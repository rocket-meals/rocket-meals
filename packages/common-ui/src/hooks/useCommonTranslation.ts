import { getLocales } from 'expo-localization';
import { useMemo } from 'react';
import translations from '../locales/translations.json';
import type { CommonUITranslationKeys } from '../locales/keys';

type SupportedLanguage = 'de' | 'en';

/** Returns the best-matching supported language based on the device locale. */
function detectLanguage(): SupportedLanguage {
	try {
		const locales = getLocales();
		for (const locale of locales) {
			const lang = locale.languageCode ?? '';
			if (lang === 'de') return 'de';
			if (lang === 'en') return 'en';
		}
	} catch {
		// Fallback to English when locale detection fails
	}
	return 'en';
}

const language: SupportedLanguage = detectLanguage();

/**
 * Returns a `translate` function that resolves a {@link CommonUITranslationKeys}
 * key to the localised string for the detected device language.
 *
 * The language is resolved once at module load time (device locale does not
 * change while the app is running).
 */
export function useCommonTranslation() {
	const translate = useMemo(() => {
		return (key: CommonUITranslationKeys): string => {
			const entry = (translations as Record<string, Record<string, string>>)[key];
			if (!entry) return key;
			return entry[language] ?? entry['en'] ?? key;
		};
	}, []);

	return { translate, language };
}
