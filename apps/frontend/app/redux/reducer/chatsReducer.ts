import { CLEAR_CHATS, SET_CHATS } from '../Types/types';

const initialState = {
	chats: [],
};

const chatsReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_CHATS:
			return {
				...state,
				chats: actions.payload,
			};
		case CLEAR_CHATS:
			return {
				...initialState,
			};
		default:
			return state;
	}
};

export default chatsReducer;
