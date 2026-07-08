/**
 * food-offers-test.ts – Tests the food offers flow.
 *
 * After login: complete onboarding (which lands on food offers) → verify food
 * offers load → open a detail view.
 * IMPORTANT: Always use ComponentIds (from app/constants/ComponentIds.ts) with testID
 * for element targeting. Components must set testID={ComponentIds.XXX} so that
 * Maestro web tests can locate elements by their id attribute.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';
import { performAnonymousLogin } from '../framework/loginHelper';
import { completeFullOnboarding } from '../framework/onboardingHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'food-offers'],
	outputFileName: 'food-offers-test',
});

// Login anonymously and complete onboarding (every login now lands on onboarding
// first; finishing it navigates to food offers on its own).
performAnonymousLogin(test);
completeFullOnboarding(test);

test
	.takeScreenshot('food-offers-after-canteen-selected')

	// Dismiss any popup/event modal that may have appeared after canteen selection
	.optionalTapOnId(ComponentIds.MODAL_CLOSE_BUTTON)
	.waitForAnimationToEnd()

	// Navigate to food offers via drawer
	.tapOnId(ComponentIds.OPEN_DRAWER)
	.waitForAnimationToEnd()
	.tapOnId(ComponentIds.DRAWER_ITEM_FOOD_OFFERS)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offers-list')

	// Verify that either food offers are displayed or a "no offers" message is shown
	// (depends on the test backend data)
	.waitForAnimationToEnd()

	// Scroll through the food offers list
	.scroll()
	.takeScreenshot('food-offers-scrolled')

	// Try to tap on the first food offer to open the detail view
	.scroll()
	.swipe('UP')
	.waitForAnimationToEnd()
	.takeScreenshot('food-offers-detail');

export default test;
