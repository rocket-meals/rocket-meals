import { CHANGE_LANGUAGE, CHANGE_THEME, CLEAR_SETTINGS, SET_AMOUNT_COLUMNS_FOR_CARDS, SET_APARTMENTS_SORTING, SET_APP_RATING_DATA, SET_APP_SETTINGS, SET_CAMPUSES_SORTING, SET_CANTEEN_VISITS_VISIBILITY, SET_COLLECTIBLE_ITEM_SIZE, SET_COLLECTIBLE_RANDOM_POSITION, SET_COLOR, SET_DEBUG_MODE, SET_DRAWER_POSITION, SET_FIRST_DAY_OF_THE_WEEK, SET_FOOD_DETAILS_LAST_TAB, SET_FOODOFFERS_NEXT_DAY_THRESHOLD, SET_FOODOFFERS_SHOW_AVERAGE_RATING_ON_CARD, SET_FOODOFFERS_SHOW_SEPARATED_MARKINGS_BREAKDOWN, SET_FUN_LANGUAGE_MODE, SET_MAP_CLUSTER_PIXEL_RADIUS, SET_MAP_ORGANISATION_FILTER, SET_MAP_TILE_VARIANT_KEY, SET_MAP_USE_FLY_ANIMATION, SET_MAP_VIRTUAL_ZOOM, SET_NICKNAME_LOCAL, SET_OFFLINE_MODE,  SET_OSM_VECTOR_MAP_AUTO_ROTATE_MODE, SET_OSM_VECTOR_MAP_CAR_MODE, SET_OSM_VECTOR_MAP_CLUSTER_DISTANCE, SET_OSM_VECTOR_MAP_CONSENT, SET_OSM_VECTOR_MAP_GAME_MODE, SET_OSM_VECTOR_MAP_INTELLIGENT_MOVEMENT, SET_OSM_VECTOR_MAP_ORGANISATION_FILTER, SET_OSM_VECTOR_MAP_PEOPLE_COUNT, SET_OSM_VECTOR_MAP_PEOPLE_MODE, SET_OSM_VECTOR_MAP_PITCH, SET_OSM_VECTOR_MAP_POI_SUB_SETTINGS, SET_OSM_VECTOR_MAP_SHOW_CONTROLS_HINT, SET_OSM_VECTOR_MAP_SHOW_SETTINGS, SET_OSM_VECTOR_MAP_STYLE_KEY, SET_OSM_VECTOR_MAP_USE_FLY_ANIMATION, SET_PIRATE_LANGUAGE, SET_SELECTED_CUSTOMER, SET_SERVER_INFO, SET_SIMULATE_EXPO_UPDATE_AVAILABLE, SET_SORTING, SET_USE_WEBP_FOR_ASSETS, SET_WARNING, SET_WIKIS, SET_WIKIS_PAGES } from '@/redux/Types/types';
import { ApartmentSortOption, CampusSortOption, FoodSortOption } from 'repo-depkit-common';
import { ConfigCustomerEnum, getCustomerConfig, getCustomerEnumForConfig } from '@/config';
import { MapStyleKey } from 'repo-depkit-common-ui';
import { FoodOfferDetailTab } from '@/constants/TabEnums';

