import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper';
import { ServerAPI } from '@/redux/actions/Auth/Auth';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class NewsHelper extends CollectionHelper<DatabaseTypes.News> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('news', client);
	}

	// Fetch all news with optional query overrides
	async fetchNews(queryOverride?: Query<DatabaseTypes.News>) {
		const defaultQuery = {
			fields: ['* , translations.*'],
			sort: ['sort', '-date'],
			limit: 100, // Fetch all
			deep: buildTranslationsDeep(),
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	// Fetch a specific news by ID
	async fetchNewsById(id: string, queryOverride?: Query<DatabaseTypes.News>) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}
}
