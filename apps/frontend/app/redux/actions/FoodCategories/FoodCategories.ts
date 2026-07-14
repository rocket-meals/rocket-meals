import { itemStatus } from '@/constants/Constants';
import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class FoodCategoriesHelper extends CollectionHelper<DatabaseTypes.FoodsCategories> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('foods_categories', client);
	}

	// Fetch all food categories with optional query overrides
	async fetchFoodCategories(queryOverride?: Query<DatabaseTypes.FoodsCategories>) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
			deep: buildTranslationsDeep(),
			limit: -1, // Fetch all
			filter: {
				_and: [{ status: { _eq: itemStatus } }],
			},
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	async fetchFoodCategoriesById(id: string, queryOverride?: Query<DatabaseTypes.FoodsCategories>) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}

	async createFoodCategories(canteenData: Partial<DatabaseTypes.FoodsCategories>) {
		return await this.createItem(canteenData);
	}

	async updateFoodCategories(id: string, updatedData: Partial<DatabaseTypes.FoodsCategories>) {
		return await this.updateItem(id, updatedData);
	}

	async deleteFoodCategories(id: string) {
		return await this.deleteItem(id);
	}
}
