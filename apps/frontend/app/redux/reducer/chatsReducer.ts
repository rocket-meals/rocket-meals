import { CLEAR_CHATS, SET_CHATS, SET_CHATS_DICT } from '../Types/types';
import { CollectionHelper } from '@/helper/collectionHelper';

const initialState = {
	chats: [],
	chatsDict: {},
};

const chatsReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_CHATS: {
			const chatsDict = CollectionHelper.convertListToDict(actions.payload, 'id');
			return {
				...state,
				chats: actions.payload,
				chatsDict,
			};
		}
		case SET_CHATS_DICT: {
			return {
				...state,
				chatsDict: actions.payload,
			};
		}
		case CLEAR_CHATS:
			return {
				...initialState,
			};
		default:
			return state;
	}
};

export default chatsReducer;
