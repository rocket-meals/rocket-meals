/**
 * Tests for TileFeatureHelper – tile coordinate and bounding-box helpers.
 *
 * These tests verify the tile-coordinate pipeline for H3 cell
 * `8a1f10d5061ffff` (resolution 10, Dinklage / north-west Germany area).
 *
 * The cell boundary is:
 *   lat: 52.6599 – 52.6611
 *   lng: 8.1375 – 8.1396
 *
 * At zoom 14 the bounding box falls into a single tile (14/8562/5362).
 */

import {
	getTilesForBounds,
	calculateOptimalZoom,
	queryTileFeaturesForAreas,
} from '../helpers/TileFeatureHelper';

import {
	isAvailable as isH3Available,
	cellToBoundary,
	getResolution,
	isValidCell,
} from '../helpers/H3Helper';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const HEX_ID = '8a1f10d5061ffff';
const FEATURE_QUERY_ZOOM = 14;

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

describe('TileFeatureHelper – tile coordinate helpers', () => {
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

	it('calculateOptimalZoom returns zoom 14 for the small hex cell', () => {
		const bounds = getHexBounds(HEX_ID);
		const zoom = calculateOptimalZoom(bounds.minLat, bounds.minLng, bounds.maxLat, bounds.maxLng);
		expect(zoom).toBe(14);
	});

	it('calculateOptimalZoom reduces zoom for large areas', () => {
		// A ~10° × 10° box should require a lower zoom to fit in ≤4×4 tiles
		const zoom = calculateOptimalZoom(45.0, 5.0, 55.0, 15.0);
		expect(zoom).toBeLessThan(10);
		expect(zoom).toBeGreaterThanOrEqual(1);
	});
});

