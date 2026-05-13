/**
 * Helper for fetching vector-tile features directly from the tiling server
 * **without** requiring a MapLibre map instance.
 *
 * Accepts a bounding box (minLat, minLng, maxLat, maxLng) and a zoom level,
 * computes the set of vector tiles that cover the area, downloads the PBF
 * data via HTTP, parses it with the Mapbox-Vector-Tile library and returns
 * features in the same `MapFeatureInfo` format that the map-based
 * `queryRenderedFeatures` approach uses.
 */

import Pbf from 'pbf';
import { VectorTile } from '@mapbox/vector-tile';

import type { MapFeatureInfo } from './RouteNameSuggestionHelper';
import type { MapFeatureFilterOptions } from './OpenMapTilesSchema';
import { cellToBoundary as h3CellToBoundary } from './H3Helper';

// ─── Configuration ──────────────────────────────────────────────────────────

/** Default style URL whose `sources` block contains the PBF tile URL template. */
export const DEFAULT_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/**
 * Layers to skip when extracting features (overlay / UI layers that are not
 * real geographic features).
 */
const SKIP_LAYERS = new Set<string>([
	'housenumber',
]);

// ─── Tile-coordinate helpers ────────────────────────────────────────────────

/** Convert longitude to tile X at the given zoom level. */
function lngToTileX(lng: number, zoom: number): number {
	return Math.floor(((lng + 180) / 360) * Math.pow(2, zoom));
}

