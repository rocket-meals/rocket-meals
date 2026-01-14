import { combineReducers } from 'redux';
import authReducer from './authReducer';
import canteenReducer from './canteenReducer';
import settingReducer from './settingsReducer';
import foodReducer from './foodReducer';
import newsReducer from './newsReducer';
import collectibleEventsReducer from './collectibleEventsReducer';
import campusReducer from './campusReducer';
import apartmentsReducer from './apartmentReducer';
import managementReducer from './managementReducer';
import formReducer from './formReducer';
import foodAttributesReducer from './FoodAttributes';
import appElementsReducer from './appElementsReducer';
import lastUpdatedReducer from './lastUpdatedReducer';
import popupEventsHashReducer from './popupEventsHashReducer';
import chatsReducer from './chatsReducer';
import { ApartmentsState, AppElementState, AuthState, CampusState, CanteensState, ChatsState, CollectibleEventsState, FoodAttributesState, FoodState, FormState, LastUpdatedState, ManagementState, NewsState, PopupEventsHashState, SettingsState } from '../Types/stateTypes';

export const reducer = combineReducers({
	state: (state = {}) => state,
	authReducer,
	canteenReducer,
        food: foodReducer,
        settings: settingReducer,
        news: newsReducer,
        collectibleEvents: collectibleEventsReducer,
        campus: campusReducer,
        apartment: apartmentsReducer,
        management: managementReducer,
	form: formReducer,
	foodAttributes: foodAttributesReducer,
	appElements: appElementsReducer,
	lastUpdated: lastUpdatedReducer,
	popup_events_hash: popupEventsHashReducer,
	chats: chatsReducer,
});

export type RootState = {
	authReducer: AuthState;
	apartment: ApartmentsState;
	appElements: AppElementState;
	campus: CampusState;
	canteenReducer: CanteensState;
	food: FoodState;
	form: FormState;
        foodAttributes: FoodAttributesState;
        lastUpdated: LastUpdatedState;
        management: ManagementState;
        news: NewsState;
        collectibleEvents: CollectibleEventsState;
        settings: SettingsState;
        popup_events_hash: PopupEventsHashState;
        chats: ChatsState;
};
