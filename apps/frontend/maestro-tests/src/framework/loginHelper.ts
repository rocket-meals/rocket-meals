/**
 * loginHelper.ts – Shared helper that performs the anonymous login flow.
 *
 * Many Maestro tests require the user to be logged in (anonymously) and past
 * the onboarding screens.  This helper encapsulates the common steps so that
 * each test file stays concise.
 */

import { MaestroTestCase } from './MaestroTestCase';
import { TranslationKeys } from '../../../app/locales/keys';
import translations from '../../../app/locales/translations.json';
import { TestIds } from '../../../app/constants/TestIds';

/** Return the translation for the given key (defaults to German). */
export function t(key: TranslationKeys, lang: string = 'de'): string {
	const value = (translations[key as keyof typeof translations] as Record<string, string>)?.[lang];
	if (!value) {
		console.warn(
			`Warning: No translation found for key "${key}" in language "${lang}". ` +
				`The raw key will be used, which will likely cause test failures.`,
		);
	}
	return value ?? String(key);
}

/**
 * Perform anonymous login: accept privacy policy, tap "Continue without account",
 * confirm the attention dialog, and wait for the canteen selection screen.
 */
export function performAnonymousLogin(test: MaestroTestCase): MaestroTestCase {
	return test
		.openPage('http://localhost:8081/rocket-meals/')
		.waitForAnimationToEnd()
		// Accept privacy policy
		.tapOn(t(TranslationKeys.i_accept_privacy_policy_and_terms_of_service))
		// Tap "Continue without account"
		.tapOn(t(TranslationKeys.continue_without_account))
		// Confirm attention dialog
		.waitForAnimationToEnd()
		.assertVisible(t(TranslationKeys.attention))
		.tapOn(t(TranslationKeys.confirm))
		// Wait for canteen selection screen
		.waitForAnimationToEnd();
}

/**
 * After login, select the first available canteen to proceed past the
 * canteen selection screen into the main app.
 * Uses accessibility label matching since the canteen cards use
 * accessibilityLabel={translate(select) + ' ' + canteenAlias}.
 */
export function selectFirstCanteen(test: MaestroTestCase): MaestroTestCase {
	return test
		.assertVisible(t(TranslationKeys.please_select_your_canteen))
		.scroll()
		.tapOnId(`${t(TranslationKeys.select)}.*`)
		.waitForAnimationToEnd();
}

/**
 * Tap the side-navigation (hamburger) button.
 * Uses the stable testID instead of a localised text string so the step
 * does not break when the app language changes.
 */
export function openDrawer(test: MaestroTestCase): MaestroTestCase {
	return test.tapOnId(TestIds.OPEN_DRAWER_BUTTON).waitForAnimationToEnd();
}
