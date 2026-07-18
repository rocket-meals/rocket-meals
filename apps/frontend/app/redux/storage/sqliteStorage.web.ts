import { getStorageItem, setStorageItem, removeStorageItem, clearStorage } from 'repo-depkit-common-ui';
import type { Storage } from 'redux-persist';

// Web storage for redux-persist and the app's key-value helpers, delegating to the
// shared repo-depkit-common-ui SqliteKeyValueStorage. Its web backend is
// window.localStorage with raw keys - byte-identical to the AsyncStorage web shim this
// file used before (AsyncStorage's web implementation is itself just localStorage with
// raw keys), so existing web data like "persist:root" or "auth_data" keeps working.
// The shared module is also what score-tracker and geonexia persist through, so all
// apps now use the same storage code on every platform. Metro picks this file over
// sqliteStorage.ts for web builds, so expo-sqlite's wasm-dependent web module is never
// pulled into the web bundle.
export const sqliteKeyValueStorage = {
	getItem: (key: string) => getStorageItem(key),
	setItem: (key: string, value: string) => setStorageItem(key, value),
	removeItem: (key: string) => removeStorageItem(key),
	multiRemove: async (keys: string[]) => {
		for (const key of keys) {
			await removeStorageItem(key);
		}
	},
	clear: () => clearStorage(),
};

// Web has no separate sqlite store to migrate into - localStorage already is the store.
export async function migrateAsyncStorageToSqlite(): Promise<{ migratedKeys: string[] }> {
	return { migratedKeys: [] };
}

export const sqliteStorage: Storage = sqliteKeyValueStorage;
