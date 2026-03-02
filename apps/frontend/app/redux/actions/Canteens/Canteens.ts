import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class CanteenHelper extends CollectionHelper<DatabaseTypes.Canteens> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('canteens', client || ServerAPI.getClient());
	}

	// Fetch all canteens with optional query overrides
	async fetchCanteens(queryOverride: any = {}) {
		const defaultQuery = {
			fields: [' * , foodservice_hours.*, foodservice_hours_during_semester_break.*'],
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	// Fetch a specific canteen by ID
	async fetchCanteenById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	// Create a new canteen
	async createCanteen(canteenData: any) {
		return await this.createItem(canteenData);
	}

	// Update an existing canteen
	async updateCanteen(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a canteen
	async deleteCanteen(id: string) {
		return await this.deleteItem(id);
	}
}
