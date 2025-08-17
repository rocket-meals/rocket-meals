export enum FoodSortOption {
  INTELLIGENT = 'intelligent',
  FAVORITE = 'favorite',
  EATING = 'eating',
  FOOD_CATEGORY = 'food_category',
  FOODOFFER_CATEGORY = 'foodoffer_category',
  RATING = 'rating',
  ALPHABETICAL = 'alphabetical',
  PRICE_ASCENDING = 'price_ascending',
  PRICE_DESCENDING = 'price_descending',
  NONE = 'none',
}

export enum CampusSortOption {
  INTELLIGENT = 'intelligent',
  ALPHABETICAL = 'alphabetical',
  DISTANCE = 'distance',
  NONE = 'none',
}

export enum ApartmentSortOption {
  INTELLIGENT = 'intelligent',
  ALPHABETICAL = 'alphabetical',
  DISTANCE = 'distance',
  FREE_ROOMS = 'free rooms',
  NONE = 'none',
}

export type BuildingSortOption = CampusSortOption | ApartmentSortOption;
