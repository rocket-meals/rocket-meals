import { File, Paths } from 'expo-file-system';

export type ThemeMode = 'light' | 'dark' | 'systematic';

function getThemeFile(): File {
	return new File(Paths.document, 'cathedral-theme.json');
}

/**
 * Persist the selected theme mode to disk.
 * Silently ignores write errors to avoid crashing on storage failures.
 */
export function saveThemeMode(mode: ThemeMode): void {
	try {
		getThemeFile().write(JSON.stringify({ mode }));
	} catch (err) {
		console.warn('[ThemeStorage] Failed to save theme mode:', err);
	}
}

/**
 * Load the persisted theme mode from disk.
 * Returns 'systematic' as the default when no file exists or on parse errors.
 */
export async function loadThemeMode(): Promise<ThemeMode> {
	try {
		const file = getThemeFile();
		if (!file.exists) return 'systematic';
		const content = await file.text();
		const parsed = JSON.parse(content) as { mode?: ThemeMode };
		const mode = parsed.mode;
		if (mode === 'light' || mode === 'dark' || mode === 'systematic') return mode;
		return 'systematic';
	} catch {
		return 'systematic';
	}
}
