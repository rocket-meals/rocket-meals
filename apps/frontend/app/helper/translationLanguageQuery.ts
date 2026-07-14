import { configureStore } from '@/redux/store';

// getDirectusTranslation() in resourceHelper falls back to English and then German when
// the requested language has no entry. These base codes must therefore always be fetched
// alongside the user's language, otherwise the client-side fallback finds nothing.
const FALLBACK_BASE_LANGUAGE_CODES = ['en', 'de'];

// Server-side filter so collections only ship the translations the app can actually
// display (current language + fallback languages) instead of all 8+ languages. This keeps
// the redux-persist snapshot small enough for localStorage/AsyncStorage limits.
export function getTranslationsLanguageFilter() {
	const language = configureStore.getState()?.settings?.language || 'de';
	const baseCodes = Array.from(new Set([language, ...FALLBACK_BASE_LANGUAGE_CODES]));
	// languages_code is stored as a locale ("de-DE"), the app language as a base code ("de")
	return { _or: baseCodes.map((code) => ({ languages_code: { _starts_with: code } })) };
}

// Builds a Directus "deep" query filtering the given translations relations by language.
// Paths are the full path to a translations relation, e.g. 'translations',
// 'food.translations' or 'housing_translations'. Defaults to the top-level 'translations'.
export function buildTranslationsDeep(...translationPaths: string[]): Record<string, any> {
	const paths = translationPaths.length > 0 ? translationPaths : ['translations'];
	const deep: Record<string, any> = {};
	for (const path of paths) {
		let node = deep;
		for (const segment of path.split('.')) {
			node[segment] = node[segment] || {};
			node = node[segment];
		}
		node._filter = getTranslationsLanguageFilter();
	}
	return deep;
}
