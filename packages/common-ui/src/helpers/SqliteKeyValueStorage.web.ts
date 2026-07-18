import { getUtf8ByteLength } from './ByteSizeHelper';

// Web backend for the shared key-value storage: window.localStorage with raw
// (unprefixed) keys.
//
// This is deliberately byte-identical to what apps/frontend has always done on web:
// its redux/storage/sqliteStorage.web.ts used AsyncStorage, and AsyncStorage's web
// implementation is itself a thin wrapper around window.localStorage with raw keys
// (see @react-native-async-storage/async-storage/src/AsyncStorage.ts). Implementing
// it directly on localStorage keeps that exact storage format - existing frontend web
// data (e.g. "persist:root", "auth_data") keeps working - without making every app
// pull the AsyncStorage native module into its binary just for this web file.
//
// Why not expo-sqlite or expo-file-system:
// - expo-sqlite's web build needs Metro wasm config plus COOP/COEP response headers
//   (for SharedArrayBuffer/OPFS) that these apps' static web exports don't set up.
// - expo-file-system's new File/Paths API (SDK 54+) is a no-op stub on web: every
//   operation only logs "expo-file-system is not supported on web", so nothing was
//   ever persisted (only the legacy API had a web shim, and that one is a no-op too).
// Metro picks this file over SqliteKeyValueStorage.ts for web builds, so expo-sqlite's
// wasm-dependent web module is never pulled into the web bundle.

export const DEFAULT_DB_NAME = 'app_storage.db';

// Short-lived predecessor of this implementation namespaced keys as
// "kv:<dbName>:<key>" - migrate such entries to the raw key on first read.
function legacyPrefixedKey(key: string, dbName: string = DEFAULT_DB_NAME): string {
	return `kv:${dbName}:${key}`;
}

function getLocalStorage(): Storage | null {
	// Static web exports pre-render pages in Node where window/localStorage don't
	// exist; all real reads/writes happen client-side after hydration.
	if (typeof window === 'undefined' || !window.localStorage) return null;
	return window.localStorage;
}

// Export parity with the native module (re-exported by common-ui's index.ts). There is
// no SQLite database on web - callers needing raw SQL access must stay native-only.
export function getKvDatabase(dbName?: string): Promise<never> {
	return Promise.reject(new Error('getKvDatabase is not available on web (localStorage backend)'));
}

export async function getStorageItem(key: string, dbName?: string): Promise<string | null> {
	const storage = getLocalStorage();
	if (!storage) return null;
	const value = storage.getItem(key);
	if (value !== null) return value;
	const legacyValue = storage.getItem(legacyPrefixedKey(key, dbName));
	if (legacyValue !== null) {
		storage.setItem(key, legacyValue);
		storage.removeItem(legacyPrefixedKey(key, dbName));
	}
	return legacyValue;
}

export async function setStorageItem(key: string, value: string, dbName?: string): Promise<void> {
	const storage = getLocalStorage();
	if (!storage) return;
	storage.setItem(key, value);
}

export async function removeStorageItem(key: string, dbName?: string): Promise<void> {
	const storage = getLocalStorage();
	if (!storage) return;
	storage.removeItem(key);
	storage.removeItem(legacyPrefixedKey(key, dbName));
}

export type SqliteStorageKeyUsage = { key: string; bytes: number };

// Powers the debug "storage usage" settings list (see SettingsListSqliteStorage) - lists
// every localStorage key with its approximate size. Skips internal sentinel keys wrapped
// in double underscores, mirroring the native implementation.
export async function getStorageUsage(
	dbName?: string
): Promise<{ items: SqliteStorageKeyUsage[]; totalBytes: number }> {
	const storage = getLocalStorage();
	if (!storage) return { items: [], totalBytes: 0 };
	const items: SqliteStorageKeyUsage[] = [];
	for (let i = 0; i < storage.length; i++) {
		const key = storage.key(i);
		if (key === null) continue;
		if (key.startsWith('__') && key.endsWith('__')) continue;
		items.push({ key, bytes: getUtf8ByteLength(storage.getItem(key) ?? '') });
	}
	items.sort((a, b) => b.bytes - a.bytes);
	const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
	return { items, totalBytes };
}

// Clears the whole localStorage - same behavior as the AsyncStorage.clear() the
// frontend app's web storage exposed before this was shared here.
export async function clearStorage(dbName?: string): Promise<void> {
	const storage = getLocalStorage();
	if (!storage) return;
	storage.clear();
}
