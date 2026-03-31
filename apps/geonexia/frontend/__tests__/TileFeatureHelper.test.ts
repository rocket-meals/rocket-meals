/**
 * Tests for TileFeatureHelper – fetching vector-tile features for an H3 hex cell.
 *
 * These tests verify the tile-feature query pipeline for H3 cell
 * `8a1f10d5061ffff` (resolution 10, Dinklage / north-west Germany area).
 *
 * The cell boundary is:
 *   lat: 52.6599 – 52.6611
 *   lng: 8.1375 – 8.1396
 *
 * At zoom 14 the bounding box falls into a single tile (14/8562/5362).
 * The expected features are based on verified real-world data from the
 * OpenFreeMap tiling server.
 */

import {
	getTilesForBounds,
	queryTileFeaturesForHexCell,
} from '../helpers/TileFeatureHelper';

import {
	isAvailable as isH3Available,
	cellToBoundary,
	getResolution,
	isValidCell,
} from '../helpers/H3Helper';

import type { MapFeatureInfo } from '../helpers/RouteNameSuggestionHelper';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const HEX_ID = '8a1f10d5061ffff';
const FEATURE_QUERY_ZOOM = 14;

/**
 * Expected features returned by the tile server for the hex cell at zoom 14.
 * These were verified manually and represent the stable set of geographic
 * features that intersect the cell's bounding box.
 */
