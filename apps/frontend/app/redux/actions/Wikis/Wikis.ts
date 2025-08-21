import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class WikisHelper extends CollectionHelper<DatabaseTypes.Wikis> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('wikis', client || ServerAPI.getClient());
	}

	// Fetch all wikis with optional query overrides
	async fetchWikis(queryOverride: any = {}) {
		const defaultQuery = {
			fields: [' *.* '],
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	// Fetch a specific wikis by ID
	async fetchWikisById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	// Create a new wikis
	async createWikis(canteenData: any) {
		return await this.createItem(canteenData);
	}

	// Update an existing wikis
	async updateWikis(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a wikis
	async deleteWikis(id: string) {
		return await this.deleteItem(id);
	}
}
