/**
 * loginHelper.ts – Shared helper that performs the anonymous login flow.
 *
 * Many Maestro tests require the user to be logged in (anonymously) and past
 * the onboarding screens.  This helper encapsulates the common steps so that
 * each test file stays concise.
 *
 * CONVENTION: Always use ComponentIds (from app/constants/ComponentIds.ts) for
 * element targeting via nativeID. This ensures stable, refactor-safe selectors
 * that are decoupled from visible text or component hierarchy. Components must
 * set `nativeID={ComponentIds.XXX}` so Maestro web tests can locate them by HTML id.
 *
 * NOTE: The `MaestroTestCase` framework automatically appends `.*` to every `id:`
 * pattern in the generated YAML so that Maestro's anchored regex matches even when
 * the rendered HTML id has a dynamic suffix (e.g. `canteen-select-button-23456543`).
 */

import { MaestroTestCase } from './MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';

/**
 * Perform anonymous login: accept privacy policy, tap "Continue without account",
 * confirm the attention dialog, and wait for the onboarding flow.
 */
export function performAnonymousLogin(test: MaestroTestCase): MaestroTestCase {
	return test
		.openPage('http://localhost:8081/login?logout=true')
		.waitForAnimationToEnd()
		// Accept privacy policy
		.tapOnId(ComponentIds.LOGIN_ACCEPT_PRIVACY)
		// Tap "Continue without account"
		.tapOnId(ComponentIds.LOGIN_CONTINUE_WITHOUT_ACCOUNT)
		// Confirm attention dialog
		.waitForAnimationToEnd()
		.assertVisibleId(ComponentIds.LOGIN_ATTENTION_TITLE)
		.tapOnId(ComponentIds.LOGIN_ATTENTION_CONFIRM)
		// Wait for onboarding flow
		.waitForAnimationToEnd()
		.assertVisibleId(ComponentIds.ONBOARDING_NEXT_BUTTON);
}

/**
 * Complete onboarding after anonymous login and land in the main app.
 */
export function selectFirstCanteen(test: MaestroTestCase): MaestroTestCase {
	return test
		.tapOnId(ComponentIds.ONBOARDING_NEXT_BUTTON)
		.waitForAnimationToEnd()
		.assertVisibleId(ComponentIds.CANTEEN_SELECT_BUTTON)
		.tapOnId(ComponentIds.CANTEEN_SELECT_BUTTON)
		.waitForAnimationToEnd()
		.assertVisibleId(ComponentIds.PRICE_GROUP_OPTION_STUDENT)
		.tapOnId(ComponentIds.PRICE_GROUP_OPTION_STUDENT)
		.waitForAnimationToEnd()
		.assertVisibleId(ComponentIds.ONBOARDING_START_BUTTON)
		.tapOnId(ComponentIds.ONBOARDING_START_BUTTON)
		.waitForAnimationToEnd();
}
