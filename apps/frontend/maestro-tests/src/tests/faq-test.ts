/**
 * faq-test.ts – Tests the FAQ screen.
 *
 * After login: navigate to FAQ → verify categories load → browse content.
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - settings: Enters settings screen
 *   - feedback_and_support: "Feedback & Support" section
 *   - feedback_support_faq: "FAQ" option within Feedback & Support
 *   - All text lookups use the t() helper to fetch German translations
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'faq'],
	outputFileName: 'faq-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

// Navigate to Settings → Feedback & Support → FAQ
openDrawer(test);
test
	.tapOn(t(TranslationKeys.settings))
	.waitForAnimationToEnd()

	// Scroll to find feedback/FAQ section
	.scroll()
	.scroll()
	.tapOn(t(TranslationKeys.feedback_and_support))
	.waitForAnimationToEnd()
	.takeScreenshot('faq-access-screen')

	// Tap on FAQ
	.tapOn(t(TranslationKeys.feedback_support_faq))
	.waitForAnimationToEnd()
	.takeScreenshot('faq-screen-loaded')

	// Scroll through FAQ content
	.scroll()
	.takeScreenshot('faq-scrolled')

	// Scroll further
	.scroll()
	.takeScreenshot('faq-scrolled-more');

export default test;
