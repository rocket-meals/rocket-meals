/**
 * monitor-link-logged-out-test.ts – Regression: a LOGGED-OUT device opening a saved
 * BigScreen monitor link must land on the monitor - not on onboarding and not on the
 * login screen.
 *
 * launchApp opens a clean browser context (no cookies/localStorage), which is exactly
 * the state of a monitor device that only knows the saved link. Maestro can't capture
 * the runtime URL produced in monitor-link-test.ts, so the saved link is reconstructed
 * here; its query params only shape the displayed content, not the routing this test
 * guards.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'monitor'],
	outputFileName: 'monitor-link-logged-out-test',
});

test
	.openPage('http://localhost:8081/bigScreen?fullscreen=true')
	.waitForAnimationToEnd()
	// The monitor must render...
	.assertVisibleId(ComponentIds.MONITOR_BIG_SCREEN)
	// ...and neither onboarding nor the login screen may have hijacked the deep link
	.assertNotVisible('Willkommen')
	.assertNotVisibleId(ComponentIds.LOGIN_ACCEPT_PRIVACY)
	.takeScreenshot('monitor-link-logged-out-direct-open');

export default test;
