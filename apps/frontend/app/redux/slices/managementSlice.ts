import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ManagementState } from '@/redux/Types/stateTypes';

const initialState: ManagementState = {
	dayPlan: {
		selectedCanteen: {} as any,
		mealOfferCategory: { id: '', alias: '' },
		isMenuCategory: true,
		nextFoodInterval: 10,
		refreshInterval: 300,
		isFullScreen: true,
		showMarkingsOnCard: true,
		foodCategory: { id: '', alias: '' },
		isMenuCategoryName: true,
	},
	foodPlan: {
		selectedCanteen: {} as any,
		additionalSelectedCanteen: {} as any,
		nextFoodInterval: 10,
		refreshInterval: 300,
	},
	weekPlan: {
		selectedCanteen: {} as any,
		isAllergene: true,
		selectedWeek: { week: 0, days: [] },
	},
};

const managementSlice = createSlice({
	name: 'management',
	initialState,
	reducers: {
		setDayPlan: (state, action: PayloadAction<any>) => {
			state.dayPlan = { ...state.dayPlan, ...action.payload };
		},
		setFoodPlan: (state, action: PayloadAction<any>) => {
			state.foodPlan = { ...state.foodPlan, ...action.payload };
		},
		setWeekPlan: (state, action: PayloadAction<any>) => {
			state.weekPlan = { ...state.weekPlan, ...action.payload };
		},
		clearManagement: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_DAY_PLAN', (state, action: any) => {
				state.dayPlan = { ...state.dayPlan, ...action.payload };
			})
			.addCase('SET_FOOD_PLAN', (state, action: any) => {
				state.foodPlan = { ...state.foodPlan, ...action.payload };
			})
			.addCase('SET_WEEK_PLAN', (state, action: any) => {
				state.weekPlan = { ...state.weekPlan, ...action.payload };
			})
			.addCase('CLEAR_MANAGEMENT', () => initialState)
			.addCase('CLEAR_DEVELOPER_MODE', () => initialState);
	},
});

export const { setDayPlan, setFoodPlan, setWeekPlan, clearManagement } = managementSlice.actions;
export default managementSlice.reducer;
