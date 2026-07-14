import axios from '@/interceptor';
import { DatabaseTypes, DirectusItemStatus } from 'repo-depkit-common';
import { buildTranslationsDeep } from '@/helper/translationLanguageQuery';

const TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;

const fetchWithRetry = async (url: string, config: any) => {
	let lastError;
	for (let i = 0; i < MAX_RETRIES; i++) {
		try {
			return await axios.get(url, { ...config, timeout: TIMEOUT_MS });
		} catch (error: any) {
			lastError = error;
			const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
			const isNetworkError = !error.response;
			const isServerError = error.response?.status >= 500;

			if (i < MAX_RETRIES - 1 && (isTimeout || isNetworkError || isServerError)) {
				const delay = 1000 * Math.pow(2, i);
				await new Promise((resolve) => setTimeout(resolve, delay));
				continue;
			}
			break;
		}
	}
	throw lastError;
};

/**
 * Filters out foodoffers where the associated food has status 'archived'.
 * This ensures that even if archived-food foodoffers exist on the server,
 * they are not displayed in the frontend.
 */
const filterNonArchivedFoodOffers = (foodoffers: DatabaseTypes.Foodoffers[]): DatabaseTypes.Foodoffers[] => {
	return foodoffers.filter(
		(foodoffer) => (foodoffer.food as DatabaseTypes.Foods | null | undefined)?.status !== DirectusItemStatus.ARCHIVED
	);
};

/**
 * Applies the archived-food filter to a Directus list response object.
 * Returns the response unchanged if it does not contain a `data` array.
 */
const applyArchivedFoodFilter = (responseData: { data?: DatabaseTypes.Foodoffers[] } | null): typeof responseData => {
	if (responseData && Array.isArray(responseData.data)) {
		return { ...responseData, data: filterNonArchivedFoodOffers(responseData.data) };
	}
	return responseData;
};

export const fetchFoodOffers = async () => {
	try {
		const response = await fetchWithRetry('/items/foodoffers', {
			params: {
				fields: '*.*',
				limit: -1,
			},
		});
		return response.data;
	} catch (error) {
		console.error('fetchFoodOffers error:', error);
		throw new Error('Error fetching Food Offers');
	}
};

export const fetchFoodOffersByCanteen = async (canteenId: string, selected: string) => {
	try {
		// Date format should be YYYY-MM-DD
		const paramDateStart = new Date(selected).toISOString().split('T')[0];
		const paramDateEnd = new Date(selected).toISOString().split('T')[0];

		const response = await fetchWithRetry('/items/foodoffers', {
			params: {
				fields: '*, markings.*,food.*,food.translations.*, attribute_values.*, attribute_values.food_attribute.*,attribute_values.food_attribute.group.*, attribute_values.food_attribute.translations.*, foods_attributes_values.*', // Fetch all fields, including related ones
				deep: buildTranslationsDeep('food.translations', 'attribute_values.food_attribute.translations'),
				limit: -1, // Remove limit to fetch all results
				filter: {
					_and: [
						{
							canteen: {
								_eq: canteenId, // Filter where "canteen" equals the provided ID
							},
						},
						{
							_or: [
								{
									_and: [
										{
											date: {
												_gte: paramDateStart,
											},
										},
										{
											date: {
												_lte: paramDateEnd,
											},
										},
									],
								},
								{
									date: {
										_null: true, // Include entries with null dates
									},
								},
							],
						},
					],
				},
			},
		});
		return applyArchivedFoodFilter(response.data);
	} catch (error) {
		console.error('fetchFoodOffersByCanteen error:', error);
		throw new Error('Error fetching Food Offers');
	}
};

export const fetchFoodsByCanteen = async (canteenId: string, selected?: string) => {
	try {
		// Initialize date filter variables only if `selected` is provided
		const paramDateStart = selected ? new Date(selected).toISOString().split('T')[0] : null;
		const paramDateEnd = selected ? new Date(selected).toISOString().split('T')[0] : null;

		// Construct the base filter
		const baseFilter: any[] = [
			{
				canteen: {
					_eq: canteenId, // Filter where "canteen" equals the provided ID
				},
			},
		];

		// Conditionally add date-related filters only if `selected` is provided
		if (paramDateStart && paramDateEnd) {
			baseFilter.unshift({
				_or: [
					{
						_and: [
							{
								date: {
									_gte: paramDateStart,
								},
							},
							{
								date: {
									_lte: paramDateEnd,
								},
							},
						],
					},
					{
						date: {
							_null: true, // Include entries with null dates
						},
					},
				],
			});
		}

		const response = await fetchWithRetry('/items/foodoffers', {
			params: {
				fields: '*,food.*,!food.feedbacks,food.translations.*,markings.*, attribute_values.*, attribute_values.food_attribute.*,attribute_values.food_attribute.group.*, attribute_values.food_attribute.translations.*, foods_attributes_values.*', // Exclude food.feedbacks field as per the API call
				deep: buildTranslationsDeep('food.translations', 'attribute_values.food_attribute.translations'),
				limit: -1, // Fetch all results
				filter: { _and: baseFilter },
			},
		});

		return applyArchivedFoodFilter(response.data);
	} catch (error) {
		throw new Error('Error fetching Food Offers');
	}
};

