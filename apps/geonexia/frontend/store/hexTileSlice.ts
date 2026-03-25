import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HexTileRecord, computeHexTileLevel } from '../helpers/HexTileStorage';

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
};

const initialState: HexTileSliceState = {
	records: {},
	runStartLevels: {},
	resetToken: 0,
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
			edgeCrossings: {},
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
		 * Record edge crossings for a completed run from the ordered sequence of
		 * H3 cells traversed. For each consecutive (prev, curr) pair, the shared
		 * border edge is counted once on both tiles.
		 * Called at the end of a run, after markVisited / markEnclosed.
		 */
		recordEdgeCrossings(
			state,
			action: PayloadAction<{ h3Sequence: string[] }>,
		) {
			const { h3Sequence } = action.payload;
			for (let i = 1; i < h3Sequence.length; i++) {
				const prev = h3Sequence[i - 1];
				const curr = h3Sequence[i];
				if (prev === curr) continue;
				const prevRec = getOrCreate(state.records, prev);
				const currRec = getOrCreate(state.records, curr);
				prevRec.edgeCrossings[curr] = (prevRec.edgeCrossings[curr] ?? 0) + 1;
				currRec.edgeCrossings[prev] = (currRec.edgeCrossings[prev] ?? 0) + 1;
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
			const records = action.payload;
			// Ensure edgeCrossings exists for records loaded from older persisted data.
			// Also recompute levels so that any formula change is applied on next launch.
			for (const rec of Object.values(records)) {
				if (!rec.edgeCrossings) rec.edgeCrossings = {};
				rec.level = computeHexTileLevel(rec);
			}
			state.records = records;
			state.resetToken += 1;
		},
	},
});

export const { startRun, markVisited, markEnclosed, recordEdgeCrossings, loadPersistedState } = hexTileSlice.actions;
export default hexTileSlice.reducer;
