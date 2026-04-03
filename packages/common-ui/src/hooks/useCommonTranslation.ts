import { useLanguageContext } from '../context/LanguageContext';
import translations from '../locales/translations.json';
import { CommonUITranslationKeys } from '../locales/keys';

/**
 * Hook for translating {@link CommonUITranslationKeys} within common-ui
 * components.
 *
 * It reads the current language from {@link useLanguageContext}.  When no
 * {@link LanguageProvider} is present in the tree (e.g. during isolated
 * component tests), it gracefully falls back to German (`'de'`).
 *
 * @example
 * ```tsx
 * const { translate } = useCommonTranslation();
 * <Text>{translate(CommonUITranslationKeys.cancel)}</Text>
 * ```
 */
export function useCommonTranslation() {
	const ctx = useLanguageContext();
	const language = ctx?.language ?? 'de';

	const translate = (key: CommonUITranslationKeys): string => {
		const entry = (translations as Record<string, Record<string, string>>)[key];
		if (!entry) return key;
		return entry[language] ?? entry['de'] ?? key;
	};

	return { translate, language };
}
