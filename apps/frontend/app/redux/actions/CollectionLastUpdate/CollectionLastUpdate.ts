import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class CollectionLastUpdateHelper extends CollectionHelper<DatabaseTypes.CollectionsDatesLastUpdate> {
	constructor(client?: any) {
		super('collections_dates_last_update', client || ServerAPI.getClient());
	}

	async fetchCollectionDatesLastUpdate(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
			limit: -1,
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}
}
