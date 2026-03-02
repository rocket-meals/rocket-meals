import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from '@/helper/collectionHelper'; // Reusing the CollectionHelper
import { ServerAPI } from '@/redux/actions/Auth/Auth'; // API client

export class FoodFeedbackHelper extends CollectionHelper<DatabaseTypes.FoodsFeedbacks> {
	constructor(client?: any) {
		// Pass the collection name and API client
		super('foods_feedbacks', client || ServerAPI.getClient());
	}

	async fetchAllFoodFeedbacks(queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
			limit: -1, // Fetch all
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}
	// Fetch all food feedbacks with optional query overrides
	async fetchFoodFeedbacks(usersProfileId: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
			limit: -1, // Fetch all
			filter: {
				_and: [
					{
						profile: {
							_eq: usersProfileId, // Add the user's profile ID filter
						},
					},
				],
			},
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	// Fetch a specific food feedback by ID
	async fetchFoodFeedbackById(id: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItem(id, query);
	}

	// Create new food feedback
	async createFoodFeedback(feedbackData: any) {
		return await this.createItem(feedbackData);
	}

	// Update an existing food feedback By Profile ID
	async fetchFoodFeedbackByProfileId(profileId: string, queryOverride: any = {}) {
		const defaultQuery = {
			fields: ['*'],
			limit: -1, // Fetch all
			filter: {
				_and: [
					{
						profile: {
							_eq: profileId, // Add the user's profile ID filter
						},
					},
				],
			},
		};

		const query = { ...defaultQuery, ...queryOverride };
		return await this.readItems(query);
	}

	// Update an existing food feedback
	// async updateFoodFeedback(id: string, updatedData: any) {
	//   return await this.updateItem(id, updatedData);
	// }

	// Delete a food feedback
	async deleteFoodFeedback(id: string) {
		return await this.deleteItem(id);
	}

	async updateFoodFeedback(
		foodId: string,
		profileId: string,
		// ownFeedback: DatabaseTypes.FoodsFeedbacks | null | undefined,
		feedback: DatabaseTypes.FoodsFeedbacks
	) {
		// const resourceCollectionHelper = new CollectionHelper<DatabaseTypes.FoodsFeedbacks>(TABLE_NAME_FOODS_FEEDBACKS);

		let foodFeedback = Object.values(feedback)?.length > 2 ? feedback : null;
		// Create a new feedback if it doesn't exist
		if (!foodFeedback) {
			foodFeedback = (await this.createItem({
				food: foodId,
				profile: profileId,
			})) as DatabaseTypes.FoodsFeedbacks;
			foodFeedback = { ...foodFeedback, ...feedback };
		}

		if (!foodFeedback) {
			console.error('Failed to retrieve or create food feedback.');
			return;
		}

		// remove field "chat" from foodFeedback if exists
		if ('chat' in foodFeedback) {
			delete foodFeedback.chat;
		}

		// Determine if feedback should be deleted
		const shouldDelete = !foodFeedback.rating && !foodFeedback.comment && !foodFeedback.notify;

		if (shouldDelete) {
			if (foodFeedback.id) {
				await this.deleteItem(foodFeedback.id);
				return null;
			}
		} else {
			return await this.updateItem(foodFeedback.id, foodFeedback);
		}
	}
}

