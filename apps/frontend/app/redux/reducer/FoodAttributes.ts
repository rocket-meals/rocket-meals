import { CLEAR_FOOD_ATTRIBUTES, SET_FOOD_ATTRIBUTE_GROUPS, SET_FOOD_ATTRIBUTES_DICT } from '@/redux/Types/types';

const initialState = {
	foodAttributeGroups: [],
	foodAttributesDict: {},
};

const foodAttributesReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_FOOD_ATTRIBUTE_GROUPS: {
			return {
				...state,
				foodAttributeGroups: actions.payload,
			};
		}

		case SET_FOOD_ATTRIBUTES_DICT: {
			return {
				...state,
				foodAttributesDict: actions.payload,
			};
		}
		case CLEAR_FOOD_ATTRIBUTES: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default foodAttributesReducer;
