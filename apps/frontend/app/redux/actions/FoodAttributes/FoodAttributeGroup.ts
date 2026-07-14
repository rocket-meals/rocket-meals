import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class FoodAttributeGroupHelper extends CollectionHelper<DatabaseTypes.FoodsAttributesGroups> {
	constructor(client?: any) {
		super('foods_attributes_groups', client);
	}

	async fetchAllFoodAttributeGroups(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*, translations.*'],
			deep: buildTranslationsDeep(),
			limit: -1,
			sort: ['sort'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchFoodAttributeGroupById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*,translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
