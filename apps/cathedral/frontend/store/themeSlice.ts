import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode } from '../helpers/ThemeStorage';
export type { ThemeMode };

// ─── State type ───────────────────────────────────────────────────────────────

export type ThemeSliceState = {
	selectedMode: ThemeMode;
};

const initialState: ThemeSliceState = {
	selectedMode: 'systematic',
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const themeSlice = createSlice({
	name: 'theme',
	initialState,
	reducers: {
		setThemeMode(state, action: PayloadAction<ThemeMode>) {
			state.selectedMode = action.payload;
		},
		loadThemeMode(state, action: PayloadAction<ThemeMode>) {
			state.selectedMode = action.payload;
		},
	},
});

export const { setThemeMode, loadThemeMode } = themeSlice.actions;
export default themeSlice.reducer;
