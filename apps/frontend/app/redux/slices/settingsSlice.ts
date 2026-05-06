import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ApartmentSortOption, CampusSortOption, FoodSortOption } from 'repo-depkit-common';
import { ConfigCustomerEnum, getCustomerConfig, getCustomerEnumForConfig } from '@/config';
import { MapStyleKey } from 'repo-depkit-common-ui';
import { arrayToDict, idKey } from '@/redux/utils/arrayToDict';
import { SettingsState } from '@/redux/Types/stateTypes';

const initialState: SettingsState & Record<string, any> = {
	selectedTheme: 'systematic',
	isWarning: false,
	sortBy: FoodSortOption.INTELLIGENT,
	campusesSortBy: CampusSortOption.INTELLIGENT,
	apartmentsSortBy: ApartmentSortOption.INTELLIGENT,
	serverInfo: {},
	primaryColor: '#FCDE31',
	appSettings: {} as any,
	selectedCustomer: getCustomerEnumForConfig(getCustomerConfig()) ?? ConfigCustomerEnum.TEST,
	language: 'de',
	firstDayOfTheWeek: { id: 'monday', name: 'Mon' },
	drawerPosition: 'left',
	wikisPagesDict: {},
	wikisDict: {},
	nickNameLocal: '',
	amountColumnsForcard: 0,
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
	canteenVisits: {
		visibility: 'all' as 'all' | 'friends_only' | 'off',
	},
};

