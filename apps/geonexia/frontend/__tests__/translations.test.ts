/**
 * Guards the Geonexia translation catalogue.
 *
 * Every key the app declares must resolve to a real text in German and English, and every
 * text in the catalogue must belong to a declared key. Without this test a missing
 * translation only shows up as a raw key like `route_rename` on a user's screen.
 */

import {
	CommonTranslationKeys,
	commonTranslations,
	createTranslator,
	findInvalidKeyDeclarations,
	findSuspectedApostropheTruncations,
	formatTranslationValidationReport,
	validateTranslations,
	type TranslationLanguage,
} from 'repo-depkit-common';
import appTranslations from '../locales/translations.json';
import { ALL_GEONEXIA_TRANSLATION_KEYS, GeonexiaTranslationKeys } from '../locales/keys';
import { SUPPORTED_TRANSLATION_LANGUAGES, translationResources } from '../locales/translationResources';

describe('GeonexiaTranslationKeys', () => {
	it('inherits every shared key from repo-depkit-common', () => {
		for (const commonKey of Object.values(CommonTranslationKeys)) {
			expect(ALL_GEONEXIA_TRANSLATION_KEYS).toContain(commonKey);
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
		expect(findInvalidKeyDeclarations(GeonexiaTranslationKeys)).toEqual([]);
	});

	it('declares no key twice', () => {
		expect(new Set(ALL_GEONEXIA_TRANSLATION_KEYS).size).toBe(ALL_GEONEXIA_TRANSLATION_KEYS.length);
	});
});

describe('translation catalogue', () => {
	it('has a text for every key in every supported language', () => {
		const report = validateTranslations({
			keys: [...ALL_GEONEXIA_TRANSLATION_KEYS],
			resources: translationResources,
			languages: SUPPORTED_TRANSLATION_LANGUAGES,
		});
		expect(formatTranslationValidationReport(report)).toBe('No translation problems found.');
		expect(report.isValid).toBe(true);
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
			for (const key of ALL_GEONEXIA_TRANSLATION_KEYS) {
				expect(translate(key).length).toBeGreaterThan(0);
			}
			expect(onMissingTranslation).not.toHaveBeenCalled();
		}
	});
});
