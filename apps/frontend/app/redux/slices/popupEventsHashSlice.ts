import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { PopupEventsHashState } from '@/redux/Types/stateTypes';

const initialState: PopupEventsHashState = {
	hashValue: '',
};

const popupEventsHashSlice = createSlice({
	name: 'popup_events_hash',
	initialState,
	reducers: {
		setPopupEventsHash: (state, action: PayloadAction<string>) => { state.hashValue = action.payload; },
		clearPopupEventsHash: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_POPUP_EVENTS_HASH', (state, action: any) => { state.hashValue = action.payload; })
			.addCase('CLEAR_POPUP_EVENTS_HASH', () => initialState);
	},
});

export const { setPopupEventsHash, clearPopupEventsHash } = popupEventsHashSlice.actions;
export default popupEventsHashSlice.reducer;
