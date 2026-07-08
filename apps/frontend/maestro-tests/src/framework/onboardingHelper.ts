/**
 * onboardingHelper.ts – Shared helpers for driving the onboarding screen
 * (apps/frontend/app/app/(app)/experimentell/onboarding/index.tsx).
 *
 * Since (app)/index.tsx redirects every login straight to onboarding, both the
 * anonymous and the registered-account flows land here first. Users with an
 * already-complete profile ("returning users") are instead offered a single
 * direct-continue button – see `confirmDirectContinue` below.
 *
 * CONVENTION: Always use ComponentIds (from app/constants/ComponentIds.ts) for
 * element targeting via nativeID – see loginHelper.ts for details.
 */

import { MaestroTestCase } from './MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';

/**
 * Walk through every onboarding step (welcome -> canteen -> price group ->
 * preferences) for a user who does not yet have a complete profile. Selecting
 * a canteen and a price group each auto-advance to the next step, so only the
 * welcome step's "weiter" button and the final "start" button need an
 * explicit tap.
 */
export function completeFullOnboarding(test: MaestroTestCase): MaestroTestCase {
	return test
		.assertVisibleId(ComponentIds.ONBOARDING_WELCOME_STEP)
		.assertVisibleId(ComponentIds.ONBOARDING_STEP_INDICATOR)
		.tapOnId(ComponentIds.ONBOARDING_NEXT_BUTTON)
		.waitForAnimationToEnd()

		// Canteen step: selecting a canteen auto-advances to the price group step.
		.tapOnId(ComponentIds.CANTEEN_SELECT_BUTTON)
		.waitForAnimationToEnd()

		// Price group step: selecting a price group auto-advances to preferences.
		.tapOnId(ComponentIds.PRICE_GROUP_SELECT_BUTTON)
		.waitForAnimationToEnd()

		// Preferences step (last step) -> finish onboarding.
		.assertVisibleId(ComponentIds.ONBOARDING_PREFERENCES_STEP)
		.tapOnId(ComponentIds.ONBOARDING_START_BUTTON)
		.waitForAnimationToEnd();
}

/**
 * For a returning user whose profile is already complete, onboarding skips
 * straight to a single centered continue button instead of the step-by-step
 * flow. The step dots stay reserved but invisible in this case.
 */
export function confirmDirectContinue(test: MaestroTestCase): MaestroTestCase {
	return test
		.assertVisibleId(ComponentIds.ONBOARDING_WELCOME_STEP)
		.assertNotVisibleId(ComponentIds.ONBOARDING_NEXT_BUTTON)
		.tapOnId(ComponentIds.ONBOARDING_CONTINUE_BUTTON)
		.waitForAnimationToEnd();
}
