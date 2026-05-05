import { CLEAR_CANTEENS, DELETE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES, SET_BUILDINGS, SET_BUILDINGS_DICT, SET_BUILDINGS_ORGANIZATIONS, SET_BUSINESS_HOURS, SET_BUSINESS_HOURS_GROUPS, SET_CANTEEN_FEEDBACK_LABELS, SET_CANTEENS, SET_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES, SET_ORGANISATIONS, SET_SELECTED_CANTEEN, SET_SELECTED_CANTEEN_FOOD_OFFERS, SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL, UPDATE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES } from '@/redux/Types/types';

const initialState = {
	canteens: [],
	buildingsDict: {},
	buildingsOrganizations: [],
	organisations: [],
	selectedCanteen: null,
	selectedCanteenFoodOffers: [],
	canteenFoodOffers: [],
	businessHours: [],
	businessHoursGroups: [],
	canteenFeedbackLabels: [],
	ownCanteenFeedBackLabelEntries: [],
};

const canteensReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_CANTEENS: {
			return {
				...state,
				canteens: actions.payload,
			};
		}
		case SET_BUILDINGS: {
			const payload = actions.payload;
			const buildingsDict = Array.isArray(payload)
				? payload.reduce((acc: Record<string, any>, building: any) => {
						if (building?.id) {
							acc[String(building.id)] = building;
						}
						return acc;
				  }, {})
				: (payload ?? {});
			return {
				...state,
				buildingsDict,
			};
		}
		case SET_BUILDINGS_DICT: {
			return {
				...state,
				buildingsDict: actions.payload ?? {},
			};
		}
		case SET_BUILDINGS_ORGANIZATIONS: {
			return {
				...state,
				buildingsOrganizations: actions.payload,
			};
		}
		case SET_ORGANISATIONS: {
			return {
				...state,
				organisations: actions.payload,
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
			return {
				...state,
				businessHours: actions.payload,
			};
		}
		case SET_BUSINESS_HOURS_GROUPS: {
			return {
				...state,
				businessHoursGroups: actions.payload,
			};
		}
		case SET_CANTEEN_FEEDBACK_LABELS: {
			return {
				...state,
				canteenFeedbackLabels: actions.payload,
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
