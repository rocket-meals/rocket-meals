import { ADD_FORM_QUEUE_ENTRY, CLEAR_CACHED_FORM_DATA, CLEAR_CACHED_FORMS, CLEAR_FORM, CLEAR_FORM_QUEUE, REMOVE_FORM_QUEUE_ENTRY, SET_CACHED_FORM_DATA, SET_CACHED_FORM_CATEGORIES, SET_CACHED_FORMS, SET_FORM_FILTER, SET_FORM_SUBMISSION, UPDATE_FORM_QUEUE_ENTRY } from '@/redux/Types/types';
import { CachedFormEntry, FormQueueEntry } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';

const initialState = {
	filterBy: 'draft',
	formSubmission: {},
	formQueue: [] as FormQueueEntry[],
	cachedFormData: {} as Record<string, CachedFormEntry>,
	cachedFormCategories: [] as DatabaseTypes.FormCategories[],
	cachedForms: {} as Record<string, DatabaseTypes.Forms[]>,
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
		case ADD_FORM_QUEUE_ENTRY: {
			const queue = state.formQueue || [];
			const existingIndex = queue.findIndex((entry: FormQueueEntry) => entry.form_submission_id === actions.payload.form_submission_id);
			if (existingIndex !== -1) {
				const updated = [...queue];
				updated[existingIndex] = actions.payload;
				return { ...state, formQueue: updated };
			}
			return { ...state, formQueue: [...queue, actions.payload] };
		}
		case REMOVE_FORM_QUEUE_ENTRY: {
			return {
				...state,
				formQueue: (state.formQueue || []).filter((entry: FormQueueEntry) => entry.id !== actions.payload),
			};
		}
		case UPDATE_FORM_QUEUE_ENTRY: {
			return {
				...state,
				formQueue: (state.formQueue || []).map((entry: FormQueueEntry) =>
					entry.id === actions.payload.id ? { ...entry, ...actions.payload } : entry
				),
			};
		}
		case CLEAR_FORM_QUEUE: {
			return { ...state, formQueue: [] };
		}
		case SET_CACHED_FORM_DATA: {
			const { form_id, form, submissions, answers } = actions.payload;
			return {
				...state,
				cachedFormData: {
					...(state.cachedFormData || {}),
					[form_id]: { form, submissions, answers },
				},
			};
		}
		case CLEAR_CACHED_FORM_DATA: {
			return { ...state, cachedFormData: {} };
		}
		case SET_CACHED_FORM_CATEGORIES: {
			return { ...state, cachedFormCategories: actions.payload };
		}
		case SET_CACHED_FORMS: {
			const { category_id, forms } = actions.payload;
			return {
				...state,
				cachedForms: {
					...(state.cachedForms || {}),
					[category_id]: forms,
				},
			};
		}
		case CLEAR_CACHED_FORMS: {
			return { ...state, cachedForms: {} };
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