const initialState = {
	selectedTheme: 'systematic',
	isWarning: false,
	sortBy: FoodSortOption.INTELLIGENT,
	campusesSortBy: CampusSortOption.INTELLIGENT,
	apartmentsSortBy: ApartmentSortOption.INTELLIGENT,
        serverInfo: {},
        primaryColor: '#FCDE31',
        appSettings: {},
        selectedCustomer: getCustomerEnumForConfig(getCustomerConfig()) ?? ConfigCustomerEnum.TEST,
        language: 'de',
	firstDayOfTheWeek: { id: 'monday', name: 'Mon' },
	drawerPosition: 'left',
	wikisPages: [],
	wikis: [],
        nickNameLocal: '',
        amountColumnsForcard: 0,
        // Zuletzt ausgewählte Reiter-Gruppe in den Food Details (feedbacks, details, labels).
        // Wird dauerhaft gespeichert, damit der Nutzer beim nächsten Öffnen automatisch
        // zum zuletzt aktiven Reiter zurückkehrt.
        // null = noch kein Reiter explizit gewählt → Standardreiter (feedbacks) wird verwendet.
        foodDetailsLastTab: null as FoodOfferDetailTab | null,
        useWebpForAssets: true,
        foodOffersNextDayThreshold: null,
        debugMode: false,
        simulateExpoUpdateAvailable: false,
        collectibleItemSize: 'medium',
        collectibleRandomPosition: false,
        offlineMode: false,
        mapTileVariantKey: 'osm',
        mapUseFlyAnimation: true,
        mapVirtualZoom: 18 as number | null,
        mapOrganisationFilter: {} as Record<string, boolean>,
        osmVectorMapStyleKey: MapStyleKey.DEFAULT,
        osmVectorMapUseFlyAnimation: true,
        osmVectorMapOrganisationFilter: {} as Record<string, boolean>,
        osmVectorMapPitch: '70',
        osmVectorMapClusterDistance: 30,
        osmVectorMapShowControlsHint: true,
        osmVectorMapGameMode: false,
        osmVectorMapAutoRotateMode: false,
        osmVectorMapPeopleMode: false,
        osmVectorMapIntelligentMovement: false,
        osmVectorMapPeopleCount: 80,
        osmVectorMapCarMode: false,
        osmVectorMapConsent: false,
        osmVectorMapShowSettings: {
            poi: true,
            transit: true,
            roadNames: true,
            leisure: true,
            barriers: true,
            parking: true,
        } as Record<string, boolean>,
        osmVectorMapPoiSubSettings: {} as Record<string, boolean>,
        mapClusterPixelRadius: 60,
        pirateLanguage: false,
        funLanguageMode: null as string | null,
        foodoffersShowSeparatedMarkingsBreakdown: null as boolean | null,
        foodoffersShowAverageRatingOnCard: null as boolean | null,
        canteenVisits: {
                visibility: 'all' as 'all' | 'friends_only' | 'off',
        },
        appRatingData: {
                score: 0,
                lastAskedAt: null as string | null,
                lastAskedAppVersion: null as string | null,
                lastFocusTime: '',
                // ISO timestamps of the prompt attempts of the last year. Drives the yearly
                // budget in decideAppRating; pruned whenever a new attempt is recorded.
                askedTimestamps: [] as string[],
                // Set when the user just had a bad experience, so we don't ask right after.
                negativeSignalAt: null as string | null,
        },
};

