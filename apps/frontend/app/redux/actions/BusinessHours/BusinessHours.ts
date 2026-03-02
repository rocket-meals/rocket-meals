import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class BusinessHoursHelper extends CollectionHelper<DatabaseTypes.Businesshours> {
	constructor(client?: any) {
		super('businesshours', client || ServerAPI.getClient());
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
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
