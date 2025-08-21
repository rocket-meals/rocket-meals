import {
	CLEAR_COLLECTION_DATES_LAST_UPDATED,
	SET_COLLECTION_DATES_LAST_UPDATED,
} from '@/redux/Types/types';

const initialState = {
	lastUpdatedMap: {},
};

const lastUpdatedReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_COLLECTION_DATES_LAST_UPDATED: {
			return {
				...state,
				lastUpdatedMap: actions.payload,
			};
		}
		case CLEAR_COLLECTION_DATES_LAST_UPDATED: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default lastUpdatedReducer;
