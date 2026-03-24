import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// ─── Sport type definitions ────────────────────────────────────────────────────

export type SportType = 'run' | 'walk' | 'bicycle' | 'motorcycle' | 'swim';

export type SportTypeDefinition = {
	type: SportType;
	label: string;
	/** Which @expo/vector-icons library provides the icon */
	iconLibrary: 'MaterialIcons' | 'MaterialCommunityIcons';
	/** Icon name within the chosen library */
	iconName: string;
	/** Accent colour used for this sport type */
	color: string;
};

const SPORT_TYPE_COLOR = '#2563eb';

export const SPORT_TYPES: SportTypeDefinition[] = [
	{ type: 'run', label: 'Run', iconLibrary: 'MaterialIcons', iconName: 'directions-run', color: SPORT_TYPE_COLOR },
	{ type: 'walk', label: 'Walk', iconLibrary: 'MaterialIcons', iconName: 'directions-walk', color: SPORT_TYPE_COLOR },
	{ type: 'bicycle', label: 'Bicycle', iconLibrary: 'MaterialIcons', iconName: 'directions-bike', color: SPORT_TYPE_COLOR },
	{ type: 'motorcycle', label: 'Motorcycle', iconLibrary: 'MaterialCommunityIcons', iconName: 'motorbike', color: SPORT_TYPE_COLOR },
	{ type: 'swim', label: 'Swim', iconLibrary: 'MaterialIcons', iconName: 'pool', color: SPORT_TYPE_COLOR },
];

// ─── State type ───────────────────────────────────────────────────────────────

export type SportTypeSliceState = {
	selectedType: SportType;
};

const initialState: SportTypeSliceState = {
	selectedType: 'run',
};

// ─── Slice ────────────────────────────────────────────────────────────────────

const sportTypeSlice = createSlice({
	name: 'sportType',
	initialState,
	reducers: {
		/**
		 * Set the active sport type. Persisted to disk by the store subscriber.
		 */
		setSportType(state, action: PayloadAction<SportType>) {
			state.selectedType = action.payload;
		},

		/**
		 * Load the persisted sport type from disk. Called once at app startup.
		 */
		loadSportType(state, action: PayloadAction<SportType>) {
			state.selectedType = action.payload;
		},
	},
});

export const { setSportType, loadSportType } = sportTypeSlice.actions;
export default sportTypeSlice.reducer;
