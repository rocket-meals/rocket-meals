import { DatabaseTypes } from 'repo-depkit-common';
import { FoodSortOption } from '@/constants/SortingEnums';
import {
  intelligentSort,
  sortByEatingHabits,
  sortByFoodCategory,
  sortByFoodName,
  sortByFoodOfferCategory,
  sortByOwnFavorite,
  sortByPublicFavorite,
} from '@/helper/sortingHelper';

export function sortOffers(
  id: FoodSortOption,
  foodOffers: DatabaseTypes.Foodoffers[],
  options: {
    ownFoodFeedbacks: DatabaseTypes.FoodsFeedbacks[];
    profileMarkings: DatabaseTypes.ProfilesMarkings[];
    language: string;
    foodCategories: DatabaseTypes.FoodsCategories[];
    foodOfferCategories: DatabaseTypes.FoodoffersCategories[];
  },
): DatabaseTypes.Foodoffers[] {
  let copiedFoodOffers = [...foodOffers];
  switch (id) {
    case FoodSortOption.ALPHABETICAL:
      copiedFoodOffers = sortByFoodName(copiedFoodOffers, options.language);
      break;
    case FoodSortOption.FAVORITE:
      copiedFoodOffers = sortByOwnFavorite(
        copiedFoodOffers,
        options.ownFoodFeedbacks,
      );
      break;
    case FoodSortOption.EATING:
      copiedFoodOffers = sortByEatingHabits(
        copiedFoodOffers,
        options.profileMarkings,
      );
      break;
    case FoodSortOption.FOOD_CATEGORY:
      copiedFoodOffers = sortByFoodCategory(
        copiedFoodOffers,
        options.foodCategories,
        options.language,
      );
      break;
    case FoodSortOption.FOODOFFER_CATEGORY:
      copiedFoodOffers = sortByFoodOfferCategory(
        copiedFoodOffers,
        options.foodOfferCategories,
      );
      break;
    case FoodSortOption.RATING:
      copiedFoodOffers = sortByPublicFavorite(copiedFoodOffers);
      break;
    case FoodSortOption.INTELLIGENT:
      copiedFoodOffers = intelligentSort(
        copiedFoodOffers,
        options.ownFoodFeedbacks,
        options.profileMarkings,
        options.language,
        options.foodCategories,
        options.foodOfferCategories,
      );
      break;
    default:
      break;
  }
  return copiedFoodOffers;
}

function convertStaticToOffer(el: DatabaseTypes.FoodofferInfoItems): DatabaseTypes.Foodoffers {
  const info = el.info_item as unknown as DatabaseTypes.FoodoffersInfoItems | undefined;
  const name = info?.name as unknown as DatabaseTypes.AppElements | undefined;
  const translations = (name as any)?.translations;
  const image = info?.image as any;
  return {
    id: `static-${el.id}`,
    food: {
      id: `static-food-${el.id}`,
      translations: translations,
      image: image?.id ?? image,
      image_remote_url: image?.data?.full_url ?? null,
    } as any,
    redirect_url: el.link ?? null,
    markings: [],
    price_employee: null,
    price_guest: null,
    price_student: null,
    prices: '',
  } as unknown as DatabaseTypes.Foodoffers;
}

export function mergeStaticElements(
  offers: DatabaseTypes.Foodoffers[],
  infoItems: DatabaseTypes.FoodofferInfoItems[],
  selectedCanteenId: string | null,
): DatabaseTypes.Foodoffers[] {
  const start: DatabaseTypes.Foodoffers[] = [];
  const end: DatabaseTypes.Foodoffers[] = [];

  infoItems.forEach((el) => {
    if (el.canteen && el.canteen !== selectedCanteenId) return;
    const onlyWhenNone = el.show_only_when_no_foodoffers_found;
    if (onlyWhenNone && offers.length > 0) return;
    if (!onlyWhenNone && offers.length === 0) return;
    if (el.status && el.status !== 'published') return;

    const item = convertStaticToOffer(el);
    if (el.placement === 'start') start.push(item);
    else end.push(item);
  });

  return [...start, ...offers, ...end];
}
