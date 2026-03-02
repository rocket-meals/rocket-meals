import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class FoodAttributeGroupHelper extends CollectionHelper<DatabaseTypes.FoodsAttributesGroups> {
	constructor(client?: any) {
		super('foods_attributes_groups', client || ServerAPI.getClient());
	}

	async fetchAllFoodAttributeGroups(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*, translations.*'],
			limit: -1,
			sort: ['sort'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchFoodAttributeGroupById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*,translations.*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
