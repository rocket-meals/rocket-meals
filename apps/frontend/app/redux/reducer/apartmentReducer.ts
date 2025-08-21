import {
	CLEAR_APARTMENTS,
	SET_APARTMENTS,
	SET_APARTMENTS_DICT,
	SET_APARTMENTS_LOCAL,
	SET_UNSORTED_APARTMENTS,
} from '../Types/types';

const initialState = {
	apartments: [],
	apartmentsLocal: [],
	unSortedApartments: [],
	apartmentsDict: {},
};

const apartmentsReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_APARTMENTS: {
			return {
				...state,
				apartments: actions.payload,
			};
		}
		case SET_APARTMENTS_DICT: {
			return {
				...state,
				apartmentsDict: actions.payload,
			};
		}
		case SET_APARTMENTS_LOCAL: {
			return {
				...state,
				apartmentsLocal: actions.payload,
			};
		}
		case SET_UNSORTED_APARTMENTS: {
			return {
				...state,
				unSortedApartments: actions.payload,
			};
		}
		case CLEAR_APARTMENTS: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default apartmentsReducer;
