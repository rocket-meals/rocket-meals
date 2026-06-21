/**
 * eating-habits-test.ts – Tests the eating habits / allergene settings.
 *
 * After login: navigate to eating habits → set preferences →
 * verify markings are available.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - settings: Enters settings screen
 *   - eating_habits: "Eating Habits" setting option
 *   - markings: "Markings" / "Allergies" section
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'eating-habits'],
	outputFileName: 'eating-habits-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

// Navigate to settings
openDrawer(test);
test
	.tapOn(t(TranslationKeys.settings))
	.waitForAnimationToEnd()

	// Find and tap on eating habits
	.scroll()
	.tapOn(t(TranslationKeys.eating_habits))
	.waitForAnimationToEnd()
	.takeScreenshot('eating-habits-screen')

	// Verify markings/allergene section is visible
	.assertVisible(t(TranslationKeys.markings))
	.takeScreenshot('eating-habits-markings')

	// Scroll through options
	.scroll()
	.takeScreenshot('eating-habits-scrolled')

	// Tap on allergene section
	.tapOn(t(TranslationKeys.allergene))
	.waitForAnimationToEnd()
	.takeScreenshot('eating-habits-allergene');

export default test;
