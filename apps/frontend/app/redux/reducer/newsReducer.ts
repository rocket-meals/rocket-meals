import { CLEAR_NEWS, SET_NEWS } from '../Types/types';

const initialState = {
	news: [],
};

const newsReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_NEWS: {
			return {
				...state,
				news: actions.payload,
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
