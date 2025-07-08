import {
  Apartments,
  AppElements,
  AppSettings,
  Buildings,
  Businesshours,
  BusinesshoursGroups,
  Canteens,
  CanteensFeedbacksLabels,
  CanteensFeedbacksLabelsEntries,
  DirectusUsers,
  Foodoffers,
  FoodoffersCategories,
  FoodsAttributes,
  FoodsAttributesGroups,
  FoodsCategories,
  FoodsFeedbacks,
  FoodsFeedbacksLabels,
  FoodsFeedbacksLabelsEntries,
  FormSubmissions,
  Markings,
  News,
  PopupEvents,
  Profiles,
  Wikis,
} from '@rocket-meals/shared';
import {
  FoodSortOption,
  CampusSortOption,
  ApartmentSortOption,
} from '@/constants/SortingEnums';

export interface AuthState {
  user: DirectusUsers | Record<string, any> | null;
  profile: Profiles;
  loggedIn: boolean;
  isManagement: boolean;
  isDevMode: boolean;
  termsAndPrivacyConsentAcceptedDate: string | null;
}

export interface AppElementState {
  appElements: AppElements[];
}

export interface ApartmentsState {
  apartments: Apartments[];
  apartmentsLocal: Apartments[];
  unSortedApartments: Apartments[];
  apartmentsDict: Record<string, Apartments>;
}

export interface CanteensState {
  canteens: Canteens[];
  buildings: Buildings[];
  selectedCanteen: Canteens | null;
  selectedCanteenFoodOffers: any[];
  canteenFoodOffers: Foodoffers[];
  businessHours: Businesshours[];
  businessHoursGroups: BusinesshoursGroups[];
  canteenFeedbackLabels: CanteensFeedbacksLabels[];
  ownCanteenFeedBackLabelEntries: CanteensFeedbacksLabelsEntries[];
}

export interface SettingsState {
  selectedTheme: string;
  isWarning: boolean;
  sortBy: FoodSortOption;
  campusesSortBy: CampusSortOption;
  apartmentsSortBy: ApartmentSortOption;
  serverInfo: Record<string, any>;
  primaryColor: string;
  appSettings: AppSettings;
  language: string;
  firstDayOfTheWeek: { id: string; name: string };
  drawerPosition: 'left' | 'right';
  wikisPages: any[];
  wikis: Wikis[];
  nickNameLocal: string;
  amountColumnsForcard: number;
}

export interface FoodState {
  foodFeedbackLabels: FoodsFeedbacksLabels[];
  ownFoodFeedbacks: FoodsFeedbacks[];
  ownfoodFeedbackLabelEntries: FoodsFeedbacksLabelsEntries[];
  markings: Markings[];
  selectedFoodMarkings: any[];
  foodCategories: FoodsCategories[];
  foodOfferCategories: FoodoffersCategories[];
  markingDetails: Markings;
  mostLikedFoods: any[];
  mostDislikedFoods: any[];
  foodCollection: Record<string, any>;
  popupEvents: ExtendedPopUpEvents[];
  selectedDate: string;
}

interface ExtendedPopUpEvents extends PopupEvents {
  isOpen: boolean;
  isCurrent: number;
}

export interface FoodAttributesState {
  foodAttributeGroups: FoodsAttributesGroups[];
  foodAttributes: FoodsAttributes[];
  foodAttributesDict: Record<string, FoodsAttributes>;
}

export interface FormState {
  filterBy: string;
  formSubmission: FormSubmissions;
}

export interface CampusState {
  campuses: Buildings[];
  campusesLocal: Buildings[];
  unSortedCampuses: Buildings[];
  campusesDict: Record<string, Buildings>;
}

export interface NewsState {
  news: News[];
}

export interface LastUpdatedState {
  lastUpdatedMap: Record<string, string>;
}

interface DayPlan {
  selectedCanteen: Canteens;
  mealOfferCategory: { id: string; alias: string };
  isMenuCategory: boolean;
  nextFoodInterval: number;
  refreshInterval: number;
  isFullScreen: boolean;
  foodCategory: { id: string; alias: string };
  isMenuCategoryName: boolean;
}

interface FoodPlan {
  selectedCanteen: Canteens;
  additionalSelectedCanteen: Canteens;
  nextFoodInterval: number;
  refreshInterval: number;
}

interface WeekPlan {
  selectedCanteen: Canteens;
  isAllergene: boolean;
  selectedWeek: {
    week: number;
    days: any[];
  };
}

export interface ManagementState {
  dayPlan: DayPlan;
  foodPlan: FoodPlan;
  weekPlan: WeekPlan;
}

export interface PopupEventsHashState {
  hashValue: string;
}
