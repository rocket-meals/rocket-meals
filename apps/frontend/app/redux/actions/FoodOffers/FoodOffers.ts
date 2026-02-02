import axios from '@/interceptor';

export const fetchFoodOffers = async () => {
	try {
		const response = await axios.get('/items/foodoffers', {
			params: {
				fields: '*.*',
				limit: -1,
			},
		});
		return response.data;
	} catch (error) {
		throw new Error('Error fetching Food Offers');
	}
};

export const fetchFoodOffersByCanteen = async (canteenId: string, selected: string) => {
	try {
		// Date format should be YYYY-MM-DD
		const paramDateStart = new Date(selected).toISOString().split('T')[0];
		const paramDateEnd = new Date(selected).toISOString().split('T')[0];

		const response = await axios.get('/items/foodoffers', {
			params: {
				fields: '*, markings.*,food.*,food.translations.*, attribute_values.*, attribute_values.food_attribute.*,attribute_values.food_attribute.group.*, attribute_values.food_attribute.translations.*, foods_attributes_values.*', // Fetch all fields, including related ones
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
		return response.data;
	} catch (error) {
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

		const response = await axios.get('/items/foodoffers', {
			params: {
				fields: '*,food.*,!food.feedbacks,food.translations.*,markings.*, attribute_values.*, attribute_values.food_attribute.*,attribute_values.food_attribute.group.*, attribute_values.food_attribute.translations.*, foods_attributes_values.*', // Exclude food.feedbacks field as per the API call
				limit: -1, // Fetch all results
				filter: { _and: baseFilter },
			},
		});

		return response.data;
	} catch (error) {
		throw new Error('Error fetching Food Offers');
	}
};

export const fetchFoodOffersDetailsById = async (id: string) => {
	try {
		const response = await axios.get(`/items/foodoffers/${id}`, {
			params: {
				fields: '*, markings.*,feedbacks.*,food.*,food.translations.*,food.food_category.*,food.food_category.translations.*,foodoffer_category.*,foodoffer_category.translations.*,attribute_values.*, attribute_values.food_attribute.*, attribute_values.food_attribute.translations.*, foods_attributes_values.*',
				limit: -1,
				deep: {
					feedbacks: {
						_filter: {
							comment: { _nnull: true },
						},
						_sort: '-date_updated',
					},
				},
			},
		});
		return response.data;
	} catch (error) {
		throw new Error('Error fetching Food Offers');
	}
};

export const fetchFoodDetailsById = async (id: string) => {
	try {
		const response = await axios.get(`/items/foods/${id}`, {
			params: {
				fields: '*, markings.*,feedbacks.*,food.*,translations.*',
				limit: -1,
				deep: {
					feedbacks: {
						_filter: {
							comment: { _nnull: true },
						},
						_sort: '-date_updated',
					},
				},
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
		const response = await axios.get('/items/foods_feedbacks_labels_entries', {
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
		const response = await axios.get('/items/buildings?fields=*&limit=-1');
		return response.data;
	} catch (error) {
		throw new Error(`Error Fetching Buildings`);
	}
};
