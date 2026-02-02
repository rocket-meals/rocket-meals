import { CLEAR_FOODS, DELETE_FOOD_FEEDBACK_LOCAL, DELETE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL, SET_FOOD_CATEGORIES, SET_FOOD_COLLECTION, SET_FOOD_OFFERS_CATEGORIES, SET_FOODOFFERS_INFO_ITEMS, SET_MARKING_DETAILS, SET_MOST_DISLIKED_FOODS, SET_MOST_LIKED_FOODS, SET_POPUP_EVENTS, SET_SELECTED_DATE, SET_SELECTED_FOOD_MARKINGS, UPDATE_FOOD_FEEDBACK_LABELS, UPDATE_FOOD_FEEDBACK_LOCAL, UPDATE_MARKINGS, UPDATE_OWN_FOOD_FEEDBACK, UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES, UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL } from '@/redux/Types/types';

const initialState = {
	foodFeedbackLabels: [],
	ownFoodFeedbacks: [],
	ownfoodFeedbackLabelEntries: [],
	markings: [],
	selectedFoodMarkings: [],
	foodCategories: [],
	foodOfferCategories: [],
	foodOffersInfoItems: [],
	markingDetails: {},
	mostLikedFoods: [],
	mostDislikedFoods: [],
	foodCollection: {},
	popupEvents: [],
	selectedDate: new Date().toISOString().split('T')[0],
};

const foodReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_POPUP_EVENTS: {
			return {
				...state,
				popupEvents: actions.payload,
			};
		}
		case SET_FOOD_COLLECTION: {
			return {
				...state,
				foodCollection: actions.payload,
			};
		}
		case UPDATE_FOOD_FEEDBACK_LABELS: {
			return {
				...state,
				foodFeedbackLabels: actions.payload,
			};
		}
		case SET_FOOD_CATEGORIES: {
			return {
				...state,
				foodCategories: actions.payload,
			};
		}
		case SET_MARKING_DETAILS: {
			return {
				...state,
				markingDetails: actions.payload,
			};
		}
		case SET_FOOD_OFFERS_CATEGORIES: {
			return {
				...state,
				foodOfferCategories: actions.payload,
			};
		}
		case SET_FOODOFFERS_INFO_ITEMS: {
			return {
				...state,
				foodOffersInfoItems: actions.payload,
			};
		}
		case UPDATE_OWN_FOOD_FEEDBACK: {
			return {
				...state,
				ownFoodFeedbacks: actions.payload,
			};
		}
		case UPDATE_FOOD_FEEDBACK_LOCAL: {
			let match = false;
			const feedbacks = state.ownFoodFeedbacks.map((feedback: any) => {
				if (feedback.food === actions.payload.food) {
					match = true;
					return actions.payload;
				}
				return feedback;
			});
			if (!match) {
				feedbacks.push(actions.payload);
			}
			return {
				...state,
				ownFoodFeedbacks: feedbacks,
			};
		}
		case DELETE_FOOD_FEEDBACK_LOCAL: {
			const feedbacks = state.ownFoodFeedbacks.filter((feedback: any) => feedback.id !== actions.payload);
			return {
				...state,
				ownFoodFeedbacks: feedbacks,
			};
		}
		case UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES: {
			return {
				...state,
				ownfoodFeedbackLabelEntries: actions.payload,
			};
		}
		case UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL: {
			let match = false;
			const entries = state.ownfoodFeedbackLabelEntries.map((entry: any) => {
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
				ownfoodFeedbackLabelEntries: entries,
			};
		}
		case DELETE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL: {
			const entries = state.ownfoodFeedbackLabelEntries.filter((feedback: any) => feedback.id !== actions.payload);
			return {
				...state,
				ownfoodFeedbackLabelEntries: entries,
			};
		}
		case UPDATE_MARKINGS: {
			return {
				...state,
				markings: actions.payload,
			};
		}
		case SET_SELECTED_FOOD_MARKINGS: {
			return {
				...state,
				selectedFoodMarkings: actions.payload,
			};
		}
		case SET_MOST_LIKED_FOODS: {
			return {
				...state,
				mostLikedFoods: actions.payload,
			};
		}
		case SET_MOST_DISLIKED_FOODS: {
			return {
				...state,
				mostDislikedFoods: actions.payload,
			};
		}
		case SET_SELECTED_DATE: {
			return {
				...state,
				selectedDate: actions.payload,
			};
		}
		case CLEAR_FOODS: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default foodReducer;
