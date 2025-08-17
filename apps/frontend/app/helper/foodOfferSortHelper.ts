import {
  DatabaseTypes,
  FoodSortOption,
  intelligentSort,
  sortByPrice,
  sortByEatingHabits,
  sortByFoodName,
  sortByOwnFavorite,
  sortByPublicFavorite,
  sortByFoodCategory,
  sortByFoodOfferCategory,
  sortByFoodOfferCategoryOnly,
} from 'repo-depkit-common';

interface SortContext {
  languageCode: string;
  ownFoodFeedbacks: any[];
  profile: { price_group?: string; markings: any };
  foodCategories: any[];
  foodOfferCategories: any[];
  useFoodOfferCategoryOnly?: boolean;
}

export function sortFoodOffers(
  id: FoodSortOption,
  foodOffers: DatabaseTypes.Foodoffers[],
  {
    languageCode,
    ownFoodFeedbacks,
    profile,
    foodCategories,
    foodOfferCategories,
    useFoodOfferCategoryOnly,
  }: SortContext
): DatabaseTypes.Foodoffers[] {
  let copiedFoodOffers = [...foodOffers];

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
      copiedFoodOffers = sortByFoodCategory(
        copiedFoodOffers,
        foodCategories,
        languageCode
      );
      break;
    case FoodSortOption.FOODOFFER_CATEGORY:
      copiedFoodOffers = useFoodOfferCategoryOnly
        ? sortByFoodOfferCategoryOnly(copiedFoodOffers, foodOfferCategories)
        : sortByFoodOfferCategory(copiedFoodOffers, foodOfferCategories);
      break;
    case FoodSortOption.RATING:
      copiedFoodOffers = sortByPublicFavorite(copiedFoodOffers);
      break;
    case FoodSortOption.PRICE_ASCENDING:
      copiedFoodOffers = sortByPrice(
        copiedFoodOffers,
        profile?.price_group,
        false
      );
      break;
    case FoodSortOption.PRICE_DESCENDING:
      copiedFoodOffers = sortByPrice(
        copiedFoodOffers,
        profile?.price_group,
        true
      );
      break;
    case FoodSortOption.INTELLIGENT:
      copiedFoodOffers = intelligentSort(
        copiedFoodOffers,
        ownFoodFeedbacks,
        profile.markings,
        languageCode,
        foodCategories,
        foodOfferCategories
      );
      break;
    default:
      console.warn('Unknown sorting option:', id);
      break;
  }

  return copiedFoodOffers;
}

