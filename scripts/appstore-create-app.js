#!/usr/bin/env node
// Creates (or looks up) the App Store Connect app record of an Expo app in this
// monorepo and writes its Apple-ID into the app's config.ts - the one manual
// copy&paste step that was left between "new app in apps/" and a working
// `eas build --auto-submit`.
//
// Why a script and not just the App Store Connect API: Apple's public API has
// no endpoint for creating apps ("Don't use this API to create new apps;
// instead, create new apps on the App Store Connect website"). What DOES work
// is the private iris API behind appstoreconnect.apple.com, which is exactly
// what `eas submit` uses under the hood via @expo/apple-utils - but it needs an
// Apple-ID session (cookies), NOT the App Store Connect API key. eas-cli says
// as much in its own source: "Does not support App Store Connect API (CI)".
//
// This script therefore has two modes, picked automatically:
//
//   1. Apple-ID session (can create):  EXPO_APPLE_ID set, or a cached session,
//      or FASTLANE_SESSION. Password comes from EXPO_APPLE_PASSWORD, the system
//      keychain or a prompt; the two-factor code is prompted for. The session is
//      cached by @expo/apple-utils, so the next run usually needs no 2FA.
//   2. App Store Connect API key (lookup only): the EXPO_ASC_* variables that
//      .github/actions/prepare-asc-api-key exports. Enough to read the Apple-ID
//      of an app that already exists (that request goes to the public API), not
//      enough to create one.
//
// Usage:
//   yarn appstore:create-app apps/playground/frontend
//   yarn appstore:create-app apps/playground/frontend --name "My Playground"
//   yarn appstore:create-app apps/playground/frontend --lookup-only
//
// Options:
//   --name <name>      App Store name (default: `name` from the Expo config).
//                      Names are globally unique across the whole App Store; a
//                      taken name is retried with a short random suffix, like
//                      eas-cli does. Rename later in App Store Connect.
//   --sku <sku>        Internal SKU (default: the bundle identifier).
//   --language <code>  Primary locale (default: en-US).
//   --lookup-only      Never create anything, only read the Apple-ID.
//   --apple-id <email> Apple-ID to log in with (default: EXPO_APPLE_ID).
//
// Env:
//   EXPO_APPLE_ID, EXPO_APPLE_PASSWORD   Apple-ID login (mode 1)
//   FASTLANE_SESSION                     reuse a `fastlane spaceauth` session
//   EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID, EXPO_ASC_ISSUER_ID  API key (mode 2)
//   EXPO_APPLE_TEAM_ID                   Apple team; falls back to the shared
//                                        constant in repo-depkit-common
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO_ROOT = path.resolve(__dirname, '..');

function fail(message) {
	console.error(`\n❌ ${message}\n`);
	process.exit(1);
}

function parseArguments(argv) {
	const options = { projectDir: null, name: null, sku: null, language: 'en-US', lookupOnly: false, appleId: null };
	const flags = { '--name': 'name', '--sku': 'sku', '--language': 'language', '--apple-id': 'appleId' };

	for (let i = 0; i < argv.length; i++) {
		const argument = argv[i];
		if (argument === '--lookup-only') {
			options.lookupOnly = true;
		} else if (flags[argument]) {
			const value = argv[++i];
			if (!value) {
				fail(`Missing value for ${argument}`);
			}
			options[flags[argument]] = value;
		} else if (argument.startsWith('--')) {
			fail(`Unknown option ${argument}`);
		} else if (!options.projectDir) {
			options.projectDir = argument;
		} else {
			fail(`Unexpected argument ${argument}`);
		}
	}

	if (!options.projectDir) {
		fail('Missing project directory, e.g. `yarn appstore:create-app apps/playground/frontend`');
	}
	return options;
}

/** The app's public Expo config (app.config.ts), loaded with the app's own @expo/config. */
function readExpoConfig(projectDir) {
	let getConfig;
	try {
		getConfig = require(require.resolve('@expo/config', { paths: [projectDir] })).getConfig;
	} catch {
		fail(`Could not load @expo/config from ${projectDir}. Run \`yarn install\` first.`);
	}

	const { exp } = getConfig(projectDir, { skipSDKVersionRequirement: true, isPublicConfig: true });
	const bundleIdentifier = exp.ios?.bundleIdentifier;
	if (!bundleIdentifier) {
		fail(`${projectDir} has no ios.bundleIdentifier in its Expo config.`);
	}
	return { name: exp.name, bundleIdentifier };
}

