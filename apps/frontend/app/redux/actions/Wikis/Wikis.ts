import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper, Query } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
 // API client

export class WikisHelper extends CollectionHelper<DatabaseTypes.Wikis> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('wikis', client);
	}

	// Fetch all wikis for menus/lists. Deliberately excludes translations.content (the
	// markdown body): this list is kept in redux for the drawer/footer menus and only
	// needs the title, not the full page - the content is fetched on demand for whichever
	// wiki the user actually opens, see fetchWikiWithContent().
	// Only published wikis: archived ones (e.g. a legal document replaced by the one from code,
	// custom_id "legacy-...") would otherwise show up a second time in the footer and the drawer.
	async fetchWikis(queryOverride?: Query<DatabaseTypes.Wikis>) {
		const defaultQuery = {
			fields: ['*', 'translations.id', 'translations.languages_code', 'translations.title'],
			filter: { status: { _eq: 'published' } },
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	// Fetch a single wiki including its full translations (title + content). Used by the
	// wiki detail screen when a page is actually opened - callers should keep the result
	// in local component state and must not dispatch/persist it into redux.
	async fetchWikiWithContent(params: { id?: string; custom_id?: string }) {
		const { id, custom_id } = params;
		if (!id && !custom_id) return undefined;
		const items = await this.readItems({
			fields: ['*', 'translations.*'],
			filter: id ? { id: { _eq: id } } : { custom_id: { _eq: custom_id } },
			limit: 1,
		});
		return items?.[0];
	}

	// Fetch a specific wikis by ID
	async fetchWikisById(id: string, queryOverride?: Query<DatabaseTypes.Wikis>) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
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