describe('TileFeatureHelper – batch API', () => {
	it('queryTileFeaturesForAreas returns one result array per input area', async () => {
		// Mock fetch: return valid style JSON for style URL, 404 for tile PBFs.
		const originalFetch = globalThis.fetch;
		const mockStyle = {
			sources: {
				openmaptiles: {
					type: 'vector',
					tiles: ['https://example.test/tiles/{z}/{x}/{y}.pbf'],
				},
			},
		};
		globalThis.fetch = jest.fn().mockImplementation((url: string) => {
			if (typeof url === 'string' && url.includes('.pbf')) {
				return Promise.resolve({ ok: false, status: 404 });
			}
			// Style URL
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve(mockStyle),
			});
		});

		try {
			const bounds1 = getHexBounds(HEX_ID);
			const bounds2 = {
				minLat: bounds1.minLat + 0.01,
				minLng: bounds1.minLng + 0.01,
				maxLat: bounds1.maxLat + 0.01,
				maxLng: bounds1.maxLng + 0.01,
			};

			const results = await queryTileFeaturesForAreas([bounds1, bounds2]);

			expect(results).toHaveLength(2);
			expect(Array.isArray(results[0])).toBe(true);
			expect(Array.isArray(results[1])).toBe(true);
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it('queryTileFeaturesForAreas returns empty array for empty input', async () => {
		const results = await queryTileFeaturesForAreas([]);
		expect(results).toHaveLength(0);
	});
});

// ─── Dinklage area feature categorisation ───────────────────────────────────
//
// The features below were extracted from a screenshot of the Burg Dinklage area
// (Dinklage, north-west Germany).  They represent real-world map data that the
// OpenMapTiles vector tiles return for this area:
//
//   • Streets: Burgallee, Am Burgwald, Lohner Straße (L 845)
//   • Bus stop: Burg Dinklage
//   • Buildings: residential buildings
//   • Land use: residential area, grass
//
// The categorisation logic mirrors what the experimental hex-tile-info screen
// uses (see `apps/geonexia/frontend/app/experimental/hex-tile-info/index.tsx`).

import type { MapFeatureInfo } from '../helpers/RouteNameSuggestionHelper';

/** Mock features representing the Burg Dinklage area extracted from the map screenshot. */
const DINKLAGE_AREA_FEATURES: MapFeatureInfo[] = [
	// ── Streets ────────────────────────────────────────────────────────
	{
		layerId: 'transportation_name',
		name: 'Burgallee',
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
		layerId: 'transportation_name',
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
		layerId: 'transportation_name',
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
		layerId: 'road',
		name: null,
		class: 'secondary',
		subclass: null,
		highway: 'secondary',
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'road',
		name: null,
		class: 'residential',
		subclass: null,
		highway: 'residential',
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},

	// ── Bus stop / POI ─────────────────────────────────────────────────
	{
		layerId: 'poi',
		name: 'Burg Dinklage',
		class: 'bus_stop',
		subclass: 'bus_stop',
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'poi',
		name: null,
		class: 'parking',
		subclass: 'parking',
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: 'parking',
	},

	// ── Buildings ──────────────────────────────────────────────────────
	{
		layerId: 'building',
		name: null,
		class: null,
		subclass: null,
		highway: null,
		waterway: null,
		building: 'residential',
		natural: null,
		landuse: null,
		amenity: null,
	},
	{
		layerId: 'building',
		name: null,
		class: null,
		subclass: null,
		highway: null,
		waterway: null,
		building: 'yes',
		natural: null,
		landuse: null,
		amenity: null,
	},

	// ── Land use ───────────────────────────────────────────────────────
	{
		layerId: 'landuse',
		name: null,
		class: 'residential',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: 'residential',
		amenity: null,
	},
	{
		layerId: 'landcover',
		name: null,
		class: 'grass',
		subclass: null,
		highway: null,
		waterway: null,
		building: null,
		natural: null,
		landuse: null,
		amenity: null,
	},
];

/**
 * Feature categorisation helpers – same logic used in the hex-tile-info
 * experimental screen and the recording screen's HexTileInfoContent.
 */
function categoriseFeatures(features: MapFeatureInfo[]) {
	const streets = features.filter((f) =>
		f.highway || (f.layerId && (f.layerId.includes('road') || f.layerId.includes('highway') || f.layerId.includes('transportation'))),
	);
	const waterways = features.filter((f) =>
		f.waterway || (f.layerId && f.layerId.includes('water')),
	);
	const buildings = features.filter((f) =>
		f.building || (f.layerId && f.layerId.includes('building')),
	);
	const pois = features.filter((f) =>
		f.amenity || f.natural || f.landuse ||
		(f.layerId && (f.layerId.includes('poi') || f.layerId.includes('park') || f.layerId.includes('landuse') || f.layerId.includes('landcover'))),
	);
	return { streets, waterways, buildings, pois };
}

describe('TileFeatureHelper – Dinklage area feature categorisation', () => {
	it('categorises Burgallee, Am Burgwald and Lohner Straße as streets', () => {
		const { streets } = categoriseFeatures(DINKLAGE_AREA_FEATURES);

		const streetNames = streets
			.map((f) => f.name)
			.filter(Boolean);

		expect(streetNames).toContain('Burgallee');
		expect(streetNames).toContain('Am Burgwald');
		expect(streetNames).toContain('Lohner Straße');
	});

	it('categorises road features (highway property) as streets', () => {
		const { streets } = categoriseFeatures(DINKLAGE_AREA_FEATURES);

		const highwayValues = streets
			.map((f) => f.highway)
			.filter(Boolean);

		expect(highwayValues).toContain('secondary');
		expect(highwayValues).toContain('residential');
	});

	it('categorises transportation_name features as streets', () => {
		const { streets } = categoriseFeatures(DINKLAGE_AREA_FEATURES);

		// transportation_name contains 'transportation', so named streets from
		// this layer are now correctly categorised as streets.
		const namedFromTransportation = streets.filter(
			(f) => f.name && f.layerId === 'transportation_name',
		);
		expect(namedFromTransportation.length).toBe(3);

		const names = namedFromTransportation.map((f) => f.name);
		expect(names).toContain('Burgallee');
		expect(names).toContain('Am Burgwald');
		expect(names).toContain('Lohner Straße');
	});

	it('categorises Burg Dinklage bus stop and parking as POIs', () => {
		const { pois } = categoriseFeatures(DINKLAGE_AREA_FEATURES);

		const poiNames = pois.map((f) => f.name).filter(Boolean);
		// Burg Dinklage bus stop should be a POI (layerId includes 'poi')
		expect(poiNames).toContain('Burg Dinklage');

		// Parking has amenity='parking', so it should be categorised as POI
		const parkingPoi = pois.find((f) => f.amenity === 'parking');
		expect(parkingPoi).toBeDefined();
	});

	it('categorises residential buildings correctly', () => {
		const { buildings } = categoriseFeatures(DINKLAGE_AREA_FEATURES);

		expect(buildings.length).toBeGreaterThanOrEqual(2);

		const buildingTypes = buildings.map((f) => f.building).filter(Boolean);
		expect(buildingTypes).toContain('residential');
		expect(buildingTypes).toContain('yes');
	});

	it('categorises land use and land cover as POIs', () => {
		const { pois } = categoriseFeatures(DINKLAGE_AREA_FEATURES);

		// Residential landuse
		const residentialLanduse = pois.find((f) => f.landuse === 'residential');
		expect(residentialLanduse).toBeDefined();

		// Grass landcover (matched via layerId containing 'landcover')
		const grassLandcover = pois.find((f) => f.layerId === 'landcover' && f.class === 'grass');
		expect(grassLandcover).toBeDefined();
	});

	it('returns no waterways for the Dinklage screenshot area', () => {
		const { waterways } = categoriseFeatures(DINKLAGE_AREA_FEATURES);
		expect(waterways).toHaveLength(0);
	});

	it('all features are accounted for in at least one category', () => {
		const { streets, waterways, buildings, pois } = categoriseFeatures(DINKLAGE_AREA_FEATURES);

		// Some features may appear in multiple categories (e.g. amenity + poi layerId).
		// With the transportation_name fix, all features should now be categorised.
		const totalCategorised = new Set([
			...streets,
			...waterways,
			...buildings,
			...pois,
		]);

		// All features should be categorised now that transportation_name is included
		// in the streets filter.
		expect(totalCategorised.size).toBe(DINKLAGE_AREA_FEATURES.length);
	});

	it('Burg Dinklage area covers tile 14/8562/5362 for the test hex cell', () => {
		const bounds = getHexBounds(HEX_ID);
		const tiles = getTilesForBounds(
			bounds.minLat,
			bounds.minLng,
			bounds.maxLat,
			bounds.maxLng,
			14,
		);

		// The Burg Dinklage / Burgallee area is within the same tile
		expect(tiles.length).toBeGreaterThanOrEqual(1);
		expect(tiles[0]).toEqual({ z: 14, x: 8562, y: 5362 });
	});
});
