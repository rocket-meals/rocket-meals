/**
 * Guards the Rocket Meals translation catalogue.
 *
 * Every key the app declares must resolve to a real text in **all** supported languages, and
 * every text in the catalogue must belong to a declared key. Without this test a missing
 * translation only shows up as a raw key like `friendships_qr_hint` on a user's screen.
 */

import {
	ALL_TRANSLATION_LANGUAGES,
	CommonTranslationKeys,
	commonTranslations,
	createTranslator,
	findInvalidKeyDeclarations,
	findSuspectedApostropheTruncations,
	formatTranslationValidationReport,
	toI18nextResources,
	validateTranslations,
	type TranslationLanguage,
} from 'repo-depkit-common';
import appTranslations from '../locales/translations.json';
import { ALL_TRANSLATION_KEYS, TranslationKeys } from '../locales/keys';
import { SUPPORTED_TRANSLATION_LANGUAGES, translationResources } from '../locales/translationResources';

/**
 * Historic keys whose value differs from their declared name. New keys must not do this –
 * `name: 'name'` is what makes a key greppable across the codebase.
 */
const LEGACY_KEY_NAME_MISMATCHES = [
	"Food_Plan_Week = 'FoodPlan:Week' (value must equal the key name)",
	"food_Plan_Day = 'foodPlanDay' (value must equal the key name)",
	"Food_Plan_List = 'FoodPlan:List' (value must equal the key name)",
];

describe('TranslationKeys', () => {
	it('inherits every shared key from repo-depkit-common', () => {
		for (const commonKey of Object.values(CommonTranslationKeys)) {
			expect(ALL_TRANSLATION_KEYS).toContain(commonKey);
		}
	});

	it('only restates a shared key when the app really needs a different wording', () => {
		// Overriding a shared key is allowed (mergeTranslationResources lets app texts win),
		// but restating the identical text is dead duplication that drifts apart over time.
		const pointlessOverrides = Object.values(CommonTranslationKeys).filter((key) => {
			const appEntry = (appTranslations as Record<string, Record<string, string>>)[key];
			if (appEntry === undefined) return false;
			return Object.entries(appEntry).every(([language, text]) => commonTranslations[key]?.[language as TranslationLanguage] === text);
		});
		expect(pointlessOverrides).toEqual([]);
	});

	it('declares every key with its own name as the value', () => {
		expect(findInvalidKeyDeclarations(TranslationKeys)).toEqual(LEGACY_KEY_NAME_MISMATCHES);
	});

	it('declares no key twice', () => {
		expect(new Set(ALL_TRANSLATION_KEYS).size).toBe(ALL_TRANSLATION_KEYS.length);
	});
});

describe('translation catalogue', () => {
	it('has a text for every key in every supported language', () => {
		const report = validateTranslations({
			keys: [...ALL_TRANSLATION_KEYS],
			resources: translationResources,
			languages: SUPPORTED_TRANSLATION_LANGUAGES,
		});
		expect(formatTranslationValidationReport(report)).toBe('No translation problems found.');
		expect(report.isValid).toBe(true);
	});

	it('ships translations for all eight app languages', () => {
		expect([...SUPPORTED_TRANSLATION_LANGUAGES].sort()).toEqual([...ALL_TRANSLATION_LANGUAGES].sort());
	});

	it('contains no text that is only whitespace', () => {
		for (const key of ALL_TRANSLATION_KEYS) {
			for (const language of SUPPORTED_TRANSLATION_LANGUAGES) {
				expect(translationResources[key]?.[language]?.trim()).toBeTruthy();
			}
		}
	});

	it('contains no text cut off at an apostrophe', () => {
		// A converter once read the texts as single-quoted strings and stopped at the first
		// unescaped apostrophe, leaving French fragments like "Copier l" and "J".
		// The shared unit symbols are exempt: "l" for litre is a whole text, not an elision.
		expect(
			findSuspectedApostropheTruncations({
				resources: translationResources,
				languages: SUPPORTED_TRANSLATION_LANGUAGES,
				ignoredKeys: [
					CommonTranslationKeys.unit_gram,
					CommonTranslationKeys.unit_kilogram,
					CommonTranslationKeys.unit_liter,
					CommonTranslationKeys.unit_milliliter,
				],
			}),
		).toEqual([]);
	});

	it('resolves every key without falling back to the raw key', () => {
		for (const language of SUPPORTED_TRANSLATION_LANGUAGES) {
			const onMissingTranslation = jest.fn().mockReturnValue('');
			const translate = createTranslator({ resources: translationResources, language, onMissingTranslation });
			for (const key of ALL_TRANSLATION_KEYS) {
				expect(translate(key).length).toBeGreaterThan(0);
			}
			expect(onMissingTranslation).not.toHaveBeenCalled();
		}
	});

	it('builds an i18next bundle with every key in every language', () => {
		const i18nextResources = toI18nextResources(translationResources);
		expect(Object.keys(i18nextResources).sort()).toEqual([...SUPPORTED_TRANSLATION_LANGUAGES].sort());
		for (const language of SUPPORTED_TRANSLATION_LANGUAGES) {
			for (const key of ALL_TRANSLATION_KEYS) {
				expect(i18nextResources[language]?.[key]).toBeTruthy();
			}
		}
	});
});
