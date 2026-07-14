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
 * confirm the attention dialog, and wait for the canteen selection screen.
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

/**
 * Complete the onboarding flow shown after a fresh anonymous login
 * (welcome → canteen → price group → preferences → start).
 *
 * A fresh session is always routed to onboarding by (app)/index.tsx until a
 * canteen AND a price group are set. Selecting a canteen or price group
 * automatically advances to the next step.
 */
export function completeAnonymousOnboarding(test: MaestroTestCase): MaestroTestCase {
	return test
		// Welcome step
		.assertVisibleId(ComponentIds.ONBOARDING_NEXT_BUTTON)
		.tapOnId(ComponentIds.ONBOARDING_NEXT_BUTTON)
		.waitForAnimationToEnd()
		// Canteen step – selecting a canteen advances to the price group step
		.tapOnId(ComponentIds.CANTEEN_SELECT_BUTTON)
		.waitForAnimationToEnd()
		// Price group step – selecting a price group advances to the preferences step
		.tapOnId(`${ComponentIds.PRICE_GROUP_SELECT_BUTTON}-student`)
		.waitForAnimationToEnd()
		// Preferences step – start the app
		.tapOnId(ComponentIds.ONBOARDING_START_BUTTON)
		.waitForAnimationToEnd();
}
