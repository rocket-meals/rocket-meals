import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { LastUpdatedState } from '@/redux/Types/stateTypes';

const initialState: LastUpdatedState = {
	lastUpdatedMap: {},
};

const lastUpdatedSlice = createSlice({
	name: 'lastUpdated',
	initialState,
	reducers: {
		setCollectionDatesLastUpdated: (state, action: PayloadAction<Record<string, string>>) => {
			state.lastUpdatedMap = action.payload;
		},
		clearCollectionDatesLastUpdated: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_COLLECTION_DATES_LAST_UPDATED', (state, action: any) => { state.lastUpdatedMap = action.payload; })
			.addCase('CLEAR_COLLECTION_DATES_LAST_UPDATED', () => initialState);
	},
});

export const { setCollectionDatesLastUpdated, clearCollectionDatesLastUpdated } = lastUpdatedSlice.actions;
export default lastUpdatedSlice.reducer;