// Action types whose handling is a simple, uniform "replace one field with the
// action payload" operation. Grouping them into a lookup table (instead of one
// switch-case each) keeps the reducer's switch statement below the maintainability
// threshold for number of case clauses, without changing behavior for any action type.
const SIMPLE_FIELD_ASSIGNMENTS: Record<string, string> = {
	[CHANGE_THEME]: 'selectedTheme',
	[SET_WARNING]: 'isWarning',
	[SET_SORTING]: 'sortBy',
	[SET_CAMPUSES_SORTING]: 'campusesSortBy',
	[SET_APARTMENTS_SORTING]: 'apartmentsSortBy',
	[SET_SERVER_INFO]: 'serverInfo',
	[SET_COLOR]: 'primaryColor',
	[CHANGE_LANGUAGE]: 'language',
	[SET_DRAWER_POSITION]: 'drawerPosition',
	[SET_APP_SETTINGS]: 'appSettings',
	[SET_WIKIS_PAGES]: 'wikisPages',
	[SET_WIKIS]: 'wikis',
	[SET_NICKNAME_LOCAL]: 'nickNameLocal',
	[SET_FIRST_DAY_OF_THE_WEEK]: 'firstDayOfTheWeek',
	[SET_AMOUNT_COLUMNS_FOR_CARDS]: 'amountColumnsForcard',
	[SET_FOOD_DETAILS_LAST_TAB]: 'foodDetailsLastTab',
	[SET_USE_WEBP_FOR_ASSETS]: 'useWebpForAssets',
	[SET_FOODOFFERS_NEXT_DAY_THRESHOLD]: 'foodOffersNextDayThreshold',
	[SET_DEBUG_MODE]: 'debugMode',
	[SET_SIMULATE_EXPO_UPDATE_AVAILABLE]: 'simulateExpoUpdateAvailable',
	[SET_COLLECTIBLE_ITEM_SIZE]: 'collectibleItemSize',
	[SET_COLLECTIBLE_RANDOM_POSITION]: 'collectibleRandomPosition',
	[SET_OFFLINE_MODE]: 'offlineMode',
	[SET_MAP_TILE_VARIANT_KEY]: 'mapTileVariantKey',
	[SET_MAP_USE_FLY_ANIMATION]: 'mapUseFlyAnimation',
	[SET_MAP_VIRTUAL_ZOOM]: 'mapVirtualZoom',
	[SET_MAP_ORGANISATION_FILTER]: 'mapOrganisationFilter',
	[SET_OSM_VECTOR_MAP_STYLE_KEY]: 'osmVectorMapStyleKey',
	[SET_OSM_VECTOR_MAP_USE_FLY_ANIMATION]: 'osmVectorMapUseFlyAnimation',
	[SET_OSM_VECTOR_MAP_ORGANISATION_FILTER]: 'osmVectorMapOrganisationFilter',
	[SET_OSM_VECTOR_MAP_PITCH]: 'osmVectorMapPitch',
	[SET_OSM_VECTOR_MAP_CLUSTER_DISTANCE]: 'osmVectorMapClusterDistance',
	[SET_OSM_VECTOR_MAP_SHOW_CONTROLS_HINT]: 'osmVectorMapShowControlsHint',
	[SET_OSM_VECTOR_MAP_GAME_MODE]: 'osmVectorMapGameMode',
	[SET_OSM_VECTOR_MAP_AUTO_ROTATE_MODE]: 'osmVectorMapAutoRotateMode',
	[SET_OSM_VECTOR_MAP_PEOPLE_MODE]: 'osmVectorMapPeopleMode',
	[SET_OSM_VECTOR_MAP_INTELLIGENT_MOVEMENT]: 'osmVectorMapIntelligentMovement',
	[SET_OSM_VECTOR_MAP_PEOPLE_COUNT]: 'osmVectorMapPeopleCount',
	[SET_OSM_VECTOR_MAP_CAR_MODE]: 'osmVectorMapCarMode',
	[SET_OSM_VECTOR_MAP_CONSENT]: 'osmVectorMapConsent',
	[SET_MAP_CLUSTER_PIXEL_RADIUS]: 'mapClusterPixelRadius',
	[SET_PIRATE_LANGUAGE]: 'pirateLanguage',
	[SET_FUN_LANGUAGE_MODE]: 'funLanguageMode',
	[SET_FOODOFFERS_SHOW_SEPARATED_MARKINGS_BREAKDOWN]: 'foodoffersShowSeparatedMarkingsBreakdown',
	[SET_FOODOFFERS_SHOW_AVERAGE_RATING_ON_CARD]: 'foodoffersShowAverageRatingOnCard',
};

const settingReducer = (state, actions: any) => {
	state = state === undefined ? initialState : state;

	const simpleField = SIMPLE_FIELD_ASSIGNMENTS[actions.type];
	if (simpleField !== undefined) {
		return {
			...state,
			[simpleField]: actions.payload,
		};
	}

	switch (actions.type) {
                case SET_SELECTED_CUSTOMER: {
                        return {
                                ...state,
                                selectedCustomer: actions.payload,
                                foodoffersShowSeparatedMarkingsBreakdown: null,
                        };
                }
                case SET_OSM_VECTOR_MAP_SHOW_SETTINGS: {
                        return {
                                ...state,
                                osmVectorMapShowSettings: {
                                        ...(state as any).osmVectorMapShowSettings,
                                        ...actions.payload,
                                },
                        };
                }
                case SET_OSM_VECTOR_MAP_POI_SUB_SETTINGS: {
                        return {
                                ...state,
                                osmVectorMapPoiSubSettings: {
                                        ...(state as any).osmVectorMapPoiSubSettings,
                                        ...actions.payload,
                                },
                        };
                }
                case SET_CANTEEN_VISITS_VISIBILITY: {
                        return {
                                ...state,
                                canteenVisits: {
                                        ...state.canteenVisits,
                                        visibility: actions.payload,
                                },
                        };
                }
                case SET_APP_RATING_DATA: {
                        return {
                                ...state,
                                appRatingData: {
                                        ...state.appRatingData,
                                        ...actions.payload,
                                },
                        };
                }
                case CLEAR_SETTINGS: {
                        return {
                                ...initialState,
                                selectedCustomer: state.selectedCustomer,
                        };
                }
		default:
			return state;
	}
};

export default settingReducer;
