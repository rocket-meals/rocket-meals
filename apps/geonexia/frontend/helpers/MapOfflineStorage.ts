import { getKvDatabase, getStorageItem, getStorageUsage, removeStorageItem, setStorageItem } from 'repo-depkit-common-ui';

/**
 * Offline map adapter: persists raw map resources (vector tiles, style JSON,
 * glyphs, sprites) in the shared SQLite key-value storage so the map keeps
 * working without a network connection.
 *
 * The adapter intentionally only knows how to SAVE, LOAD and DELETE map data –
 * the interception of MapLibre resource requests lives in the injected WebView
 * script (assets/mapOfflineScript.ts) and the message wiring in app/index.tsx.
 *
 * All map resources share a dedicated key prefix so that disabling the feature
 * can delete exactly the cached map data and nothing else.
 */

// ─── Storage keys ─────────────────────────────────────────────────────────────

export const MAP_OFFLINE_ENABLED_DEFAULT = false;

const MAP_OFFLINE_ENABLED_KEY = 'geonexia-map-offline-enabled.json';

/** Every cached map resource key starts with this prefix (followed by the resource URL). */
export const MAP_OFFLINE_TILE_KEY_PREFIX = 'geonexia-map-offline-tile-';

/** Build the storage key for a cached map resource URL. */
export function getMapTileKey(url: string): string {
	return MAP_OFFLINE_TILE_KEY_PREFIX + url;
}

// ─── Enabled flag ─────────────────────────────────────────────────────────────

/**
 * Persist the offline-maps enabled flag to disk.
 * Silently ignores write errors to avoid crashing on storage failures.
 */
export async function saveMapOfflineEnabled(enabled: boolean): Promise<void> {
	try {
		await setStorageItem(MAP_OFFLINE_ENABLED_KEY, JSON.stringify({ enabled }));
	} catch (err) {
		console.warn('[MapOfflineStorage] Failed to save offline maps flag:', err);
	}
}

/**
 * Load the persisted offline-maps enabled flag from disk.
 * Returns MAP_OFFLINE_ENABLED_DEFAULT when nothing is stored or on parse errors.
 */
export async function loadMapOfflineEnabled(): Promise<boolean> {
	try {
		const raw = await getStorageItem(MAP_OFFLINE_ENABLED_KEY);
		if (raw === null) return MAP_OFFLINE_ENABLED_DEFAULT;
		const parsed = JSON.parse(raw) as { enabled?: unknown };
		return typeof parsed.enabled === 'boolean' ? parsed.enabled : MAP_OFFLINE_ENABLED_DEFAULT;
	} catch {
		return MAP_OFFLINE_ENABLED_DEFAULT;
	}
}

// ─── Tile persistence ─────────────────────────────────────────────────────────

/**
 * Save one map resource (base64-encoded raw bytes) under its URL.
 * Silently ignores write errors so a failing cache never breaks the live map.
 */
export async function saveMapTile(url: string, base64Data: string): Promise<void> {
	try {
		await setStorageItem(getMapTileKey(url), base64Data);
	} catch (err) {
		console.warn('[MapOfflineStorage] Failed to save map tile:', err);
	}
}

/**
 * Load one cached map resource by its URL.
 * Returns the base64-encoded raw bytes, or null when not cached / on errors.
 */
export async function loadMapTile(url: string): Promise<string | null> {
	try {
		return await getStorageItem(getMapTileKey(url));
	} catch {
		return null;
	}
}

/**
 * Delete ALL cached map resources – and only those. Every other key in the
 * shared SQLite storage (activities, routes, settings, …) is left untouched.
 * Called when the user disables the offline maps feature.
 *
 * Uses a single SQL prefix-delete on native; the web storage backend has no
 * SQL access (getKvDatabase rejects there), so it falls back to listing all
 * keys and removing the map-offline ones individually.
 */
export async function deleteAllMapTiles(): Promise<void> {
	try {
		const db = await getKvDatabase();
		await db.runAsync('DELETE FROM kv WHERE key LIKE ?', MAP_OFFLINE_TILE_KEY_PREFIX + '%');
	} catch {
		try {
			const { items } = await getStorageUsage();
			const tileKeys = items.filter((item) => item.key.startsWith(MAP_OFFLINE_TILE_KEY_PREFIX));
			await Promise.all(tileKeys.map((item) => removeStorageItem(item.key)));
		} catch (err) {
			console.warn('[MapOfflineStorage] Failed to delete cached map tiles:', err);
		}
	}
}

/**
 * Report how many map resources are cached and their combined size in bytes.
 * The stored values are base64 (ASCII), so LENGTH(value) equals the byte size.
 * Falls back to the key-listing API where SQL access is unavailable (web).
 */
export async function getMapTileUsage(): Promise<{ count: number; totalBytes: number }> {
	try {
		const db = await getKvDatabase();
		const row = await db.getFirstAsync<{ count: number; totalBytes: number | null }>(
			'SELECT COUNT(*) AS count, COALESCE(SUM(LENGTH(value)), 0) AS totalBytes FROM kv WHERE key LIKE ?',
			MAP_OFFLINE_TILE_KEY_PREFIX + '%',
		);
		return { count: row?.count ?? 0, totalBytes: row?.totalBytes ?? 0 };
	} catch {
		try {
			const { items } = await getStorageUsage();
			const tileItems = items.filter((item) => item.key.startsWith(MAP_OFFLINE_TILE_KEY_PREFIX));
			return {
				count: tileItems.length,
				totalBytes: tileItems.reduce((sum, item) => sum + item.bytes, 0),
			};
		} catch {
			return { count: 0, totalBytes: 0 };
		}
	}
}
