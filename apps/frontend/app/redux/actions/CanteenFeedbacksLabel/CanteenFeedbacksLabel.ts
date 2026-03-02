import { itemStatus } from '@/constants/Constants';
import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class CanteenFeedbackLabelHelper extends CollectionHelper<DatabaseTypes.CanteensFeedbacksLabels> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('canteens_feedbacks_labels', client || ServerAPI.getClient());
	}

	// Fetch all canteens feedback labels with optional query overrides
	async fetchCanteenFeedbackLabels(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*', 'translations.*'], // Include translations
			limit: -1, // Fetch all
			filter: {
				_and: [
					{
						status: {
							_eq: itemStatus, // Add the status filter
						},
					},
				],
			},
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	public static async QueryData(data: any, query: any) {
		return await ServerAPI.getClient().request(query);
	}

	// Fetch a specific food feedback label by ID
	async fetchCanteenFeedbackLabelById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	// Create a new Canteen feedback label
	async createCanteenFeedbackLabel(labelData: any) {
		return await this.createItem(labelData);
	}

	// Update an existing Canteen feedback label
	async updateCanteenFeedbackLabel(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a Canteen feedback label
	async deleteCanteenFeedbackLabel(id: string) {
		return await this.deleteItem(id);
	}

	// Fetch a single Canteen feedback label item directly by ID (alternative)
	async itemCanteenFeedbackLabel(id: string) {
		return await this.readItem(id);
	}
}
