import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class AppSettingsHelper extends CollectionHelper<DatabaseTypes.AppSettings> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('app_settings', client);
	}

	// Fetch all app settings with optional query overrides
	async fetchAppSettings(queryOverride?: Query<DatabaseTypes.AppSettings>) {
		const defaultQuery = {
			fields: ['*', 'translations.*', 'housing_translations.*', 'balance_translations.*', 'login_screen_translations.*'],
			deep: buildTranslationsDeep('translations', 'housing_translations', 'balance_translations', 'login_screen_translations'),
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readSingletonItem(query);
	}
}
