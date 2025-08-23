import { CLEAR_NEWS, SET_NEWS, SET_NEWS_DICT } from '../Types/types';
import { CollectionHelper } from '@/helper/collectionHelper';

const initialState = {
	news: [],
	newsDict: {},
};

const newsReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_NEWS: {
			const newsDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				news: actions.payload,
				newsDict,
			};
		}
		case SET_NEWS_DICT: {
			return {
				...state,
				newsDict: actions.payload,
			};
		}
		case CLEAR_NEWS: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default newsReducer;
