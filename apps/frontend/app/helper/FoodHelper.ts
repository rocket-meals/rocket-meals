import { DatabaseTypes } from 'repo-depkit-common';
import { CollectionHelper } from './collectionHelper';

export async function loadMostLikedOrDislikedFoods(limit: number, offset: number, minRatingAmount: number | undefined, bestFirst: boolean) {
	const collectionHelper = new CollectionHelper<DatabaseTypes.Foods>('foods');
	if (!minRatingAmount) {
		minRatingAmount = 1;
	}

	// Initialize the filters array
	const andFilters = [];

	// Filter for rating_amount if minRatingAmount is specified
	if (minRatingAmount !== undefined) {
		andFilters.push({
			rating_amount: {
				_gte: minRatingAmount,
			},
		});
	}

	const sort = bestFirst ? '-rating_average' : 'rating_average';

	// Construct the query object
	const query = {
		limit: limit,
		offset: offset,
		filter: {
			_and: andFilters,
		},
		sort: [sort], // Sort by rating_average in descending order
		fields: ['*', 'translations.*', 'markings.*'],
	};

	return await collectionHelper.readItems(query);
}

export async function loadBestRatedFoodsWithImage(limit: number, offset: number) {
        const collectionHelper = new CollectionHelper<DatabaseTypes.Foods>('foods');
        const query = {
                limit,
                offset,
                sort: ['-rating_average'],
                filter: {
                        _and: [{ image: { _nnull: true } }],
                },
                fields: ['id', 'image'],
        };

        return await collectionHelper.readItems(query);
}

export async function loadFoodById(id: string) {
        const collectionHelper = new CollectionHelper<DatabaseTypes.Foods>('foods');
        const query: any = {
                fields: ['*'],
                deep: {
                        translations: {
                                fields: ['*'],
                        },
                },
        };

        return await collectionHelper.readItem(id, query);
}
