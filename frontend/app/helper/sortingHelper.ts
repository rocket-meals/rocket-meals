import {
  Foodoffers,
  Foods,
  Markings,
  MarkingsGroups,
  FoodsCategories,
  FoodoffersCategories,
} from "@rocket-meals/shared";

export const normalizeSort = (value: any): number => {
  return value === undefined || value === null || value === "" ? Infinity : value;
};

export const sortBySortField = <T extends { sort?: number | null }>(
    items: T[]
): T[] => {
  const withSort: T[] = [];
  const withoutSort: T[] = [];

  for (const item of items) {
    if (item.sort === undefined || item.sort === null) {
      withoutSort.push(item);
    } else {
      withSort.push(item);
    }
  }

  withSort.sort((a, b) => (a.sort! as number) - (b.sort! as number));

  return [...withSort, ...withoutSort];
};

import { getFoodName, isRatingNegative, isRatingPositive } from "./resourceHelper";

export function sortByFoodName(foodOffers: Foodoffers[], languageCode: string) {
    foodOffers.sort((a, b) => {
      let nameA = getFoodName(a.food, languageCode);
      let nameB = getFoodName(b.food, languageCode);
      if (nameA && nameB) {
        return nameA.localeCompare(nameB);
      } else if (nameA) {
        return -1;
      } else if (nameB) {
        return 1;
      }
    });
  return foodOffers;
}

export function sortByFoodCategory(
  foodOffers: Foodoffers[],
  categories: FoodsCategories[],
    languageCode: string
) {
  // 1) Alphabetisch (am wenigsten wichtig)
    sortByFoodName(foodOffers, languageCode);

    // 2) Food Categories
    sortByFoodCategoryOnly(foodOffers, categories);

    return foodOffers;
}

function sortByFoodCategoryOnly(
    foodOffers: Foodoffers[],
    categories: FoodsCategories[]
) {
  const sortMap = new Map<string, number>();
  categories.forEach((cat) => {
    if (cat.id) {
      sortMap.set(cat.id, normalizeSort(cat.sort));
    }
  });

  return foodOffers.sort((a, b) => {
    const aId =
        typeof (a.food as any)?.food_category === 'object'
            ? (a.food as any)?.food_category?.id
            : (a.food as any)?.food_category;
    const bId =
        typeof (b.food as any)?.food_category === 'object'
            ? (b.food as any)?.food_category?.id
            : (b.food as any)?.food_category;

    const aSort = sortMap.has(aId as string)
        ? (sortMap.get(aId as string) as number)
        : Infinity;
    const bSort = sortMap.has(bId as string)
        ? (sortMap.get(bId as string) as number)
        : Infinity;
    return aSort - bSort;
  });
}

export function sortByFoodOfferCategory(
  foodOffers: Foodoffers[],
  categories: FoodoffersCategories[],
    languageCode: string
) {
    // 1) Alphabetisch (am wenigsten wichtig)
    sortByFoodName(foodOffers, languageCode);

    // 2) Food Offer Categories
    sortByFoodOfferCategoryOnly(foodOffers, categories);

    return foodOffers;
}

function sortByFoodOfferCategoryOnly(
    foodOffers: Foodoffers[],
    categories: FoodoffersCategories[]
) {
  const sortMap = new Map<string, number>();
  categories.forEach((cat) => {
    if (cat.id) {
      sortMap.set(cat.id, normalizeSort(cat.sort));
    }
  });

  return foodOffers.sort((a, b) => {
    const aId =
        typeof a.foodoffer_category === 'object'
            ? (a.foodoffer_category as any)?.id
            : a.foodoffer_category;
    const bId =
        typeof b.foodoffer_category === 'object'
            ? (b.foodoffer_category as any)?.id
            : b.foodoffer_category;

    const aSort = sortMap.has(aId as string)
        ? (sortMap.get(aId as string) as number)
        : Infinity;
    const bSort = sortMap.has(bId as string)
        ? (sortMap.get(bId as string) as number)
        : Infinity;
    return aSort - bSort;
  });
}

  // Working Own Favorite Sorting
export function sortByOwnFavorite(foodOffers: Foodoffers[], ownFeedBacks: any) {
    const feedbackMap = new Map(
      ownFeedBacks.map((feedback: any) => [feedback.food, feedback.rating])
    );
    return foodOffers.sort((a, b) => {
      const aRating = feedbackMap.get(a?.food?.id) ?? null;
      const bRating = feedbackMap.get(b?.food?.id) ?? null;

      const getCategory = (rating: any) => {
        if (isRatingNegative(rating)) return 3; // Lowest priority
        if (rating === null || rating === undefined) return 2; // Unknown priority
        if (isRatingPositive(rating)) return 1; // Highest priority
        return 0; // Fallback, if needed
      };

      const aCategory = getCategory(aRating);
      const bCategory = getCategory(bRating);

      return aCategory - bCategory;
    });
  }

  // Working Public Favorite Sorting
