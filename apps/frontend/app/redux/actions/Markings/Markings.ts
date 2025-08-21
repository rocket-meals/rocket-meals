import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { DatabaseTypes } from 'repo-depkit-common'; // Assuming DatabaseTypes.Markings is the required type

export class MarkingHelper extends CollectionHelper<DatabaseTypes.Markings> {
	constructor(client?: any) {
		// Pass the collection name 'markings' and an optional API client
		super('markings', client || ServerAPI.getClient());
	}

	// Helper to build default query
	private buildQuery(queryOverride: any = {}, defaultQuery: any = {}) {
		return { ...defaultQuery, ...queryOverride };
	}

	// Fetch all markings with optional query overrides
	async fetchMarkings(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'], // Include translations
			limit: -1, // Fetch all
			filter: {
				_and: [{ status: { _eq: 'published' } }],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}

	// Fetch markings by profile ID
	async fetchMarkingsByProfile(profileId: string, queryOverride: any = {}) {
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

	// Fetch a specific marking by ID
	async fetchMarkingById(id: string, queryOverride: any = {}) {
		const defaultQuery = { fields: ['*'] }; // Adjust fields if necessary
		return await this.readItem(id, this.buildQuery(queryOverride, defaultQuery));
	}

	// Create a new marking entry
	async createMarking(entryData: DatabaseTypes.Markings) {
		return await this.createItem(entryData);
	}

	// Update an existing marking entry by ID
	async updateMarkingById(id: string, updatedData: DatabaseTypes.Markings) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a marking entry by ID
	async deleteMarkingById(id: string) {
		return await this.deleteItem(id);
	}

	// Fetch a single marking entry directly by ID
	async itemMarkingById(id: string) {
		return await this.readItem(id);
	}

	// Static method to query markings with a custom query
	public static async QueryData(query: any) {
		return await ServerAPI.getClient().request(query);
	}

	// Fetch all markings from the server (ignores local cache)
	async loadMarkingsFromServer(queryOverride: any = {}) {
		const defaultQuery = {
			filter: {
				_and: [
					{ status: { _eq: 'published' } }, // Ensure only published markings are fetched
				],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}

	// Fetch markings by their IDs
	async loadMarkingsByIds(ids: string[], queryOverride: any = {}) {
		const defaultQuery = {
			filter: {
				_and: [{ id: { _in: ids } }],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}
}
