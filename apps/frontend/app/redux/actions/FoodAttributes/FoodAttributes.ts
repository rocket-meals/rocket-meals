import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class FoodAttributesHelper extends CollectionHelper<DatabaseTypes.FoodsAttributes> {
	constructor(client?: any) {
		super('foods_attributes', client || ServerAPI.getClient());
	}

	async fetchAllFoodAttributes(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*, translations.*'],
			limit: -1,
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchFoodAttributeById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*, translations.*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
