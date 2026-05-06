import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppElementState } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const initialState: AppElementState = {
	appElementsDict: {} as Record<string, DatabaseTypes.AppElements>,
};

const appElementsSlice = createSlice({
	name: 'appElements',
	initialState,
	reducers: {
		setAppElements: (state, action: PayloadAction<any>) => {
			state.appElementsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		clearAppElements: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_APP_ELEMENTS', (state, action: any) => {
				state.appElementsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('CLEAR_APP_ELEMENTS', () => initialState);
	},
});

export const { setAppElements, clearAppElements } = appElementsSlice.actions;
export default appElementsSlice.reducer;
