import { File, Paths } from 'expo-file-system';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Player = {
	id: string;
	name: string;
	color: string;
};

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
			// Migrate old players without a color field
			const FALLBACK_COLORS = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#9333ea', '#0891b2', '#e11d48', '#4f46e5'];
			for (let i = 0; i < parsed.players.length; i++) {
				if (!parsed.players[i].color) {
					parsed.players[i].color = FALLBACK_COLORS[i % FALLBACK_COLORS.length];
				}
			}
			return parsed;
		}
		return { players: [], rounds: [] };
	} catch {
		return { players: [], rounds: [] };
	}
}
