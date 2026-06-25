/**
 * food-offers-test.ts – Tests the food offers flow.
 *
 * After login: select a canteen → verify food offers load → open a detail view
 * → switch between the three detail tabs → close the modal.
 * IMPORTANT: Always use ComponentIds (from app/constants/ComponentIds.ts) with nativeID
 * for element targeting. Components must set nativeID={ComponentIds.XXX} so that
 * Maestro web tests can locate elements by their id attribute.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';
import { performAnonymousLogin, selectFirstCanteen } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'food-offers'],
	outputFileName: 'food-offers-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

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

	// Scroll through the food offers list
	.scroll()
	.takeScreenshot('food-offers-scrolled')

	// Tap on the first food offer to open the detail modal
	.tapOnIdIndex(ComponentIds.FOOD_OFFER_ITEM, 0)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offer-detail-feedbacks')

	// Switch to the Details tab
	.tapOnId(ComponentIds.FOOD_OFFER_TAB_DETAILS)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offer-detail-details')

	// Switch to the Labels/Markings tab
	.tapOnId(ComponentIds.FOOD_OFFER_TAB_LABELS)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offer-detail-labels')

	// Switch back to Feedbacks tab
	.tapOnId(ComponentIds.FOOD_OFFER_TAB_FEEDBACKS)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offer-detail-back-to-feedbacks')

	// Close the food offer detail modal
	.tapOnId(ComponentIds.MODAL_CLOSE_BUTTON)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offers-after-detail-closed');

export default test;
