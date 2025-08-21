import {
	CLEAR_CAMPUSES,
	SET_CAMPUSES,
	SET_CAMPUSES_DICT,
	SET_CAMPUSES_LOCAL,
	SET_UNSORTED_CAMPUSES,
} from '../Types/types';

const initialState = {
	campuses: [],
	campusesLocal: [],
	unSortedCampuses: [],
	campusesDict: {},
};

const campusReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_CAMPUSES: {
			return {
				...state,
				campuses: actions.payload,
			};
		}
		case SET_CAMPUSES_DICT: {
			return {
				...state,
				campusesDict: actions.payload,
			};
		}
		case SET_CAMPUSES_LOCAL: {
			return {
				...state,
				campusesLocal: actions.payload,
			};
		}
		case SET_UNSORTED_CAMPUSES: {
			return {
				...state,
				unSortedCampuses: actions.payload,
			};
		}
		case CLEAR_CAMPUSES: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default campusReducer;
