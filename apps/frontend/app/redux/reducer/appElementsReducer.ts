import { CLEAR_APP_ELEMENTS, SET_APP_ELEMENTS, SET_APP_ELEMENTS_DICT } from '@/redux/Types/types';
import { CollectionHelper } from '@/helper/collectionHelper';

const initialState = {
	appElements: [],
	appElementsDict: {},
};

const appElementsReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_APP_ELEMENTS: {
			const appElementsDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				appElements: actions.payload,
				appElementsDict,
			};
		}
		case SET_APP_ELEMENTS_DICT: {
			return {
				...state,
				appElementsDict: actions.payload,
			};
		}
		case CLEAR_APP_ELEMENTS: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default appElementsReducer;
