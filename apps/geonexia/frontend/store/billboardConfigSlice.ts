import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { BillboardConfigState, SpriteAnchorOverride } from '../helpers/BillboardConfigStorage';

// ─── State type ───────────────────────────────────────────────────────────────

export type BillboardConfigSliceState = {
	/** Sprite index → anchor overrides (anchorX, anchorY). */
	spriteAnchors: BillboardConfigState;
};

const initialState: BillboardConfigSliceState = {
	spriteAnchors: {
		// castle2 (index 12) default config
		12: { scaleMultiplier: 0.6, anchorX: 0.5, anchorY: 0.65 },
	},
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const billboardConfigSlice = createSlice({
	name: 'billboardConfig',
	initialState,
	reducers: {
		/**
		 * Set the anchor override for a single sprite type.
		 * Preserves any existing scaleMultiplier override.
		 * All billboards of that type will use the new anchor values.
		 */
		setSpriteAnchor(
			state,
			action: PayloadAction<{ spriteIndex: number; anchorX: number; anchorY: number }>,
		) {
			const { spriteIndex, anchorX, anchorY } = action.payload;
			const existing = state.spriteAnchors[spriteIndex];
			state.spriteAnchors[spriteIndex] = {
				...existing,
				anchorX,
				anchorY,
			};
		},

		/**
		 * Set the per-sprite scale multiplier for a single sprite type.
		 * Preserves any existing anchor overrides.
		 */
		setSpriteScale(
			state,
			action: PayloadAction<{ spriteIndex: number; scaleMultiplier: number }>,
		) {
			const { spriteIndex, scaleMultiplier } = action.payload;
			const existing = state.spriteAnchors[spriteIndex];
			state.spriteAnchors[spriteIndex] = {
				...existing,
				scaleMultiplier,
			};
		},

		/**
		 * Reset a sprite's anchor and scale overrides (removes the entry entirely).
		 */
		resetSpriteAnchor(state, action: PayloadAction<{ spriteIndex: number }>) {
			delete state.spriteAnchors[action.payload.spriteIndex];
		},

		/**
		 * Replace the entire state with data loaded from persistent storage.
		 * Merges the loaded config on top of the default values so that
		 * sprites with defaults (e.g. castle2) are not lost when the user
		 * has not explicitly configured them.
		 */
		loadPersistedBillboardConfig(
			state,
			action: PayloadAction<BillboardConfigState>,
		) {
			state.spriteAnchors = { ...initialState.spriteAnchors, ...action.payload };
		},
	},
});

export const { setSpriteAnchor, setSpriteScale, resetSpriteAnchor, loadPersistedBillboardConfig } = billboardConfigSlice.actions;
export default billboardConfigSlice.reducer;
