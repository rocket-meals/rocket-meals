import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { DatabaseTypes } from 'repo-depkit-common'; // Assuming DatabaseTypes.Markings is the required type

export class MarkingGroupsHelper extends CollectionHelper<DatabaseTypes.MarkingsGroups> {
	constructor(client?: any) {
		// Pass the collection name 'markings' and an optional API client
		super('markings_groups', client || ServerAPI.getClient());
	}

	// Helper to build default query
	private buildQuery(queryOverride: any = {}, defaultQuery: any = {}) {
		return { ...defaultQuery, ...queryOverride };
	}

	// Fetch all marking groups with optional query overrides
	async fetchMarkingGroups(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'], // Include translations
			limit: -1, // Fetch all
			filter: {
				_and: [{ status: { _eq: 'published' } }],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}

	// Fetch marking groups by profile ID
	async fetchMarkingGroupsByProfile(profileId: string, queryOverride: any = {}) {
		const defaultQuery = {
			filter: {
				_and: [
					{ profile: { _eq: profileId } }, // Filter by profile ID
					{ status: { _eq: 'published' } }, // Ensure only 'published' markings are returned
				],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}

	// Fetch a specific marking groups by ID
	async fetchMarkingGroupsById(id: string, queryOverride: any = {}) {
		const defaultQuery = { fields: ['*'] }; // Adjust fields if necessary
		return await this.readItem(id, this.buildQuery(queryOverride, defaultQuery));
	}

	// Create a new marking groups entry
	async createMarkingGroups(entryData: DatabaseTypes.Markings) {
		return await this.createItem(entryData);
	}

	// Update an existing marking groups entry by ID
	async updateMarkingGroupsById(id: string, updatedData: DatabaseTypes.Markings) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a marking groups entry by ID
	async deleteMarkingGroupsById(id: string) {
		return await this.deleteItem(id);
	}

	// Fetch a single marking groups entry directly by ID
	async itemMarkingById(id: string) {
		return await this.readItem(id);
	}

	// Static method to query marking groups with a custom query
	public static async QueryData(query: any) {
		return await ServerAPI.getClient().request(query);
	}

	// Fetch all markings groups from the server (ignores local cache)
	async loadMarkingGroupsFromServer(queryOverride: any = {}) {
		const defaultQuery = {
			filter: {
				_and: [
					{ status: { _eq: 'published' } }, // Ensure only published markings are fetched
				],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}

	// Fetch markings groups by their IDs
	async loadMarkingGroupsByIds(ids: string[], queryOverride: any = {}) {
		const defaultQuery = {
			filter: {
				_and: [{ id: { _in: ids } }],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}
}
