import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class AppSettingsHelper extends CollectionHelper<DatabaseTypes.AppSettings> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('app_settings', client || ServerAPI.getClient());
	}

	// Fetch all app settings with optional query overrides
	async fetchAppSettings(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*', 'housing_translations.*', 'balance_translations.*', 'login_screen_translations.*'],
			limit: -1,
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}
}
