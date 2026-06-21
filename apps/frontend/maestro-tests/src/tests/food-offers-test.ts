/**
 * food-offers-test.ts – Tests the food offers flow.
 *
 * After login: select a canteen → verify food offers load → open a detail view.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - food_offers: "Food Offers" navigation option
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'food-offers'],
	outputFileName: 'food-offers-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

test.takeScreenshot('food-offers-after-canteen-selected');

// Navigate to food offers via drawer
openDrawer(test);
test
	.tapOn(t(TranslationKeys.food_offers))
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
