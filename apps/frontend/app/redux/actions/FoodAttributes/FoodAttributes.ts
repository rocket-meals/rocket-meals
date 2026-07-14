import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class FoodAttributesHelper extends CollectionHelper<DatabaseTypes.FoodsAttributes> {
	constructor(client?: any) {
		super('foods_attributes', client);
	}

	async fetchAllFoodAttributes(queryOverride?: Query<DatabaseTypes.FoodsAttributes>) {
		const defaultQuery = {
			fields: ['*, translations.*'],
			deep: buildTranslationsDeep(),
			limit: -1,
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	async fetchFoodAttributeById(id: string, queryOverride?: Query<DatabaseTypes.FoodsAttributes>) {
		const defaultQuery = {
			fields: ['*, translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}
}
