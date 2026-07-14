import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

export class WikisHelper extends CollectionHelper<DatabaseTypes.Wikis> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('wikis', client);
	}

	// Fetch all wikis with optional query overrides. Deliberately omits the heavy
	// translations.content field: this list feeds the drawer/footer menus (title only)
	// and is persisted via redux-persist - full wiki pages are loaded on demand with
	// fetchWikiWithContent().
	async fetchWikis(queryOverride?: Query<DatabaseTypes.Wikis>) {
		const defaultQuery = {
			fields: ['*', 'translations.id', 'translations.languages_code', 'translations.title'],
			deep: buildTranslationsDeep(),
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItems(query);
	}

	// Fetch a single wiki including its full translations (content) - used by the wiki
	// detail screen when the page is actually opened.
	async fetchWikiWithContent(params: { id?: string; custom_id?: string }) {
		const { id, custom_id } = params;
		if (!id && !custom_id) return undefined;
		const query = {
			fields: ['*', 'translations.*'],
			deep: buildTranslationsDeep(),
			filter: id ? { id: { _eq: id } } : { custom_id: { _eq: custom_id } },
			limit: 1,
		};
		const items = await this.readItems(query);
		return items?.[0];
	}

	// Fetch a specific wikis by ID
	async fetchWikisById(id: string, queryOverride?: Query<DatabaseTypes.Wikis>) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...(queryOverride || {}) };
		return await this.readItem(id, query);
	}

	// Create a new wikis
	async createWikis(canteenData: any) {
		return await this.createItem(canteenData);
	}

	// Update an existing wikis
	async updateWikis(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a wikis
	async deleteWikis(id: string) {
		return await this.deleteItem(id);
	}
}
