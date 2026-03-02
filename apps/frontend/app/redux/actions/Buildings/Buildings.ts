import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class BuildingsHelper extends CollectionHelper<DatabaseTypes.Buildings> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('buildings', client || ServerAPI.getClient());
	}

	// Fetch all buildings with optional query overrides
	async fetchBuildings(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	// Fetch a specific building by ID
	async fetchBuildingById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*, businesshours.*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	// Create a new building
	async createBuilding(buildingData: any) {
		return await this.createItem(buildingData);
	}

	// Update an existing building
	async updateBuilding(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a building
	async deleteBuilding(id: string) {
		return await this.deleteItem(id);
	}
}
