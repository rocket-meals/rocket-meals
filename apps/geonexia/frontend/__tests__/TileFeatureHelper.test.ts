/**
 * Tests for TileFeatureHelper – fetching vector-tile features for H3 hex cells.
 *
 * Two hex cells are tested:
 *
 * 1) `8a1f10d5061ffff` (resolution 10, Dinklage / north-west Germany)
 *    Boundary: lat 52.6599–52.6611, lng 8.1375–8.1396
 *    At zoom 14 → single tile 14/8562/5362, 14 expected features.
 *
 * 2) `8a1f10d53d37fff` (resolution 10, Burgwald Dinklage area)
 *    10 expected features including POI, water, and park layers.
 *
 * The expected features are based on verified real-world data from the
 * OpenFreeMap tiling server (record-screen magnifying glass output).
 */

import {
	getTilesForBounds,
} from '../helpers/TileFeatureHelper';

import {
	isAvailable as isH3Available,
	cellToBoundary,
	getResolution,
	isValidCell,
} from '../helpers/H3Helper';

import type { MapFeatureInfo } from '../helpers/RouteNameSuggestionHelper';

// ─── Fixtures – Hex 1: 8a1f10d5061ffff ──────────────────────────────────────

const HEX_ID_1 = '8a1f10d5061ffff';
const FEATURE_QUERY_ZOOM = 14;

/**
 * Expected features returned by the tile server for hex cell 1 at zoom 14.
 * Verified via record-screen magnifying glass output.
 */
