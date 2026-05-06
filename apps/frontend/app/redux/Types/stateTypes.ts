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
	appElementsDict: Record<string, DatabaseTypes.AppElements>;
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
	canteensDict: Record<string, CanteenWithImage>;
	buildingsDict: Record<string, DatabaseTypes.Buildings>;
	buildingsOrganizationsDict: Record<string, DatabaseTypes.BuildingsOrganizations>;
	organisationsDict: Record<string, DatabaseTypes.Organizations>;
	selectedCanteen: CanteenWithImage | null;
	selectedCanteenFoodOffersDict: Record<string, DatabaseTypes.Foodoffers>;
	canteenFoodOffersDict: Record<string, DatabaseTypes.Foodoffers>;
	businessHoursDict: Record<string, DatabaseTypes.Businesshours>;
	businessHoursGroupsDict: Record<string, DatabaseTypes.BusinesshoursGroups>;
	canteenFeedbackLabelsDict: Record<string, DatabaseTypes.CanteensFeedbacksLabels>;
	ownCanteenFeedBackLabelEntriesDict: Record<string, DatabaseTypes.CanteensFeedbacksLabelsEntries>;
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
	wikisPagesDict: Record<string, any>;
	wikisDict: Record<string, DatabaseTypes.Wikis>;
	nickNameLocal: string;
	amountColumnsForcard: number;
	useWebpForAssets: boolean;
	foodOffersNextDayThreshold: string | null;
	debugMode: boolean;
	simulateExpoUpdateAvailable: boolean;
	collectibleItemSize: 'small' | 'medium' | 'large';
	collectibleRandomPosition: boolean;
	offlineMode: boolean;
	mapTileVariantKey: string;
	mapUseFlyAnimation: boolean;
	mapVirtualZoom: number | null;
	mapOrganisationFilter: Record<string, boolean>;
	mapClusterPixelRadius: number;
	foodoffersShowSeparatedMarkingsBreakdown: boolean | null;
	osmVectorMapStyleKey: string;
	osmVectorMapUseFlyAnimation: boolean;
	osmVectorMapOrganisationFilter: Record<string, boolean>;
	osmVectorMapPitch: string;
	osmVectorMapClusterDistance: number;
	osmVectorMapShowControlsHint: boolean;
	osmVectorMapGameMode: boolean;
	osmVectorMapAutoRotateMode: boolean;
	osmVectorMapPeopleMode: boolean;
	osmVectorMapIntelligentMovement: boolean;
	osmVectorMapPeopleCount: number;
	osmVectorMapCarMode: boolean;
	osmVectorMapConsent: boolean;
	osmVectorMapShowSettings: Record<string, boolean>;
	osmVectorMapPoiSubSettings: Record<string, boolean>;
	pirateLanguage: boolean;
	funLanguageMode: string | null;
	canteenVisits: {
		visibility: 'all' | 'friends_only' | 'off';
	};
}

export type FoodState = {
	foodFeedbackLabelsDict: Record<string, DatabaseTypes.FoodsFeedbacksLabels>;
	ownFoodFeedbacksDict: Record<string, DatabaseTypes.FoodsFeedbacks>;
	ownfoodFeedbackLabelEntriesDict: Record<string, DatabaseTypes.FoodsFeedbacksLabelsEntries>;
	markingsDict: Record<string, DatabaseTypes.Markings>;
	markingGroupsDict: Record<string, DatabaseTypes.MarkingsGroups>;
	selectedFoodMarkingsDict: Record<string, DatabaseTypes.FoodoffersMarkings>;
	foodCategoriesDict: Record<string, DatabaseTypes.FoodsCategories>;
	foodOfferCategoriesDict: Record<string, DatabaseTypes.FoodoffersCategories>;
	foodOffersInfoItemsDict: Record<string, DatabaseTypes.FoodoffersInfoItems>;
	markingDetails: DatabaseTypes.Markings;
	mostLikedFoodsDict: Record<string, DatabaseTypes.Foods>;
	mostDislikedFoodsDict: Record<string, DatabaseTypes.Foods>;
	foodCollection: Record<string, any>;
	popupEventsDict: Record<string, ExtendedPopUpEvents>;
	selectedDate: string;
}

type ExtendedPopUpEvents = {
	isOpen: boolean;
	isCurrent: number;
} & DatabaseTypes.PopupEvents;

export type FoodAttributesState = {
	foodAttributeGroupsDict: Record<string, DatabaseTypes.FoodsAttributesGroups>;
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
	formQueueDict: Record<string, FormQueueEntry>;
	cachedFormData: Record<string, CachedFormEntry>;
	cachedFormCategoriesDict: Record<string, DatabaseTypes.FormCategories>;
	cachedFormsDict: Record<string, Record<string, DatabaseTypes.Forms>>;
}

export type CampusState = {
	campuses: DatabaseTypes.Buildings[];
	campusesLocal: DatabaseTypes.Buildings[];
	unSortedCampuses: DatabaseTypes.Buildings[];
	campusesDict: Record<string, DatabaseTypes.Buildings>;
}

export type NewsState = {
	newsDict: Record<string, DatabaseTypes.News>;
};

export type CollectibleEventsState = {
        collectibleEventsItemsDict: Record<string, DatabaseTypes.CollectibleEvents>;
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
        chatsDict: Record<string, DatabaseTypes.Chats>;
        readStatus: Record<string, string>;
}

export type FriendshipsState = {
	friendshipsDict: Record<string, DatabaseTypes.Friendships>;
}
