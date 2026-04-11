import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HexTileRecord, BillboardAnchorPosition, computeHexTileLevel } from '../helpers/HexTileStorage';

// ─── Supporting types ─────────────────────────────────────────────────────────

/**
 * Per-tile customization data accepted by `applyMapCustomizations`.
 * Includes all mutable fields that can be imported/exported.
 */
export type HexTileCustomizationPayload = {
	tileImage?: string | null;
	/** @deprecated Use `billboards` instead. */
	billboard?: string | null;
	/** @deprecated Use `billboards` instead. */
	billboardAnchorColor?: string | null;
	billboards?: Record<string, string | null>;
	/** @deprecated Use `billboardsTexture` for flat anchor-positioned sprites. */
	billboardsFlat?: Record<string, boolean>;
	billboardsTexture?: Record<string, string | null>;
};

// ─── State type ───────────────────────────────────────────────────────────────

export type HexTileSliceState = {
	/** Map of H3 index → persistent record */
	records: Record<string, HexTileRecord>;
	/** Snapshot of tile levels at the start of the current run (transient, not persisted) */
	runStartLevels: Record<string, number>;
	/**
	 * Monotonically increasing counter that is bumped on every full data reset.
	 * Screens can watch this value to detect resets and refresh their map views.
	 */
	resetToken: number;
	/** Whether the app is currently using the dev-mode tile set instead of the real one. */
	isDevMode: boolean;
	/** Whether debug mode is active (shows debug button, coloring tool, etc.). */
	isDebugMode: boolean;
	/**
	 * Set of actual hex-to-hex transitions that occurred during walks, stored as
	 * "cellA:cellB" strings where cellA is lexicographically smaller than cellB.
	 * Used to draw spokes only between hexagons that were actually traversed
	 * consecutively, instead of connecting all adjacent walked-on hexagons.
	 */
	walkedEdges: string[];
};

