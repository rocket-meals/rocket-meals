import { itemStatus } from '@/constants/Constants';
import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class FoodOffersCategoriesHelper extends CollectionHelper<DatabaseTypes.FoodoffersCategories> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('foodoffers_categories', client || ServerAPI.getClient());
	}

	// Fetch all food categories with optional query overrides
	async fetchFoodOffersCategories(queryOverride: any = {}) {
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

	async fetchFoodOffersCategoriesById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	async createFoodOffersCategories(canteenData: any) {
		return await this.createItem(canteenData);
	}

	async updateFoodOffersCategories(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	async deleteFoodOffersCategories(id: string) {
		return await this.deleteItem(id);
	}
}
