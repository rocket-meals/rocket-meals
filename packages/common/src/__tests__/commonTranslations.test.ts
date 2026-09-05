/**
 * Data-integrity tests for the shared translation catalogue.
 *
 * These are the tests that keep "every translation key has a translation in every language"
 * true for the shared vocabulary. The per-app catalogues run the same checks in their own
 * test suites, against their own key set.
 */

import {
	ALL_COMMON_TRANSLATION_KEYS,
	CommonTranslationKeys,
} from '../translations/CommonTranslationKeys';
import { commonTranslations } from '../translations/commonTranslations';
import { createTranslator, toI18nextResources } from '../translations/TranslationHelper';
import { ALL_TRANSLATION_LANGUAGES, TranslationLanguage } from '../translations/TranslationLanguage';
import {
	findInvalidKeyDeclarations,
	findSuspectedApostropheTruncations,
	formatTranslationValidationReport,
	validateTranslations,
} from '../translations/TranslationValidationHelper';

/**
 * The measurement unit symbols. They are exempt from two of the guards below: they are the
 * same string in every latin-script language, and "l" looks like a French elision to the
 * apostrophe check.
 */
const MEASUREMENT_UNIT_KEYS = [
	CommonTranslationKeys.unit_gram,
	CommonTranslationKeys.unit_kilogram,
	CommonTranslationKeys.unit_liter,
	CommonTranslationKeys.unit_milliliter,
];

describe('CommonTranslationKeys', () => {
	it('declares every key with its own name as the value', () => {
		expect(findInvalidKeyDeclarations(CommonTranslationKeys)).toEqual([]);
	});

	it('exposes the same keys through ALL_COMMON_TRANSLATION_KEYS', () => {
		expect([...ALL_COMMON_TRANSLATION_KEYS].sort()).toEqual(Object.values(CommonTranslationKeys).sort());
	});

	it('uses only key names that are safe in a JSON catalogue and in code', () => {
		for (const key of ALL_COMMON_TRANSLATION_KEYS) {
			expect(key).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
		}
	});

	it('is not empty – a regression guard against a broken generator', () => {
		expect(ALL_COMMON_TRANSLATION_KEYS.length).toBeGreaterThan(100);
	});
});

