/**
 * dark-mode-test.ts – Tests dark mode activation and visual change.
 *
 * After login: navigate to settings → activate dark mode → take screenshots
 * for visual comparison.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - settings: Enters settings screen
 *   - color_scheme: Color scheme setting option
 *   - color_scheme_dark: "Dark Mode" option
 *   - color_scheme_light: "Light Mode" option
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'dark-mode'],
	outputFileName: 'dark-mode-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

// Navigate to Settings
openDrawer(test);
test
	.tapOn(t(TranslationKeys.settings))
	.waitForAnimationToEnd()
	.takeScreenshot('dark-mode-before-light')

	// Tap on color scheme
	.tapOn(t(TranslationKeys.color_scheme))
	.waitForAnimationToEnd()

	// Select dark mode
	.tapOn(t(TranslationKeys.color_scheme_dark))
	.waitForAnimationToEnd()
	.takeScreenshot('dark-mode-settings-dark');

// Go back to main screen to see dark mode in effect
openDrawer(test);
test
	.takeScreenshot('dark-mode-drawer-dark')
	.tapOn(t(TranslationKeys.food_offers))
	.waitForAnimationToEnd()
	.takeScreenshot('dark-mode-food-offers-dark');

// Switch back to light for comparison
openDrawer(test);
test
	.tapOn(t(TranslationKeys.settings))
	.waitForAnimationToEnd()
	.tapOn(t(TranslationKeys.color_scheme))
	.waitForAnimationToEnd()
	.tapOn(t(TranslationKeys.color_scheme_light))
	.waitForAnimationToEnd()
	.takeScreenshot('dark-mode-back-to-light');

export default test;
