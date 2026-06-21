/**
 * language-switch-test.ts – Tests switching the app language.
 *
 * After login: navigate to settings → switch language from DE to EN →
 * verify that translated texts change.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - settings: Enters settings screen
 *   - group_app_settings: Settings group title in German/English
 *   - language: Language setting option
 * - Language option labels (from SettingData.ts languages array, via LanguageLabels):
 *   - LanguageLabels.ENGLISH: English language option
 *   - LanguageLabels.GERMAN: German language option
 *   - Other available constants: TURKISH, SPANISH, FRENCH, CHINESE, ARABIC, RUSSIAN
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';
import { LanguageLabels } from '../framework/languageHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'language'],
	outputFileName: 'language-switch-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

// Navigate to Settings
openDrawer(test);
test
	.tapOn(t(TranslationKeys.settings))
	.waitForAnimationToEnd()
	.takeScreenshot('language-settings-de')

	// Verify German text is shown
	.assertVisible(t(TranslationKeys.group_app_settings, 'de'))

	// Tap on language setting
	.tapOn(t(TranslationKeys.language))
	.waitForAnimationToEnd()
	.takeScreenshot('language-options')

	// Select English
	.tapOn(LanguageLabels.ENGLISH)
	.waitForAnimationToEnd()
	.takeScreenshot('language-switched-to-en')

	// Verify English text is now shown
	.assertVisible(t(TranslationKeys.group_app_settings, 'en'))
	.takeScreenshot('language-settings-en')

	// Switch back to German
	.tapOn(t(TranslationKeys.language, 'en'))
	.waitForAnimationToEnd()
	.tapOn(LanguageLabels.GERMAN)
	.waitForAnimationToEnd()
	.takeScreenshot('language-back-to-de');

export default test;
