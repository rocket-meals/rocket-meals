import { CLEAR_CANTEENS, DELETE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES, SET_BUILDINGS, SET_BUILDINGS_DICT, SET_BUSINESS_HOURS, SET_BUSINESS_HOURS_DICT, SET_BUSINESS_HOURS_GROUPS, SET_BUSINESS_HOURS_GROUPS_DICT, SET_CANTEENS, SET_CANTEENS_DICT, SET_CANTEEN_FEEDBACK_LABELS, SET_CANTEEN_FEEDBACK_LABELS_DICT, SET_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES, SET_SELECTED_CANTEEN, SET_SELECTED_CANTEEN_FOOD_OFFERS, SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL, UPDATE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES } from '@/redux/Types/types';
import { CollectionHelper } from '@/helper/collectionHelper';

const initialState = {
	canteens: [],
	canteensDict: {},
	buildings: [],
	buildingsDict: {},
	selectedCanteen: null,
	selectedCanteenFoodOffers: [],
	canteenFoodOffers: [],
	businessHours: [],
	businessHoursDict: {},
	businessHoursGroups: [],
	businessHoursGroupsDict: {},
	canteenFeedbackLabels: [],
	canteenFeedbackLabelsDict: {},
	ownCanteenFeedBackLabelEntries: [],
};

const canteensReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_CANTEENS: {
			const canteensDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				canteens: actions.payload,
				canteensDict,
			};
		}
		case SET_CANTEENS_DICT: {
			return {
				...state,
				canteensDict: actions.payload,
			};
		}
		case SET_BUILDINGS: {
			const buildingsDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				buildings: actions.payload,
				buildingsDict,
			};
		}
		case SET_BUILDINGS_DICT: {
			return {
				...state,
				buildingsDict: actions.payload,
			};
		}
		case SET_SELECTED_CANTEEN: {
			return {
				...state,
				selectedCanteen: actions.payload,
			};
		}
		case SET_SELECTED_CANTEEN_FOOD_OFFERS: {
			return {
				...state,
				selectedCanteenFoodOffers: actions.payload,
			};
		}
		case SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL: {
			return {
				...state,
				canteenFoodOffers: actions.payload,
			};
		}
		case SET_BUSINESS_HOURS: {
			const businessHoursDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				businessHours: actions.payload,
				businessHoursDict,
			};
		}
		case SET_BUSINESS_HOURS_DICT: {
			return {
				...state,
				businessHoursDict: actions.payload,
			};
		}
		case SET_BUSINESS_HOURS_GROUPS: {
			const businessHoursGroupsDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				businessHoursGroups: actions.payload,
				businessHoursGroupsDict,
			};
		}
		case SET_BUSINESS_HOURS_GROUPS_DICT: {
			return {
				...state,
				businessHoursGroupsDict: actions.payload,
			};
		}
		case SET_CANTEEN_FEEDBACK_LABELS: {
			const canteenFeedbackLabelsDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				canteenFeedbackLabels: actions.payload,
				canteenFeedbackLabelsDict,
			};
		}
		case SET_CANTEEN_FEEDBACK_LABELS_DICT: {
			return {
				...state,
				canteenFeedbackLabelsDict: actions.payload,
			};
		}
		case SET_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES: {
			return {
				...state,
				ownCanteenFeedBackLabelEntries: actions.payload,
			};
		}
		case UPDATE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES: {
			let match = false;
			const entries = state.ownCanteenFeedBackLabelEntries.map((entry: any) => {
				if (entry.label === actions.payload.label) {
					match = true;
					return actions.payload;
				}
				return entry;
			});
			if (!match) {
				entries.push(actions.payload);
			}
			return {
				...state,
				ownCanteenFeedBackLabelEntries: entries,
			};
		}
		case DELETE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES: {
			const entries = state.ownCanteenFeedBackLabelEntries.filter((feedback: any) => feedback.id !== actions.payload);
			return {
				...state,
				ownCanteenFeedBackLabelEntries: entries,
			};
		}
		case CLEAR_CANTEENS: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default canteensReducer;
