import { CLEAR_APP_ELEMENTS, SET_APP_ELEMENTS } from '@/redux/Types/types';

const initialState = {
	appElements: [],
};

const appElementsReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_APP_ELEMENTS: {
			return {
				...state,
				appElements: actions.payload,
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
