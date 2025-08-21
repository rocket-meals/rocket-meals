import {
	CLEAR_FOOD_ATTRIBUTES,
	SET_FOOD_ATTRIBUTES,
	SET_FOOD_ATTRIBUTES_DICT,
	SET_FOOD_ATTRIBUTE_GROUPS,
} from '@/redux/Types/types';

const initialState = {
	foodAttributeGroups: [],
	foodAttributes: [],
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
		case SET_FOOD_ATTRIBUTES: {
			return {
				...state,
				foodAttributes: actions.payload,
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
