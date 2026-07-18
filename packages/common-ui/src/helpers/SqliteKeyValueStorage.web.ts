import { getUtf8ByteLength } from './ByteSizeHelper';

// Web backend for the shared key-value storage: window.localStorage.
//
// Why not expo-sqlite or expo-file-system:
// - expo-sqlite's web build needs Metro wasm config plus COOP/COEP response headers
//   (for SharedArrayBuffer/OPFS) that these apps' static web exports don't set up.
// - expo-file-system's NEW File/Paths API (SDK 54+) is a no-op stub on web: every
//   operation only logs "expo-file-system is not supported on web" (see
//   expo-file-system/src/ExpoFileSystem.web.ts), so `new File(...).write(...)` throws
//   and nothing is ever persisted. Only the *legacy* API ever had a web shim, and that
//   one is a no-op too.
// localStorage is the same mechanism apps/frontend already uses on web (AsyncStorage's
// web shim is localStorage-backed), it is synchronous, universally available and
// survives reloads. Metro picks this file over SqliteKeyValueStorage.ts for web builds,
// so expo-sqlite's wasm-dependent web module is never pulled into the web bundle.

export const DEFAULT_DB_NAME = 'app_storage.db';

// Namespace prefix so getStorageUsage()/clearStorage() only ever touch keys owned by
// this helper and never entries other libraries put into localStorage. The dbName is
// part of the prefix for signature parity with the native per-db separation.
function keyPrefix(dbName: string = DEFAULT_DB_NAME): string {
	return `kv:${dbName}:`;
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
	return storage.getItem(keyPrefix(dbName) + key);
}

export async function setStorageItem(key: string, value: string, dbName?: string): Promise<void> {
	const storage = getLocalStorage();
	if (!storage) return;
	storage.setItem(keyPrefix(dbName) + key, value);
}

export async function removeStorageItem(key: string, dbName?: string): Promise<void> {
	const storage = getLocalStorage();
	if (!storage) return;
	storage.removeItem(keyPrefix(dbName) + key);
}

export type SqliteStorageKeyUsage = { key: string; bytes: number };

// Powers the debug "storage usage" settings list (see SettingsListSqliteStorage) - lists
// every key owned by this helper with its approximate size. Skips internal sentinel keys
// wrapped in double underscores, mirroring the native implementation.
export async function getStorageUsage(
	dbName?: string
): Promise<{ items: SqliteStorageKeyUsage[]; totalBytes: number }> {
	const storage = getLocalStorage();
	if (!storage) return { items: [], totalBytes: 0 };
	const prefix = keyPrefix(dbName);
	const items: SqliteStorageKeyUsage[] = [];
	for (let i = 0; i < storage.length; i++) {
		const fullKey = storage.key(i);
		if (fullKey === null || !fullKey.startsWith(prefix)) continue;
		const key = fullKey.slice(prefix.length);
		if (key.startsWith('__') && key.endsWith('__')) continue;
		items.push({ key, bytes: getUtf8ByteLength(storage.getItem(fullKey) ?? '') });
	}
	items.sort((a, b) => b.bytes - a.bytes);
	const totalBytes = items.reduce((sum, item) => sum + item.bytes, 0);
	return { items, totalBytes };
}

export async function clearStorage(dbName?: string): Promise<void> {
	const storage = getLocalStorage();
	if (!storage) return;
	const prefix = keyPrefix(dbName);
	// Collect first - removing while iterating shifts localStorage's key indices.
	const keysToRemove: string[] = [];
	for (let i = 0; i < storage.length; i++) {
		const fullKey = storage.key(i);
		if (fullKey !== null && fullKey.startsWith(prefix)) keysToRemove.push(fullKey);
	}
	for (const fullKey of keysToRemove) {
		storage.removeItem(fullKey);
	}
}