/** Convert latitude to tile Y at the given zoom level. */
function latToTileY(lat: number, zoom: number): number {
	const latRad = (lat * Math.PI) / 180;
	return Math.floor(
		((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
			Math.pow(2, zoom),
	);
}

/**
 * Convert a fractional tile X coordinate back to longitude.
 * Accepts non-integer values (e.g. `tileX + px / extent`) for sub-tile precision.
 */
function tileXToLng(xFrac: number, zoom: number): number {
	return (xFrac / Math.pow(2, zoom)) * 360 - 180;
}

/**
 * Convert a fractional tile Y coordinate back to latitude.
 * Accepts non-integer values (e.g. `tileY + py / extent`) for sub-tile precision.
 */
function tileYToLat(yFrac: number, zoom: number): number {
	const n = Math.PI - (2 * Math.PI * yFrac) / Math.pow(2, zoom);
	return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

/** Simple axis-aligned bounding-box overlap check. */
function boundsOverlap(
	aMinLat: number, aMinLng: number, aMaxLat: number, aMaxLng: number,
	bMinLat: number, bMinLng: number, bMaxLat: number, bMaxLng: number,
): boolean {
	return aMinLat <= bMaxLat && aMaxLat >= bMinLat &&
		aMinLng <= bMaxLng && aMaxLng >= bMinLng;
}

// ─── Name-null filter ───────────────────────────────────────────────────────

/**
 * Filter features based on {@link MapFeatureFilterOptions}.
 *
 * When the `options` object is omitted entirely, all features are returned
 * unchanged (backward-compatible default).
 *
 * When `options` **is** provided:
 * - `includeNameNull: true` → all features are returned.
 * - `includeNameNull` omitted / `false` → features whose `name` is `null`
 *   are removed unless their `layerId` appears in `nameNullAllowList`.
 */
function applyNameFilter(
	features: MapFeatureInfo[],
	options?: MapFeatureFilterOptions,
): MapFeatureInfo[] {
	if (!options || options.includeNameNull) return features;

	const allowList = options.nameNullAllowList;

	return features.filter((f) => {
		// Named features always pass.
		if (f.name !== null) return true;
		// Unnamed features pass only when their layer is on the allow list.
		if (allowList && f.layerId && allowList.has(f.layerId)) return true;
		return false;
	});
}

/** Return all (z, x, y) tile coordinates that cover the given bounding box. */
export function getTilesForBounds(
	minLat: number,
	minLng: number,
	maxLat: number,
	maxLng: number,
	zoom: number,
): Array<{ z: number; x: number; y: number }> {
	const xMin = lngToTileX(minLng, zoom);
	const xMax = lngToTileX(maxLng, zoom);
	// Note: tile Y is inverted – smaller lat → larger Y.
	const yMin = latToTileY(maxLat, zoom);
	const yMax = latToTileY(minLat, zoom);

	const tiles: Array<{ z: number; x: number; y: number }> = [];
	for (let x = xMin; x <= xMax; x++) {
		for (let y = yMin; y <= yMax; y++) {
			tiles.push({ z: zoom, x, y });
		}
	}
	return tiles;
}

// ─── Style / tile-URL resolution ────────────────────────────────────────────

/** Cache: style URL → resolved tile URL template. */
const tileUrlCache: Record<string, string> = {};

/**
 * Fetch the MapLibre style JSON and extract the first `{z}/{x}/{y}` PBF tile
 * URL template from the `sources` section.
 */
export async function resolveTileUrl(styleUrl: string = DEFAULT_STYLE_URL): Promise<string> {
	const cached = tileUrlCache[styleUrl];
	if (cached) return cached;

	const res = await fetch(styleUrl);
	if (!res.ok) throw new Error(`Failed to fetch style: ${res.status}`);
	const style = await res.json();

	// Walk all sources looking for a vector source with a PBF tile URL.
	// Only consider sources whose type is 'vector' to avoid picking up
	// raster (PNG/JPG) tile URLs that also contain `{z}/{x}/{y}` placeholders.
	for (const src of Object.values(style.sources ?? {})) {
		const source = src as Record<string, unknown>;
		if (source.type !== 'vector') continue;

		const tiles = source.tiles as string[] | undefined;
		if (tiles) {
			for (const url of tiles) {
				if (url.includes('{z}') || url.includes('.pbf')) {
					tileUrlCache[styleUrl] = url;
					return url;
				}
			}
		}

		// Some styles use a TileJSON URL in the `url` field instead.
		if (typeof source.url === 'string') {
			try {
				const tjRes = await fetch(source.url);
				if (tjRes.ok) {
					const tj = await tjRes.json();
					const tjTiles = tj.tiles as string[] | undefined;
					if (tjTiles) {
						for (const url of tjTiles) {
							if (url.includes('{z}') || url.includes('.pbf')) {
								tileUrlCache[styleUrl] = url;
								return url;
							}
						}
					}
				}
			} catch {
				// Ignore TileJSON fetch errors and continue.
			}
		}
	}

	throw new Error('Could not find a PBF tile URL template in the style JSON.');
}

/**
 * Pre-load and cache the tile URL template for a style so that subsequent
 * tile-feature queries can start downloading PBF tiles immediately without
 * waiting for the style JSON round-trip.
 *
 * Calling this function multiple times is cheap – a cached result is returned
 * instantly.
 *
 * @param styleUrl – Optional style URL override (default: OpenFreeMap Liberty).
 * @returns The resolved PBF tile URL template string.
 */
export async function preloadMapStyle(styleUrl: string = DEFAULT_STYLE_URL): Promise<string> {
	return resolveTileUrl(styleUrl);
}

// ─── H3-cell → lat/lng bounding-box helper ──────────────────────────────────

/**
 * Lat/lng axis-aligned bounding box.
 */
export type LatLngBounds = {
	minLat: number;
	minLng: number;
	maxLat: number;
	maxLng: number;
};

/**
 * Viewport bounding box using cardinal directions.
 */
export type ViewportBounds = { north: number; south: number; east: number; west: number };

/**
 * Convert an H3 hex-cell index to its axis-aligned lat/lng bounding box.
 *
 * This is a convenience helper that computes the boundary polygon of the cell
 * and returns the smallest rectangle that contains it.
 *
 * @param h3Index – H3 cell index string (e.g. `'8a1f10d5061ffff'`).
 * @returns The bounding box of the cell.
 * @throws When the cell index is invalid or the boundary is empty.
 */
export function hexCellToBounds(h3Index: string): LatLngBounds {
	const boundary = h3CellToBoundary(h3Index); // [[lat, lng], ...]
	if (!boundary || boundary.length === 0) {
		throw new Error(`Invalid H3 cell or empty boundary: ${h3Index}`);
	}
	const lats = boundary.map((v: [number, number]) => v[0]);
	const lngs = boundary.map((v: [number, number]) => v[1]);
	return {
		minLat: Math.min(...lats),
		minLng: Math.min(...lngs),
		maxLat: Math.max(...lats),
		maxLng: Math.max(...lngs),
	};
}

// ─── Single-tile fetching & parsing ─────────────────────────────────────────

/** Cache: `"tileUrlTemplate|z|x|y"` → parsed MapFeatureInfo[] (unfiltered). */
const tileFeaturesCache: Record<string, MapFeatureInfo[]> = {};

/** Cache: `"tileUrlTemplate|z|x|y"` → raw tile ArrayBuffer for filtered re-parsing. */
const tileBufferCache: Record<string, ArrayBuffer> = {};

/** Build a cache key for a single tile fetch. */
function tileCacheKey(tileUrlTemplate: string, z: number, x: number, y: number): string {
	return `${tileUrlTemplate}|${z}|${x}|${y}`;
}

/**
 * Fetch a single vector tile and parse it into an array of `MapFeatureInfo`.
 * Results are cached in-memory so repeated requests for the same tile
 * (e.g. overlapping H3 bounding boxes) are served instantly.
 *
 * When `filterBounds` is provided, only features whose geographic bounding box
 * overlaps the given lat/lng rectangle are included in the result.
 *
 * @param tileUrlTemplate – URL template with `{z}`, `{x}`, `{y}` placeholders.
 * @param z – Zoom level.
 * @param x – Tile X coordinate.
 * @param y – Tile Y coordinate.
 * @param filterBounds – Optional geographic bounding box to restrict returned features.
 */
export async function fetchAndParseTile(
	tileUrlTemplate: string,
	z: number,
	x: number,
	y: number,
	filterBounds?: { minLat: number; minLng: number; maxLat: number; maxLng: number },
): Promise<MapFeatureInfo[]> {
	const cacheKey = tileCacheKey(tileUrlTemplate, z, x, y);

	// When no filter is requested we can serve from the parsed-features cache.
	if (!filterBounds) {
		const cached = tileFeaturesCache[cacheKey];
		if (cached) return cached;
	}

	// Use cached raw buffer when available (avoids re-downloading for filtered queries).
	let buffer: ArrayBuffer;
	const cachedBuffer = tileBufferCache[cacheKey];
	if (cachedBuffer) {
		buffer = cachedBuffer;
	} else {
		const url = tileUrlTemplate
			.replace('{z}', String(z))
			.replace('{x}', String(x))
			.replace('{y}', String(y));

		const res = await fetch(url);
		if (!res.ok) {
			// Tiles may legitimately return 404 for ocean / empty areas.
			if (res.status === 404) {
				tileFeaturesCache[cacheKey] = [];
				return [];
			}
			throw new Error(`Tile fetch failed (${res.status}): ${url}`);
		}

		buffer = await res.arrayBuffer();
		tileBufferCache[cacheKey] = buffer;
	}

	const tile = new VectorTile(new Pbf(buffer));

	// Use a Map keyed by the synthetic feature ID (class|subclass|name) to
	// deduplicate within the tile and accumulate occurrence counts.
	const featureMap = new Map<string, MapFeatureInfo>();

	for (const layerName of Object.keys(tile.layers)) {
		if (SKIP_LAYERS.has(layerName)) continue;

		const layer = tile.layers[layerName];
		for (let i = 0; i < layer.length; i++) {
			const feat = layer.feature(i);
			const props = feat.properties ?? {};

			// ── Geographic filter ────────────────────────────────────
			if (filterBounds) {
				const [bx1, by1, bx2, by2] = feat.bbox();
				const extent = feat.extent || 4096;

				// Convert tile-relative coordinates to geographic lat/lng.
				const featMinLng = tileXToLng(x + bx1 / extent, z);
				const featMaxLng = tileXToLng(x + bx2 / extent, z);
				// Tile Y increases downward: smaller py → further north.
				const featMaxLat = tileYToLat(y + by1 / extent, z);
				const featMinLat = tileYToLat(y + by2 / extent, z);

				if (!boundsOverlap(
					featMinLat, featMinLng, featMaxLat, featMaxLng,
					filterBounds.minLat, filterBounds.minLng,
					filterBounds.maxLat, filterBounds.maxLng,
				)) {
					continue;
				}
			}

			const name = (props.name as string) || (props['name:de'] as string) || null;
			const cls = (props['class'] as string) || null;
			const subclass = (props.subclass as string) || null;
			const highway = (props.highway as string) || null;
			const waterway = (props.waterway as string) || null;
			const building = (props.building as string) || null;
			const natural = (props.natural as string) || null;
			const landuse = (props.landuse as string) || null;
			const amenity = (props.amenity as string) || null;

			// Deduplicate by synthetic feature ID: class|subclass|name.
			// Duplicate occurrences increment the count instead of adding a new entry.
			const featureId = (cls ?? '') + '|' + (subclass ?? '') + '|' + (name ?? '');
			const existing = featureMap.get(featureId);
			if (existing) {
				existing.count += 1;
				continue;
			}

			featureMap.set(featureId, {
				layerId: layerName,
				name,
				class: cls,
				subclass,
				highway,
				waterway,
				building,
				natural,
				landuse,
				amenity,
				count: 1,
			});
		}
	}

	const features = Array.from(featureMap.values());

	// Only cache when no filter was applied (unfiltered superset).
	if (!filterBounds) {
		tileFeaturesCache[cacheKey] = features;
	}

	return features;
}

// ─── Auto-zoom calculation ──────────────────────────────────────────────────

/**
 * The minimum zoom at which OpenMapTiles / OpenFreeMap provides full
 * street-level detail (road names, buildings, POIs, etc.).
 * Below this zoom, many features are omitted from the vector tiles.
 */
const DETAIL_ZOOM = 14;

/** Maximum number of tiles to fetch per axis (width and height). */
const MAX_TILES_PER_AXIS = 4;

/**
 * Compute the highest zoom level (up to `DETAIL_ZOOM`) at which the given
 * bounding box fits within at most `MAX_TILES_PER_AXIS × MAX_TILES_PER_AXIS`
 * tiles.  This ensures full detail while keeping the number of HTTP requests
 * manageable.
 */
export function calculateOptimalZoom(
	minLat: number,
	minLng: number,
	maxLat: number,
	maxLng: number,
): number {
	for (let z = DETAIL_ZOOM; z >= 1; z--) {
		const xMin = lngToTileX(minLng, z);
		const xMax = lngToTileX(maxLng, z);
		const yMin = latToTileY(maxLat, z);
		const yMax = latToTileY(minLat, z);

		const tilesX = xMax - xMin + 1;
		const tilesY = yMax - yMin + 1;

		if (tilesX <= MAX_TILES_PER_AXIS && tilesY <= MAX_TILES_PER_AXIS) {
			return z;
		}
	}
	return 1;
}

// ─── Main public API ────────────────────────────────────────────────────────

export type TileFeatureQueryParams = LatLngBounds & {
	/** Zoom level (typically 14 for street-level detail). */
	zoom: number;
	/** Optional style URL override (default: OpenFreeMap Liberty). */
	styleUrl?: string;
	/** Optional filter for features with `name === null`. */
	filterOptions?: MapFeatureFilterOptions;
};

/**
 * Fetch all vector-tile features that fall within the given bounding box at
 * the specified zoom level.  Returns a flat array of `MapFeatureInfo`.
 *
 * This function does **not** require a MapLibre map instance.  It downloads
 * raw PBF tiles over HTTP and parses them in-process.
 */
export async function queryTileFeaturesForBounds(
	params: TileFeatureQueryParams,
): Promise<MapFeatureInfo[]> {
	const { minLat, minLng, maxLat, maxLng, zoom, styleUrl, filterOptions } = params;

	const tileUrlTemplate = await resolveTileUrl(styleUrl);
	const tiles = getTilesForBounds(minLat, minLng, maxLat, maxLng, zoom);
	const filterBounds = { minLat, minLng, maxLat, maxLng };

	const results = await Promise.all(
		tiles.map((t) => fetchAndParseTile(tileUrlTemplate, t.z, t.x, t.y, filterBounds)),
	);

	// Deduplicate across tiles by the same synthetic feature ID (class|subclass|name),
	// summing counts so no feature appears twice in the final list.
	const mergedMap = new Map<string, MapFeatureInfo>();
	for (const f of results.flat()) {
		const featureId = (f.class ?? '') + '|' + (f.subclass ?? '') + '|' + (f.name ?? '');
		const existing = mergedMap.get(featureId);
		if (existing) {
			existing.count += f.count;
		} else {
			mergedMap.set(featureId, { ...f });
		}
	}

	return applyNameFilter(Array.from(mergedMap.values()), filterOptions);
}

/**
 * Convenience wrapper that returns features grouped by a synthetic tile key
 * (`"z/x/y"`), matching the `Record<string, MapFeatureInfo[]>` shape expected
 * by `buildAreaInfoDict`.
 */
export async function queryTileFeaturesGrouped(
	params: TileFeatureQueryParams,
): Promise<Record<string, MapFeatureInfo[]>> {
	const { minLat, minLng, maxLat, maxLng, zoom, styleUrl, filterOptions } = params;

	const tileUrlTemplate = await resolveTileUrl(styleUrl);
	const tiles = getTilesForBounds(minLat, minLng, maxLat, maxLng, zoom);
	const filterBounds = { minLat, minLng, maxLat, maxLng };

	const grouped: Record<string, MapFeatureInfo[]> = {};

	await Promise.all(
		tiles.map(async (t) => {
			const features = await fetchAndParseTile(tileUrlTemplate, t.z, t.x, t.y, filterBounds);
			grouped[`${t.z}/${t.x}/${t.y}`] = applyNameFilter(features, filterOptions);
		}),
	);

	return grouped;
}

/**
 * Fetch all vector-tile features for a single H3 hex cell.
 *
 * Computes the bounding box of the cell from its boundary vertices and
 * queries all vector tiles that cover the area at an automatically chosen
 * zoom level (highest detail that keeps tile count manageable).
 * Returns a flat, deduplicated array of `MapFeatureInfo`.
 *
 * @param h3Index – H3 cell index string (e.g. `'8a1f10d5061ffff'`).
 * @param styleUrl – Optional style URL override.
 */
export async function queryTileFeaturesForHexCell(
	h3Index: string,
	styleUrl?: string,
	filterOptions?: MapFeatureFilterOptions,
): Promise<MapFeatureInfo[]> {
	const bounds = hexCellToBounds(h3Index);

	const { features } = await queryTileFeaturesForArea({
		...bounds,
		styleUrl,
		filterOptions,
	});

	return features;
}

// ─── Area-based convenience API (auto-zoom) ─────────────────────────────────

export type AreaFeatureQueryParams = LatLngBounds & {
	/** Optional style URL override (default: OpenFreeMap Liberty). */
	styleUrl?: string;
	/** Optional filter for features with `name === null`. */
	filterOptions?: MapFeatureFilterOptions;
};

/**
 * Fetch all vector-tile features within the given bounding box **without**
 * requiring the caller to specify a zoom level.
 *
 * The optimal zoom is calculated automatically so that the area is queried at
 * the highest possible detail level (up to zoom 14, the OpenMapTiles street-
 * level threshold) while keeping the number of tile downloads manageable.
 *
 * @returns An object containing the flat feature array and the zoom level
 *          that was used, so the caller can display it for transparency.
 */
export async function queryTileFeaturesForArea(
	params: AreaFeatureQueryParams,
): Promise<{ features: MapFeatureInfo[]; zoom: number }> {
	const { minLat, minLng, maxLat, maxLng, styleUrl, filterOptions } = params;
	const zoom = calculateOptimalZoom(minLat, minLng, maxLat, maxLng);

	const features = await queryTileFeaturesForBounds({
		minLat,
		minLng,
		maxLat,
		maxLng,
		zoom,
		styleUrl,
		filterOptions,
	});

	return { features, zoom };
}

/**
 * Fetch vector-tile features for **multiple** areas in a single call.
 *
 * Accepts an array of bounding boxes and returns an array of the same length
 * where each entry is the flat feature array for the corresponding area.
 * Zoom is calculated automatically per area so the caller never needs to
 * think about tile-zoom levels.
 *
 * Shared tiles across areas are deduplicated by the internal cache, so
 * overlapping / adjacent bounding boxes only incur one HTTP request per tile.
 *
 * @param areas – Array of bounding-box objects (minLat, minLng, maxLat, maxLng, optional styleUrl).
 * @returns A `MapFeatureInfo[]` array for each input area, in the same order.
 */
export async function queryTileFeaturesForAreas(
	areas: AreaFeatureQueryParams[],
): Promise<MapFeatureInfo[][]> {
	const results = await Promise.all(
		areas.map(async (area) => {
			const { features } = await queryTileFeaturesForArea(area);
			return features;
		}),
	);
	return results;
}
