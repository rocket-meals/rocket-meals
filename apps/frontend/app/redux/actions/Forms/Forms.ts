import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class FormsHelper extends CollectionHelper<DatabaseTypes.Forms> {
	constructor(client?: any) {
		super('forms', client || ServerAPI.getClient());
	}

	async fetchForms(queryOverride: any = {}) {
		const defaultQuery = {
			fields: [' * , translations.*'],
			limit: -1,
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchFormsById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: [' * , translations.*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}
}
