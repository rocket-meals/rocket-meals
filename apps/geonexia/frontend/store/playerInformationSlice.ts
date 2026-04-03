import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { PlayerInformation } from '../helpers/PlayerInformationStorage';

// ─── State type ───────────────────────────────────────────────────────────────

export type PlayerInformationState = {
	/** H3 cell index of the tile set as the player's home, or null when not set. */
	homeHexTile: string | null;
};

const initialState: PlayerInformationState = {
	homeHexTile: null,
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const playerInformationSlice = createSlice({
	name: 'playerInformation',
	initialState,
	reducers: {
		/**
		 * Set the player's home hex tile.
		 * Pass null to clear the home location.
		 */
		setHomeHexTile(state, action: PayloadAction<string | null>) {
			state.homeHexTile = action.payload;
		},

		/**
		 * Replace the entire state with data loaded from persistent storage.
		 */
		loadPersistedPlayerInformation(state, action: PayloadAction<PlayerInformation>) {
			state.homeHexTile = action.payload.homeHexTile;
		},
	},
});

export const { setHomeHexTile, loadPersistedPlayerInformation } = playerInformationSlice.actions;
export default playerInformationSlice.reducer;
