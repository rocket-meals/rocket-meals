import { configureStore as rtkConfigureStore } from '@reduxjs/toolkit';
import promise from 'redux-promise';
import { createMigrate, persistReducer, persistStore } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { reducer } from '@/redux/reducer';

const migrations = {
	1: () => {
		return undefined;
	},
	2: () => {
		if (typeof window !== 'undefined') {
			localStorage.clear();
			window.location.reload();
		}
		return undefined;
	},
};

const persistConfig = {
	key: 'root',
	version: 1,
	storage: AsyncStorage,
	migrate: createMigrate(migrations, { debug: false }),
};

const rootReducer = (state: any, action: any) => {
	if (action.type === 'RESET_STORE') {
		const { settings } = state;
		AsyncStorage.clear(); // optional: force clear AsyncStorage too
		state = { settings };
	}
	return reducer(state, action);
};

const persistedReducer = persistReducer(persistConfig, rootReducer);


export const store = rtkConfigureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: false,
		}).concat(promise as any),
});

export const persistor = persistStore(store);


export const configureStore = store;
