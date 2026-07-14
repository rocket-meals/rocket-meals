import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class FormsHelper extends CollectionHelper<DatabaseTypes.Forms> {
	constructor(client?: any) {
		super('forms', client);
	}

	async fetchForms(queryOverride?: Query<DatabaseTypes.Forms>) {
		const defaultQuery = {
			fields: [' * , translations.*'],
			deep: buildTranslationsDeep(),
			limit: -1,
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	async fetchFormsById(id: string, queryOverride?: Query<DatabaseTypes.Forms>) {
		const defaultQuery = {
			fields: [' * , translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}
}
