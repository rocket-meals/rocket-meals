import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class FormCategoriesHelper extends CollectionHelper<DatabaseTypes.FormCategories> {
	constructor(client?: any) {
		super('form_categories', client);
	}

	async fetchFormCategories(queryOverride?: Query<DatabaseTypes.FormCategories>) {
		const defaultQuery = {
			fields: [' * , translations.*'],
			deep: buildTranslationsDeep(),
			limit: -1,
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	async fetchFormCategoryById(id: string, queryOverride?: Query<DatabaseTypes.FormCategories>) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}
}
