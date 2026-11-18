#!/usr/bin/env node
// Runs the tour described in request.json on an Expo cloud simulator and saves
// screenshots. Started by .github/workflows/frontend-cloud-simulator.yml.
//
// Why this exists: a cloud simulator is the only way to look at the app on a
// device nobody has at hand (the iPhone Duo, folded, unfolded, held sideways).
// Turning and folding the device is only possible through EAS CLI, which needs
// the Expo token - and that lives in the CI secrets.
//
// request.json:
//   build          true: build the "simulator" profile from this commit first.
//   buildId        Otherwise: id of an existing simulator build to install.
//   device         Simulator name, e.g. "iPhone Duo" or "iPhone 17".
//   keepMinutes    > 0: leave the session running that long (idle time) after
//                  the tour, so it can be watched on expo.dev. 0: stop it.
//   steps          List of [action, ...arguments]. Allowed actions:
//                    rotate portrait|landscape_left|landscape_right|portrait_upside_down
//                    hinge.set fold|half|unfold|<degrees>      (iPhone Duo)
//                    tap <x> <y>                                (0 to 1, relative)
//                    swipe <x1> <y1> <x2> <y2>                  (0 to 1, relative)
//                    type <ascii text>
//                    button home|lock
//                    wait <seconds>
//                    screenshot <name> [display]                (Duo: 1 outer, 3 inner)
//
// Nothing from the request reaches a shell: every command is started with an
// argument list, and each argument is checked against the patterns below.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.resolve(here, '../app');
const outDir = path.resolve(here, 'output');
const request = JSON.parse(fs.readFileSync(path.join(here, 'request.json'), 'utf8'));

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const UNIT = /^(0(\.\d+)?|1(\.0+)?)$/;
const NAME = /^[a-z0-9][a-z0-9-]{0,60}$/;
const ROTATIONS = ['portrait', 'portrait_upside_down', 'landscape_left', 'landscape_right'];

function fail(message) {
	console.error(`::error::${message}`);
	process.exit(1);
}

function eas(args, { allowFailure = false } = {}) {
	console.log(`$ eas ${args.join(' ')}`);
	const result = spawnSync('eas', args, { cwd: appDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
	const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
	console.log(output.trim());
	if (result.status !== 0 && !allowFailure) {
		fail(`eas ${args[0]} failed with exit code ${result.status}`);
	}
	return result.stdout ?? '';
}

function sleep(seconds) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, seconds * 1000);
}

function summary(line) {
	console.log(line);
	if (process.env.GITHUB_STEP_SUMMARY) {
		fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${line}\n`);
	}
}

function parseJson(text) {
	const start = text.search(/[[{]/);
	if (start < 0) return null;
	try {
		return JSON.parse(text.slice(start));
	} catch {
		return null;
	}
}

const device = String(request.device ?? 'iPhone 17');
if (!/^[A-Za-z0-9 ().-]{1,60}$/.test(device)) fail('device has an unexpected format');
const keepMinutes = Math.max(0, Math.min(60, Number(request.keepMinutes ?? 0) || 0));
const steps = Array.isArray(request.steps) ? request.steps : [];

fs.mkdirSync(outDir, { recursive: true });

// 1. Which build?
let buildId = request.buildId;
if (request.build === true) {
	const built = parseJson(eas(['build', '--platform', 'ios', '--profile', 'simulator', '--non-interactive', '--json']));
	buildId = Array.isArray(built) ? built[0]?.id : built?.id;
	summary(`Simulator build: \`${buildId}\``);
}
if (!UUID.test(String(buildId))) fail('no valid buildId (set "build": true or give "buildId")');

