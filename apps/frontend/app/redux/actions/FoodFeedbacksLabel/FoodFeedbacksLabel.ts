import { itemStatus } from '@/constants/Constants';
import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class FoodFeedbackLabelHelper extends CollectionHelper<DatabaseTypes.FoodsFeedbacksLabels> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('foods_feedbacks_labels', client || ServerAPI.getClient());
	}

	// Fetch all food feedback labels with optional query overrides
	async fetchFoodFeedbackLabels(queryOverride: any = {}) {
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
	async fetchFoodFeedbackLabelById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	// Create a new food feedback label
	async createFoodFeedbackLabel(labelData: any) {
		return await this.createItem(labelData);
	}

	// Update an existing food feedback label
	async updateFoodFeedbackLabel(id: string, updatedData: any) {
		return await this.updateItem(id, updatedData);
	}

	// Delete a food feedback label
	async deleteFoodFeedbackLabel(id: string) {
		return await this.deleteItem(id);
	}

	// Fetch a single food feedback label item directly by ID (alternative)
	async itemFoodFeedbackLabel(id: string) {
		return await this.readItem(id);
	}
}
