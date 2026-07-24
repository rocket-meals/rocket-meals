import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MAP_OFFLINE_ENABLED_DEFAULT } from '../helpers/MapOfflineStorage';

// ─── State type ───────────────────────────────────────────────────────────────

export type MapOfflineSliceState = {
	/** Whether map resources (tiles, style, glyphs, sprites) are cached in SQLite. */
	enabled: boolean;
};

const initialState: MapOfflineSliceState = {
	enabled: MAP_OFFLINE_ENABLED_DEFAULT,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const mapOfflineSlice = createSlice({
	name: 'mapOffline',
	initialState,
	reducers: {
		/**
		 * Enable or disable the offline map cache. Persisted to disk by the store
		 * subscriber. Deleting the cached data on disable is handled by the caller
		 * (settings screen) via deleteAllMapTiles().
		 */
		setMapOfflineEnabled(state, action: PayloadAction<boolean>) {
			state.enabled = action.payload;
		},

		/**
		 * Load the persisted offline-maps flag from disk. Called once at app startup.
		 */
		loadMapOfflineEnabled(state, action: PayloadAction<boolean>) {
			state.enabled = action.payload;
		},
	},
});

export const { setMapOfflineEnabled, loadMapOfflineEnabled } = mapOfflineSlice.actions;
export default mapOfflineSlice.reducer;
