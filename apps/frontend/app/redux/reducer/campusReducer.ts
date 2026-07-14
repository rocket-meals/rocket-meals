import { CLEAR_CAMPUSES, SET_CAMPUSES } from '../Types/types';

const initialState = {
	campuses: [],
};

const campusReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_CAMPUSES: {
			// Strip the legacy duplicated copies (campusesDict/campusesLocal/unSortedCampuses)
			// that older app versions persisted - rehydration would otherwise keep them in the
			// redux-persist snapshot forever and bloat it far beyond the storage limits.
			const { campusesDict, campusesLocal, unSortedCampuses, ...rest } = state as Record<string, any>;
			return {
				...rest,
				campuses: actions.payload,
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