const settingsSlice = createSlice({
	name: 'settings', // Must match the combineReducers key
	initialState,
	reducers: {
		changeTheme: (state, action: PayloadAction<string>) => {
			state.selectedTheme = action.payload;
		},
		setWarning: (state, action: PayloadAction<boolean>) => {
			state.isWarning = action.payload;
		},
		setSorting: (state, action: PayloadAction<FoodSortOption>) => {
			state.sortBy = action.payload;
		},
		setCampusesSorting: (state, action: PayloadAction<CampusSortOption>) => {
			state.campusesSortBy = action.payload;
		},
		setApartmentsSorting: (state, action: PayloadAction<ApartmentSortOption>) => {
			state.apartmentsSortBy = action.payload;
		},
		setServerInfo: (state, action: PayloadAction<Record<string, any>>) => {
			state.serverInfo = action.payload;
		},
		setColor: (state, action: PayloadAction<string>) => {
			state.primaryColor = action.payload;
		},
		changeLanguage: (state, action: PayloadAction<string>) => {
			state.language = action.payload;
		},
		setDrawerPosition: (state, action: PayloadAction<'left' | 'right' | 'system'>) => {
			state.drawerPosition = action.payload;
		},
		setAppSettings: (state, action: PayloadAction<any>) => {
			state.appSettings = action.payload;
		},
		setWikisPages: (state, action: PayloadAction<any>) => {
			state.wikisPagesDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setWikis: (state, action: PayloadAction<any>) => {
			state.wikisDict = arrayToDict(action.payload, (item, index) => idKey(item) ?? `idx:${index}`);
		},
		setNicknameLocal: (state, action: PayloadAction<string>) => {
			state.nickNameLocal = action.payload;
		},
		setFirstDayOfTheWeek: (state, action: PayloadAction<{ id: string; name: string }>) => {
			state.firstDayOfTheWeek = action.payload;
		},
		setAmountColumnsForCards: (state, action: PayloadAction<number>) => {
			state.amountColumnsForcard = action.payload;
		},
		setUseWebpForAssets: (state, action: PayloadAction<boolean>) => {
			state.useWebpForAssets = action.payload;
		},
		setFoodoffersNextDayThreshold: (state, action: PayloadAction<string | null>) => {
			state.foodOffersNextDayThreshold = action.payload;
		},
		setSelectedCustomer: (state, action: PayloadAction<ConfigCustomerEnum | null>) => {
			state.selectedCustomer = action.payload;
			state.foodoffersShowSeparatedMarkingsBreakdown = null;
		},
		setDebugMode: (state, action: PayloadAction<boolean>) => {
			state.debugMode = action.payload;
		},
		setSimulateExpoUpdateAvailable: (state, action: PayloadAction<boolean>) => {
			state.simulateExpoUpdateAvailable = action.payload;
		},
		setCollectibleItemSize: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
			state.collectibleItemSize = action.payload;
		},
		setCollectibleRandomPosition: (state, action: PayloadAction<boolean>) => {
			state.collectibleRandomPosition = action.payload;
		},
		setOfflineMode: (state, action: PayloadAction<boolean>) => {
			state.offlineMode = action.payload;
		},
		setMapTileVariantKey: (state, action: PayloadAction<string>) => {
			state.mapTileVariantKey = action.payload;
		},
		setMapUseFlyAnimation: (state, action: PayloadAction<boolean>) => {
			state.mapUseFlyAnimation = action.payload;
		},
		setMapVirtualZoom: (state, action: PayloadAction<number | null>) => {
			state.mapVirtualZoom = action.payload;
		},
		setMapOrganisationFilter: (state, action: PayloadAction<Record<string, boolean>>) => {
			state.mapOrganisationFilter = action.payload;
		},
		setOsmVectorMapStyleKey: (state, action: PayloadAction<string>) => {
			state.osmVectorMapStyleKey = action.payload;
		},
		setOsmVectorMapUseFlyAnimation: (state, action: PayloadAction<boolean>) => {
			state.osmVectorMapUseFlyAnimation = action.payload;
		},
		setOsmVectorMapOrganisationFilter: (state, action: PayloadAction<Record<string, boolean>>) => {
			state.osmVectorMapOrganisationFilter = action.payload;
		},
		setOsmVectorMapPitch: (state, action: PayloadAction<string>) => {
			state.osmVectorMapPitch = action.payload;
		},
		setOsmVectorMapClusterDistance: (state, action: PayloadAction<number>) => {
			state.osmVectorMapClusterDistance = action.payload;
		},
		setOsmVectorMapShowControlsHint: (state, action: PayloadAction<boolean>) => {
			state.osmVectorMapShowControlsHint = action.payload;
		},
		setOsmVectorMapGameMode: (state, action: PayloadAction<boolean>) => {
			state.osmVectorMapGameMode = action.payload;
		},
		setOsmVectorMapAutoRotateMode: (state, action: PayloadAction<boolean>) => {
			state.osmVectorMapAutoRotateMode = action.payload;
		},
		setOsmVectorMapPeopleMode: (state, action: PayloadAction<boolean>) => {
			state.osmVectorMapPeopleMode = action.payload;
		},
		setOsmVectorMapIntelligentMovement: (state, action: PayloadAction<boolean>) => {
			state.osmVectorMapIntelligentMovement = action.payload;
		},
		setOsmVectorMapPeopleCount: (state, action: PayloadAction<number>) => {
			state.osmVectorMapPeopleCount = action.payload;
		},
		setOsmVectorMapCarMode: (state, action: PayloadAction<boolean>) => {
			state.osmVectorMapCarMode = action.payload;
		},
		setOsmVectorMapConsent: (state, action: PayloadAction<boolean>) => {
			state.osmVectorMapConsent = action.payload;
		},
		setOsmVectorMapShowSettings: (state, action: PayloadAction<Record<string, boolean>>) => {
			state.osmVectorMapShowSettings = {
				...(state.osmVectorMapShowSettings ?? {}),
				...action.payload,
			};
		},
		setOsmVectorMapPoiSubSettings: (state, action: PayloadAction<Record<string, boolean>>) => {
			state.osmVectorMapPoiSubSettings = {
				...(state.osmVectorMapPoiSubSettings ?? {}),
				...action.payload,
			};
		},
		setMapClusterPixelRadius: (state, action: PayloadAction<number>) => {
			state.mapClusterPixelRadius = action.payload;
		},
		setPirateLanguage: (state, action: PayloadAction<boolean>) => {
			state.pirateLanguage = action.payload;
		},
		setFunLanguageMode: (state, action: PayloadAction<string | null>) => {
			state.funLanguageMode = action.payload;
		},
		setFoodoffersShowSeparatedMarkingsBreakdown: (state, action: PayloadAction<boolean | null>) => {
			state.foodoffersShowSeparatedMarkingsBreakdown = action.payload;
		},
		setCanteenVisitsVisibility: (state, action: PayloadAction<'all' | 'friends_only' | 'off'>) => {
			state.canteenVisits = {
				...state.canteenVisits,
				visibility: action.payload,
			};
		},
		clearSettings: (state) => {
			const selectedCustomer = state.selectedCustomer;
			Object.assign(state, initialState);
			state.selectedCustomer = selectedCustomer;
		},
	},
	extraReducers: (builder) => {
		builder
			.addCase('CHANGE_THEME', (state, action: any) => { state.selectedTheme = action.payload; })
			.addCase('SET_WARNING', (state, action: any) => { state.isWarning = action.payload; })
			.addCase('SET_SORTING', (state, action: any) => { state.sortBy = action.payload; })
			.addCase('SET_CAMPUSES_SORTING', (state, action: any) => { state.campusesSortBy = action.payload; })
			.addCase('SET_APARTMENTS_SORTING', (state, action: any) => { state.apartmentsSortBy = action.payload; })
			.addCase('SET_SERVER_INFO', (state, action: any) => { state.serverInfo = action.payload; })
			.addCase('SET_COLOR', (state, action: any) => { state.primaryColor = action.payload; })
			.addCase('CHANGE_LANGUAGE', (state, action: any) => { state.language = action.payload; })
			.addCase('SET_DRAWER_POSITION', (state, action: any) => { state.drawerPosition = action.payload; })
			.addCase('SET_APP_SETTINGS', (state, action: any) => { state.appSettings = action.payload; })
			.addCase('SET_WIKIS_PAGES', (state, action: any) => {
				state.wikisPagesDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_WIKIS', (state, action: any) => {
				state.wikisDict = arrayToDict(action.payload, (item: any, index: number) => idKey(item) ?? `idx:${index}`);
			})
			.addCase('SET_NICKNAME_LOCAL', (state, action: any) => { state.nickNameLocal = action.payload; })
			.addCase('SET_FIRST_DAY_OF_THE_WEEK', (state, action: any) => { state.firstDayOfTheWeek = action.payload; })
			.addCase('SET_AMOUNT_COLUMNS_FOR_CARDS', (state, action: any) => { state.amountColumnsForcard = action.payload; })
			.addCase('SET_USE_WEBP_FOR_ASSETS', (state, action: any) => { state.useWebpForAssets = action.payload; })
			.addCase('SET_FOODOFFERS_NEXT_DAY_THRESHOLD', (state, action: any) => { state.foodOffersNextDayThreshold = action.payload; })
			.addCase('SET_SELECTED_CUSTOMER', (state, action: any) => {
				state.selectedCustomer = action.payload;
				state.foodoffersShowSeparatedMarkingsBreakdown = null;
			})
			.addCase('SET_DEBUG_MODE', (state, action: any) => { state.debugMode = action.payload; })
			.addCase('SET_SIMULATE_EXPO_UPDATE_AVAILABLE', (state, action: any) => { state.simulateExpoUpdateAvailable = action.payload; })
			.addCase('SET_COLLECTIBLE_ITEM_SIZE', (state, action: any) => { state.collectibleItemSize = action.payload; })
			.addCase('SET_COLLECTIBLE_RANDOM_POSITION', (state, action: any) => { state.collectibleRandomPosition = action.payload; })
			.addCase('SET_OFFLINE_MODE', (state, action: any) => { state.offlineMode = action.payload; })
			.addCase('SET_MAP_TILE_VARIANT_KEY', (state, action: any) => { state.mapTileVariantKey = action.payload; })
			.addCase('SET_MAP_USE_FLY_ANIMATION', (state, action: any) => { state.mapUseFlyAnimation = action.payload; })
			.addCase('SET_MAP_VIRTUAL_ZOOM', (state, action: any) => { state.mapVirtualZoom = action.payload; })
			.addCase('SET_MAP_ORGANISATION_FILTER', (state, action: any) => { state.mapOrganisationFilter = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_STYLE_KEY', (state, action: any) => { state.osmVectorMapStyleKey = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_USE_FLY_ANIMATION', (state, action: any) => { state.osmVectorMapUseFlyAnimation = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_ORGANISATION_FILTER', (state, action: any) => { state.osmVectorMapOrganisationFilter = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_PITCH', (state, action: any) => { state.osmVectorMapPitch = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_CLUSTER_DISTANCE', (state, action: any) => { state.osmVectorMapClusterDistance = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_SHOW_CONTROLS_HINT', (state, action: any) => { state.osmVectorMapShowControlsHint = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_GAME_MODE', (state, action: any) => { state.osmVectorMapGameMode = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_AUTO_ROTATE_MODE', (state, action: any) => { state.osmVectorMapAutoRotateMode = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_PEOPLE_MODE', (state, action: any) => { state.osmVectorMapPeopleMode = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_INTELLIGENT_MOVEMENT', (state, action: any) => { state.osmVectorMapIntelligentMovement = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_PEOPLE_COUNT', (state, action: any) => { state.osmVectorMapPeopleCount = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_CAR_MODE', (state, action: any) => { state.osmVectorMapCarMode = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_CONSENT', (state, action: any) => { state.osmVectorMapConsent = action.payload; })
			.addCase('SET_OSM_VECTOR_MAP_SHOW_SETTINGS', (state, action: any) => {
				state.osmVectorMapShowSettings = { ...(state.osmVectorMapShowSettings ?? {}), ...action.payload };
			})
			.addCase('SET_OSM_VECTOR_MAP_POI_SUB_SETTINGS', (state, action: any) => {
				state.osmVectorMapPoiSubSettings = { ...(state.osmVectorMapPoiSubSettings ?? {}), ...action.payload };
			})
			.addCase('SET_MAP_CLUSTER_PIXEL_RADIUS', (state, action: any) => { state.mapClusterPixelRadius = action.payload; })
			.addCase('SET_PIRATE_LANGUAGE', (state, action: any) => { state.pirateLanguage = action.payload; })
			.addCase('SET_FUN_LANGUAGE_MODE', (state, action: any) => { state.funLanguageMode = action.payload; })
			.addCase('SET_FOODOFFERS_SHOW_SEPARATED_MARKINGS_BREAKDOWN', (state, action: any) => {
				state.foodoffersShowSeparatedMarkingsBreakdown = action.payload;
			})
			.addCase('SET_CANTEEN_VISITS_VISIBILITY', (state, action: any) => {
				state.canteenVisits = { ...state.canteenVisits, visibility: action.payload };
			})
			.addCase('CLEAR_SETTINGS', (state) => {
				const selectedCustomer = state.selectedCustomer;
				Object.assign(state, initialState);
				state.selectedCustomer = selectedCustomer;
			});
	},
});

export const {
	changeTheme,
	setWarning,
	setSorting,
	setCampusesSorting,
	setApartmentsSorting,
	setServerInfo,
	setColor,
	changeLanguage,
	setDrawerPosition,
	setAppSettings,
	setWikisPages,
	setWikis,
	setNicknameLocal,
	setFirstDayOfTheWeek,
	setAmountColumnsForCards,
	setUseWebpForAssets,
	setFoodoffersNextDayThreshold,
	setSelectedCustomer,
	setDebugMode,
	setSimulateExpoUpdateAvailable,
	setCollectibleItemSize,
	setCollectibleRandomPosition,
	setOfflineMode,
	setMapTileVariantKey,
	setMapUseFlyAnimation,
	setMapVirtualZoom,
	setMapOrganisationFilter,
	setOsmVectorMapStyleKey,
	setOsmVectorMapUseFlyAnimation,
	setOsmVectorMapOrganisationFilter,
	setOsmVectorMapPitch,
	setOsmVectorMapClusterDistance,
	setOsmVectorMapShowControlsHint,
	setOsmVectorMapGameMode,
	setOsmVectorMapAutoRotateMode,
	setOsmVectorMapPeopleMode,
	setOsmVectorMapIntelligentMovement,
	setOsmVectorMapPeopleCount,
	setOsmVectorMapCarMode,
	setOsmVectorMapConsent,
	setOsmVectorMapShowSettings,
	setOsmVectorMapPoiSubSettings,
	setMapClusterPixelRadius,
	setPirateLanguage,
	setFunLanguageMode,
	setFoodoffersShowSeparatedMarkingsBreakdown,
	setCanteenVisitsVisibility,
	clearSettings,
} = settingsSlice.actions;

export default settingsSlice.reducer;
