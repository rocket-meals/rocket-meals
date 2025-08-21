import {
	CLEAR_MANAGEMENT,
	SET_DAY_PLAN,
	SET_FOOD_PLAN,
	SET_WEEK_PLAN,
} from '../Types/types';

const initialState = {
	dayPlan: {
		selectedCanteen: {},
		mealOfferCategory: { id: '', alias: '' },
		isMenuCategory: true,
		nextFoodInterval: 10,
		refreshInterval: 300,
		isFullScreen: true,
		foodCategory: { id: '', alias: '' },
		isMenuCategoryName: true,
	},
	foodPlan: {
		selectedCanteen: {},
		additionalSelectedCanteen: {},
		nextFoodInterval: 10,
		refreshInterval: 300,
	},
	weekPlan: {
		selectedCanteen: {},
		isAllergene: true,
		selectedWeek: { week: 0, days: [] },
	},
};

const managementReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_DAY_PLAN: {
			return {
				...state,
				dayPlan: { ...state.dayPlan, ...actions.payload },
			};
		}
		case SET_FOOD_PLAN: {
			return {
				...state,
				foodPlan: { ...state.foodPlan, ...actions.payload },
			};
		}
		case SET_WEEK_PLAN: {
			return {
				...state,
				weekPlan: { ...state.weekPlan, ...actions.payload },
			};
		}
		case CLEAR_MANAGEMENT: {
			return {
				...initialState,
			};
		}

		default:
			return state;
	}
};

export default managementReducer;
