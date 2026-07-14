import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class BusinessHoursHelper extends CollectionHelper<DatabaseTypes.Businesshours> {
	constructor(client?: any) {
		super('businesshours', client);
	}

	async fetchBusinessHours(queryOverride: any = {}) {
		const defaultQuery = {
			fields: [' * '],
			filter: { status: { _eq: 'published' } },
			limit: -1,
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchBusinessHoursById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*, translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