export function sortByPublicFavorite(foodOffers: Foodoffers[]) {
    foodOffers.sort((a, b) => {
      const aFood: Foods = a.food || {};
      const bFood: Foods = b.food || {};
      const getRatingCategory = (rating: number | null | undefined) => {
        if (isRatingNegative(rating)) return "negative";
        if (rating === null || rating === undefined) return "null";
        if (isRatingPositive(rating)) return "positive";
        return "unknown"; // Fallback for unexpected cases
      };

      const aCategory = getRatingCategory(aFood?.rating_average);
      const bCategory = getRatingCategory(bFood?.rating_average);

      const priorityOrder = ["positive", "unknown", "null", "negative",];

      const aPriority = priorityOrder.indexOf(aCategory);
      const bPriority = priorityOrder.indexOf(bCategory);

      return aPriority - bPriority;
    });

    return foodOffers;
  }


export function sortByEatingHabits(foodOffers: Foodoffers[], profileMarkingsData: any) {
    const profileMarkingsMap = new Map(
      profileMarkingsData?.map((marking: any) => [marking.markings_id, marking])
    );
    foodOffers.sort((a, b) => {
      const calculateSortValue = (foodOffer: Foodoffers) => {
        let sortValue = 0;
        const likeSortWeight = 1;
        const dislikeSortWeight = likeSortWeight * 2;

        if (foodOffer?.markings) {
          foodOffer.markings.forEach((marking) => {
            const profileMarking = profileMarkingsMap.get(marking.markings_id);

            if (profileMarking) {
              if (profileMarking.like === true) {
                sortValue += likeSortWeight;
              } else if (profileMarking.like === false) {
                sortValue -= dislikeSortWeight;
              }
            }
          });
        }

        return sortValue;
      };

      const aSortValue = calculateSortValue(a);
      const bSortValue = calculateSortValue(b);

      // Sort in descending order of sort value (higher preference first)
      return bSortValue - aSortValue;
    });

    return foodOffers;
  }


export function sortMarkingsByGroup(markings: Markings[], markingGroups: MarkingsGroups[]): Markings[] {
  if (!markings || !markingGroups) {
    return markings || [];
  }
  // Sort marking groups by their "sort" field
  const sortedGroups = sortBySortField(markingGroups);

  // Create a map for quick lookup of each marking's group
  const markingToGroupMap = new Map<string, MarkingsGroups>();
  sortedGroups.forEach((group) => {
    group.markings.forEach((markingId) => {
      if (typeof markingId === 'string') {
        markingToGroupMap.set(markingId, group);
      } else if (markingId && typeof markingId === 'object' && 'id' in markingId) {
        markingToGroupMap.set(markingId.id, group);
      }
    });
  });

  // Helper function to get group sort value
  const getGroupSort = (marking: Markings): number => {
    const group = markingToGroupMap.get(marking.id);
    return normalizeSort(group?.sort);
  };

  // Helper function to get marking's own sort value
  const getMarkingSort = (marking: Markings): number => {
    return normalizeSort(marking.sort);
  };

  // Sort markings based on the specified criteria
  return [...markings].sort((a, b) => {
    const groupSortA = getGroupSort(a);
    const groupSortB = getGroupSort(b);

    // First, compare group sorts
    if (groupSortA !== groupSortB) {
      return groupSortA - groupSortB;
    }

    // If both markings belong to the same group, sort by their "sort" value
    const markingSortA = getMarkingSort(a);
    const markingSortB = getMarkingSort(b);

    if (markingSortA !== markingSortB) {
      return markingSortA - markingSortB;
    }

    // If no sort values exist, sort alphabetically by alias
    return (a.alias || '').localeCompare(b.alias || '');
  });
}

export function intelligentSort(
    foodOffers: Foodoffers[],
    ownFeedbacks: any[],
    profileMarkings: any[],
    languageCode: string,
    foodCategories: FoodsCategories[] = [],
    foodOfferCategories: FoodoffersCategories[] = []
) {
  // 1) Alphabetisch (am wenigsten wichtig)
  sortByFoodName(foodOffers, languageCode);

  // 2) Public Rating + Amount
  sortByPublicFavorite(foodOffers);

  // 3) Food Offer Categories
  sortByFoodOfferCategoryOnly(foodOffers, foodOfferCategories);

  // 4) Food Categories
  sortByFoodCategoryOnly(foodOffers, foodCategories);

  // 5) Own Feedbacks
  sortByOwnFavorite(foodOffers, ownFeedbacks);

  // 6) Eating Habits (am wichtigsten)
  sortByEatingHabits(foodOffers, profileMarkings);

  return foodOffers;
}
