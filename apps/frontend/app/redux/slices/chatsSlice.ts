import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ChatsState } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const initialState: ChatsState = {
	chatsDict: {} as Record<string, DatabaseTypes.Chats>,
	readStatus: {} as Record<string, string>,
};

const chatsSlice = createSlice({
	name: 'chats',
	initialState,
	reducers: {
		setChats: (state, action: PayloadAction<any>) => {
			state.chatsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setChatReadStatus: (state, action: PayloadAction<Record<string, string>>) => {
			state.readStatus = { ...action.payload };
		},
		markChatAsRead: (state, action: PayloadAction<{ chatId: string; timestamp: string }>) => {
			state.readStatus[action.payload.chatId] = action.payload.timestamp;
		},
		markAllChatsAsRead: (state, action: PayloadAction<Record<string, string>>) => {
			Object.assign(state.readStatus, action.payload);
		},
		markAllChatsAsUnread: (state, action: PayloadAction<string[]>) => {
			const ids = Array.isArray(action.payload) ? action.payload : [];
			ids.forEach((id) => { delete state.readStatus[id]; });
		},
		clearChats: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_CHATS', (state, action: any) => {
				state.chatsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_CHAT_READ_STATUS', (state, action: any) => { state.readStatus = { ...action.payload }; })
			.addCase('MARK_CHAT_AS_READ', (state, action: any) => {
				state.readStatus[action.payload.chatId] = action.payload.timestamp;
			})
			.addCase('MARK_ALL_CHATS_AS_READ', (state, action: any) => {
				Object.assign(state.readStatus, action.payload);
			})
			.addCase('MARK_ALL_CHATS_AS_UNREAD', (state, action: any) => {
				const ids: string[] = Array.isArray(action.payload) ? action.payload : [];
				ids.forEach((id) => { if (id in state.readStatus) delete state.readStatus[id]; });
			})
			.addCase('CLEAR_CHATS', () => initialState);
	},
});

export const { setChats, setChatReadStatus, markChatAsRead, markAllChatsAsRead, markAllChatsAsUnread, clearChats } = chatsSlice.actions;
export default chatsSlice.reducer;
