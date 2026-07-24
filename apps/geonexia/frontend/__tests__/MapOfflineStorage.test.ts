/**
 * Tests for MapOfflineStorage – the SQLite-backed offline map adapter.
 *
 * The shared key-value storage (repo-depkit-common-ui) is mocked with an
 * in-memory Map so the tests verify the adapter's contract:
 *   – tiles are stored under the dedicated map-offline key prefix,
 *   – deleteAllMapTiles removes exactly the prefixed keys and nothing else,
 *   – the enabled flag round-trips and defaults to disabled.
 */

const mockMemoryStore = new Map<string, string>();

const mockRunAsync = jest.fn(async (sql: string, param: string) => {
	// Emulate the prefix delete used by deleteAllMapTiles.
	if (sql.startsWith('DELETE FROM kv WHERE key LIKE')) {
		const prefix = param.slice(0, -1); // strip trailing '%'
		for (const key of Array.from(mockMemoryStore.keys())) {
			if (key.startsWith(prefix)) mockMemoryStore.delete(key);
		}
	}
});

const mockGetFirstAsync = jest.fn(async (sql: string, param: string) => {
	if (sql.startsWith('SELECT COUNT(*)')) {
		const prefix = param.slice(0, -1);
		let count = 0;
		let totalBytes = 0;
		for (const [key, value] of mockMemoryStore) {
			if (key.startsWith(prefix)) {
				count++;
				totalBytes += value.length;
			}
		}
		return { count, totalBytes };
	}
	return null;
});

jest.mock('repo-depkit-common-ui', () => ({
	getStorageItem: jest.fn(async (key: string) => mockMemoryStore.get(key) ?? null),
	setStorageItem: jest.fn(async (key: string, value: string) => {
		mockMemoryStore.set(key, value);
	}),
	removeStorageItem: jest.fn(async (key: string) => {
		mockMemoryStore.delete(key);
	}),
	getStorageUsage: jest.fn(async () => {
		const items = Array.from(mockMemoryStore, ([key, value]) => ({ key, bytes: value.length }));
		return { items, totalBytes: items.reduce((sum, item) => sum + item.bytes, 0) };
	}),
	getKvDatabase: jest.fn(async () => ({
		runAsync: mockRunAsync,
		getFirstAsync: mockGetFirstAsync,
	})),
}));

import {
	MAP_OFFLINE_TILE_KEY_PREFIX,
	getMapTileKey,
	saveMapTile,
	loadMapTile,
	deleteAllMapTiles,
	getMapTileUsage,
	saveMapOfflineEnabled,
	loadMapOfflineEnabled,
} from '../helpers/MapOfflineStorage';
import { MAP_OFFLINE_SCRIPT } from '../assets/mapOfflineScript';

const TILE_URL = 'https://tiles.openfreemap.org/planet/14/8562/5362.pbf';

beforeEach(() => {
	mockMemoryStore.clear();
});

