import AsyncStorage from '@react-native-async-storage/async-storage';
import { Dispatch } from 'redux';
import { CLEAR_APARTMENTS, CLEAR_CAMPUSES, CLEAR_CANTEENS, CLEAR_CHATS, CLEAR_COLLECTION_DATES_LAST_UPDATED, CLEAR_DEVELOPER_MODE, CLEAR_FOODS, CLEAR_MANAGEMENT, CLEAR_NEWS, CLEAR_POPUP_EVENTS_HASH, CLEAR_PROFILE, CLEAR_SETTINGS, CLEAR_COLLECTIBLE_EVENTS } from '@/redux/Types/types';
import { persistor } from '@/redux/store';
import { clearChatReadStatus } from '@/helper/chatReadStatus';

export const performLogout = async (
	dispatch: Dispatch,
	router: {
		replace: (args: { pathname: string; params?: Record<string, string> }) => void;
	}
) => {
	try {
		dispatch({ type: CLEAR_CANTEENS });
		dispatch({ type: CLEAR_CAMPUSES });
		dispatch({ type: CLEAR_APARTMENTS });
		dispatch({ type: CLEAR_FOODS });
                dispatch({ type: CLEAR_MANAGEMENT });
                dispatch({ type: CLEAR_DEVELOPER_MODE });
                dispatch({ type: CLEAR_NEWS });
                dispatch({ type: CLEAR_COLLECTIBLE_EVENTS });
                dispatch({ type: CLEAR_PROFILE });
                dispatch({ type: CLEAR_CHATS });
                await clearChatReadStatus();
                dispatch({ type: CLEAR_SETTINGS });
		dispatch({ type: CLEAR_POPUP_EVENTS_HASH });
		dispatch({ type: CLEAR_COLLECTION_DATES_LAST_UPDATED });
		await AsyncStorage.multiRemove(['auth_data', 'persist:root']);

		persistor.purge();
		router.replace({ pathname: '/(auth)/login', params: { logout: 'true' } });
	} catch (error) {
		console.error('Error during logout:', error);
	}
};