// 2. Start the device with the build installed.
const maxDuration = Math.min(115, 20 + keepMinutes);
eas([
	'simulator:start', '--platform', 'ios', '--type', 'agent-device', '--device', device,
	'--build-id', buildId, '--name', 'CI simulator tour', '--non-interactive',
	'--max-duration-minutes', String(maxDuration), '--max-idle-time-minutes', String(Math.max(5, keepMinutes)),
]);
const envFile = path.join(appDir, '.env.eas-simulator');
const sessionId = fs.existsSync(envFile) ? (fs.readFileSync(envFile, 'utf8').match(/EAS_SIMULATOR_SESSION_ID=["']?([0-9a-f-]{36})/) ?? [])[1] : undefined;
if (!UUID.test(String(sessionId))) fail('the simulator session did not start');
summary(`Simulator session: \`${sessionId}\` on ${device}`);

for (let attempt = 0; attempt < 40; attempt++) {
	const state = parseJson(eas(['simulator:get', '--id', sessionId, '--json', '--non-interactive'], { allowFailure: true }));
	if (state?.status === 'IN_PROGRESS') break;
	if (state?.status === 'ERRORED' || state?.status === 'STOPPED') fail(`session ended early: ${state.status}`);
	sleep(15);
}
// The app needs a moment after the device reports ready.
sleep(20);

// 3. The tour.
const control = args => eas(['simulator:control', ...args, '--id', sessionId], { allowFailure: true });
let shots = 0;
for (const step of steps) {
	if (!Array.isArray(step) || step.length === 0) fail('every step is a list: [action, ...arguments]');
	const [action, ...args] = step.map(String);
	switch (action) {
		case 'rotate':
			if (!ROTATIONS.includes(args[0])) fail(`rotate: unknown orientation ${args[0]}`);
			control(['rotate', args[0]]);
			break;
		case 'hinge.set':
			if (!/^(fold|half|unfold|\d{1,3})$/.test(args[0])) fail('hinge.set: fold, half, unfold or degrees');
			control(['hinge.set', args[0]]);
			break;
		case 'tap':
			if (args.length !== 2 || !args.every(value => UNIT.test(value))) fail('tap: two numbers from 0 to 1');
			control(['tap', args[0], args[1]]);
			break;
		case 'swipe': {
			if (args.length !== 4 || !args.every(value => UNIT.test(value))) fail('swipe: four numbers from 0 to 1');
			const [x1, y1, x2, y2] = args.map(Number);
			const events = [
				{ type: 'begin', x: x1, y: y1 },
				{ type: 'move', x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
				{ type: 'end', x: x2, y: y2 },
			];
			control(['gesture', JSON.stringify(events)]);
			break;
		}
		case 'type':
			if (!/^[\x20-\x7e]{1,200}$/.test(args[0] ?? '')) fail('type: ASCII text only');
			control(['type', args[0]]);
			break;
		case 'button':
			if (!['home', 'lock'].includes(args[0])) fail('button: home or lock');
			control(['button', args[0]]);
			break;
		case 'wait': {
			const seconds = Number(args[0]);
			if (!(seconds > 0 && seconds <= 60)) fail('wait: 1 to 60 seconds');
			sleep(seconds);
			break;
		}
		case 'screenshot': {
			if (!NAME.test(args[0] ?? '')) fail('screenshot: name of lowercase letters, digits and dashes');
			if (args[1] !== undefined && !/^[1-9]$/.test(args[1])) fail('screenshot: display is a single digit');
			shots += 1;
			const file = path.join(outDir, `${String(shots).padStart(2, '0')}-${args[0]}.png`);
			control(['screenshot.capture', ...(args[1] ? [`display=${args[1]}`] : []), '--output', file]);
			break;
		}
		default:
			fail(`unknown action: ${action}`);
	}
	// Commands that change the device run one at a time, the device needs to settle.
	if (action !== 'wait' && action !== 'screenshot') sleep(2);
}
summary(`Screenshots: ${shots}`);

// 4. Leave it running for a look, or stop it.
if (keepMinutes > 0) {
	summary(`The session stays up for ${keepMinutes} idle minutes.`);
} else {
	eas(['simulator:stop', '--id', sessionId], { allowFailure: true });
}
