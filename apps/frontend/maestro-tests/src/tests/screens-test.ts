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

const tests: MaestroTestCase[] = APP_ROUTES.map((route: string) => {
	const test = new MaestroTestCase({
		appId: 'com.rocketmeals.web',
		tags: ['web', 'screens'],
		outputFileName: `screen-${route}-test`,
	});

	test
		.openPage(`http://localhost:8081/${route}?kioskMode=true`)
		// Block until the app shell has actually booted - waitForAnimationToEnd alone
		// returns immediately on a still-loading (static) page and produced blank shots.
		.waitUntilVisibleId(ComponentIds.APP_ROOT)
		.waitForAnimationToEnd()
		.takeScreenshot(`screen-${route}`);

	return test;
});

export default tests;
