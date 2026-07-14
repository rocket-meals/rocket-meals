import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class FormsSubmissionsHelper extends CollectionHelper<DatabaseTypes.FormSubmissions> {
	constructor(client?: any) {
		super('form_submissions', client);
	}

	async fetchFormSubmissions(queryOverride: any = {}) {
		// Destructure parameters from queryOverride and provide defaults.
		const { alias, state, page = 1, offset = 0, limit = -1, sort, form, ...restQuery } = queryOverride;

		// Build filters object based on alias and state if provided.
		const filters: any = {};
		if (form) {
			filters.form = { _eq: form };
		}
		if (alias) {
			// Using _contains to allow partial search on alias.
			filters.alias = { _contains: alias };
		}
		if (state) {
			// Assuming exact match is needed for state.
			filters.state = { _eq: state };
		}

		const defaultQuery = {
			// Only fetch the fields needed for the list view; full data is loaded on demand.
			fields: ['id', 'alias'],
			// Sort by date_updated (or custom sort if provided).
			sort: sort || ['date_updated'],
			// Apply the filters built above.
			filter: filters,
			// Set pagination defaults.
			page,
			offset,
			limit,
			...restQuery,
		};

		return await this.readItems(defaultQuery);
	}

	async fetchFormubmissionById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: [' * , translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	async updateFormSubmissionById(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}
}