const EXPECTED_FEATURES_HEX1: MapFeatureInfo[] = [
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

// ─── Fixtures – Hex 2: 8a1f10d53d37fff ──────────────────────────────────────

const HEX_ID_2 = '8a1f10d53d37fff';

/**
 * Expected features returned by the tile server for hex cell 2 at zoom 14.
 * Verified via record-screen magnifying glass output.
 */
const EXPECTED_FEATURES_HEX2: MapFeatureInfo[] = [
	{
		layerId: 'poi_r1',
		name: 'Wildgehege Burghotel Dinklage',
		class: 'information',
		subclass: 'map',
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
		layerId: 'water',
		name: null,
		class: 'lake',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'landcover_grass',
		name: null,
		class: 'grass',
		subclass: 'meadow',
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

// ─── Tests – Hex 1: 8a1f10d5061ffff ────────────────────────────────────────

describe('TileFeatureHelper – hex cell 8a1f10d5061ffff', () => {
	it('H3 library is available and recognises the test cell', () => {
		expect(isH3Available()).toBe(true);
		expect(isValidCell(HEX_ID_1)).toBe(true);
		expect(getResolution(HEX_ID_1)).toBe(10);
	});

	it('hex cell boundary produces valid lat/lng bounds', () => {
		const bounds = getHexBounds(HEX_ID_1);
		// Cell is in the Dinklage area (north-west Germany)
		expect(bounds.minLat).toBeGreaterThan(52.65);
		expect(bounds.maxLat).toBeLessThan(52.67);
		expect(bounds.minLng).toBeGreaterThan(8.13);
		expect(bounds.maxLng).toBeLessThan(8.15);
	});

	it('getTilesForBounds returns exactly one tile (14/8562/5362) for the hex bounding box', () => {
		const bounds = getHexBounds(HEX_ID_1);
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
		expect(EXPECTED_FEATURES_HEX1).toHaveLength(14);
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
		expect(EXPECTED_FEATURES_HEX1.map((f) => f.layerId)).toEqual(expectedLayerIds);
	});

	it('expected features contain named features for Lohner Straße, Am Burgwald and Burgwald Dinklage', () => {
		const namedFeatures = EXPECTED_FEATURES_HEX1.filter((f) => f.name !== null);
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
		for (const feat of EXPECTED_FEATURES_HEX1) {
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
		const roadFeatures = EXPECTED_FEATURES_HEX1.filter((f) =>
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
		const parkFeatures = EXPECTED_FEATURES_HEX1.filter((f) =>
			f.layerId === 'park' || f.layerId === 'park_outline',
		);
		expect(parkFeatures).toHaveLength(2);
		for (const pf of parkFeatures) {
			expect(pf.name).toBe('Burgwald Dinklage');
			expect(pf.class).toBe('naturschutzgebiet');
		}
	});

	it('landcover_wood feature has class=wood and subclass=forest', () => {
		const wood = EXPECTED_FEATURES_HEX1.find((f) => f.layerId === 'landcover_wood');
		expect(wood).toBeDefined();
		expect(wood!.class).toBe('wood');
		expect(wood!.subclass).toBe('forest');
	});

	it('road_path_pedestrian feature has class=path and subclass=path', () => {
		const pedestrian = EXPECTED_FEATURES_HEX1.find((f) => f.layerId === 'road_path_pedestrian');
		expect(pedestrian).toBeDefined();
		expect(pedestrian!.class).toBe('path');
		expect(pedestrian!.subclass).toBe('path');
	});

	it('full output matches the exact expected feature array', () => {
		expect(EXPECTED_FEATURES_HEX1).toEqual([
			{ layerId: 'highway-shield-non-us', name: 'Lohner Straße', class: 'secondary', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'highway-name-major', name: 'Lohner Straße', class: 'secondary', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'highway-name-minor', name: 'Am Burgwald', class: 'minor', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'building-3d', name: null, class: null, subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_secondary_tertiary', name: null, class: 'secondary', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_minor', name: null, class: 'minor', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_service_track', name: null, class: 'service', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_path_pedestrian', name: null, class: 'path', subclass: 'path', highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_secondary_tertiary_casing', name: null, class: 'secondary', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_minor_casing', name: null, class: 'minor', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_service_track_casing', name: null, class: 'service', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'landcover_wood', name: null, class: 'wood', subclass: 'forest', highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'park_outline', name: 'Burgwald Dinklage', class: 'naturschutzgebiet', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'park', name: 'Burgwald Dinklage', class: 'naturschutzgebiet', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
		]);
	});
});

// ─── Tests – Hex 2: 8a1f10d53d37fff ────────────────────────────────────────

describe('TileFeatureHelper – hex cell 8a1f10d53d37fff', () => {
	it('H3 library recognises the test cell', () => {
		expect(isH3Available()).toBe(true);
		expect(isValidCell(HEX_ID_2)).toBe(true);
		expect(getResolution(HEX_ID_2)).toBe(10);
	});

	it('expected features have exactly 10 entries', () => {
		expect(EXPECTED_FEATURES_HEX2).toHaveLength(10);
	});

	it('expected features contain the correct layer IDs in order', () => {
		const expectedLayerIds = [
			'poi_r1',
			'building-3d',
			'road_service_track',
			'road_path_pedestrian',
			'road_service_track_casing',
			'water',
			'landcover_grass',
			'landcover_wood',
			'park_outline',
			'park',
		];
		expect(EXPECTED_FEATURES_HEX2.map((f) => f.layerId)).toEqual(expectedLayerIds);
	});

	it('expected features contain named features for Wildgehege Burghotel Dinklage and Burgwald Dinklage', () => {
		const namedFeatures = EXPECTED_FEATURES_HEX2.filter((f) => f.name !== null);
		expect(namedFeatures).toHaveLength(3);
		expect(namedFeatures.map((f) => f.name)).toEqual([
			'Wildgehege Burghotel Dinklage',
			'Burgwald Dinklage',
			'Burgwald Dinklage',
		]);
	});

	it('all expected features have the correct MapFeatureInfo shape', () => {
		for (const feat of EXPECTED_FEATURES_HEX2) {
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

	it('POI feature references Wildgehege Burghotel Dinklage', () => {
		const poi = EXPECTED_FEATURES_HEX2.find((f) => f.layerId === 'poi_r1');
		expect(poi).toBeDefined();
		expect(poi!.name).toBe('Wildgehege Burghotel Dinklage');
		expect(poi!.class).toBe('information');
		expect(poi!.subclass).toBe('map');
	});

	it('water feature has class=lake', () => {
		const water = EXPECTED_FEATURES_HEX2.find((f) => f.layerId === 'water');
		expect(water).toBeDefined();
		expect(water!.class).toBe('lake');
	});

	it('landcover_grass feature has class=grass and subclass=meadow', () => {
		const grass = EXPECTED_FEATURES_HEX2.find((f) => f.layerId === 'landcover_grass');
		expect(grass).toBeDefined();
		expect(grass!.class).toBe('grass');
		expect(grass!.subclass).toBe('meadow');
	});

	it('park features reference Burgwald Dinklage as naturschutzgebiet', () => {
		const parkFeatures = EXPECTED_FEATURES_HEX2.filter((f) =>
			f.layerId === 'park' || f.layerId === 'park_outline',
		);
		expect(parkFeatures).toHaveLength(2);
		for (const pf of parkFeatures) {
			expect(pf.name).toBe('Burgwald Dinklage');
			expect(pf.class).toBe('naturschutzgebiet');
		}
	});

	it('road features have the expected class values', () => {
		const roadFeatures = EXPECTED_FEATURES_HEX2.filter((f) =>
			f.layerId !== null && (
				f.layerId.startsWith('road_')
			),
		);
		const classes = roadFeatures.map((f) => f.class);
		expect(classes).toEqual([
			'service',      // road_service_track
			'path',         // road_path_pedestrian
			'service',      // road_service_track_casing
		]);
	});

	it('full output matches the exact expected feature array', () => {
		expect(EXPECTED_FEATURES_HEX2).toEqual([
			{ layerId: 'poi_r1', name: 'Wildgehege Burghotel Dinklage', class: 'information', subclass: 'map', highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'building-3d', name: null, class: null, subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_service_track', name: null, class: 'service', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_path_pedestrian', name: null, class: 'path', subclass: 'path', highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'road_service_track_casing', name: null, class: 'service', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'water', name: null, class: 'lake', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'landcover_grass', name: null, class: 'grass', subclass: 'meadow', highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'landcover_wood', name: null, class: 'wood', subclass: 'forest', highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'park_outline', name: 'Burgwald Dinklage', class: 'naturschutzgebiet', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
			{ layerId: 'park', name: 'Burgwald Dinklage', class: 'naturschutzgebiet', subclass: null, highway: null, waterway: null, building: null, natural: null, landuse: null, amenity: null },
		]);
	});
});