const initialState: HexTileSliceState = {
	records: {},
	runStartLevels: {},
	resetToken: 0,
	isDevMode: false,
	isDebugMode: false,
	walkedEdges: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getOrCreate(records: Record<string, HexTileRecord>, h3Index: string): HexTileRecord {
	if (!records[h3Index]) {
		records[h3Index] = {
			h3Index,
			lastVisitedAt: null,
			lastEnclosedAt: null,
			visitCount: 0,
			enclosedCount: 0,
			level: 0,
			walkedOn: false,
		};
	}
	return records[h3Index];
}

// ─── Slice ────────────────────────────────────────────────────────────────────

const hexTileSlice = createSlice({
	name: 'hexTiles',
	initialState,
	reducers: {
		/**
		 * Snapshot the current tile levels at the start of a run.
		 * Used to ensure the tile level can increase by at most 1 per run.
		 */
		startRun(state) {
			state.runStartLevels = {};
			for (const [h3Index, rec] of Object.entries(state.records)) {
				state.runStartLevels[h3Index] = rec.level;
			}
		},

		/**
		 * Record that the user visited the given tiles during a run.
		 * Each tile is dispatched at most once per run (enforced in the recording
		 * screen), so visitCount increases by at most 1 per run.
		 * The level cap of startLevel + 1 additionally ensures a tile can never
		 * rise by more than one step within a single activity.
		 */
		markVisited(
			state,
			action: PayloadAction<{ h3Indices: string[]; timestamp: number }>,
		) {
			const { h3Indices, timestamp } = action.payload;
			for (const h3Index of h3Indices) {
				const rec = getOrCreate(state.records, h3Index);
				rec.lastVisitedAt = timestamp;
				rec.visitCount += 1;
				rec.walkedOn = true;
				const newLevel = computeHexTileLevel(rec);
				const startLevel = state.runStartLevels[h3Index] ?? 0;
				rec.level = Math.min(newLevel, startLevel + 1);
			}
		},

		/**
		 * Record that the given tiles were enclosed by a completed run loop.
		 * The level cap of startLevel + 1 ensures that even combined visit +
		 * enclosure bonuses cannot push a tile up more than one step per run.
		 */
		markEnclosed(
			state,
			action: PayloadAction<{ h3Indices: string[]; timestamp: number }>,
		) {
			const { h3Indices, timestamp } = action.payload;
			for (const h3Index of h3Indices) {
				const rec = getOrCreate(state.records, h3Index);
				rec.lastEnclosedAt = timestamp;
				rec.enclosedCount += 1;
				const newLevel = computeHexTileLevel(rec);
				const startLevel = state.runStartLevels[h3Index] ?? 0;
				rec.level = Math.min(newLevel, startLevel + 1);
			}
		},

		/**
		 * Replace the entire state with data loaded from persistent storage.
		 * Called once at app startup and again after a full data reset.
		 * Bumps `resetToken` on every call so that the record screen can detect
		 * resets and reload the map with fresh (empty) tile data.
		 */
		loadPersistedState(
			state,
			action: PayloadAction<Record<string, HexTileRecord>>,
		) {
			state.records = action.payload;
			state.resetToken += 1;
		},

		/**
		 * Set the custom tile image and/or billboard for a specific hex tile.
		 * Pass `null` to explicitly clear a value; omit the key to leave it unchanged.
		 * @deprecated Prefer `setBillboardAtAnchor` for billboard changes.
		 */
		setHexTileCustomization(
			state,
			action: PayloadAction<{ h3Index: string; tileImage?: string | null; billboard?: string | null; billboardAnchorColor?: string | null }>,
		) {
			const { h3Index, tileImage, billboard, billboardAnchorColor } = action.payload;
			const rec = getOrCreate(state.records, h3Index);
			if (tileImage !== undefined) rec.tileImage = tileImage;
			if (billboard !== undefined) rec.billboard = billboard;
			if (billboardAnchorColor !== undefined) rec.billboardAnchorColor = billboardAnchorColor;
		},

		/**
		 * Set or clear the billboard at a specific anchor position on a hex tile.
		 * Migrates the legacy `billboard`/`billboardAnchorColor` fields into the
		 * `billboards` map the first time this action is dispatched for a tile.
		 */
		setBillboardAtAnchor(
			state,
			action: PayloadAction<{ h3Index: string; anchorColor: BillboardAnchorPosition; billboard: string | null }>,
		) {
			const { h3Index, anchorColor, billboard } = action.payload;
			const rec = getOrCreate(state.records, h3Index);
			if (!rec.billboards) {
				rec.billboards = {};
				// Migrate legacy single-billboard field if present
				if (rec.billboard) {
					const legacyAnchor = rec.billboardAnchorColor ?? BillboardAnchorPosition.CENTER;
					rec.billboards[legacyAnchor] = rec.billboard;
				}
			}
			if (billboard === null) {
				delete rec.billboards[anchorColor];
			} else {
				rec.billboards[anchorColor] = billboard;
			}
		},

		/**
		 * Set or clear the flat-rendering flag for a billboard at a specific anchor
		 * position on a hex tile.  When `flat` is true the billboard is rendered
		 * lying flat on the map surface; when false (or absent) it faces the camera.
		 * @deprecated Prefer `setTextureAdaptionAtAnchor` for flat anchor-positioned sprites.
		 */
		setBillboardFlatAtAnchor(
			state,
			action: PayloadAction<{ h3Index: string; anchorColor: BillboardAnchorPosition; flat: boolean }>,
		) {
			const { h3Index, anchorColor, flat } = action.payload;
			const rec = getOrCreate(state.records, h3Index);
			if (!rec.billboardsFlat) rec.billboardsFlat = {};
			if (!flat) {
				delete rec.billboardsFlat[anchorColor];
			} else {
				rec.billboardsFlat[anchorColor] = true;
			}
		},

		/**
		 * Set or clear a Hex Texture Adaption sprite at a specific anchor position
		 * on a hex tile.  Texture adaptions are always rendered flat on the map
		 * surface (pitch-alignment = 'map') and form the layer between the Hex
		 * Textur fill and the Hex Objects (face-camera) layer.
		 */
		setTextureAdaptionAtAnchor(
			state,
			action: PayloadAction<{ h3Index: string; anchorColor: BillboardAnchorPosition; billboard: string | null }>,
		) {
			const { h3Index, anchorColor, billboard } = action.payload;
			const rec = getOrCreate(state.records, h3Index);
			if (!rec.billboardsTexture) rec.billboardsTexture = {};
			if (billboard === null) {
				delete rec.billboardsTexture[anchorColor];
			} else {
				rec.billboardsTexture[anchorColor] = billboard;
			}
		},

		/**
		 * Apply map customizations (tileImage, billboards) to the tile records,
		 * merging the provided data into the existing state. Useful for importing
		 * map settings without overwriting activity tracking data.
		 */
		applyMapCustomizations(
			state,
			action: PayloadAction<Record<string, HexTileCustomizationPayload>>,
		) {
			for (const [h3Index, customization] of Object.entries(action.payload)) {
				const rec = getOrCreate(state.records, h3Index);
				if (customization.tileImage !== undefined) rec.tileImage = customization.tileImage;
				if (customization.billboard !== undefined) rec.billboard = customization.billboard;
				if (customization.billboardAnchorColor !== undefined) rec.billboardAnchorColor = customization.billboardAnchorColor;
				if (customization.billboards !== undefined) rec.billboards = customization.billboards;
				if (customization.billboardsFlat !== undefined) rec.billboardsFlat = customization.billboardsFlat;
				if (customization.billboardsTexture !== undefined) rec.billboardsTexture = customization.billboardsTexture;
			}
		},

		/**
		 * Atomically switch between dev-mode and production tile sets.
		 * Replaces the entire records state with the provided set and flips the
		 * `isDevMode` flag so that the auto-save subscriber writes to the correct
		 * file. Bumps `resetToken` so that the record screen reloads the map.
		 */
		setDevMode(
			state,
			action: PayloadAction<{ isDevMode: boolean; records: Record<string, HexTileRecord>; walkedEdges?: string[] }>,
		) {
			state.isDevMode = action.payload.isDevMode;
			state.records = action.payload.records;
			state.walkedEdges = action.payload.walkedEdges ?? [];
			state.runStartLevels = {};
			state.resetToken += 1;
		},

		/** Set debug mode on/off. */
		setDebugMode(state, action: PayloadAction<boolean>) {
			state.isDebugMode = action.payload;
		},

		/**
		 * Record one or more actual hex-to-hex transitions that occurred during a walk.
		 * Each edge is provided as "cellA:cellB" with the lexicographically smaller
		 * index first. Duplicate edges are silently ignored.
		 */
		addWalkedEdges(state, action: PayloadAction<string[]>) {
			const edgeSet = new Set(state.walkedEdges);
			for (const edge of action.payload) {
				edgeSet.add(edge);
			}
			state.walkedEdges = Array.from(edgeSet);
		},

		/**
		 * Replace the walked-edges list with data loaded from persistent storage.
		 * Called once at app startup alongside loadPersistedState / setDevMode.
		 */
		loadWalkedEdgesState(state, action: PayloadAction<string[]>) {
			state.walkedEdges = action.payload;
		},
	},
});

export const { startRun, markVisited, markEnclosed, loadPersistedState, setHexTileCustomization, setBillboardAtAnchor, setBillboardFlatAtAnchor, setTextureAdaptionAtAnchor, applyMapCustomizations, setDevMode, setDebugMode, addWalkedEdges, loadWalkedEdgesState } = hexTileSlice.actions;
export default hexTileSlice.reducer;
