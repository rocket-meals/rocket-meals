import {
	CLEAR_FORM,
	SET_FORM_FILTER,
	SET_FORM_SUBMISSION,
} from '@/redux/Types/types';

const initialState = {
	filterBy: 'draft',
	formSubmission: {},
};

const formReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case SET_FORM_FILTER: {
			return {
				...state,
				filterBy: actions.payload,
			};
		}
		case SET_FORM_SUBMISSION: {
			return {
				...state,
				formSubmission: actions.payload,
			};
		}
		case CLEAR_FORM: {
			return {
				...initialState,
			};
		}
		default:
			return state;
	}
};

export default formReducer;
