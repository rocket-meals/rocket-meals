import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class FoodOffersInfoItemsHelper extends CollectionHelper<DatabaseTypes.FoodoffersInfoItems> {
	constructor(client?: any) {
		super('foodoffers_info_items', client || ServerAPI.getClient());
	}

	async fetchFoodOffersInfoItems(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'image.*'],
			limit: -1,
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}
}
