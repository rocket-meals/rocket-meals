import { configureStore } from '@reduxjs/toolkit';
import themeReducer from './themeSlice';
import gameReducer from './gameSlice';
import { saveThemeMode } from '../helpers/ThemeStorage';
import { saveGameState } from '../helpers/GameStorage';
import type { ThemeMode } from './themeSlice';
import type { GameSliceState } from './gameSlice';

// ─── Store ────────────────────────────────────────────────────────────────────

export const store = configureStore({
	reducer: {
		theme: themeReducer,
		game: gameReducer,
	},
});

// ─── Auto-persist ─────────────────────────────────────────────────────────────

let _lastSavedThemeMode: ThemeMode | null = null;
let _gameTimer: ReturnType<typeof setTimeout> | null = null;
let _lastSavedGame: GameSliceState | null = null;

store.subscribe(() => {
	const state = store.getState();

	const { selectedMode } = state.theme;
	if (selectedMode !== _lastSavedThemeMode) {
		_lastSavedThemeMode = selectedMode;
		saveThemeMode(selectedMode);
	}

	const game = state.game;
	if (game !== _lastSavedGame) {
		_lastSavedGame = game;
		if (_gameTimer) clearTimeout(_gameTimer);
		_gameTimer = setTimeout(() => {
			saveGameState(game);
			_gameTimer = null;
		}, 300);
	}
});

// ─── Type helpers ─────────────────────────────────────────────────────────────

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
