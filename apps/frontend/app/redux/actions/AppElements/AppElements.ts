import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class AppElementsHelper extends CollectionHelper<DatabaseTypes.AppElements> {
	constructor(client?: any) {
		super('app_elements', client);
	}

	async fetchAllAppElements(queryOverride?: Query<DatabaseTypes.AppElements>) {
		const defaultQuery = {
			fields: ['* , translations.*'],
			deep: buildTranslationsDeep(),
			limit: -1,
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	async fetchAppElementsById(id: string, queryOverride?: Query<DatabaseTypes.AppElements>) {
		const defaultQuery = {
			fields: ['*, translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}
}
