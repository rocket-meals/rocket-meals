import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CampusState } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';

const initialState: CampusState = {
	campuses: [] as DatabaseTypes.Buildings[],
	campusesLocal: [] as DatabaseTypes.Buildings[],
	unSortedCampuses: [] as DatabaseTypes.Buildings[],
	campusesDict: {},
};

const campusSlice = createSlice({
	name: 'campus',
	initialState,
	reducers: {
		setCampuses: (state, action: PayloadAction<any>) => { state.campuses = action.payload; },
		setCampusesDict: (state, action: PayloadAction<any>) => { state.campusesDict = action.payload; },
		setCampusesLocal: (state, action: PayloadAction<any>) => { state.campusesLocal = action.payload; },
		setUnSortedCampuses: (state, action: PayloadAction<any>) => { state.unSortedCampuses = action.payload; },
		clearCampuses: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_CAMPUSES', (state, action: any) => { state.campuses = action.payload; })
			.addCase('SET_CAMPUSES_DICT', (state, action: any) => { state.campusesDict = action.payload; })
			.addCase('SET_CAMPUSES_LOCAL', (state, action: any) => { state.campusesLocal = action.payload; })
			.addCase('SET_UNSORTED_CAMPUSES', (state, action: any) => { state.unSortedCampuses = action.payload; })
			.addCase('CLEAR_CAMPUSES', () => initialState);
	},
});

export const { setCampuses, setCampusesDict, setCampusesLocal, setUnSortedCampuses, clearCampuses } = campusSlice.actions;
export default campusSlice.reducer;
