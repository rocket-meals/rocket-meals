import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FriendshipsState } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const initialState: FriendshipsState = {
	friendshipsDict: {} as Record<string, DatabaseTypes.Friendships>,
};

const friendshipsSlice = createSlice({
	name: 'friendships',
	initialState,
	reducers: {
		setFriendships: (state, action: PayloadAction<any>) => {
			state.friendshipsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		addFriendship: (state, action: PayloadAction<any>) => {
			const key = idKey(action.payload);
			if (key) state.friendshipsDict[key] = action.payload;
		},
		updateFriendship: (state, action: PayloadAction<any>) => {
			const updated = action.payload as DatabaseTypes.Friendships;
			const key = updated.id ? String(updated.id) : null;
			if (key) state.friendshipsDict[key] = { ...state.friendshipsDict[key], ...updated };
		},
		removeFriendship: (state, action: PayloadAction<string>) => {
			const key = String(action.payload ?? '');
			if (key in state.friendshipsDict) delete state.friendshipsDict[key];
		},
		clearFriendships: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_FRIENDSHIPS', (state, action: any) => {
				state.friendshipsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('ADD_FRIENDSHIP', (state, action: any) => {
				const key = idKey(action.payload);
				if (key) state.friendshipsDict[key] = action.payload;
			})
			.addCase('UPDATE_FRIENDSHIP', (state, action: any) => {
				const updated = action.payload as DatabaseTypes.Friendships;
				const key = updated.id ? String(updated.id) : null;
				if (key) state.friendshipsDict[key] = { ...state.friendshipsDict[key], ...updated };
			})
			.addCase('REMOVE_FRIENDSHIP', (state, action: any) => {
				const key = String(action.payload ?? '');
				if (key in state.friendshipsDict) delete state.friendshipsDict[key];
			})
			.addCase('CLEAR_FRIENDSHIPS', () => initialState);
	},
});

export const { setFriendships, addFriendship, updateFriendship, removeFriendship, clearFriendships } = friendshipsSlice.actions;
export default friendshipsSlice.reducer;
