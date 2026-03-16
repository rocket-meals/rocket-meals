import { CHANGE_LANGUAGE, CHANGE_THEME, CLEAR_SETTINGS, SET_AMOUNT_COLUMNS_FOR_CARDS, SET_APARTMENTS_SORTING, SET_APP_SETTINGS, SET_CAMPUSES_SORTING, SET_COLLECTIBLE_ITEM_SIZE, SET_COLLECTIBLE_RANDOM_POSITION, SET_COLOR, SET_DEBUG_MODE, SET_DRAWER_POSITION, SET_FIRST_DAY_OF_THE_WEEK, SET_FOODOFFERS_NEXT_DAY_THRESHOLD, SET_FUN_LANGUAGE_MODE, SET_MAP_CLUSTER_PIXEL_RADIUS, SET_MAP_ORGANISATION_FILTER, SET_MAP_TILE_VARIANT_KEY, SET_MAP_USE_FLY_ANIMATION, SET_MAP_VIRTUAL_ZOOM, SET_NICKNAME_LOCAL, SET_OFFLINE_MODE, SET_OSM_VECTOR_MAP_AUTO_ROTATE_MODE, SET_OSM_VECTOR_MAP_CAR_MODE, SET_OSM_VECTOR_MAP_CLUSTER_DISTANCE, SET_OSM_VECTOR_MAP_GAME_MODE, SET_OSM_VECTOR_MAP_INTELLIGENT_MOVEMENT, SET_OSM_VECTOR_MAP_ORGANISATION_FILTER, SET_OSM_VECTOR_MAP_PEOPLE_COUNT, SET_OSM_VECTOR_MAP_PEOPLE_MODE, SET_OSM_VECTOR_MAP_PITCH, SET_OSM_VECTOR_MAP_SHOW_CONTROLS_HINT, SET_OSM_VECTOR_MAP_STYLE_KEY, SET_OSM_VECTOR_MAP_USE_FLY_ANIMATION, SET_PIRATE_LANGUAGE, SET_SELECTED_CUSTOMER, SET_SERVER_INFO, SET_SIMULATE_EXPO_UPDATE_AVAILABLE, SET_SORTING, SET_USE_WEBP_FOR_ASSETS, SET_WARNING, SET_WIKIS, SET_WIKIS_PAGES } from '@/redux/Types/types';
import { ApartmentSortOption, CampusSortOption, FoodSortOption } from 'repo-depkit-common';
import { ConfigCustomerEnum } from '@/config';

const initialState = {
	selectedTheme: 'systematic',
	isWarning: false,
	sortBy: FoodSortOption.INTELLIGENT,
	campusesSortBy: CampusSortOption.INTELLIGENT,
	apartmentsSortBy: ApartmentSortOption.INTELLIGENT,
        serverInfo: {},
        primaryColor: '#FCDE31',
        appSettings: {},
        selectedCustomer: ConfigCustomerEnum.TEST,
        language: 'de',
	firstDayOfTheWeek: { id: 'monday', name: 'Mon' },
	drawerPosition: 'left',
	wikisPages: [],
	wikis: [],
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
        osmVectorMapStyleKey: 'liberty',
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
        mapClusterPixelRadius: 60,
        pirateLanguage: false,
        funLanguageMode: null as string | null,
};

