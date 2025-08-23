import { CLEAR_FOOD_ATTRIBUTES, SET_FOOD_ATTRIBUTE_GROUPS, SET_FOOD_ATTRIBUTE_GROUPS_DICT, SET_FOOD_ATTRIBUTES, SET_FOOD_ATTRIBUTES_DICT } from '@/redux/Types/types';
import { CollectionHelper } from '@/helper/collectionHelper';

const initialState = {
	foodAttributeGroups: [],
	foodAttributeGroupsDict: {},
	foodAttributes: [],
	foodAttributesDict: {},
};

const foodAttributesReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_FOOD_ATTRIBUTE_GROUPS: {
			const foodAttributeGroupsDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				foodAttributeGroups: actions.payload,
				foodAttributeGroupsDict,
			};
		}
		case SET_FOOD_ATTRIBUTE_GROUPS_DICT: {
			return {
				...state,
				foodAttributeGroupsDict: actions.payload,
			};
		}
		case SET_FOOD_ATTRIBUTES: {
			const foodAttributesDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				foodAttributes: actions.payload,
				foodAttributesDict,
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
