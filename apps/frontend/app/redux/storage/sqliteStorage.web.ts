import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Storage } from 'redux-persist';

// expo-sqlite's web support needs Metro wasm config plus COOP/COEP response headers
// (for SharedArrayBuffer/OPFS) that this app's static web export doesn't set up, and the
// 2MB ceiling being worked around on native is an Android/AsyncStorage-specific limit
// anyway - so web keeps using AsyncStorage (its localStorage-backed shim) unchanged.
// Metro picks this file over sqliteStorage.ts for web builds, so expo-sqlite's
// wasm-dependent web module is never pulled into the web bundle.
export const sqliteKeyValueStorage = {
	getItem: (key: string) => AsyncStorage.getItem(key),
	setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
	removeItem: (key: string) => AsyncStorage.removeItem(key),
	multiRemove: (keys: string[]) => AsyncStorage.multiRemove(keys),
	clear: () => AsyncStorage.clear(),
};

// Web has no separate sqlite store to migrate into - AsyncStorage already is the store.
export async function migrateAsyncStorageToSqlite(): Promise<{ migratedKeys: string[] }> {
	return { migratedKeys: [] };
}

export const sqliteStorage: Storage = AsyncStorage;
