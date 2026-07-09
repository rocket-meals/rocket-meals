/**
 * screens-test.ts – Visits every app screen and captures a screenshot.
 *
 * Replaces apps/screenshotGenerator: that script iterated over APP_ROUTES with
 * ?kioskMode=true (kiosk mode auto-logs-in with a demo profile so guarded (app)
 * screens render without a real account) and captured screenshots without any
 * assertions. This does the same as part of the Maestro suite, so every screen
 * is at least mounted once per run - a crash/redirect-to-login regression on any
 * screen shows up in its screenshot.
 *
 * One flow per route because a Maestro web flow can only launch one URL (the
 * YAML header url is reused for every launchApp in the flow).
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';
// Import from the package source (not the package index) so ts-node can compile
// this without pulling in JSX - same pattern as ComponentIds.
import { APP_ROUTES } from '../../../../../packages/common/src/AppLinks';

// Extra settle time before each screenshot, applied at YAML-generation time. The
// store-screenshot mode of run-maestro-web-test.sh sets this (async content like food
// images needs a few seconds to load and there is no generic element to wait on);
// regular test runs keep it at 0 so the suite stays fast.
const settleMs = parseInt(process.env.MAESTRO_SCREENS_SETTLE_MS || '0', 10) || 0;

const tests: MaestroTestCase[] = APP_ROUTES.map((route: string) => {
	const test = new MaestroTestCase({
		appId: 'com.rocketmeals.web',
		tags: ['web', 'screens'],
		outputFileName: `screen-${route}-test`,
	});

	test
		// deviceMock=iphone renders the fake iOS status bar (9:41, signal/wifi/battery) on
		// login and (app) screens - same combination the screenshotGenerator used, so the
		// captures double as store screenshots when the run uses a phone-sized viewport.
		.openPage(`http://localhost:8081/${route}?kioskMode=true&deviceMock=iphone`)
		// Block until the app shell has actually booted - waitForAnimationToEnd alone
		// returns immediately on a still-loading (static) page and produced blank shots.
		.waitUntilVisibleId(ComponentIds.APP_ROOT)
		.waitForAnimationToEnd();

	if (settleMs > 0) {
		test.sleepMs(settleMs).waitForAnimationToEnd();
	}

	test.takeScreenshot(`screen-${route}`);

	return test;
});

export default tests;
