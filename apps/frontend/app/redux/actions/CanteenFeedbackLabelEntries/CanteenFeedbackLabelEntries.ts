import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { DatabaseTypes } from 'repo-depkit-common';
import { itemStatus } from '@/constants/Constants';

export class CanteenFeedbackLabelEntryHelper extends CollectionHelper<DatabaseTypes.CanteensFeedbacksLabelsEntries> {
	constructor(client?: any) {
		super('canteens_feedbacks_labels_entries', client || ServerAPI.getClient());
	}

	// Helper to build default query
	private buildQuery(queryOverride: any, defaultQuery: any) {
		return { ...defaultQuery, ...queryOverride };
	}
	// Fetch canteen feedback label entries with query overrides
	async fetchCanteenFeedbackLabelEntries(queryOverride: any = {}, date: string, canteenId: string, labelId: string) {
		const defaultQuery = {
			filter: {
				_and: [
					{ like: { _nnull: true } }, // Ensure 'like' is not null
					{ date: { _eq: date } }, // Specific date
					{ canteen: { _eq: canteenId } }, // Specific canteen ID
					{ label: { _eq: labelId } }, // Specific label ID
				],
			},
			aggregate: { count: '*' }, // Count all entries
			groupBy: ['like'], // Group by 'like' field
		};

		// Combine the default query with any overrides
		const finalQuery = { ...defaultQuery, ...queryOverride };

		// Execute the query using the SDK method
		return await this.readItems(finalQuery);
	}

	// Fetch canteen feedback label entries by profile
	async fetchCanteenFeedbackLabelEntriesByProfile(profileId: string, queryOverride: any = {}) {
		const defaultQuery = {
			filter: {
				_and: [{ profile: { _eq: profileId } }, { status: { _eq: itemStatus } }],
			},
		};
		return await this.readItems(this.buildQuery(queryOverride, defaultQuery));
	}

	// Fetch a specific Canteen feedback label entry by ID
	async fetchCanteenFeedbackLabelEntryById(id: string, queryOverride: any = {}) {
		const defaultQuery = { fields: ['*'] };
		return await this.readItem(id, this.buildQuery(queryOverride, defaultQuery));
	}

	// Update or create food feedback label entry
	async updateCanteenFeedbackLabelEntry(profile_id: string, canteenFeedbackLabelEntriesData: DatabaseTypes.CanteensFeedbacksLabelsEntries[] | null | undefined, canteenFeedbackLabelId: string, like: boolean | null, canteen_id: string | null | undefined, date: string) {
		// Default to empty array if no entries provided
		let canteenFeedbackLabelEntries = canteenFeedbackLabelEntriesData ?? [];

		// Check for existing entry
		// let existingEntry = foodFeedbackLabelEntries.find(x => x.label === canteenFeedbackLabelId && x.food === foodId);
		let existingEntry = canteenFeedbackLabelEntries?.find(x => x.label === canteenFeedbackLabelId && x.canteen === canteen_id && x.date === date);
		let isNewEntry = !existingEntry;

		// Prepare new entry data
		const newFoodFeedbackLabelEntry: Partial<DatabaseTypes.CanteensFeedbacksLabelsEntries> = {
			canteen: canteen_id,
			label: canteenFeedbackLabelId,
			status: itemStatus,
			date: new Date(date).toISOString(),
			like,
			profile: profile_id,
		};

		// Create a new entry if not found
		if (isNewEntry) {
			existingEntry = (await this.createItem(newFoodFeedbackLabelEntry)) as DatabaseTypes.CanteensFeedbacksLabelsEntries;
		}

		// Handle missing entry
		if (!existingEntry) {
			console.error('updateCanteenFeedbackRemote: existingCanteenFeedbackLabelEntry is undefined');
			return;
		}

		// Update entry fields
		existingEntry.like = like;
		if (canteen_id) existingEntry.canteen = canteen_id;

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

	// Create a new canteen feedback label entry
	async createCanteenFeedbackLabelEntry(entryData: any) {
		return await this.createItem(entryData);
	}

	// Update an existing canteen feedback label entry
	async updateCanteenFeedbackLabelEntryById(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a canteen feedback label entry
	async deleteCanteenFeedbackLabelEntry(id: string) {
		return await this.deleteItem(id);
	}

	// Fetch a single Canteen feedback label entry directly by ID
	async itemCanteenFeedbackLabelEntry(id: string) {
		return await this.readItem(id);
	}

	// Static method to query Canteen feedback label entries with a custom query
	public static async QueryData(data: any, query: any) {
		return await ServerAPI.getClient().request(query);
	}
}
