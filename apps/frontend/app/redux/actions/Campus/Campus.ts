import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class CampusHelper extends CollectionHelper<DatabaseTypes.Buildings> {
	constructor(client?: any) {
		super('buildings', client);
	}

	// Fetch all campuses with optional query overrides
	async fetchCampus(queryOverride?: Query<DatabaseTypes.Buildings>) {
		const defaultQuery = {
			fields: ['* ,translations.*, businesshours.*'],
			deep: buildTranslationsDeep(),
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	// Fetch a specific canteen by ID
	async fetchCampusById(id: string, queryOverride?: Query<DatabaseTypes.Buildings>) {
		const defaultQuery = {
			fields: ['*', 'translations.*'],
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}
}