describe('MapOfflineStorage tile persistence', () => {
	it('stores tiles under the dedicated map-offline key prefix', async () => {
		expect(getMapTileKey(TILE_URL)).toBe(MAP_OFFLINE_TILE_KEY_PREFIX + TILE_URL);

		await saveMapTile(TILE_URL, 'dGlsZS1kYXRh');
		expect(mockMemoryStore.get(MAP_OFFLINE_TILE_KEY_PREFIX + TILE_URL)).toBe('dGlsZS1kYXRh');
	});

	it('round-trips a saved tile and returns null for unknown URLs', async () => {
		await saveMapTile(TILE_URL, 'dGlsZS1kYXRh');
		expect(await loadMapTile(TILE_URL)).toBe('dGlsZS1kYXRh');
		expect(await loadMapTile('https://example.org/other.pbf')).toBeNull();
	});

	it('deleteAllMapTiles removes only map-offline keys', async () => {
		await saveMapTile(TILE_URL, 'dGlsZS1kYXRh');
		await saveMapTile('https://tiles.openfreemap.org/styles/liberty', 'c3R5bGU=');
		mockMemoryStore.set('geonexia-routes-index.json', '["route-1"]');
		mockMemoryStore.set('geonexia-gps-interval.json', '{"seconds":5}');

		await deleteAllMapTiles();

		expect(await loadMapTile(TILE_URL)).toBeNull();
		expect(await getMapTileUsage()).toEqual({ count: 0, totalBytes: 0 });
		// Non-map keys survive.
		expect(mockMemoryStore.get('geonexia-routes-index.json')).toBe('["route-1"]');
		expect(mockMemoryStore.get('geonexia-gps-interval.json')).toBe('{"seconds":5}');
	});

	it('falls back to key listing when SQL access is unavailable (web)', async () => {
		// Simulate the web storage backend where getKvDatabase rejects.
		const { getKvDatabase } = jest.requireMock('repo-depkit-common-ui');
		getKvDatabase.mockRejectedValueOnce(new Error('not available on web'));
		getKvDatabase.mockRejectedValueOnce(new Error('not available on web'));

		await saveMapTile(TILE_URL, 'dGlsZS1kYXRh');
		mockMemoryStore.set('geonexia-routes-index.json', '["route-1"]');

		const usage = await getMapTileUsage();
		expect(usage).toEqual({ count: 1, totalBytes: 'dGlsZS1kYXRh'.length });

		await deleteAllMapTiles();
		expect(await loadMapTile(TILE_URL)).toBeNull();
		expect(mockMemoryStore.get('geonexia-routes-index.json')).toBe('["route-1"]');
	});

	it('reports cached tile count and total bytes', async () => {
		await saveMapTile(TILE_URL, 'dGlsZS1kYXRh');
		await saveMapTile('https://tiles.openfreemap.org/planet/14/8562/5363.pbf', 'bW9yZQ==');

		const usage = await getMapTileUsage();
		expect(usage.count).toBe(2);
		expect(usage.totalBytes).toBe('dGlsZS1kYXRh'.length + 'bW9yZQ=='.length);
	});
});

describe('MapOfflineStorage enabled flag', () => {
	it('defaults to disabled when nothing is stored', async () => {
		expect(await loadMapOfflineEnabled()).toBe(false);
	});

	it('round-trips the enabled flag', async () => {
		await saveMapOfflineEnabled(true);
		expect(await loadMapOfflineEnabled()).toBe(true);
		await saveMapOfflineEnabled(false);
		expect(await loadMapOfflineEnabled()).toBe(false);
	});

	it('ignores corrupted stored values', async () => {
		mockMemoryStore.set('geonexia-map-offline-enabled.json', 'not-json');
		expect(await loadMapOfflineEnabled()).toBe(false);
	});
});

describe('MAP_OFFLINE_SCRIPT message contract', () => {
	// The injected WebView script and the React Native message handlers in
	// app/index.tsx communicate via string tags/keys. Guard against renames on
	// one side only.
	it('uses the message tags handled by the React Native side', () => {
		expect(MAP_OFFLINE_SCRIPT).toContain("tag: 'MapOfflineInit'");
		expect(MAP_OFFLINE_SCRIPT).toContain("tag: 'MapOfflineLoad'");
		expect(MAP_OFFLINE_SCRIPT).toContain("tag: 'MapOfflineStore'");
		expect(MAP_OFFLINE_SCRIPT).toContain('mapOfflineEnabled');
		expect(MAP_OFFLINE_SCRIPT).toContain('mapOfflineLoadResult');
	});

	it('registers the offline protocol and the transformRequest hook', () => {
		expect(MAP_OFFLINE_SCRIPT).toContain('maplibregl.addProtocol');
		expect(MAP_OFFLINE_SCRIPT).toContain('window._mapExtensions.transformRequest');
	});
});
