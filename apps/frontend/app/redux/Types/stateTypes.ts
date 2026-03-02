import { ConfigCustomerEnum } from '@/config';
import { ApartmentSortOption, CampusSortOption, DatabaseTypes, FoodSortOption } from 'repo-depkit-common';

export type AuthState = {
	user: DatabaseTypes.DirectusUsers | Record<string, any> | null;
	profile: DatabaseTypes.Profiles;
	loggedIn: boolean;
	isManagement: boolean;
	isDevMode: boolean;
	termsAndPrivacyConsentAcceptedDate: string | null;
}

export type AppElementState = {
	appElements: DatabaseTypes.AppElements[];
}

export type ApartmentsState = {
	apartments: DatabaseTypes.Apartments[];
	apartmentsLocal: DatabaseTypes.Apartments[];
	unSortedApartments: DatabaseTypes.Apartments[];
	apartmentsDict: Record<string, DatabaseTypes.Apartments>;
}

export type CanteensState = {
	canteens: DatabaseTypes.Canteens[];
	buildings: DatabaseTypes.Buildings[];
	selectedCanteen: DatabaseTypes.Canteens | null;
	selectedCanteenFoodOffers: any[];
	canteenFoodOffers: DatabaseTypes.Foodoffers[];
	businessHours: DatabaseTypes.Businesshours[];
	businessHoursGroups: DatabaseTypes.BusinesshoursGroups[];
	canteenFeedbackLabels: DatabaseTypes.CanteensFeedbacksLabels[];
	ownCanteenFeedBackLabelEntries: DatabaseTypes.CanteensFeedbacksLabelsEntries[];
}

export type SettingsState = {
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
        drawerPosition: 'left' | 'right' | 'system';
        selectedCustomer: ConfigCustomerEnum | null;
        wikisPages: any[];
        wikis: DatabaseTypes.Wikis[];
        nickNameLocal: string;
        amountColumnsForcard: number;
        useWebpForAssets: boolean;
        foodOffersNextDayThreshold: string | null;
        debugMode: boolean;
        simulateExpoUpdateAvailable: boolean;
        collectibleItemSize: 'small' | 'medium' | 'large';
        collectibleRandomPosition: boolean;
}

export type FoodState = {
	foodFeedbackLabels: DatabaseTypes.FoodsFeedbacksLabels[];
	ownFoodFeedbacks: DatabaseTypes.FoodsFeedbacks[];
	ownfoodFeedbackLabelEntries: DatabaseTypes.FoodsFeedbacksLabelsEntries[];
	markings: DatabaseTypes.Markings[];
	selectedFoodMarkings: any[];
	foodCategories: DatabaseTypes.FoodsCategories[];
	foodOfferCategories: DatabaseTypes.FoodoffersCategories[];
	foodOffersInfoItems: DatabaseTypes.FoodoffersInfoItems[];
	markingDetails: DatabaseTypes.Markings;
	mostLikedFoods: any[];
	mostDislikedFoods: any[];
	foodCollection: Record<string, any>;
	popupEvents: ExtendedPopUpEvents[];
	selectedDate: string;
}

type ExtendedPopUpEvents = {
	isOpen: boolean;
	isCurrent: number;
} & DatabaseTypes.PopupEvents;

export type FoodAttributesState = {
	foodAttributeGroups: DatabaseTypes.FoodsAttributesGroups[];
	foodAttributes: DatabaseTypes.FoodsAttributes[];
	foodAttributesDict: Record<string, DatabaseTypes.FoodsAttributes>;
}

export type FormState = {
	filterBy: string;
	formSubmission: DatabaseTypes.FormSubmissions;
}

export type CampusState = {
	campuses: DatabaseTypes.Buildings[];
	campusesLocal: DatabaseTypes.Buildings[];
	unSortedCampuses: DatabaseTypes.Buildings[];
	campusesDict: Record<string, DatabaseTypes.Buildings>;
}

export type NewsState = {
	news: DatabaseTypes.News[];
}

export type CollectibleEventsState = {
        collectibleEvents: DatabaseTypes.CollectibleEvents[];
        collectibleEventsDict: Record<string, Record<string, boolean>>;
};

export type LastUpdatedState = {
	lastUpdatedMap: Record<string, string>;
}

export type DayPlan = {
	selectedCanteen: DatabaseTypes.Canteens;
	mealOfferCategory: { id: string; alias: string };
	isMenuCategory: boolean;
	nextFoodInterval: number;
	refreshInterval: number;
	isFullScreen: boolean;
	showMarkingsOnCard: boolean;
	foodCategory: { id: string; alias: string };
	isMenuCategoryName: boolean;
}

export type FoodPlan = {
	selectedCanteen: DatabaseTypes.Canteens;
	additionalSelectedCanteen: DatabaseTypes.Canteens;
	nextFoodInterval: number;
	refreshInterval: number;
}

export type WeekPlan = {
	selectedCanteen: DatabaseTypes.Canteens;
	isAllergene: boolean;
	selectedWeek: {
		week: number;
		days: any[];
	};
}

export type ManagementState = {
	dayPlan: DayPlan;
	foodPlan: FoodPlan;
	weekPlan: WeekPlan;
}

export type PopupEventsHashState = {
	hashValue: string;
}

export type ChatsState = {
        chats: DatabaseTypes.Chats[];
        readStatus: Record<string, string>;
}
