/**
 * onboardingHelper.ts – Shared helper for driving the onboarding screen
 * (apps/frontend/app/app/(app)/experimentell/onboarding/index.tsx).
 *
 * (app)/index.tsx redirects to onboarding only while the profile is incomplete
 * (no canteen or no price group); sessions with a complete profile skip it and
 * land directly on food offers. A fresh login therefore always arrives here.
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
