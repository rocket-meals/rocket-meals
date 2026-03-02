import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { DatabaseTypes, DateHelper } from 'repo-depkit-common';

export class UtilizationEntryHelper extends CollectionHelper<DatabaseTypes.UtilizationsEntries> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('utilizations_entries', client || ServerAPI.getClient());
	}

	// Fetch utilization entries with query overrides
	async fetchUtilizationEntries(queryOverride: any = {}, utilizationGroupId: string, dateToGet: string) {
		// Default query structure
		const defaultQuery = {
			fields: ['*, utilization_group.*'],
			filter: {
				_and: [], // Start with an empty array
			},
			limit: -1, // No limit by default, fetch all matching entries
		};

		let date = new Date(dateToGet);
		const date_start = new Date(date);
		date_start.setHours(0, 0, 0, 0);

		const date_end = new Date(date_start);
		date_end.setDate(date_end.getDate() + 1);

		// Add default filters if utilizationGroupId, dateStart, and dateEnd are provided
		if (utilizationGroupId) {
			defaultQuery.filter._and.push({
				utilization_group: { _eq: utilizationGroupId },
			});
		}

		if (date_start) {
			defaultQuery.filter._and.push({
				date_start: {
					_gte: DateHelper.formatDateToIso8601WithoutTimezone(date_start),
				},
			});
		}

		if (date_end) {
			defaultQuery.filter._and.push({
				date_end: {
					_lte: DateHelper.formatDateToIso8601WithoutTimezone(date_end),
				},
			});
		}

		// Merge the dynamic query override with the default query
		const query = { ...defaultQuery, ...queryOverride };

		// Perform the query
		return await this.readItems(query);
	}

	// Fetch a specific utilization entry by ID
	async fetchUtilizationEntryById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'], // Adjust the fields as needed
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	// Create a new utilization entry
	async createUtilizationEntry(entryData: any) {
		return await this.createItem(entryData);
	}

	// Update an existing utilization entry
	async updateUtilizationEntry(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a utilization entry
	async deleteUtilizationEntry(id: string) {
		return await this.deleteItem(id);
	}

	// Static method to query utilization entries with a custom query
	public static async QueryData(data: any, query: any) {
		return await ServerAPI.getClient().request(query);
	}
}
