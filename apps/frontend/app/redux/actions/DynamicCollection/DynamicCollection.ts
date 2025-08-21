import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class DynamicCollectionHelper extends CollectionHelper<any> {
	constructor(collection: string, client?: any) {
		super(collection, client || ServerAPI.getClient());
	}

	async fectAllCollection(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}
}
