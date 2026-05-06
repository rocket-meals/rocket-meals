import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FoodAttributesState } from '@/redux/Types/stateTypes';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const initialState: FoodAttributesState = {
	foodAttributeGroupsDict: {},
	foodAttributesDict: {},
};

const foodAttributesSlice = createSlice({
	name: 'foodAttributes',
	initialState,
	reducers: {
		setFoodAttributeGroups: (state, action: PayloadAction<any>) => {
			state.foodAttributeGroupsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setFoodAttributesDict: (state, action: PayloadAction<any>) => {
			state.foodAttributesDict = action.payload;
		},
		clearFoodAttributes: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_FOOD_ATTRIBUTE_GROUPS', (state, action: any) => {
				state.foodAttributeGroupsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_FOOD_ATTRIBUTES_DICT', (state, action: any) => { state.foodAttributesDict = action.payload; })
			.addCase('CLEAR_FOOD_ATTRIBUTES', () => initialState);
	},
});

export const { setFoodAttributeGroups, setFoodAttributesDict, clearFoodAttributes } = foodAttributesSlice.actions;
export default foodAttributesSlice.reducer;
