import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class FoodAttributesValuesHelper extends CollectionHelper<DatabaseTypes.FoodsAttributesValues> {
	constructor(client?: any) {
		super('foods_attributes_values', client || ServerAPI.getClient());
	}

	async fetchAllFoodAttributes(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
			limit: -1,
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchFoodAttributeById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*, food_attribute.*, food_attribute.translations.*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
