import { File, Paths } from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single TTS log entry capturing what was spoken (or attempted) and whether
 * it succeeded.
 */
export type TTSLogEntry = {
	/** Unix timestamp (ms) when the speech attempt occurred */
	timestamp: number;
	/** The text that was to be spoken */
	text: string;
	/** Language code passed to expo-speech */
	languageCode: string;
	/** Whether the speech call succeeded */
	success: boolean;
	/** Error message if the speech call failed */
	error?: string;
	/** Label describing the source of the announcement (e.g. "km_milestone", "periodic", "pace_hint", "background") */
	source: string;
};

// ─── Storage ──────────────────────────────────────────────────────────────────

/** Maximum number of log entries to keep in storage to avoid unbounded growth. */
const MAX_LOG_ENTRIES = 500;

function getLogFile(): File {
	return new File(Paths.document, 'geonexia-tts-log.json');
}

/**
 * Load all TTS log entries from disk. Returns an empty array when the file does
 * not yet exist or cannot be parsed.
 */
export async function loadTTSLog(): Promise<TTSLogEntry[]> {
	try {
		const file = getLogFile();
		if (!file.exists) return [];
		const content = await file.text();
		const entries = JSON.parse(content);
		if (!Array.isArray(entries)) return [];
		return entries as TTSLogEntry[];
	} catch {
		return [];
	}
}

/**
 * Append a single TTS log entry to disk. Older entries beyond
 * {@link MAX_LOG_ENTRIES} are trimmed.
 * Silently ignores write errors.
 */
export async function appendTTSLogEntry(entry: TTSLogEntry): Promise<void> {
	try {
		const existing = await loadTTSLog();
		existing.push(entry);
		// Keep only the newest entries to avoid unbounded growth.
		const trimmed = existing.length > MAX_LOG_ENTRIES
			? existing.slice(existing.length - MAX_LOG_ENTRIES)
			: existing;
		getLogFile().write(JSON.stringify(trimmed));
	} catch (err) {
		console.warn('[TTSLogStorage] Failed to append log entry:', err);
	}
}

/**
 * Clear all TTS log entries from disk.
 * Silently ignores errors.
 */
export function clearTTSLog(): void {
	try {
		const file = getLogFile();
		if (file.exists) file.delete();
	} catch (err) {
		console.warn('[TTSLogStorage] Failed to clear TTS log:', err);
	}
}
