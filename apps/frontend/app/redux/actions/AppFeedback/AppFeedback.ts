import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';

export class AppFeedback extends CollectionHelper<DatabaseTypes.AppFeedbacks> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('app_feedbacks', client || ServerAPI.getClient());
	}

	// Fetch all app settings with optional query overrides
	async fetchAppFeedback(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
			sort: ['sort', '-date_created'],
			filter: {},
			limit: 100,
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	async fetchAppFeedbackById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	async updateAppFeedback(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	async createAppFeedback(data: any) {
		return await this.createItem(data);
	}
}
