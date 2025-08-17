import {
  CHANGE_LANGUAGE,
  CHANGE_THEME,
  CLEAR_SETTINGS,
  SET_AMOUNT_COLUMNS_FOR_CARDS,
  SET_APARTMENTS_SORTING,
  SET_APP_SETTINGS,
  SET_CAMPUSES_SORTING,
  SET_COLOR,
  SET_DRAWER_POSITION,
  SET_FIRST_DAY_OF_THE_WEEK,
  SET_NICKNAME_LOCAL,
  SET_SERVER_INFO,
  SET_SORTING,
  SET_WARNING,
  SET_WIKIS,
  SET_WIKIS_PAGES,
  SET_USE_WEBP_FOR_ASSETS,
} from '@/redux/Types/types';
import {
  FoodSortOption,
  CampusSortOption,
  ApartmentSortOption,
} from 'repo-depkit-common';

const initialState = {
  selectedTheme: 'systematic',
  isWarning: false,
  sortBy: FoodSortOption.INTELLIGENT,
  campusesSortBy: CampusSortOption.INTELLIGENT,
  apartmentsSortBy: ApartmentSortOption.INTELLIGENT,
  serverInfo: {},
  primaryColor: '#FCDE31',
  appSettings: {},
  language: 'de',
  firstDayOfTheWeek: { id: 'monday', name: 'Mon' },
  drawerPosition: 'left',
  wikisPages: [],
  wikis: [],
  nickNameLocal: '',
  amountColumnsForcard: 0,
  useWebpForAssets: true,
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
