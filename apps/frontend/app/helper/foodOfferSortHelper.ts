import { DatabaseTypes, FoodSortOption, intelligentSort, sortByPrice, sortByEatingHabits, sortByFoodName, sortByOwnFavorite, sortByPublicFavorite, sortByFoodCategory, sortByFoodOfferCategory, sortByFoodOfferCategoryOnly } from 'repo-depkit-common';

interface SortContext {
	languageCode: string;
	ownFoodFeedbacks: any[];
	profile: { price_group?: string; markings: any };
	foodCategories: any[];
	foodOfferCategories: any[];
	useFoodOfferCategoryOnly?: boolean;
}

// Cache for sort results to improve performance
const sortCache = new Map<string, DatabaseTypes.Foodoffers[]>();
const CACHE_SIZE_LIMIT = 50;

function generateCacheKey(id: FoodSortOption, foodOffers: DatabaseTypes.Foodoffers[], context: SortContext): string {
	const offersHash = foodOffers.map(o => o.id).join(',');
	const contextHash = JSON.stringify({
		id,
		languageCode: context.languageCode,
		priceGroup: context.profile?.price_group,
		markingsCount: context.profile?.markings?.length || 0,
		categoriesCount: context.foodCategories?.length || 0,
		offerCategoriesCount: context.foodOfferCategories?.length || 0,
		useFoodOfferCategoryOnly: context.useFoodOfferCategoryOnly
	});
	return `${offersHash}-${contextHash}`;
}

function clearCacheIfNeeded() {
	if (sortCache.size > CACHE_SIZE_LIMIT) {
		// Clear oldest entries (simple LRU-like behavior)
		const keys = Array.from(sortCache.keys());
		const keysToDelete = keys.slice(0, Math.floor(CACHE_SIZE_LIMIT / 2));
		keysToDelete.forEach(key => sortCache.delete(key));
	}
}

export function sortFoodOffers(id: FoodSortOption, foodOffers: DatabaseTypes.Foodoffers[], context: SortContext): DatabaseTypes.Foodoffers[] {
	// Check cache first for performance improvement
	const cacheKey = generateCacheKey(id, foodOffers, context);
	if (sortCache.has(cacheKey)) {
		return sortCache.get(cacheKey)!;
	}

	let copiedFoodOffers = [...foodOffers];
	const { languageCode, ownFoodFeedbacks, profile, foodCategories, foodOfferCategories, useFoodOfferCategoryOnly } = context;

	switch (id) {
		case FoodSortOption.ALPHABETICAL:
			copiedFoodOffers = sortByFoodName(copiedFoodOffers, languageCode);
			break;
		case FoodSortOption.FAVORITE:
			copiedFoodOffers = sortByOwnFavorite(copiedFoodOffers, ownFoodFeedbacks);
			break;
		case FoodSortOption.EATING:
			copiedFoodOffers = sortByEatingHabits(copiedFoodOffers, profile.markings);
			break;
		case FoodSortOption.FOOD_CATEGORY:
			copiedFoodOffers = sortByFoodCategory(copiedFoodOffers, foodCategories, languageCode);
			break;
		case FoodSortOption.FOODOFFER_CATEGORY:
			copiedFoodOffers = useFoodOfferCategoryOnly ? sortByFoodOfferCategoryOnly(copiedFoodOffers, foodOfferCategories) : sortByFoodOfferCategory(copiedFoodOffers, foodOfferCategories);
			break;
		case FoodSortOption.RATING:
			copiedFoodOffers = sortByPublicFavorite(copiedFoodOffers);
			break;
		case FoodSortOption.PRICE_ASCENDING:
			copiedFoodOffers = sortByPrice(copiedFoodOffers, profile?.price_group, false);
			break;
		case FoodSortOption.PRICE_DESCENDING:
			copiedFoodOffers = sortByPrice(copiedFoodOffers, profile?.price_group, true);
			break;
		case FoodSortOption.INTELLIGENT:
			copiedFoodOffers = intelligentSort(copiedFoodOffers, ownFoodFeedbacks, profile.markings, languageCode, foodCategories, foodOfferCategories);
			break;
		default:
			console.warn('Unknown sorting option:', id);
			break;
	}

	// Cache the result for future use
	clearCacheIfNeeded();
	sortCache.set(cacheKey, copiedFoodOffers);

	return copiedFoodOffers;
}
