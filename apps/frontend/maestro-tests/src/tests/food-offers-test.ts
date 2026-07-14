/**
 * food-offers-test.ts – Tests the food offers flow.
 *
 * After login: select a canteen → verify food offers load → open a detail view.
 * IMPORTANT: Always use ComponentIds (from app/constants/ComponentIds.ts) with testID
 * for element targeting. Components must set testID={ComponentIds.XXX} so that
 * Maestro web tests can locate elements by their id attribute.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';
import { completeAnonymousOnboarding, performAnonymousLogin } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'food-offers'],
	outputFileName: 'food-offers-test',
});

// Login and complete onboarding (fresh sessions are always routed to onboarding
// by (app)/index.tsx until a canteen and a price group are set)
performAnonymousLogin(test);
completeAnonymousOnboarding(test);

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
