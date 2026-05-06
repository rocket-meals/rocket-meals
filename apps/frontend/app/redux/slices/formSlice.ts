import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FormState, FormQueueEntry, CachedFormEntry } from '@/redux/Types/stateTypes';
import { DatabaseTypes } from 'repo-depkit-common';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';

const byFormSubmissionIdKey = (item: any): string | null =>
	item?.form_submission_id ? String(item.form_submission_id) : idKey(item);

const initialState: FormState = {
	filterBy: 'draft',
	formSubmission: {} as DatabaseTypes.FormSubmissions,
	formQueueDict: {} as Record<string, FormQueueEntry>,
	cachedFormData: {} as Record<string, CachedFormEntry>,
	cachedFormCategoriesDict: {} as Record<string, DatabaseTypes.FormCategories>,
	cachedFormsDict: {} as Record<string, Record<string, DatabaseTypes.Forms>>,
};

const formSlice = createSlice({
	name: 'form',
	initialState,
	reducers: {
		setFormFilter: (state, action: PayloadAction<string>) => { state.filterBy = action.payload; },
		setFormSubmission: (state, action: PayloadAction<any>) => { state.formSubmission = action.payload; },
		addFormQueueEntry: (state, action: PayloadAction<any>) => {
			const key = byFormSubmissionIdKey(action.payload);
			if (key) state.formQueueDict[key] = action.payload;
		},
		removeFormQueueEntry: (state, action: PayloadAction<any>) => {
			const idToRemove = String(action.payload ?? '');
			Object.keys(state.formQueueDict).forEach((key) => {
				const entry = (state.formQueueDict as any)[key];
				if (String(entry?.id) === idToRemove || String(entry?.form_submission_id) === idToRemove) {
					delete (state.formQueueDict as any)[key];
				}
			});
		},
		updateFormQueueEntry: (state, action: PayloadAction<any>) => {
			const payload = action.payload;
			const idToUpdate = String(payload?.id ?? '');
			let updatedKey: string | null = null;
			Object.keys(state.formQueueDict).forEach((key) => {
				const entry = (state.formQueueDict as any)[key];
				if (String(entry?.id) === idToUpdate) {
					(state.formQueueDict as any)[key] = { ...entry, ...payload };
					updatedKey = key;
				}
			});
			if (!updatedKey) {
				const key = byFormSubmissionIdKey(payload);
				if (key) (state.formQueueDict as any)[key] = payload;
			}
		},
		clearFormQueue: (state) => { state.formQueueDict = {}; },
		setCachedFormData: (state, action: PayloadAction<any>) => {
			const { form_id, form, submissions, answers } = action.payload;
			(state.cachedFormData as any)[form_id] = { form, submissions, answers };
		},
		clearCachedFormData: (state) => { state.cachedFormData = {}; },
		setCachedFormCategories: (state, action: PayloadAction<any>) => {
			state.cachedFormCategoriesDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setCachedForms: (state, action: PayloadAction<any>) => {
			const { category_id, forms } = action.payload;
			const formsDict = arrayToDict(forms, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			(state.cachedFormsDict as any)[String(category_id)] = formsDict;
		},
		clearForm: () => initialState,
	},
	extraReducers: (builder) => {
		builder
			.addCase('SET_FORM_FILTER', (state, action: any) => { state.filterBy = action.payload; })
			.addCase('SET_FORM_SUBMISSION', (state, action: any) => { state.formSubmission = action.payload; })
			.addCase('ADD_FORM_QUEUE_ENTRY', (state, action: any) => {
				const key = byFormSubmissionIdKey(action.payload);
				if (key) (state.formQueueDict as any)[key] = action.payload;
			})
			.addCase('REMOVE_FORM_QUEUE_ENTRY', (state, action: any) => {
				const idToRemove = String(action.payload ?? '');
				Object.keys(state.formQueueDict).forEach((key) => {
					const entry = (state.formQueueDict as any)[key];
					if (String(entry?.id) === idToRemove || String(entry?.form_submission_id) === idToRemove)
						delete (state.formQueueDict as any)[key];
				});
			})
			.addCase('UPDATE_FORM_QUEUE_ENTRY', (state, action: any) => {
				const payload = action.payload;
				const idToUpdate = String(payload?.id ?? '');
				let updatedKey: string | null = null;
				Object.keys(state.formQueueDict).forEach((key) => {
					const entry = (state.formQueueDict as any)[key];
					if (String(entry?.id) === idToUpdate) {
						(state.formQueueDict as any)[key] = { ...entry, ...payload };
						updatedKey = key;
					}
				});
				if (!updatedKey) {
					const key = byFormSubmissionIdKey(payload);
					if (key) (state.formQueueDict as any)[key] = payload;
				}
			})
			.addCase('CLEAR_FORM_QUEUE', (state) => { state.formQueueDict = {}; })
			.addCase('SET_CACHED_FORM_DATA', (state, action: any) => {
				const { form_id, form, submissions, answers } = action.payload;
				(state.cachedFormData as any)[form_id] = { form, submissions, answers };
			})
			.addCase('CLEAR_CACHED_FORM_DATA', (state) => { state.cachedFormData = {}; })
			.addCase('SET_CACHED_FORM_CATEGORIES', (state, action: any) => {
				state.cachedFormCategoriesDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_CACHED_FORMS', (state, action: any) => {
				const { category_id, forms } = action.payload;
				const formsDict = arrayToDict(forms, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
				(state.cachedFormsDict as any)[String(category_id)] = formsDict;
			})
			.addCase('CLEAR_FORM', () => initialState);
	},
});

export const {
	setFormFilter, setFormSubmission, addFormQueueEntry, removeFormQueueEntry,
	updateFormQueueEntry, clearFormQueue, setCachedFormData, clearCachedFormData,
	setCachedFormCategories, setCachedForms, clearForm,
} = formSlice.actions;

export default formSlice.reducer;
