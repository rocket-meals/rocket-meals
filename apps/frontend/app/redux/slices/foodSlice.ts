import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FoodState } from '@/redux/Types/stateTypes';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const initialState: FoodState = {
	foodFeedbackLabelsDict: {},
	ownFoodFeedbacksDict: {},
	ownfoodFeedbackLabelEntriesDict: {},
	markingsDict: {},
	markingGroupsDict: {},
	selectedFoodMarkingsDict: {},
	foodCategoriesDict: {},
	foodOfferCategoriesDict: {},
	foodOffersInfoItemsDict: {},
	markingDetails: {} as any,
	mostLikedFoodsDict: {},
	mostDislikedFoodsDict: {},
	foodCollection: {},
	popupEventsDict: {},
	selectedDate: new Date().toISOString().split('T')[0],
};

const foodSlice = createSlice({
	name: 'food', // Matches combineReducers key
	initialState,
	reducers: {
		setPopupEvents: (state, action: PayloadAction<any>) => {
			state.popupEventsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setFoodCollection: (state, action: PayloadAction<any>) => {
			state.foodCollection = action.payload;
		},
		updateFoodFeedbackLabels: (state, action: PayloadAction<any>) => {
			state.foodFeedbackLabelsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setFoodCategories: (state, action: PayloadAction<any>) => {
			state.foodCategoriesDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setMarkingDetails: (state, action: PayloadAction<any>) => {
			state.markingDetails = action.payload;
		},
		setFoodOffersCategories: (state, action: PayloadAction<any>) => {
			state.foodOfferCategoriesDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setFoodoffersInfoItems: (state, action: PayloadAction<any>) => {
			state.foodOffersInfoItemsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		updateOwnFoodFeedback: (state, action: PayloadAction<any>) => {
			state.ownFoodFeedbacksDict = arrayToDict(
				action.payload,
				(item, index) => (item?.food ? String(item.food) : idKey(item) ?? `idx:${index}`)
			);
		},
		updateFoodFeedbackLocal: (state, action: PayloadAction<any>) => {
			const key = action.payload?.food ? String(action.payload.food) : idKey(action.payload);
			if (key) state.ownFoodFeedbacksDict[key] = action.payload;
		},
		deleteFoodFeedbackLocal: (state, action: PayloadAction<any>) => {
			const deleteId = action.payload ? String(action.payload) : null;
			if (!deleteId) return;
			for (const k of Object.keys(state.ownFoodFeedbacksDict)) {
				const v = (state.ownFoodFeedbacksDict as any)[k];
				if (String(v?.id ?? '') === deleteId || String(v?.food ?? '') === deleteId || k === deleteId) {
					delete (state.ownFoodFeedbacksDict as any)[k];
				}
			}
		},
		updateOwnFoodFeedbackLabelEntries: (state, action: PayloadAction<any>) => {
			state.ownfoodFeedbackLabelEntriesDict = arrayToDict(
				action.payload,
				(item, index) => idKey(item) ?? (item?.label ? String(item.label) : `idx:${index}`)
			);
		},
		updateOwnFoodFeedbackLabelEntriesLocal: (state, action: PayloadAction<any>) => {
			const key = action.payload?.label ? String(action.payload.label) : idKey(action.payload);
			if (key) state.ownfoodFeedbackLabelEntriesDict[key] = action.payload;
		},
		deleteOwnFoodFeedbackLabelEntriesLocal: (state, action: PayloadAction<any>) => {
			const deleteId = action.payload ? String(action.payload) : null;
			if (!deleteId) return;
			for (const k of Object.keys(state.ownfoodFeedbackLabelEntriesDict)) {
				const v = (state.ownfoodFeedbackLabelEntriesDict as any)[k];
				if (String(v?.id ?? '') === deleteId || k === deleteId) {
					delete (state.ownfoodFeedbackLabelEntriesDict as any)[k];
				}
			}
		},
		updateMarkings: (state, action: PayloadAction<any>) => {
			state.markingsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		updateMarkingGroups: (state, action: PayloadAction<any>) => {
			state.markingGroupsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setSelectedFoodMarkings: (state, action: PayloadAction<any>) => {
			state.selectedFoodMarkingsDict = arrayToDict(
				action.payload,
				(item, index) => idKey(item) ?? (item?.markings_id ? String(item.markings_id) : `idx:${index}`)
			);
		},
		setMostLikedFoods: (state, action: PayloadAction<any>) => {
			state.mostLikedFoodsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setMostDislikedFoods: (state, action: PayloadAction<any>) => {
			state.mostDislikedFoodsDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setSelectedDate: (state, action: PayloadAction<string>) => {
			state.selectedDate = action.payload;
		},
		clearFoods: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_POPUP_EVENTS', (state, action: any) => {
				state.popupEventsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_FOOD_COLLECTION', (state, action: any) => { state.foodCollection = action.payload; })
			.addCase('UPDATE_FOOD_FEEDBACK_LABELS', (state, action: any) => {
				state.foodFeedbackLabelsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_FOOD_CATEGORIES', (state, action: any) => {
				state.foodCategoriesDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_MARKING_DETAILS', (state, action: any) => { state.markingDetails = action.payload; })
			.addCase('SET_FOOD_OFFERS_CATEGORIES', (state, action: any) => {
				state.foodOfferCategoriesDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_FOODOFFERS_INFO_ITEMS', (state, action: any) => {
				state.foodOffersInfoItemsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('UPDATE_OWN_FOOD_FEEDBACK', (state, action: any) => {
				state.ownFoodFeedbacksDict = arrayToDict(
					action.payload, (item: any, index: number) => (item?.food ? String(item.food) : idKey(item) ?? `idx:${index}`)
				);
			})
			.addCase('UPDATE_FOOD_FEEDBACK_LOCAL', (state, action: any) => {
				const key = action.payload?.food ? String(action.payload.food) : idKey(action.payload);
				if (key) state.ownFoodFeedbacksDict[key] = action.payload;
			})
			.addCase('DELETE_FOOD_FEEDBACK_LOCAL', (state, action: any) => {
				const deleteId = action.payload ? String(action.payload) : null;
				if (!deleteId) return;
				for (const k of Object.keys(state.ownFoodFeedbacksDict)) {
					const v = (state.ownFoodFeedbacksDict as any)[k];
					if (String(v?.id ?? '') === deleteId || String(v?.food ?? '') === deleteId || k === deleteId)
						delete (state.ownFoodFeedbacksDict as any)[k];
				}
			})
			.addCase('UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES', (state, action: any) => {
				state.ownfoodFeedbackLabelEntriesDict = arrayToDict(
					action.payload, (item: any, index: number) => idKey(item) ?? (item?.label ? String(item.label) : `idx:${index}`)
				);
			})
			.addCase('UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL', (state, action: any) => {
				const key = action.payload?.label ? String(action.payload.label) : idKey(action.payload);
				if (key) state.ownfoodFeedbackLabelEntriesDict[key] = action.payload;
			})
			.addCase('DELETE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL', (state, action: any) => {
				const deleteId = action.payload ? String(action.payload) : null;
				if (!deleteId) return;
				for (const k of Object.keys(state.ownfoodFeedbackLabelEntriesDict)) {
					const v = (state.ownfoodFeedbackLabelEntriesDict as any)[k];
					if (String(v?.id ?? '') === deleteId || k === deleteId)
						delete (state.ownfoodFeedbackLabelEntriesDict as any)[k];
				}
			})
			.addCase('UPDATE_MARKINGS', (state, action: any) => {
				state.markingsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('UPDATE_MARKING_GROUPS', (state, action: any) => {
				state.markingGroupsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_SELECTED_FOOD_MARKINGS', (state, action: any) => {
				state.selectedFoodMarkingsDict = arrayToDict(
					action.payload,
					(item: any, index: number) => idKey(item) ?? (item?.markings_id ? String(item.markings_id) : `idx:${index}`)
				);
			})
			.addCase('SET_MOST_LIKED_FOODS', (state, action: any) => {
				state.mostLikedFoodsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_MOST_DISLIKED_FOODS', (state, action: any) => {
				state.mostDislikedFoodsDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_SELECTED_DATE', (state, action: any) => { state.selectedDate = action.payload; })
			.addCase('CLEAR_FOODS', () => initialState);
	},
});

export const {
	setPopupEvents, setFoodCollection, updateFoodFeedbackLabels, setFoodCategories,
	setMarkingDetails, setFoodOffersCategories, setFoodoffersInfoItems,
	updateOwnFoodFeedback, updateFoodFeedbackLocal, deleteFoodFeedbackLocal,
	updateOwnFoodFeedbackLabelEntries, updateOwnFoodFeedbackLabelEntriesLocal,
	deleteOwnFoodFeedbackLabelEntriesLocal, updateMarkings, updateMarkingGroups,
	setSelectedFoodMarkings, setMostLikedFoods, setMostDislikedFoods,
	setSelectedDate, clearFoods,
} = foodSlice.actions;

export default foodSlice.reducer;
