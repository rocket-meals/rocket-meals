import { Foods } from '@/constants/types';
import { CollectionHelper } from './collectionHelper';

export async function loadMostLikedOrDislikedFoods(
  limit: number,
  offset: number,
  minRatingAmount: number | undefined,
  bestFirst: boolean
) {
  const collectionHelper = new CollectionHelper<Foods>('foods');
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

export async function loadMostPopularFoodsWithImages(limit = 100) {
  const collectionHelper = new CollectionHelper<Foods>('foods');
  const query = {
    limit,
    sort: ['-rating_average'],
    filter: {
      _or: [
        { image_remote_url: { _nnull: true } },
        { image: { _nnull: true } },
      ],
    },
    fields: ['id', 'image', 'image_remote_url', 'rating_average'],
  };

  return await collectionHelper.readItems(query);
}