export const fetchFoodOffersDetailsById = async (id: string) => {
	try {
		const deep = buildTranslationsDeep(
			'food.translations',
			'food.food_category.translations',
			'foodoffer_category.translations',
			'attribute_values.food_attribute.translations'
		);
		deep.food.feedbacks = {
			_filter: {
				comment: { _nnull: true },
			},
			_sort: '-date_updated',
		};
		const response = await fetchWithRetry(`/items/foodoffers/${id}`, {
			params: {
				fields: '*, markings.*,food.*,food.feedbacks.*,food.translations.*,food.food_category.*,food.food_category.translations.*,foodoffer_category.*,foodoffer_category.translations.*,attribute_values.*, attribute_values.food_attribute.*, attribute_values.food_attribute.translations.*, foods_attributes_values.*',
				limit: -1,
				deep,
			},
		});
		return response.data;
	} catch (error) {
		throw new Error('Error fetching Food Offers');
	}
};

export const fetchFoodofferComponentsById = async (id: string) => {
	try {
		const response = await fetchWithRetry(`/items/foodoffers/${id}`, {
			params: {
				fields: 'foodoffer_components.component_foodoffers_id.*,foodoffer_components.component_foodoffers_id.markings.*',
				limit: -1,
			},
		});
		return response.data;
	} catch (error) {
		throw new Error('Error fetching Foodoffer Components');
	}
};

export const fetchNextFoodOfferByFoodAndCanteen = async (foodId: string, canteenId: string) => {
	try {
		const today = new Date().toISOString().split('T')[0];
		const response = await fetchWithRetry('/items/foodoffers', {
			params: {
				fields: 'id,date,food,canteen',
				limit: 1,
				sort: 'date',
				filter: {
					_and: [
						{ food: { _eq: foodId } },
						{ canteen: { _eq: canteenId } },
						{ date: { _nnull: true } },
						{ date: { _gte: today } },
					],
				},
			},
		});
		const items = response?.data?.data;
		return Array.isArray(items) && items.length > 0 ? items[0] : null;
	} catch (error) {
		throw new Error(`Error fetching next food offer: ${(error as Error).message}`);
	}
};

export const fetchLastFoodOfferByFoodAndCanteen = async (foodId: string, canteenId: string) => {
	try {
		const response = await fetchWithRetry('/items/foodoffers', {
			params: {
				fields: 'id,date,food,canteen',
				limit: 1,
				sort: '-date',
				filter: {
					_and: [
						{ food: { _eq: foodId } },
						{ canteen: { _eq: canteenId } },
						{ date: { _nnull: true } },
					],
				},
			},
		});
		const items = response?.data?.data;
		return Array.isArray(items) && items.length > 0 ? items[0] : null;
	} catch (error) {
		throw new Error(`Error fetching last food offer: ${(error as Error).message}`);
	}
};

export const fetchFoodDetailsById = async (id: string) => {
	try {
		const deep = buildTranslationsDeep();
		deep.feedbacks = {
			_filter: {
				comment: { _nnull: true },
			},
			_sort: '-date_updated',
		};
		const response = await fetchWithRetry(`/items/foods/${id}`, {
			params: {
				fields: '*, markings.*,feedbacks.*,food.*,translations.*',
				limit: -1,
				deep,
			},
		});
		return response.data;
	} catch (error) {
		throw new Error('Error fetching Food Offers');
	}
};

// Fetch foods feedbacks, labels, and entries with specific filters, aggregation, and grouping
export const fetchFoodsFeedbacksLabelsEntries = async (foodId: string, labelId: string) => {
	try {
		const response = await fetchWithRetry('/items/foods_feedbacks_labels_entries', {
			params: {
				filter: {
					_and: [
						{
							like: { _nnull: true }, // Ensure "like" is not null
						},
						{
							food: { _eq: foodId }, // Filter where "food" equals the provided ID
						},
						{
							label: { _eq: labelId }, // Filter where "label" equals the provided ID
						},
					],
				},
				aggregate: {
					count: '*', // Count all matching entries
				},
				groupBy: 'like', // Group results by "like"
			},
		});

		return response.data;
	} catch (error) {
		throw new Error('Error fetching Foods Feedbacks Labels Entries');
	}
};

export const fetchBuildings = async () => {
	try {
		const response = await fetchWithRetry('/items/buildings?fields=*&limit=-1', {});
		return response.data;
	} catch (error) {
		throw new Error(`Error Fetching Buildings`);
	}
};
