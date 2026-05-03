import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CollectibleEventsState } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const initialState: CollectibleEventsState = {
	collectibleEventsItemsDict: {} as Record<string, DatabaseTypes.CollectibleEvents>,
	collectibleEventsDict: {} as Record<string, Record<string, boolean>>,
};

const collectibleEventsSlice = createSlice({
	name: 'collectibleEvents',
	initialState,
	reducers: {
		setCollectibleEvents: (state, action: PayloadAction<any>) => {
			state.collectibleEventsItemsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setCollectibleEventDict: (state, action: PayloadAction<{ eventId: string; key: string; value: boolean }>) => {
			const { eventId, key, value } = action.payload;
			if (!eventId || !key) return;
			if (!state.collectibleEventsDict[eventId]) state.collectibleEventsDict[eventId] = {};
			state.collectibleEventsDict[eventId][key] = value;
		},
		setCollectibleEventDictBulk: (state, action: PayloadAction<{ eventId: string; data: Record<string, boolean> }>) => {
			const { eventId, data } = action.payload;
			if (!eventId) return;
			state.collectibleEventsDict[eventId] = data || {};
		},
		resetCollectibleEventDict: (state, action: PayloadAction<{ eventId: string }>) => {
			const { eventId } = action.payload;
			if (eventId) delete state.collectibleEventsDict[eventId];
		},
		resetAllCollectibleEventDicts: (state) => {
			state.collectibleEventsDict = {};
		},
		clearCollectibleEvents: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_COLLECTIBLE_EVENTS', (state, action: any) => {
				state.collectibleEventsItemsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_COLLECTIBLE_EVENT_DICT', (state, action: any) => {
				const { eventId, key, value } = action.payload || {};
				if (!eventId || !key) return;
				if (!state.collectibleEventsDict[eventId]) state.collectibleEventsDict[eventId] = {};
				state.collectibleEventsDict[eventId][key] = value;
			})
			.addCase('SET_COLLECTIBLE_EVENT_DICT_BULK', (state, action: any) => {
				const { eventId, data } = action.payload || {};
				if (!eventId) return;
				state.collectibleEventsDict[eventId] = data || {};
			})
			.addCase('RESET_COLLECTIBLE_EVENT_DICT', (state, action: any) => {
				const { eventId } = action.payload || {};
				if (eventId) delete state.collectibleEventsDict[eventId];
			})
			.addCase('RESET_ALL_COLLECTIBLE_EVENT_DICTS', (state) => {
				state.collectibleEventsDict = {};
			})
			.addCase('CLEAR_COLLECTIBLE_EVENTS', () => initialState);
	},
});

export const {
	setCollectibleEvents, setCollectibleEventDict, setCollectibleEventDictBulk,
	resetCollectibleEventDict, resetAllCollectibleEventDicts, clearCollectibleEvents,
} = collectibleEventsSlice.actions;

export default collectibleEventsSlice.reducer;
