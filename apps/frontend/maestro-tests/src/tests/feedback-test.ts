/**
 * feedback-test.ts – Tests the feedback/support screen.
 *
 * After login: navigate to feedback → open form → fill in fields (without submitting).
 *
 * SCREEN ELEMENTS AND EXPECTED TEXT STRINGS:
 * - Uses translation keys from TranslationKeys enum, never hardcoded strings
 * - Key screen texts (via t() function):
 *   - open_drawer: Opens side navigation menu (via stable testID)
 *   - settings: Enters settings screen
 *   - feedback_and_support: "Feedback & Support" section
 *   - feedback_support_faq: "FAQ" option within Feedback & Support
 *   - All lookups use t() to fetch German translations by default
 */

import { MaestroTestCase } from '../framework/MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import { t, performAnonymousLogin, selectFirstCanteen, openDrawer } from '../framework/loginHelper';

const test = new MaestroTestCase({
	appId: 'com.rocketmeals.web',
	tags: ['web', 'feedback'],
	outputFileName: 'feedback-test',
});

// Login and select a canteen
performAnonymousLogin(test);
selectFirstCanteen(test);

// Navigate to Settings (feedback is often accessible from settings)
openDrawer(test);
test
	.tapOn(t(TranslationKeys.settings))
	.waitForAnimationToEnd()

	// Scroll to find feedback option
	.scroll()
	.scroll()
	.tapOn(t(TranslationKeys.feedback_and_support))
	.waitForAnimationToEnd()
	.takeScreenshot('feedback-screen')

	// Verify feedback screen loaded
	.assertVisible(t(TranslationKeys.feedback_support_faq))
	.takeScreenshot('feedback-support-loaded')

	// Scroll through feedback options
	.scroll()
	.takeScreenshot('feedback-scrolled');

export default test;
