import { CHANGE_LANGUAGE, CHANGE_THEME, CLEAR_SETTINGS, SET_AMOUNT_COLUMNS_FOR_CARDS, SET_APARTMENTS_SORTING, SET_APP_SETTINGS, SET_CAMPUSES_SORTING, SET_COLLECTIBLE_ITEM_SIZE, SET_COLLECTIBLE_RANDOM_POSITION, SET_COLOR, SET_DEBUG_MODE, SET_DRAWER_POSITION, SET_FIRST_DAY_OF_THE_WEEK, SET_FOODOFFERS_NEXT_DAY_THRESHOLD, SET_NICKNAME_LOCAL, SET_SELECTED_CUSTOMER, SET_SERVER_INFO, SET_SIMULATE_EXPO_UPDATE_AVAILABLE, SET_SORTING, SET_USE_WEBP_FOR_ASSETS, SET_WARNING, SET_WIKIS, SET_WIKIS_PAGES } from '@/redux/Types/types';
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
