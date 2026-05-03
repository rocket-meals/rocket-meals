import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { NewsState } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const initialState: NewsState = {
	newsDict: {} as Record<string, DatabaseTypes.News>,
};

const newsSlice = createSlice({
	name: 'news',
	initialState,
	reducers: {
		setNews: (state, action: PayloadAction<any>) => {
			state.newsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		clearNews: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_NEWS', (state, action: any) => {
				state.newsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('CLEAR_NEWS', () => initialState);
	},
});

export const { setNews, clearNews } = newsSlice.actions;
export default newsSlice.reducer;
