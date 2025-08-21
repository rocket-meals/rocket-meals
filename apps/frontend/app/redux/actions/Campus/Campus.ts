import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class CampusHelper extends CollectionHelper<DatabaseTypes.Buildings> {
	constructor(client?: any) {
		super('buildings', client || ServerAPI.getClient());
	}

	// Fetch all campuses with optional query overrides
	async fetchCampus(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['* ,translations.*, businesshours.*'],
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	// Fetch a specific canteen by ID
	async fetchCampusById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
