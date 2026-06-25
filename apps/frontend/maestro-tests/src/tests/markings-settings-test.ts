/**
 * markings-settings-test.ts – Tests the markings / eating-habits flow and settings screen.
 *
 * Flow:
 *   1. Login anonymously and select a canteen.
 *   2. Navigate to the Settings screen via the drawer.
 *   3. Open the Eating Habits (markings) screen from Settings.
 *   4. Navigate to Food Offers, open a food offer detail modal.
 *   5. Switch to the Labels/Markings tab and rate two allergens
 *      (dislike the first one, like the second one).
 *   6. Close the modal.
 *   7. Navigate back to the Settings screen to verify it loads.
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { ComponentIds } from '../../../app/constants/ComponentIds';
import { performAnonymousLogin, selectFirstCanteen } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'markings', 'settings'],
	outputFileName: 'markings-settings-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

test
	// Dismiss any popup/event modal that may appear after canteen selection
	.optionalTapOnId(ComponentIds.MODAL_CLOSE_BUTTON)
	.waitForAnimationToEnd()

	// --- Settings screen ---
	.tapOnId(ComponentIds.OPEN_DRAWER)
	.waitForAnimationToEnd()
	.tapOnId(ComponentIds.DRAWER_ITEM_SETTINGS)
	.waitForAnimationToEnd()
	.takeScreenshot('settings-screen')
	.assertVisibleId(ComponentIds.SETTINGS_GROUP_APP_SETTINGS)

	// --- Eating Habits / Markings screen ---
	.tapOnId(ComponentIds.SETTINGS_EATING_HABITS)
	.waitForAnimationToEnd()
	.takeScreenshot('eating-habits-screen')
	.assertVisibleId(ComponentIds.EATING_HABITS_MARKINGS)

	// --- Food Offers: open a food offer and interact with allergens ---
	.tapOnId(ComponentIds.OPEN_DRAWER)
	.waitForAnimationToEnd()
	.tapOnId(ComponentIds.DRAWER_ITEM_FOOD_OFFERS)
	.waitForAnimationToEnd()
	.optionalTapOnId(ComponentIds.MODAL_CLOSE_BUTTON)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offers-before-detail')

	// Open the first food offer detail modal
	.tapOnIdIndex(ComponentIds.FOOD_OFFER_ITEM, 0)
	.waitForAnimationToEnd()

	// Switch to Labels/Markings tab
	.tapOnId(ComponentIds.FOOD_OFFER_TAB_LABELS)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offer-labels-tab')

	// Dislike the first allergen marking
	.tapOnIdIndex(ComponentIds.MARKING_DISLIKE_BUTTON, 0)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offer-allergen-disliked')

	// Like the first allergen marking (toggles the same allergen from dislike to like)
	.tapOnIdIndex(ComponentIds.MARKING_LIKE_BUTTON, 0)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offer-allergen-liked')

	// Close the food offer detail modal
	.tapOnId(ComponentIds.MODAL_CLOSE_BUTTON)
	.waitForAnimationToEnd()
	.takeScreenshot('food-offers-after-allergen-interaction')

	// --- Settings screen (verify it still loads) ---
	.tapOnId(ComponentIds.OPEN_DRAWER)
	.waitForAnimationToEnd()
	.tapOnId(ComponentIds.DRAWER_ITEM_SETTINGS)
	.waitForAnimationToEnd()
	.takeScreenshot('settings-screen-final')
	.assertVisibleId(ComponentIds.SETTINGS_GROUP_CANTEEN_USAGE);

export default test;
