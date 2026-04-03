import { useMemo } from 'react';
import translations from '../locales/translations.json';
import type { CommonUITranslationKeys } from '../locales/keys';
import { useLanguageContext } from '../context/LanguageContext';

/**
 * Returns a `translate` function that resolves a {@link CommonUITranslationKeys}
 * key to the localised string for the currently active language.
 *
 * The active language is read from the nearest {@link LanguageProvider}. When
 * no provider is present the context default (`'en'`) is used. The translate
 * function updates whenever the language changes, so the hook is fully reactive
 * to runtime language switches.
 */
export function useCommonTranslation() {
	const { language } = useLanguageContext();

	const translate = useMemo(() => {
		return (key: CommonUITranslationKeys): string => {
			const entry = (translations as Record<string, Record<string, string>>)[key];
			if (!entry) return key;
			return entry[language] ?? entry['en'] ?? key;
		};
	}, [language]);

	return { translate, language };
}
