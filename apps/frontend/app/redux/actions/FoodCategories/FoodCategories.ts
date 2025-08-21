import { itemStatus } from '@/constants/Constants';
import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class FoodCategoriesHelper extends CollectionHelper<DatabaseTypes.FoodsCategories> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('foods_categories', client || ServerAPI.getClient());
	}

	// Fetch all food categories with optional query overrides
	async fetchFoodCategories(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
			limit: -1, // Fetch all
			filter: {
				_and: [{ status: { _eq: itemStatus } }],
			},
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchFoodCategoriesById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	async createFoodCategories(canteenData: any) {
		return await this.createItem(canteenData);
	}

	async updateFoodCategories(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	async deleteFoodCategories(id: string) {
		return await this.deleteItem(id);
	}
}
