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

export type CanteenWithImage = DatabaseTypes.Canteens & {
	imageAssetId?: string;
	thumbHash?: string;
	image_url?: string;
};

export type CanteensState = {
	canteens: CanteenWithImage[];
	buildingsDict: Record<string, DatabaseTypes.Buildings>;
	buildingsOrganizations: DatabaseTypes.BuildingsOrganizations[];
	organisations: DatabaseTypes.Organizations[];
	selectedCanteen: CanteenWithImage | null;
	selectedCanteenFoodOffers: DatabaseTypes.Foodoffers[];
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
        mapTileVariantKey: string;
        mapUseFlyAnimation: boolean;
        mapVirtualZoom: number | null;
        mapOrganisationFilter: Record<string, boolean>;
        mapClusterPixelRadius: number;
        foodoffersShowSeparatedMarkingsBreakdown: boolean | null;
}

export type FoodState = {
	foodFeedbackLabels: DatabaseTypes.FoodsFeedbacksLabels[];
	ownFoodFeedbacks: DatabaseTypes.FoodsFeedbacks[];
	ownfoodFeedbackLabelEntries: DatabaseTypes.FoodsFeedbacksLabelsEntries[];
	markings: DatabaseTypes.Markings[];
	markingGroups: DatabaseTypes.MarkingsGroups[];
	selectedFoodMarkings: DatabaseTypes.FoodoffersMarkings[];
	foodCategories: DatabaseTypes.FoodsCategories[];
	foodOfferCategories: DatabaseTypes.FoodoffersCategories[];
	foodOffersInfoItems: DatabaseTypes.FoodoffersInfoItems[];
	markingDetails: DatabaseTypes.Markings;
	mostLikedFoods: DatabaseTypes.Foods[];
	mostDislikedFoods: DatabaseTypes.Foods[];
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
	foodAttributesDict: Record<string, DatabaseTypes.FoodsAttributes>;
}

export type FormQueueEntry = {
	id: string;
	form_submission_id: string;
	form_id: string;
	alias: string;
	targetState: string;
	formData: Record<string, { value: any; error: string; custom_type?: string }>;
	timestamp: string;
};

export type CachedFormEntry = {
	form: DatabaseTypes.Forms | null;
	submissions: DatabaseTypes.FormSubmissions[];
	answers: Record<string, DatabaseTypes.FormAnswers[]>;
};

export type FormState = {
	filterBy: string;
	formSubmission: DatabaseTypes.FormSubmissions;
	formQueue: FormQueueEntry[];
	cachedFormData: Record<string, CachedFormEntry>;
	cachedFormCategories: DatabaseTypes.FormCategories[];
	cachedForms: Record<string, DatabaseTypes.Forms[]>;
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

/**
 * Shared fields between DayPlan and FoodPlan for the monitor screen configuration.
 */
export type CanteenIntervalPlanBase = {
	selectedCanteen: DatabaseTypes.Canteens;
	nextFoodInterval: number;
	refreshInterval: number;
};

export type DayPlan = CanteenIntervalPlanBase & {
	mealOfferCategory: { id: string; alias: string };
	isMenuCategory: boolean;
	isFullScreen: boolean;
	showMarkingsOnCard: boolean;
	foodCategory: { id: string; alias: string };
	isMenuCategoryName: boolean;
}

export type FoodPlan = CanteenIntervalPlanBase & {
	additionalSelectedCanteen: DatabaseTypes.Canteens;
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

export type FriendshipsState = {
        friendships: DatabaseTypes.Friendships[];
}
