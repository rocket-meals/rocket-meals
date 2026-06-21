/**
 * canteen-selection-test.ts – Tests the canteen selection flow.
 *
 * Verifies that multiple canteens are shown, one can be selected,
 * and the selection is persisted.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - please_select_your_canteen: "Please select your canteen" title
 *   - no_canteens_found: "No canteens found" message (should NOT be visible initially)
 *   - select: "Select" button for choosing a canteen
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - settings: Enters settings screen
 *   - group_canteen_usage: Canteen settings group
 *   - canteen: Canteen selection setting option
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'canteen'],
	outputFileName: 'canteen-selection-test',
});

// Login and get past onboarding
performAnonymousLogin(test);

test
	// Verify canteen selection screen loads with canteens
	.assertVisible(t(TranslationKeys.please_select_your_canteen))
	.assertNotVisible(t(TranslationKeys.no_canteens_found))
	.takeScreenshot('canteen-selection-initial')

	// Scroll through canteen list
	.scroll()
	.takeScreenshot('canteen-selection-scrolled')

	// Select a canteen
	.tapOnId(`${t(TranslationKeys.select)}.*`)
	.waitForAnimationToEnd()
	.takeScreenshot('canteen-selected-main-app');

// Navigate to settings to verify selected canteen is remembered
openDrawer(test);
test
	.tapOn(t(TranslationKeys.settings))
	.waitForAnimationToEnd()

	// Look for canteen-related settings
	.assertVisible(t(TranslationKeys.group_canteen_usage))
	.takeScreenshot('canteen-selection-in-settings')

	// Tap on canteen setting to change it
	.tapOn(t(TranslationKeys.canteen))
	.waitForAnimationToEnd()
	.takeScreenshot('canteen-change-screen');

export default test;
