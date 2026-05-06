import { combineReducers } from 'redux';

import authReducer from '../slices/authSlice';
import canteenReducer from '../slices/canteensSlice';
import settingReducer from '../slices/settingsSlice';
import foodReducer from '../slices/foodSlice';
import newsReducer from '../slices/newsSlice';
import collectibleEventsReducer from '../slices/collectibleEventsSlice';
import campusReducer from '../slices/campusSlice';
import apartmentsReducer from '../slices/apartmentSlice';
import managementReducer from '../slices/managementSlice';
import formReducer from '../slices/formSlice';
import foodAttributesReducer from '../slices/foodAttributesSlice';
import appElementsReducer from '../slices/appElementsSlice';
import lastUpdatedReducer from '../slices/lastUpdatedSlice';
import popupEventsHashReducer from '../slices/popupEventsHashSlice';
import chatsReducer from '../slices/chatsSlice';
import friendshipsReducer from '../slices/friendshipsSlice';

import {
	ApartmentsState,
	AppElementState,
	AuthState,
	CampusState,
	CanteensState,
	ChatsState,
	CollectibleEventsState,
	FoodAttributesState,
	FoodState,
	FormState,
	FriendshipsState,
	LastUpdatedState,
	ManagementState,
	NewsState,
	PopupEventsHashState,
	SettingsState,
} from '../Types/stateTypes';

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
	friendships: friendshipsReducer,
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
	friendships: FriendshipsState;
};