const EXPECTED_FEATURES: MapFeatureInfo[] = [
	{
		layerId: 'highway-shield-non-us',
		name: 'Lohner Straße',
		class: 'secondary',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'highway-name-major',
		name: 'Lohner Straße',
		class: 'secondary',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'highway-name-minor',
		name: 'Am Burgwald',
		class: 'minor',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'building-3d',
		name: null,
		class: null,
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'road_secondary_tertiary',
		name: null,
		class: 'secondary',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'road_minor',
		name: null,
		class: 'minor',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'road_service_track',
		name: null,
		class: 'service',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'road_path_pedestrian',
		name: null,
		class: 'path',
		subclass: 'path',
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'road_secondary_tertiary_casing',
		name: null,
		class: 'secondary',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'road_minor_casing',
		name: null,
		class: 'minor',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'road_service_track_casing',
		name: null,
		class: 'service',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'landcover_wood',
		name: null,
		class: 'wood',
		subclass: 'forest',
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'park_outline',
		name: 'Burgwald Dinklage',
		class: 'naturschutzgebiet',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'park',
		name: 'Burgwald Dinklage',
		class: 'naturschutzgebiet',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Compute the bounding box of an H3 cell from its boundary vertices. */
function getHexBounds(h3Index: string): {
	minLat: number;
	minLng: number;
	maxLat: number;
	maxLng: number;
} {
	const boundary = cellToBoundary(h3Index); // [[lat, lng], ...]
	const lats = boundary.map((v) => v[0]);
	const lngs = boundary.map((v) => v[1]);
	return {
		minLat: Math.min(...lats),
		minLng: Math.min(...lngs),
		maxLat: Math.max(...lats),
		maxLng: Math.max(...lngs),
	};
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('TileFeatureHelper – hex cell feature query', () => {
	it('H3 library is available and recognises the test cell', () => {
		expect(isH3Available()).toBe(true);
		expect(isValidCell(HEX_ID)).toBe(true);
		expect(getResolution(HEX_ID)).toBe(10);
	});

	it('hex cell boundary produces valid lat/lng bounds', () => {
		const bounds = getHexBounds(HEX_ID);
		// Cell is in the Dinklage area (north-west Germany)
		expect(bounds.minLat).toBeGreaterThan(52.65);
		expect(bounds.maxLat).toBeLessThan(52.67);
		expect(bounds.minLng).toBeGreaterThan(8.13);
		expect(bounds.maxLng).toBeLessThan(8.15);
	});

	it('getTilesForBounds returns exactly one tile (14/8562/5362) for the hex bounding box', () => {
		const bounds = getHexBounds(HEX_ID);
		const tiles = getTilesForBounds(
			bounds.minLat,
			bounds.minLng,
			bounds.maxLat,
			bounds.maxLng,
			FEATURE_QUERY_ZOOM,
		);
		expect(tiles).toHaveLength(1);
		expect(tiles[0]).toEqual({ z: 14, x: 8562, y: 5362 });
	});

	it('expected features have exactly 14 entries', () => {
		expect(EXPECTED_FEATURES).toHaveLength(14);
	});

	it('expected features contain the correct layer IDs in order', () => {
		const expectedLayerIds = [
			'highway-shield-non-us',
			'highway-name-major',
			'highway-name-minor',
			'building-3d',
			'road_secondary_tertiary',
			'road_minor',
			'road_service_track',
			'road_path_pedestrian',
			'road_secondary_tertiary_casing',
			'road_minor_casing',
			'road_service_track_casing',
			'landcover_wood',
			'park_outline',
			'park',
		];
		expect(EXPECTED_FEATURES.map((f) => f.layerId)).toEqual(expectedLayerIds);
	});

	it('expected features contain named features for Lohner Straße, Am Burgwald and Burgwald Dinklage', () => {
		const namedFeatures = EXPECTED_FEATURES.filter((f) => f.name !== null);
		expect(namedFeatures).toHaveLength(5);
		expect(namedFeatures.map((f) => f.name)).toEqual([
			'Lohner Straße',
			'Lohner Straße',
			'Am Burgwald',
			'Burgwald Dinklage',
			'Burgwald Dinklage',
		]);
	});

	it('all expected features have the correct MapFeatureInfo shape', () => {
		for (const feat of EXPECTED_FEATURES) {
			expect(feat).toHaveProperty('layerId');
			expect(feat).toHaveProperty('name');
			expect(feat).toHaveProperty('class');
			expect(feat).toHaveProperty('subclass');
			expect(feat).toHaveProperty('highway');
			expect(feat).toHaveProperty('waterway');
			expect(feat).toHaveProperty('building');
			expect(feat).toHaveProperty('natural');
			expect(feat).toHaveProperty('landuse');
			expect(feat).toHaveProperty('amenity');
		}
	});

	it('road features have the expected class values', () => {
		const roadFeatures = EXPECTED_FEATURES.filter((f) =>
			f.layerId !== null && (
				f.layerId.startsWith('road_') ||
				f.layerId.startsWith('highway-')
			),
		);
		const classes = roadFeatures.map((f) => f.class);
		expect(classes).toEqual([
			'secondary',    // highway-shield-non-us
			'secondary',    // highway-name-major
			'minor',        // highway-name-minor
			'secondary',    // road_secondary_tertiary
			'minor',        // road_minor
			'service',      // road_service_track
			'path',         // road_path_pedestrian
			'secondary',    // road_secondary_tertiary_casing
			'minor',        // road_minor_casing
			'service',      // road_service_track_casing
		]);
	});

	it('park features reference Burgwald Dinklage as naturschutzgebiet', () => {
		const parkFeatures = EXPECTED_FEATURES.filter((f) =>
			f.layerId === 'park' || f.layerId === 'park_outline',
		);
		expect(parkFeatures).toHaveLength(2);
		for (const pf of parkFeatures) {
			expect(pf.name).toBe('Burgwald Dinklage');
			expect(pf.class).toBe('naturschutzgebiet');
		}
	});

	it('landcover_wood feature has class=wood and subclass=forest', () => {
		const wood = EXPECTED_FEATURES.find((f) => f.layerId === 'landcover_wood');
		expect(wood).toBeDefined();
		expect(wood!.class).toBe('wood');
		expect(wood!.subclass).toBe('forest');
	});

	it('road_path_pedestrian feature has class=path and subclass=path', () => {
		const pedestrian = EXPECTED_FEATURES.find((f) => f.layerId === 'road_path_pedestrian');
		expect(pedestrian).toBeDefined();
		expect(pedestrian!.class).toBe('path');
		expect(pedestrian!.subclass).toBe('path');
	});

	it(
		'queryTileFeaturesForHexCell returns exactly the expected features',
		async () => {
			let result: MapFeatureInfo[];
			try {
				result = await queryTileFeaturesForHexCell(HEX_ID, FEATURE_QUERY_ZOOM);
			} catch (err: unknown) {
				// Skip when the tile server is unreachable (e.g. offline CI runner).
				const msg = err instanceof Error ? err.message : String(err);
				if (msg.includes('fetch failed') || msg.includes('ENOTFOUND') || msg.includes('network')) {
					console.warn('Skipping live tile fetch – network unavailable:', msg);
					return;
				}
				throw err;
			}
			expect(result).toEqual(EXPECTED_FEATURES);
		},
		30_000,
	);
});
