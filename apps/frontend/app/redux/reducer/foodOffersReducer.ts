import { CLEAR_CANTEENS, SET_SELECTED_CANTEEN_FOOD_OFFERS, SET_SELECTED_CANTEEN_FOOD_OFFERS_LOCAL } from '@/redux/Types/types';

const initialState = {
	selectedCanteenFoodOffers: [],
	canteenFoodOffers: [],
};

// Split out of canteenReducer into its own persisted AsyncStorage key: food offers are
// by far the largest/most frequently refreshed payload in the store, and keeping them in
// the same combined "persist:root" blob as everything else risked pushing that single
// AsyncStorage item past Android's ~2MB per-item limit (silently failing writes and
// corrupting rehydration, e.g. the onboarding loop).
const foodOffersReducer = (state: typeof initialState | undefined, actions: any) => {
	state ??= initialState;
	switch (actions.type) {
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
		case CLEAR_CANTEENS: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default foodOffersReducer;
