import { File, Paths } from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Player = {
	id: string;
	name: string;
	color: string;
};

export const PLAYER_COLORS = [
	'#2563eb', // blue
	'#dc2626', // red
	'#16a34a', // green
	'#ea580c', // orange
	'#9333ea', // purple
	'#0891b2', // cyan
	'#ca8a04', // yellow
	'#db2777', // pink
];

export type Round = {
	id: string;
	scores: Record<string, number | null>; // playerId → score (null = not entered)
};

export type GameState = {
	players: Player[];
	rounds: Round[];
};

// ─── File access ──────────────────────────────────────────────────────────────

function getGameFile(): File {
	return new File(Paths.document, 'score-tracker-game.json');
}

/**
 * Persist game state to disk.
 */
export function saveGameState(state: GameState): void {
	try {
		getGameFile().write(JSON.stringify(state));
	} catch (err) {
		console.warn('[GameStorage] Failed to save game state:', err);
	}
}

/**
 * Load persisted game state from disk.
 */
export async function loadGameState(): Promise<GameState> {
	try {
		const file = getGameFile();
		if (!file.exists) return { players: [], rounds: [] };
		const content = await file.text();
		const parsed = JSON.parse(content) as GameState;
		if (Array.isArray(parsed.players) && Array.isArray(parsed.rounds)) {
			return parsed;
		}
		return { players: [], rounds: [] };
	} catch {
		return { players: [], rounds: [] };
	}
}
