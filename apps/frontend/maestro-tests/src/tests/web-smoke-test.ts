/**
 * web-smoke-test.ts – Web smoke test for the Rocket Meals frontend.
 *
 * IMPORTANT: Always use ComponentIds (from app/constants/ComponentIds.ts) with testID
 * for element targeting. Components must set testID={ComponentIds.XXX} so that
 * Maestro web tests can locate elements by their id attribute.
 * Run `yarn maestro:generate` (from `apps/frontend/app/`)
 * to produce `maestro-tests/generated/web-smoke-test.yaml`, then `yarn maestro`
 * (or `./run-maestro-web-test.sh`) to execute it with the Maestro CLI.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'smoke'],
	outputFileName: 'web-smoke-test',
});

test
	// Open the app
	.openPage('http://localhost:8081/')
	.waitForAnimationToEnd()
	.takeScreenshot('app-loaded')

	// Step 1: Accept the privacy policy (required to enable the login buttons)
	.tapOnId(ComponentIds.LOGIN_ACCEPT_PRIVACY)

	// Step 2: Tap "Continue without account" for anonymous login
	.tapOnId(ComponentIds.LOGIN_CONTINUE_WITHOUT_ACCOUNT)

	// Step 3: Confirm the attention sheet about anonymous account limitations
	.waitForAnimationToEnd()
	.assertVisibleId(ComponentIds.LOGIN_ATTENTION_TITLE)
	.tapOnId(ComponentIds.LOGIN_ATTENTION_CONFIRM)

	// Step 4: Wait for the canteen selection screen to load
	.waitForAnimationToEnd()
	.takeScreenshot('canteen-selection')
	.assertVisibleId(ComponentIds.CANTEEN_SELECTION_TITLE)
	.assertNotVisibleId(ComponentIds.CANTEEN_SELECTION_EMPTY)
	.takeScreenshot('smoke-test-complete');

export default test;
