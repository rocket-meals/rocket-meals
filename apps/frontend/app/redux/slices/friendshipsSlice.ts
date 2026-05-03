import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FriendshipsState } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';

const initialState: FriendshipsState = {
	friendships: [] as DatabaseTypes.Friendships[],
};

const friendshipsSlice = createSlice({
	name: 'friendships',
	initialState,
	reducers: {
		setFriendships: (state, action: PayloadAction<any>) => { state.friendships = action.payload; },
		addFriendship: (state, action: PayloadAction<any>) => { state.friendships.push(action.payload); },
		updateFriendship: (state, action: PayloadAction<any>) => {
			const updated = action.payload as DatabaseTypes.Friendships;
			const idx = state.friendships.findIndex((f) => f.id === updated.id);
			if (idx !== -1) state.friendships[idx] = updated;
		},
		removeFriendship: (state, action: PayloadAction<string>) => {
			state.friendships = state.friendships.filter((f) => f.id !== action.payload);
		},
		clearFriendships: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_FRIENDSHIPS', (state, action: any) => { state.friendships = action.payload; })
			.addCase('ADD_FRIENDSHIP', (state, action: any) => { state.friendships.push(action.payload); })
			.addCase('UPDATE_FRIENDSHIP', (state, action: any) => {
				const updated = action.payload as DatabaseTypes.Friendships;
				const idx = state.friendships.findIndex((f) => f.id === updated.id);
				if (idx !== -1) state.friendships[idx] = updated;
			})
			.addCase('REMOVE_FRIENDSHIP', (state, action: any) => {
				state.friendships = state.friendships.filter((f) => f.id !== action.payload);
			})
			.addCase('CLEAR_FRIENDSHIPS', () => initialState);
	},
});

export const { setFriendships, addFriendship, updateFriendship, removeFriendship, clearFriendships } = friendshipsSlice.actions;
export default friendshipsSlice.reducer;
