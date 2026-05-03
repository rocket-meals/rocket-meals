import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApartmentsState } from '@/redux/Types/stateTypes';

const initialState: ApartmentsState = {
	apartments: [],
	apartmentsLocal: [],
	unSortedApartments: [],
	apartmentsDict: {},
};

const apartmentSlice = createSlice({
	name: 'apartment',
	initialState,
	reducers: {
		setApartments: (state, action: PayloadAction<any>) => { state.apartments = action.payload; },
		setApartmentsDict: (state, action: PayloadAction<any>) => { state.apartmentsDict = action.payload; },
		setApartmentsLocal: (state, action: PayloadAction<any>) => { state.apartmentsLocal = action.payload; },
		setUnSortedApartments: (state, action: PayloadAction<any>) => { state.unSortedApartments = action.payload; },
		clearApartments: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_APARTMENTS', (state, action: any) => { state.apartments = action.payload; })
			.addCase('SET_APARTMENTS_DICT', (state, action: any) => { state.apartmentsDict = action.payload; })
			.addCase('SET_APARTMENTS_LOCAL', (state, action: any) => { state.apartmentsLocal = action.payload; })
			.addCase('SET_UNSORTED_APARTMENTS', (state, action: any) => { state.unSortedApartments = action.payload; })
			.addCase('CLEAR_APARTMENTS', () => initialState);
	},
});

export const { setApartments, setApartmentsDict, setApartmentsLocal, setUnSortedApartments, clearApartments } = apartmentSlice.actions;
export default apartmentSlice.reducer;
