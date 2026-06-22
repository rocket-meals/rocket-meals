/**
 * loginHelper.ts – Shared helper that performs the anonymous login flow.
 *
 * Many Maestro tests require the user to be logged in (anonymously) and past
 * the onboarding screens.  This helper encapsulates the common steps so that
 * each test file stays concise.
 *
 * CONVENTION: Always use ComponentIds (from app/constants/ComponentIds.ts) for
 * element targeting via testID. This ensures stable, refactor-safe selectors
 * that are decoupled from visible text or component hierarchy. Components must
 * set `testID={ComponentIds.XXX}` so Maestro web tests can locate them by id.
 */

import { MaestroTestCase } from './MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';

/**
 * Perform anonymous login: accept privacy policy, tap "Continue without account",
 * confirm the attention dialog, and wait for the canteen selection screen.
 */
export function performAnonymousLogin(test: MaestroTestCase): MaestroTestCase {
	return test
		.openPage('http://localhost:3000/rocket-meals/')
		.waitForAnimationToEnd()
		// Accept privacy policy
		.tapOnId(ComponentIds.LOGIN_ACCEPT_PRIVACY)
		// Tap "Continue without account"
		.tapOnId(ComponentIds.LOGIN_CONTINUE_WITHOUT_ACCOUNT)
		// Confirm attention dialog
		.waitForAnimationToEnd()
		.assertVisibleId(ComponentIds.LOGIN_ATTENTION_TITLE)
		.tapOnId(ComponentIds.LOGIN_ATTENTION_CONFIRM)
		// Wait for canteen selection screen
		.waitForAnimationToEnd();
}

/**
 * After login, select the first available canteen to proceed past the
 * canteen selection screen into the main app.
 */
export function selectFirstCanteen(test: MaestroTestCase): MaestroTestCase {
	return test
		.assertVisibleId(ComponentIds.CANTEEN_SELECTION_TITLE)
		.tapOnId(ComponentIds.CANTEEN_SELECT_BUTTON)
		.waitForAnimationToEnd();
}
