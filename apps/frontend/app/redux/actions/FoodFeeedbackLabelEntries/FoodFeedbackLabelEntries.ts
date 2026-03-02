import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { DatabaseTypes } from 'repo-depkit-common';

export class FoodFeedbackLabelEntryHelper extends CollectionHelper<DatabaseTypes.FoodsFeedbacksLabelsEntries> {
	constructor(client?: any) {
		super('foods_feedbacks_labels_entries', client || ServerAPI.getClient());
	}

	// Helper to build default query
	private buildQuery(queryOverride: any, defaultQuery: any) {
		return { ...defaultQuery, ...queryOverride };
	}

	// Fetch food feedback label entries with query overrides
	async fetchFoodFeedbackLabelEntries(queryOverride: any = {}) {
		const defaultQuery = {
			filter: {
				_and: [
					{ like: { _nnull: true } }, // Ensure 'like' is not null
					{ food: { _eq: '3183' } }, // Example food ID
					{ label: { _eq: 'e3abe9e2-e596-43b4-9c2f-12b9c5f29386' } }, // Example label ID
				],
			},
			aggregate: { count: '*' },
			groupBy: 'like',
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}

	// Fetch food feedback label entries by profile
	async fetchFoodFeedbackLabelEntriesByProfile(profileId: string, queryOverride: any = {}) {
		const defaultQuery = {
			filter: {
				_and: [{ profile: { _eq: profileId } }, { status: { _eq: 'published' } }],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}

	// Fetch a specific food feedback label entry by ID
	async fetchFoodFeedbackLabelEntryById(id: string, queryOverride: any = {}) {
		const defaultQuery = { fields: ['*'] };
		return await this.readItem(id, this.buildQuery(queryOverride, defaultQuery));
	}

	// Update or create food feedback label entry
	async updateFoodFeedbackLabelEntry(foodId: string, profile_id: string, foodFeedbackLabelEntriesData: DatabaseTypes.FoodsFeedbacksLabelsEntries[] | null | undefined, foodFeedbackLabelId: string, like: boolean | null, canteen_id: string | null | undefined, foodoffer_id: string | null | undefined) {
		// Default to empty array if no entries provided
		let foodFeedbackLabelEntries = foodFeedbackLabelEntriesData ?? [];

		// Check for existing entry
		let existingEntry = foodFeedbackLabelEntries?.find(x => x.label === foodFeedbackLabelId && x.food === foodId);
		let isNewEntry = !existingEntry;

		// Prepare new entry data
		const newFoodFeedbackLabelEntry: Partial<DatabaseTypes.FoodsFeedbacksLabelsEntries> = {
			food: foodId,
			label: foodFeedbackLabelId,
			like,
			profile: profile_id,
		};

		// Create a new entry if not found
		if (isNewEntry) {
			existingEntry = (await this.createItem(newFoodFeedbackLabelEntry)) as DatabaseTypes.FoodsFeedbacksLabelsEntries;
		}

		// Handle missing entry
		if (!existingEntry) {
			console.error('updateFoodFeedbackRemote: existingFoodFeedbackLabelEntry is undefined');
			return;
		}

		// Update entry fields
		existingEntry.like = like;
		if (canteen_id) existingEntry.canteen = canteen_id;
		if (foodoffer_id) existingEntry.foodoffer = foodoffer_id;

		// If 'like' is null or undefined, delete the entry
		const shouldDelete = existingEntry.like === null || existingEntry.like === undefined;
		if (shouldDelete && existingEntry.id) {
			await this.deleteItem(existingEntry.id);
			return null;
		} else {
			// Update the entry
			return await this.updateItem(existingEntry.id, existingEntry);
		}
	}

	// Create a new food feedback label entry
	async createFoodFeedbackLabelEntry(entryData: any) {
		return await this.createItem(entryData);
	}

	// Update an existing food feedback label entry
	async updateFoodFeedbackLabelEntryById(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a food feedback label entry
	async deleteFoodFeedbackLabelEntry(id: string) {
		return await this.deleteItem(id);
	}

	// Fetch a single food feedback label entry directly by ID
	async itemFoodFeedbackLabelEntry(id: string) {
		return await this.readItem(id);
	}

	// Static method to query food feedback label entries with a custom query
	public static async QueryData(data: any, query: any) {
		return await ServerAPI.getClient().request(query);
	}
}