/** Apple team/key constants shared by all apps (packages/common/src/AppleAppStoreConfig.ts). */
function readSharedAppleConstants() {
	try {
		require('repo-depkit-common/appconfig/registerTsNode.js').registerTsNode();
		return require('repo-depkit-common');
	} catch {
		return {};
	}
}

function requireAppleUtils() {
	// Not a hard dependency of the script's own module graph: only the paths
	// that actually talk to Apple need it.
	try {
		return require('@expo/apple-utils');
	} catch {
		fail('@expo/apple-utils is not installed. Run `yarn install` in the repository root.');
	}
}

/**
 * Builds the request context @expo/apple-utils needs, preferring an Apple-ID
 * session (the only auth that can create an app) over the API key.
 */
async function createRequestContextAsync({ appleId, teamId, lookupOnly }) {
	const { Auth, Token } = requireAppleUtils();

	const canUseAppleId = Boolean(appleId || process.env.FASTLANE_SESSION);
	if (canUseAppleId) {
		console.log(`🔐 Signing in to App Store Connect${appleId ? ` as ${appleId}` : ''} ...`);
		const authState = await Auth.loginAsync({ username: appleId ?? undefined, teamId });
		return { context: authState.context, canCreate: true };
	}

	const keyPath = process.env.EXPO_ASC_API_KEY_PATH;
	const keyId = process.env.EXPO_ASC_KEY_ID;
	const issuerId = process.env.EXPO_ASC_ISSUER_ID;
	if (!keyPath || !keyId || !issuerId) {
		fail(
			'No Apple authentication available.\n' +
				'   To CREATE the app:  EXPO_APPLE_ID=you@example.com yarn appstore:create-app <project-dir>\n' +
				'   To LOOK UP the id:  set EXPO_ASC_API_KEY_PATH, EXPO_ASC_KEY_ID and EXPO_ASC_ISSUER_ID'
		);
	}
	if (!lookupOnly) {
		console.log('ℹ️  Only an App Store Connect API key is available - Apple\'s public API cannot create apps,');
		console.log('   so this run can look the Apple-ID up but not create a missing app.');
	}

	const key = fs.readFileSync(keyPath, 'utf8');
	return { context: { token: new Token({ key, keyId, issuerId }), teamId }, canCreate: false };
}

/** Creates the app, retrying with a suffixed name when the App Store name is taken. */
async function createAppAsync(context, properties, attempt = 0) {
	const { App } = requireAppleUtils();
	try {
		return await App.createAsync(context, properties);
	} catch (error) {
		const isNameTaken =
			error?.code === 'APP_CREATE_NAME_UNAVAILABLE' ||
			error?.data?.errors?.some((entry) => String(entry.code).includes('DUPLICATE'));
		if (!isNameTaken || attempt >= 3) {
			throw error;
		}
		const suffixedName = `${properties.name} ${Math.random().toString(16).slice(2, 6)}`;
		console.warn(`⚠️  App Store name "${properties.name}" is taken, retrying as "${suffixedName}".`);
		return createAppAsync(context, { ...properties, name: suffixedName }, attempt + 1);
	}
}

/**
 * Writes the Apple-ID into the app's config.ts (getCustomerConfig -> appleAppId),
 * which is what generate-eas-config.ts reads to fill in submit.production.ios.ascAppId.
 */
function writeAppleAppIdIntoConfig(projectDir, appleAppId) {
	const configPath = path.join(projectDir, 'config.ts');
	if (!fs.existsSync(configPath)) {
		console.warn(`⚠️  ${configPath} not found - set appleAppId manually.`);
		return false;
	}

	const contents = fs.readFileSync(configPath, 'utf8');
	const existing = /(\bappleAppId:\s*)'([^']*)'/.exec(contents);
	if (existing) {
		if (existing[2] === appleAppId) {
			console.log(`✅ appleAppId '${appleAppId}' is already set in ${path.relative(REPO_ROOT, configPath)}.`);
			return false;
		}
		fs.writeFileSync(configPath, contents.replace(existing[0], `${existing[1]}'${appleAppId}'`));
	} else {
		// No key yet: put it right after projectName, with that line's indentation.
		const projectName = /^([ \t]*)projectName:.*\n/m.exec(contents);
		if (!projectName) {
			console.warn(`⚠️  Could not find a place for appleAppId in ${configPath} - set it manually.`);
			return false;
		}
		const insertion = `${projectName[1]}appleAppId: '${appleAppId}',\n`;
		fs.writeFileSync(configPath, contents.replace(projectName[0], projectName[0] + insertion));
	}

	console.log(`📝 Wrote appleAppId '${appleAppId}' into ${path.relative(REPO_ROOT, configPath)}.`);
	return true;
}

