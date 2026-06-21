/**
 * navigation-test.ts – Tests that the main navigation (drawer/tabs) works after login.
 *
 * After completing the anonymous login and selecting a canteen, verifies that
 * the user can open the drawer and navigate to different sections.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - food_offers: "Food Offers" navigation option
 *   - settings: "Settings" navigation option
 *   - group_app_settings: "App Settings" section header
 *   - news: "News" navigation option
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'navigation'],
	outputFileName: 'navigation-test',
});

// Login and select a canteen to enter the main app
performAnonymousLogin(test);
selectFirstCanteen(test);

test.takeScreenshot('navigation-main-screen');

// Open the drawer
openDrawer(test);
test
	.takeScreenshot('navigation-drawer-open')

	// Verify key navigation items are visible in the drawer
	.assertVisible(t(TranslationKeys.food_offers))
	.assertVisible(t(TranslationKeys.settings))

	// Navigate to Settings
	.tapOn(t(TranslationKeys.settings))
	.waitForAnimationToEnd()
	.takeScreenshot('navigation-settings-screen')
	.assertVisible(t(TranslationKeys.group_app_settings));

// Open drawer again and navigate to News
openDrawer(test);
test
	.tapOn(t(TranslationKeys.news))
	.waitForAnimationToEnd()
	.takeScreenshot('navigation-news-screen');

// Open drawer again and navigate to Food Offers
openDrawer(test);
test
	.tapOn(t(TranslationKeys.food_offers))
	.waitForAnimationToEnd()
	.takeScreenshot('navigation-food-offers-screen');

export default test;
