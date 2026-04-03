import { File, Paths } from 'expo-file-system';

export type SupportedLanguage = 'de' | 'en';

function getLanguageFile(): File {
	return new File(Paths.document, 'geonexia-language.json');
}

/**
 * Persist the selected language to disk.
 * Silently ignores write errors to avoid crashing on storage failures.
 */
export function saveLanguage(lang: SupportedLanguage): void {
	try {
		getLanguageFile().write(JSON.stringify({ language: lang }));
	} catch (err) {
		console.warn('[LanguageStorage] Failed to save language:', err);
	}
}

/**
 * Load the persisted language from disk.
 * Returns `null` when no file exists (caller should fall back to device locale).
 */
export async function loadLanguage(): Promise<SupportedLanguage | null> {
	try {
		const file = getLanguageFile();
		if (!file.exists) return null;
		const content = await file.text();
		const parsed = JSON.parse(content) as { language?: SupportedLanguage };
		const lang = parsed.language;
		if (lang === 'de' || lang === 'en') return lang;
		return null;
	} catch {
		return null;
	}
}
