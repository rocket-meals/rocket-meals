import { File, Paths } from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlayerInformation = {
	/**
	 * H3 cell index of the tile the player has set as their home.
	 * Null when no home has been set yet.
	 */
	homeHexTile: string | null;
};

// ─── Persistence ─────────────────────────────────────────────────────────────

function getPlayerInformationFile(): File {
	return new File(Paths.document, 'geonexia-player-information.json');
}

/**
 * Persist player information to disk.
 * Silently ignores write errors to avoid crashing on storage failures.
 */
export function savePlayerInformation(info: PlayerInformation): void {
	try {
		getPlayerInformationFile().write(JSON.stringify(info));
	} catch (err) {
		console.warn('[PlayerInformationStorage] Failed to save player information:', err);
	}
}

/**
 * Load player information from disk.
 * Returns default values when the file does not exist or cannot be parsed.
 */
export async function loadPlayerInformation(): Promise<PlayerInformation> {
	try {
		const file = getPlayerInformationFile();
		if (!file.exists) return { homeHexTile: null };
		const content = await file.text();
		const parsed = JSON.parse(content) as Partial<PlayerInformation>;
		return {
			homeHexTile: typeof parsed.homeHexTile === 'string' ? parsed.homeHexTile : null,
		};
	} catch {
		return { homeHexTile: null };
	}
}