const settingReducer = (state = initialState, actions: any) => {
	switch (actions.type) {
		case CHANGE_THEME: {
			return {
				...state,
				selectedTheme: actions.payload,
			};
		}
		case SET_WARNING: {
			return {
				...state,
				isWarning: actions.payload,
			};
		}
		case SET_SORTING: {
			return {
				...state,
				sortBy: actions.payload,
			};
		}
		case SET_CAMPUSES_SORTING: {
			return {
				...state,
				campusesSortBy: actions.payload,
			};
		}
		case SET_APARTMENTS_SORTING: {
			return {
				...state,
				apartmentsSortBy: actions.payload,
			};
		}
		case SET_SERVER_INFO: {
			return {
				...state,
				serverInfo: actions.payload,
			};
		}
		case SET_COLOR: {
			return {
				...state,
				primaryColor: actions.payload,
			};
		}
		case CHANGE_LANGUAGE: {
			return {
				...state,
				language: actions.payload,
			};
		}
		case SET_DRAWER_POSITION: {
			return {
				...state,
				drawerPosition: actions.payload,
			};
		}
		case SET_APP_SETTINGS: {
			return {
				...state,
				appSettings: actions.payload,
			};
		}
		case SET_WIKIS_PAGES: {
			return {
				...state,
				wikisPages: actions.payload,
			};
		}
		case SET_WIKIS: {
			return {
				...state,
				wikis: actions.payload,
			};
		}
		case SET_NICKNAME_LOCAL: {
			return {
				...state,
				nickNameLocal: actions.payload,
			};
		}
		case SET_FIRST_DAY_OF_THE_WEEK: {
			return {
				...state,
				firstDayOfTheWeek: actions.payload,
			};
		}
		case SET_AMOUNT_COLUMNS_FOR_CARDS: {
			return {
				...state,
				amountColumnsForcard: actions.payload,
			};
		}
                case SET_USE_WEBP_FOR_ASSETS: {
                        return {
                                ...state,
                                useWebpForAssets: actions.payload,
                        };
                }
                case SET_FOODOFFERS_NEXT_DAY_THRESHOLD: {
                        return {
                                ...state,
                                foodOffersNextDayThreshold: actions.payload,
                        };
                }
                case SET_SELECTED_CUSTOMER: {
                        return {
                                ...state,
                                selectedCustomer: actions.payload,
                        };
                }
                case SET_DEBUG_MODE: {
                        return {
                                ...state,
                                debugMode: actions.payload,
                        };
                }
                case SET_SIMULATE_EXPO_UPDATE_AVAILABLE: {
                        return {
                                ...state,
                                simulateExpoUpdateAvailable: actions.payload,
                        };
                }
                case SET_COLLECTIBLE_ITEM_SIZE: {
                        return {
                                ...state,
                                collectibleItemSize: actions.payload,
                        };
                }
                case SET_COLLECTIBLE_RANDOM_POSITION: {
                        return {
                                ...state,
                                collectibleRandomPosition: actions.payload,
                        };
                }
                case SET_OFFLINE_MODE: {
                        return {
                                ...state,
                                offlineMode: actions.payload,
                        };
                }
                case SET_MAP_TILE_VARIANT_KEY: {
                        return {
                                ...state,
                                mapTileVariantKey: actions.payload,
                        };
                }
                case SET_MAP_USE_FLY_ANIMATION: {
                        return {
                                ...state,
                                mapUseFlyAnimation: actions.payload,
                        };
                }
                case SET_MAP_VIRTUAL_ZOOM: {
                        return {
                                ...state,
                                mapVirtualZoom: actions.payload,
                        };
                }
                case SET_MAP_ORGANISATION_FILTER: {
                        return {
                                ...state,
                                mapOrganisationFilter: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_STYLE_KEY: {
                        return {
                                ...state,
                                osmVectorMapStyleKey: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_USE_FLY_ANIMATION: {
                        return {
                                ...state,
                                osmVectorMapUseFlyAnimation: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_ORGANISATION_FILTER: {
                        return {
                                ...state,
                                osmVectorMapOrganisationFilter: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_PITCH: {
                        return {
                                ...state,
                                osmVectorMapPitch: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_CLUSTER_DISTANCE: {
                        return {
                                ...state,
                                osmVectorMapClusterDistance: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_SHOW_CONTROLS_HINT: {
                        return {
                                ...state,
                                osmVectorMapShowControlsHint: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_GAME_MODE: {
                        return {
                                ...state,
                                osmVectorMapGameMode: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_AUTO_ROTATE_MODE: {
                        return {
                                ...state,
                                osmVectorMapAutoRotateMode: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_PEOPLE_MODE: {
                        return {
                                ...state,
                                osmVectorMapPeopleMode: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_INTELLIGENT_MOVEMENT: {
                        return {
                                ...state,
                                osmVectorMapIntelligentMovement: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_PEOPLE_COUNT: {
                        return {
                                ...state,
                                osmVectorMapPeopleCount: actions.payload,
                        };
                }
                case SET_OSM_VECTOR_MAP_CAR_MODE: {
                        return {
                                ...state,
                                osmVectorMapCarMode: actions.payload,
                        };
                }
                case SET_MAP_CLUSTER_PIXEL_RADIUS: {
                        return {
                                ...state,
                                mapClusterPixelRadius: actions.payload,
                        };
                }
                case SET_PIRATE_LANGUAGE: {
                        return {
                                ...state,
                                pirateLanguage: actions.payload,
                        };
                }
                case SET_FUN_LANGUAGE_MODE: {
                        return {
                                ...state,
                                funLanguageMode: actions.payload,
                        };
                }
                case CLEAR_SETTINGS: {
                        return {
                                ...initialState,
                        };
                }
		default:
			return state;
	}
};

export default settingReducer;
