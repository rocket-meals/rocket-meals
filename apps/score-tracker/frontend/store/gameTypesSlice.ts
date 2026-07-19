import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MathHelper } from 'repo-depkit-common';
import type { GameType, ScoringMode } from '../helpers/GameTypesStorage';
import { DEFAULT_GAME_TYPE_ICON } from '../helpers/GameTypesStorage';
import type { GamePreset, GameRules, StartingPlayerMode } from '../helpers/GameRules';
export type { GameType, ScoringMode };

// ─── State type ───────────────────────────────────────────────────────────────

export type GameTypesSliceState = {
	gameTypes: GameType[];
};

const initialState: GameTypesSliceState = {
	gameTypes: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
	return Date.now().toString(36) + MathHelper.randomBase36String(6);
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const gameTypesSlice = createSlice({
	name: 'gameTypes',
	initialState,
	reducers: {
		/** Load persisted game types from disk. Called once at startup. */
		loadGameTypes(state, action: PayloadAction<GameType[]>) {
			state.gameTypes = action.payload;
		},

		/** Create a new game type with a default icon and "high score wins" scoring. */
		addGameType: {
			reducer(state, action: PayloadAction<GameType>) {
				state.gameTypes.push(action.payload);
			},
			prepare(name: string) {
				const gameType: GameType = {
					id: generateId(),
					name,
					icon: DEFAULT_GAME_TYPE_ICON,
					scoringMode: 'highWins',
					maxRounds: null,
					maxScore: null,
					rules: null,
					startingPlayerMode: 'fixed',
					version: 1,
					createdAt: Date.now(),
				};
				return { payload: gameType };
			},
		},

		/** Create a new game type from an imported/preset template (e.g. "Flip Seven laden"). */
		addGameTypeFromPreset: {
			reducer(state, action: PayloadAction<GameType>) {
				state.gameTypes.push(action.payload);
			},
			prepare(preset: GamePreset) {
				const gameType: GameType = {
					id: generateId(),
					name: preset.name,
					icon: preset.icon,
					scoringMode: preset.scoringMode,
					maxRounds: preset.maxRounds ?? null,
					maxScore: preset.maxScore ?? null,
					rules: preset.rules ?? null,
					startingPlayerMode: preset.startingPlayerMode ?? 'fixed',
					version: preset.version ?? 1,
					createdAt: Date.now(),
				};
				return { payload: gameType };
			},
		},

		renameGameType(state, action: PayloadAction<{ gameTypeId: string; name: string }>) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (gameType) gameType.name = action.payload.name;
		},

		setGameTypeIcon(state, action: PayloadAction<{ gameTypeId: string; icon: string }>) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (gameType) gameType.icon = action.payload.icon;
		},

		setGameTypeScoringMode(state, action: PayloadAction<{ gameTypeId: string; scoringMode: ScoringMode }>) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (gameType) gameType.scoringMode = action.payload.scoringMode;
		},

		setGameTypeMaxRounds(state, action: PayloadAction<{ gameTypeId: string; maxRounds: number | null }>) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (gameType) gameType.maxRounds = action.payload.maxRounds;
		},

		setGameTypeMaxScore(state, action: PayloadAction<{ gameTypeId: string; maxScore: number | null }>) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (gameType) gameType.maxScore = action.payload.maxScore;
		},

		setGameTypeRules(state, action: PayloadAction<{ gameTypeId: string; rules: GameRules | null }>) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (gameType) gameType.rules = action.payload.rules;
		},

		setGameTypeStartingPlayerMode(
			state,
			action: PayloadAction<{ gameTypeId: string; startingPlayerMode: StartingPlayerMode }>,
		) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (gameType) gameType.startingPlayerMode = action.payload.startingPlayerMode;
		},

		setGameTypeVersion(state, action: PayloadAction<{ gameTypeId: string; version: number }>) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (gameType) gameType.version = action.payload.version;
		},

		/**
		 * Overwrite an existing game type's content (everything but its id/
		 * createdAt) from a parsed preset - used by the "Code bearbeiten" JSON
		 * editor to apply hand-edited JSON in place.
		 */
		updateGameTypeFromPreset(state, action: PayloadAction<{ gameTypeId: string; preset: GamePreset }>) {
			const gameType = state.gameTypes.find((g) => g.id === action.payload.gameTypeId);
			if (!gameType) return;
			const { preset } = action.payload;
			gameType.name = preset.name;
			gameType.icon = preset.icon;
			gameType.scoringMode = preset.scoringMode;
			gameType.maxRounds = preset.maxRounds ?? null;
			gameType.maxScore = preset.maxScore ?? null;
			gameType.rules = preset.rules ?? null;
			gameType.startingPlayerMode = preset.startingPlayerMode ?? 'fixed';
			gameType.version = preset.version ?? 1;
		},

		removeGameType(state, action: PayloadAction<string>) {
			state.gameTypes = state.gameTypes.filter((g) => g.id !== action.payload);
		},
	},
});

export const {
	loadGameTypes,
	addGameType,
	addGameTypeFromPreset,
	renameGameType,
	setGameTypeIcon,
	setGameTypeScoringMode,
	setGameTypeMaxRounds,
	setGameTypeMaxScore,
	setGameTypeRules,
	setGameTypeStartingPlayerMode,
	setGameTypeVersion,
	updateGameTypeFromPreset,
	removeGameType,
} = gameTypesSlice.actions;
export default gameTypesSlice.reducer;