/** Regenerates eas.json from eas.template.json (never edit eas.json by hand). */
function regenerateEasConfig(projectDir) {
	const packageJsonPath = path.join(projectDir, 'package.json');
	if (!fs.existsSync(packageJsonPath)) {
		return;
	}
	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	if (!packageJson.scripts?.['generate:eas']) {
		console.warn(`⚠️  ${packageJson.name} has no "generate:eas" script - update eas.json manually.`);
		return;
	}

	console.log(`⚙️  Regenerating eas.json (yarn workspace ${packageJson.name} generate:eas) ...`);
	const result = spawnSync('yarn', ['workspace', packageJson.name, 'generate:eas'], {
		cwd: REPO_ROOT,
		stdio: 'inherit',
	});
	if (result.status !== 0) {
		fail(`"yarn workspace ${packageJson.name} generate:eas" failed.`);
	}
}

async function main() {
	const options = parseArguments(process.argv.slice(2));
	const projectDir = path.resolve(REPO_ROOT, options.projectDir);
	if (!fs.existsSync(projectDir)) {
		fail(`${projectDir} does not exist.`);
	}

	const { name, bundleIdentifier } = readExpoConfig(projectDir);
	const appName = options.name ?? name;
	const constants = readSharedAppleConstants();
	const teamId = process.env.EXPO_APPLE_TEAM_ID ?? constants.EXPO_APPLE_TEAM_ID;
	const appleId = options.appleId ?? process.env.EXPO_APPLE_ID ?? null;

	console.log(`📱 App:    ${appName}`);
	console.log(`📦 Bundle: ${bundleIdentifier}`);

	const { App } = requireAppleUtils();
	const { context, canCreate } = await createRequestContextAsync({ appleId, teamId, lookupOnly: options.lookupOnly });

	let app = await App.findAsync(context, { bundleId: bundleIdentifier });

	if (!app) {
		if (options.lookupOnly) {
			fail(
				`No App Store Connect app for "${bundleIdentifier}".\n` +
					'   Create it with: EXPO_APPLE_ID=you@example.com yarn appstore:create-app ' +
					options.projectDir
			);
		}
		if (!canCreate) {
			fail(
				`No App Store Connect app for "${bundleIdentifier}" and no Apple-ID session.\n` +
					"   Apple's public API cannot create apps - run this locally with an Apple-ID:\n" +
					`   EXPO_APPLE_ID=you@example.com yarn appstore:create-app ${options.projectDir}`
			);
		}

		console.log('🆕 Registering the bundle identifier (if needed) ...');
		await App.ensureBundleIdExistsAsync(context, { bundleId: bundleIdentifier, name: appName });

		console.log(`🆕 Creating the App Store Connect app "${appName}" ...`);
		app = await createAppAsync(context, {
			name: appName,
			bundleId: bundleIdentifier,
			primaryLocale: options.language,
			sku: options.sku ?? bundleIdentifier,
		});
		console.log(`✅ Created "${app.attributes.name}" (Apple-ID ${app.id}).`);
	} else {
		console.log(`✅ Found "${app.attributes.name}" in App Store Connect (Apple-ID ${app.id}).`);
	}

	if (writeAppleAppIdIntoConfig(projectDir, app.id)) {
		regenerateEasConfig(projectDir);
	}

	console.log('\n🎉 Done. Commit the changed config.ts/eas.json, then the iOS CI job can build and submit.');
}

if (require.main === module) {
	main().catch((error) => {
		fail(error?.message ?? String(error));
	});
}

// Exported so the file-writing half can be exercised without talking to Apple.
module.exports = { writeAppleAppIdIntoConfig, regenerateEasConfig };
