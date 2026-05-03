import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { CanteensState } from '@/redux/Types/stateTypes';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const arrayToDictById = <T extends { id?: any }>(payload: unknown): Record<string, T> => {
	if (!payload) return {};
	if (!Array.isArray(payload)) return payload as Record<string, T>;
	return payload.reduce((acc: Record<string, T>, item: any) => {
		if (item?.id) acc[String(item.id)] = item;
		return acc;
	}, {});
};

const getCanteenFeedbackLabelEntryKey = (entry: any): string | null => {
	if (entry?.id) return String(entry.id);
	if (entry?.label && entry?.canteen && entry?.date)
		return `${String(entry.label)}|${String(entry.canteen)}|${String(entry.date)}`;
	return null;
};

const initialState: CanteensState = {
	canteensDict: {},
	buildingsDict: {},
	buildingsOrganizationsDict: {},
	organisationsDict: {},
	selectedCanteen: null,
	selectedCanteenFoodOffersDict: {},
	canteenFoodOffersDict: {},
	businessHoursDict: {},
	businessHoursGroupsDict: {},
	canteenFeedbackLabelsDict: {},
	ownCanteenFeedBackLabelEntriesDict: {},
};

const canteensSlice = createSlice({
	name: 'canteenReducer', // Must match the combineReducers key for storage compatibility
	initialState,
	reducers: {
		setCanteens: (state, action: PayloadAction<any>) => {
			state.canteensDict = arrayToDictById(action.payload);
		},
		setBuildings: (state, action: PayloadAction<any>) => {
			const payload = action.payload;
			state.buildingsDict = Array.isArray(payload)
				? payload.reduce((acc: Record<string, any>, building: any) => {
					if (building?.id) acc[String(building.id)] = building;
					return acc;
				}, {})
				: (payload ?? {});
		},
		setBuildingsDict: (state, action: PayloadAction<any>) => {
			state.buildingsDict = action.payload ?? {};
		},
		setBuildingsOrganizations: (state, action: PayloadAction<any>) => {
			state.buildingsOrganizationsDict = arrayToDictById(action.payload);
		},
		setOrganisations: (state, action: PayloadAction<any>) => {
			state.organisationsDict = arrayToDictById(action.payload);
		},
		setSelectedCanteen: (state, action: PayloadAction<any>) => {
			state.selectedCanteen = action.payload;
		},
		setSelectedCanteenFoodOffers: (state, action: PayloadAction<any>) => {
			state.selectedCanteenFoodOffersDict = arrayToDictById(action.payload);
		},
		setSelectedCanteenFoodOffersLocal: (state, action: PayloadAction<any>) => {
			state.canteenFoodOffersDict = arrayToDictById(action.payload);
		},
		setBusinessHours: (state, action: PayloadAction<any>) => {
			state.businessHoursDict = arrayToDictById(action.payload);
		},
		setBusinessHoursGroups: (state, action: PayloadAction<any>) => {
			state.businessHoursGroupsDict = arrayToDictById(action.payload);
		},
		setCanteenFeedbackLabels: (state, action: PayloadAction<any>) => {
			state.canteenFeedbackLabelsDict = arrayToDictById(action.payload);
		},
		setOwnCanteenFeedbackLabelEntries: (state, action: PayloadAction<any>) => {
			state.ownCanteenFeedBackLabelEntriesDict = arrayToDictById(action.payload);
		},
		updateOwnCanteenFeedbackLabelEntries: (state, action: PayloadAction<any>) => {
			const key = getCanteenFeedbackLabelEntryKey(action.payload);
			if (key) state.ownCanteenFeedBackLabelEntriesDict[key] = action.payload;
		},
		deleteOwnCanteenFeedbackLabelEntries: (state, action: PayloadAction<any>) => {
			const id = String(action.payload ?? '');
			if (id in state.ownCanteenFeedBackLabelEntriesDict) {
				delete state.ownCanteenFeedBackLabelEntriesDict[id];
			}
		},
		clearCanteens: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_CANTEENS', (state, action: any) => { state.canteensDict = arrayToDictById(action.payload); })
			.addCase('SET_BUILDINGS', (state, action: any) => {
				const payload = action.payload;
				state.buildingsDict = Array.isArray(payload)
					? payload.reduce((acc: Record<string, any>, b: any) => { if (b?.id) acc[String(b.id)] = b; return acc; }, {})
					: (payload ?? {});
			})
			.addCase('SET_BUILDINGS_DICT', (state, action: any) => { state.buildingsDict = action.payload ?? {}; })
			.addCase('SET_BUILDINGS_ORGANIZATIONS', (state, action: any) => { state.buildingsOrganizationsDict = arrayToDictById(action.payload); })
			.addCase('SET_ORGANISATIONS', (state, action: any) => { state.organisationsDict = arrayToDictById(action.payload); })
			.addCase('SET_SELECTED_CANTEEN', (state, action: any) => { state.selectedCanteen = action.payload; })
			.addCase('SET_SELECTED_CANTEEN_FOOD_OFFERS', (state, action: any) => { state.selectedCanteenFoodOffersDict = arrayToDictById(action.payload); })
			.addCase('SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL', (state, action: any) => { state.canteenFoodOffersDict = arrayToDictById(action.payload); })
			.addCase('SET_BUSINESS_HOURS', (state, action: any) => { state.businessHoursDict = arrayToDictById(action.payload); })
			.addCase('SET_BUSINESS_HOURS_GROUPS', (state, action: any) => { state.businessHoursGroupsDict = arrayToDictById(action.payload); })
			.addCase('SET_CANTEEN_FEEDBACK_LABELS', (state, action: any) => { state.canteenFeedbackLabelsDict = arrayToDictById(action.payload); })
			.addCase('SET_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES', (state, action: any) => { state.ownCanteenFeedBackLabelEntriesDict = arrayToDictById(action.payload); })
			.addCase('UPDATE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES', (state, action: any) => {
				const key = getCanteenFeedbackLabelEntryKey(action.payload);
				if (key) state.ownCanteenFeedBackLabelEntriesDict[key] = action.payload;
			})
			.addCase('DELETE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES', (state, action: any) => {
				const id = String(action.payload ?? '');
				if (id in state.ownCanteenFeedBackLabelEntriesDict) delete state.ownCanteenFeedBackLabelEntriesDict[id];
			})
			.addCase('CLEAR_CANTEENS', () => initialState);
	},
});

export const {
	setCanteens, setBuildings, setBuildingsDict, setBuildingsOrganizations,
	setOrganisations, setSelectedCanteen, setSelectedCanteenFoodOffers,
	setSelectedCanteenFoodOffersLocal, setBusinessHours, setBusinessHoursGroups,
	setCanteenFeedbackLabels, setOwnCanteenFeedbackLabelEntries,
	updateOwnCanteenFeedbackLabelEntries, deleteOwnCanteenFeedbackLabelEntries,
	clearCanteens,
} = canteensSlice.actions;

export default canteensSlice.reducer;
