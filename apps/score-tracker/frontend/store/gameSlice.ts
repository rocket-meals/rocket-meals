import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Player, Round, GameState } from '../helpers/GameStorage';
import { PLAYER_COLORS } from '../helpers/GameStorage';
export type { Player, Round, GameState };

// ─── State type ───────────────────────────────────────────────────────────────

export type GameSliceState = {
	players: Player[];
	rounds: Round[];
};

const initialState: GameSliceState = {
	players: [],
	rounds: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
	return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const gameSlice = createSlice({
	name: 'game',
	initialState,
	reducers: {
		/** Load persisted game state from disk. Called once at startup. */
		loadGameState(_state, action: PayloadAction<GameState>) {
			const players = action.payload.players.map((p, i) => ({
				...p,
				color: p.color || PLAYER_COLORS[i % PLAYER_COLORS.length],
			}));
			return { players, rounds: action.payload.rounds };
		},

		/** Add a new player with a default name. */
		addPlayer(state) {
			const playerNumber = state.players.length + 1;
			const color = PLAYER_COLORS[state.players.length % PLAYER_COLORS.length];
			const newPlayer: Player = { id: generateId(), name: `Spieler ${playerNumber}`, color };
			state.players.push(newPlayer);
			// Add score slot for the new player in all existing rounds
			for (const round of state.rounds) {
				round.scores[newPlayer.id] = null;
			}
		},

		/** Rename a player. */
		renamePlayer(state, action: PayloadAction<{ playerId: string; name: string }>) {
			const player = state.players.find((p) => p.id === action.payload.playerId);
			if (player) {
				player.name = action.payload.name;
			}
		},

		/** Change a player's tile color. */
		setPlayerColor(state, action: PayloadAction<{ playerId: string; color: string }>) {
			const player = state.players.find((p) => p.id === action.payload.playerId);
			if (player) {
				player.color = action.payload.color;
			}
		},

		/** Remove a player and their scores from all rounds. */
		removePlayer(state, action: PayloadAction<string>) {
			state.players = state.players.filter((p) => p.id !== action.payload);
			for (const round of state.rounds) {
				delete round.scores[action.payload];
			}
		},

		/** Set the score for a player in a specific round. */
		setScore(state, action: PayloadAction<{ roundId: string; playerId: string; score: number | null }>) {
			const round = state.rounds.find((r) => r.id === action.payload.roundId);
			if (round) {
				round.scores[action.payload.playerId] = action.payload.score;
			}
		},

		/** Add a new round. */
		addRound(state) {
			const scores: Record<string, number | null> = {};
			for (const player of state.players) {
				scores[player.id] = null;
			}
			state.rounds.push({ id: generateId(), scores });
		},

		/** Reset all scores (keep players, clear rounds). */
		resetScores(state) {
			state.rounds = [];
		},

		/** Delete everything (players and rounds). */
		resetAll() {
			return { players: [], rounds: [] };
		},
	},
});

export const {
	loadGameState,
	addPlayer,
	renamePlayer,
	setPlayerColor,
	removePlayer,
	setScore,
	addRound,
	resetScores,
	resetAll,
} = gameSlice.actions;
export default gameSlice.reducer;
