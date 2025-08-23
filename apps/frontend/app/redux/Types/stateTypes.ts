import { DatabaseTypes } from 'repo-depkit-common';
import { FoodSortOption, CampusSortOption, ApartmentSortOption } from 'repo-depkit-common';

export interface AuthState {
	user: DatabaseTypes.DirectusUsers | Record<string, any> | null;
	profile: DatabaseTypes.Profiles;
	loggedIn: boolean;
	isManagement: boolean;
	isDevMode: boolean;
	termsAndPrivacyConsentAcceptedDate: string | null;
}

export interface AppElementState {
	appElements: DatabaseTypes.AppElements[];
	appElementsDict: Record<string, DatabaseTypes.AppElements>;
}

export interface ApartmentsState {
	apartments: DatabaseTypes.Apartments[];
	apartmentsLocal: DatabaseTypes.Apartments[];
	unSortedApartments: DatabaseTypes.Apartments[];
	apartmentsDict: Record<string, DatabaseTypes.Apartments>;
}

export interface CanteensState {
	canteens: DatabaseTypes.Canteens[];
	canteensDict: Record<string, DatabaseTypes.Canteens>;
	buildings: DatabaseTypes.Buildings[];
	buildingsDict: Record<string, DatabaseTypes.Buildings>;
	selectedCanteen: DatabaseTypes.Canteens | null;
	selectedCanteenFoodOffers: any[];
	canteenFoodOffers: DatabaseTypes.Foodoffers[];
	businessHours: DatabaseTypes.Businesshours[];
	businessHoursDict: Record<string, DatabaseTypes.Businesshours>;
	businessHoursGroups: DatabaseTypes.BusinesshoursGroups[];
	businessHoursGroupsDict: Record<string, DatabaseTypes.BusinesshoursGroups>;
	canteenFeedbackLabels: DatabaseTypes.CanteensFeedbacksLabels[];
	canteenFeedbackLabelsDict: Record<string, DatabaseTypes.CanteensFeedbacksLabels>;
	ownCanteenFeedBackLabelEntries: DatabaseTypes.CanteensFeedbacksLabelsEntries[];
}

export interface SettingsState {
	selectedTheme: string;
	isWarning: boolean;
	sortBy: FoodSortOption;
	campusesSortBy: CampusSortOption;
	apartmentsSortBy: ApartmentSortOption;
	serverInfo: Record<string, any>;
	primaryColor: string;
	appSettings: DatabaseTypes.AppSettings;
	language: string;
	firstDayOfTheWeek: { id: string; name: string };
	drawerPosition: 'left' | 'right';
	wikisPages: any[];
	wikis: DatabaseTypes.Wikis[];
	wikisDict: Record<string, DatabaseTypes.Wikis>;
	nickNameLocal: string;
	amountColumnsForcard: number;
	useWebpForAssets: boolean;
}

export interface FoodState {
	foodFeedbackLabels: DatabaseTypes.FoodsFeedbacksLabels[];
	foodFeedbackLabelsDict: Record<string, DatabaseTypes.FoodsFeedbacksLabels>;
	ownFoodFeedbacks: DatabaseTypes.FoodsFeedbacks[];
	ownfoodFeedbackLabelEntries: DatabaseTypes.FoodsFeedbacksLabelsEntries[];
	markings: DatabaseTypes.Markings[];
	markingsDict: Record<string, DatabaseTypes.Markings>;
	selectedFoodMarkings: any[];
	foodCategories: DatabaseTypes.FoodsCategories[];
	foodCategoriesDict: Record<string, DatabaseTypes.FoodsCategories>;
	foodOfferCategories: DatabaseTypes.FoodoffersCategories[];
	foodOfferCategoriesDict: Record<string, DatabaseTypes.FoodoffersCategories>;
	foodOffersInfoItems: DatabaseTypes.FoodoffersInfoItems[];
	foodOffersInfoItemsDict: Record<string, DatabaseTypes.FoodoffersInfoItems>;
	markingDetails: DatabaseTypes.Markings;
	mostLikedFoods: any[];
	mostDislikedFoods: any[];
	foodCollection: Record<string, any>;
	popupEvents: ExtendedPopUpEvents[];
	popupEventsDict: Record<string, ExtendedPopUpEvents>;
	selectedDate: string;
}

interface ExtendedPopUpEvents extends DatabaseTypes.PopupEvents {
	isOpen: boolean;
	isCurrent: number;
}

export interface FoodAttributesState {
	foodAttributeGroups: DatabaseTypes.FoodsAttributesGroups[];
	foodAttributeGroupsDict: Record<string, DatabaseTypes.FoodsAttributesGroups>;
	foodAttributes: DatabaseTypes.FoodsAttributes[];
	foodAttributesDict: Record<string, DatabaseTypes.FoodsAttributes>;
}

export interface FormState {
	filterBy: string;
	formSubmission: DatabaseTypes.FormSubmissions;
}

export interface CampusState {
	campuses: DatabaseTypes.Buildings[];
	campusesLocal: DatabaseTypes.Buildings[];
	unSortedCampuses: DatabaseTypes.Buildings[];
	campusesDict: Record<string, DatabaseTypes.Buildings>;
}

export interface NewsState {
	news: DatabaseTypes.News[];
	newsDict: Record<string, DatabaseTypes.News>;
}

export interface LastUpdatedState {
	lastUpdatedMap: Record<string, string>;
}

interface DayPlan {
	selectedCanteen: DatabaseTypes.Canteens;
	mealOfferCategory: { id: string; alias: string };
	isMenuCategory: boolean;
	nextFoodInterval: number;
	refreshInterval: number;
	isFullScreen: boolean;
	foodCategory: { id: string; alias: string };
	isMenuCategoryName: boolean;
}

interface FoodPlan {
	selectedCanteen: DatabaseTypes.Canteens;
	additionalSelectedCanteen: DatabaseTypes.Canteens;
	nextFoodInterval: number;
	refreshInterval: number;
}

interface WeekPlan {
	selectedCanteen: DatabaseTypes.Canteens;
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

export interface ChatsState {
	chats: DatabaseTypes.Chats[];
	chatsDict: Record<string, DatabaseTypes.Chats>;
}