describe('commonTranslations', () => {
	it('has a non-empty text for every key in every supported language', () => {
		const report = validateTranslations({
			keys: [...ALL_COMMON_TRANSLATION_KEYS],
			resources: commonTranslations,
			languages: ALL_TRANSLATION_LANGUAGES,
			keyDeclarations: CommonTranslationKeys,
		});
		expect(formatTranslationValidationReport(report)).toBe('No translation problems found.');
		expect(report.isValid).toBe(true);
	});

	it('contains no text cut off at an apostrophe', () => {
		// A converter once read the texts as single-quoted strings and stopped at the first
		// unescaped apostrophe, leaving French fragments like "Aujourd" and "jusqu".
		// The unit symbols are exempt: "l" for litre is a whole text here, not the French
		// elided article the check looks for.
		expect(findSuspectedApostropheTruncations({ resources: commonTranslations, ignoredKeys: MEASUREMENT_UNIT_KEYS })).toEqual([]);
	});

	it('contains no text that is only whitespace or a leftover placeholder', () => {
		for (const key of ALL_COMMON_TRANSLATION_KEYS) {
			for (const language of ALL_TRANSLATION_LANGUAGES) {
				const text = commonTranslations[key]?.[language];
				expect(text).toBeDefined();
				expect(text?.trim()).not.toBe('');
				expect(text).not.toContain('{{');
			}
		}
	});

	it('has no key whose text is the raw key in every language', () => {
		// A key that reads the same in all eight languages was pasted, not translated.
		// `April`/`Jan`/... legitimately equal their key in some languages, hence "in every".
		const untranslated = ALL_COMMON_TRANSLATION_KEYS.filter((key) =>
			ALL_TRANSLATION_LANGUAGES.every((language) => commonTranslations[key]?.[language] === key),
		);
		expect(untranslated).toEqual([]);
	});

	it('resolves every key in every language without hitting the missing-translation fallback', () => {
		for (const language of ALL_TRANSLATION_LANGUAGES) {
			const onMissingTranslation = jest.fn().mockReturnValue('');
			const translate = createTranslator({ resources: commonTranslations, language, onMissingTranslation });
			for (const key of ALL_COMMON_TRANSLATION_KEYS) {
				expect(translate(key).length).toBeGreaterThan(0);
			}
			expect(onMissingTranslation).not.toHaveBeenCalled();
		}
	});

	it('produces an i18next bundle covering every language and key', () => {
		const i18nextResources = toI18nextResources(commonTranslations);
		expect(Object.keys(i18nextResources).sort()).toEqual([...ALL_TRANSLATION_LANGUAGES].sort());
		for (const language of ALL_TRANSLATION_LANGUAGES) {
			expect(Object.keys(i18nextResources[language] ?? {}).length).toBe(ALL_COMMON_TRANSLATION_KEYS.length);
		}
	});

	it('keeps German and English apart – a copied English text is usually an untranslated one', () => {
		const identical = ALL_COMMON_TRANSLATION_KEYS.filter((key) => {
			const entry = commonTranslations[key];
			return entry?.de !== undefined && entry.de === entry.en;
		});
		// Month names and loanwords that genuinely read the same in both languages.
		// A new key showing up here means somebody added an English text as the German one.
		expect(identical.sort()).toEqual(
			[
				CommonTranslationKeys.Apr,
				CommonTranslationKeys.April,
				CommonTranslationKeys.Aug,
				CommonTranslationKeys.August,
				CommonTranslationKeys.Feb,
				CommonTranslationKeys.Jan,
				CommonTranslationKeys.Jul,
				CommonTranslationKeys.Jun,
				CommonTranslationKeys.Nov,
				CommonTranslationKeys.November,
				CommonTranslationKeys.Sep,
				CommonTranslationKeys.September,
				CommonTranslationKeys.account,
				CommonTranslationKeys.feedback,
				CommonTranslationKeys.no_value,
				CommonTranslationKeys.okay,
				CommonTranslationKeys.optional,
				CommonTranslationKeys.support,
				CommonTranslationKeys.updates,
				// Unit symbols: "g", "kg", "ml" and "l" are the SI symbols and identical in
				// every language that writes them in latin script.
				...MEASUREMENT_UNIT_KEYS,
			].sort(),
		);
	});
});

describe('shared vocabulary contract', () => {
	it('covers the generic actions a new app needs on day one', () => {
		for (const key of [
			CommonTranslationKeys.save,
			CommonTranslationKeys.cancel,
			CommonTranslationKeys.delete,
			CommonTranslationKeys.edit,
			CommonTranslationKeys.search,
			CommonTranslationKeys.error,
			CommonTranslationKeys.loading,
		]) {
			expect(commonTranslations[key]?.[TranslationLanguage.DE]).toBeTruthy();
		}
	});

	it('covers all weekday and month names', () => {
		const weekdays = [
			CommonTranslationKeys.Mon,
			CommonTranslationKeys.Tue,
			CommonTranslationKeys.Wed,
			CommonTranslationKeys.Thu,
			CommonTranslationKeys.Fri,
			CommonTranslationKeys.Sat,
			CommonTranslationKeys.Sun,
		];
		const months = [
			CommonTranslationKeys.January,
			CommonTranslationKeys.February,
			CommonTranslationKeys.March,
			CommonTranslationKeys.April,
			CommonTranslationKeys.May,
			CommonTranslationKeys.June,
			CommonTranslationKeys.July,
			CommonTranslationKeys.August,
			CommonTranslationKeys.September,
			CommonTranslationKeys.October,
			CommonTranslationKeys.November,
			CommonTranslationKeys.December,
		];
		expect(weekdays).toHaveLength(7);
		expect(months).toHaveLength(12);
		for (const key of [...weekdays, ...months]) {
			expect(commonTranslations[key]?.[TranslationLanguage.EN]).toBeTruthy();
		}
	});
});
