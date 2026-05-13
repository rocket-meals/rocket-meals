/**
 * Helper for generating smart route-name suggestions based on map feature
 * information collected from the route's hex tiles and (optionally) enclosed
 * tiles.
 *
 * Extracted as a standalone helper so it can be reused from other screens
 * (e.g. activity → route creation).
 */

import {
	hexCellToBounds,
	queryTileFeaturesForAreas,
	type AreaFeatureQueryParams,
	type LatLngBounds,
} from './TileFeatureHelper';
import { ROUTE_NAME_LANDMARK_NAME_NULL_ALLOW } from './OpenMapTilesSchema';
import { translateClass, translateSubclass } from '../hooks/useTranslation';

// ─── Types ──────────────────────────────────────────────────────────────────

/** Common map-feature properties shared by MapFeatureInfo and AreaInfoEntry. */
type MapFeatureBaseFields = {
	name: string | null;
	class: string | null;
	subclass: string | null;
	highway: string | null;
	waterway: string | null;
	building: string | null;
	natural: string | null;
	landuse: string | null;
	amenity: string | null;
	count: number;
};

/** Single map-feature record as returned by the map's queryRenderedFeatures. */
export type MapFeatureInfo = MapFeatureBaseFields & {
	layerId: string | null;
};

/**
 * Aggregated entry inside an area-info dictionary.
 * The key of the dict is `layerId + '::' + (name ?? '')`.
 */
export type AreaInfoEntry = MapFeatureBaseFields & {
	layerId: string;
};

/** Dict keyed by `layerId::name` holding aggregated feature counts. */
export type AreaInfoDict = Record<string, AreaInfoEntry>;

// ─── Dict builder ───────────────────────────────────────────────────────────

/**
 * Aggregate per-tile map features into a single dictionary.
 *
 * @param tileFeatures – map from tile-id → list of MapFeatureInfo as returned
 *                       by the `TileFeaturesResult` message from the map.
 * @returns AreaInfoDict keyed by `"layerId::name"`.
 */
export function buildAreaInfoDict(
	tileFeatures: Record<string, MapFeatureInfo[]>,
): AreaInfoDict {
	const dict: AreaInfoDict = {};

	for (const features of Object.values(tileFeatures)) {
		for (const f of features) {
			const key = `${f.layerId ?? ''}::${f.name ?? ''}`;
			const existing = dict[key];
			if (existing) {
				existing.count += 1;
			} else {
				dict[key] = {
					layerId: f.layerId ?? '',
					name: f.name ?? null,
					count: 1,
					class: f.class ?? null,
					subclass: f.subclass ?? null,
					highway: f.highway ?? null,
					waterway: f.waterway ?? null,
					building: f.building ?? null,
					natural: f.natural ?? null,
					landuse: f.landuse ?? null,
					amenity: f.amenity ?? null,
				};
			}
		}
	}

	return dict;
}

// ─── Name suggestion logic ──────────────────────────────────────────────────

/**
 * Layer-ID patterns ordered by priority.  The first match wins the highest
 * base-score bonus.  Patterns are matched as *substrings* of the layerId.
 */
const LAYER_PRIORITY: Array<{ pattern: string; weight: number; label?: string }> = [
	{ pattern: 'park_outline', weight: 10, label: 'Park' },
	{ pattern: 'park', weight: 8, label: 'Park' },
	{ pattern: 'forest', weight: 7, label: 'Wald' },
	{ pattern: 'water', weight: 7, label: 'Wasser' },
	{ pattern: 'river', weight: 7, label: 'Fluss' },
	{ pattern: 'lake', weight: 7, label: 'See' },
	{ pattern: 'garden', weight: 6, label: 'Garten' },
	{ pattern: 'stadium', weight: 6, label: 'Stadion' },
	{ pattern: 'university', weight: 5, label: 'Uni' },
	{ pattern: 'school', weight: 5, label: 'Schule' },
	{ pattern: 'cemetery', weight: 4, label: 'Friedhof' },
	{ pattern: 'hospital', weight: 4, label: 'Krankenhaus' },
	{ pattern: 'place_of_worship', weight: 4, label: 'Kirche' },
	{ pattern: 'industrial', weight: 3 },
	{ pattern: 'residential', weight: 2 },
	{ pattern: 'commercial', weight: 2 },
	{ pattern: 'highway', weight: 1 },
];

/** Return the priority weight for a given layerId (0 if no match). */
function layerWeight(layerId: string): number {
	for (const lp of LAYER_PRIORITY) {
		if (layerId.includes(lp.pattern)) return lp.weight;
	}
	return 0;
}

/** Return a human-readable category label for a feature if available. */
function categoryLabel(entry: AreaInfoEntry): string | null {
	// Priority: subclass translation → class translation → other fields (translated) → layer label
	if (entry.subclass) return translateSubclass(entry.subclass);
	if (entry.class) return translateClass(entry.class);
	if (entry.amenity) return translateClass(entry.amenity);
	if (entry.landuse) return translateClass(entry.landuse);
	if (entry.natural) return translateClass(entry.natural);
	if (entry.waterway) return translateClass(entry.waterway);
	if (entry.building && entry.building !== 'yes') return translateClass(entry.building);
	if (entry.highway && entry.highway !== 'yes') return translateClass(entry.highway);
	for (const lp of LAYER_PRIORITY) {
		if (entry.layerId.includes(lp.pattern) && lp.label) return lp.label;
	}
	return null;
}

type ScoredName = { name: string; score: number };

/**
 * Generate a prioritised list of route-name suggestions based on the area-info
 * dictionaries of the route tiles and the enclosed tiles.
 *
 * @param routeDict       – AreaInfoDict from tiles the route passes through.
 * @param enclosedDict    – AreaInfoDict from tiles enclosed by the route loop
 *                          (may be empty if the route is not a closed loop).
 * @param existingNames   – Names already in use by other routes.
 * @param ownName         – The current route's own name (excluded from filter).
 * @returns Ordered list of unique name suggestions (highest priority first).
 */
export function suggestRouteNames(
	routeDict: AreaInfoDict,
	enclosedDict: AreaInfoDict,
	existingNames: string[] = [],
	ownName?: string,
): string[] {
	const scored: ScoredName[] = [];
	const seen = new Set<string>();

	const addCandidate = (name: string, score: number) => {
		const trimmed = name.trim();
		if (!trimmed) return;
		const lower = trimmed.toLowerCase();
		if (seen.has(lower)) return;
		seen.add(lower);
		scored.push({ name: trimmed, score });
	};

	// ── Score entries from the route dict ──────────────────────────────────
	for (const entry of Object.values(routeDict)) {
		const lw = layerWeight(entry.layerId);
		const baseScore = entry.count + lw * 2;

		// Named features make good route names
		if (entry.name) {
			addCandidate(entry.name, baseScore + 5);

			// Composite: "Name (Category)"
			const cat = categoryLabel(entry);
			if (cat) {
				addCandidate(`${entry.name} (${cat})`, baseScore + 3);
			}
		}
	}

	// ── Score entries from enclosed dict (bonus for "around X") ────────────
	for (const entry of Object.values(enclosedDict)) {
		const lw = layerWeight(entry.layerId);
		// Enclosed features get a slight bonus because the route goes *around* them
		const baseScore = entry.count + lw * 2 + 2;

		if (entry.name) {
			addCandidate(`Runde um ${entry.name}`, baseScore + 6);
			addCandidate(entry.name, baseScore + 3);
		}
	}

	// ── Fallback: category-only names from high-priority layers ────────────
	const allEntries = [
		...Object.values(routeDict).map((e) => ({ entry: e, enclosed: false })),
		...Object.values(enclosedDict).map((e) => ({ entry: e, enclosed: true })),
	];
	for (const { entry, enclosed } of allEntries) {
		const lw = layerWeight(entry.layerId);
		if (lw >= 4) {
			const cat = categoryLabel(entry);
			if (cat) {
				const prefix = enclosed ? 'Runde um ' : '';
				addCandidate(`${prefix}${cat}`, entry.count + lw);
			}
		}
	}

	// Sort by score descending
	scored.sort((a, b) => b.score - a.score);

	// Return names only
	return scored.map((s) => s.name);
}

/**
 * Filter a list of suggested names by removing names that are already in use
 * by other routes, while keeping the route's own current name in the list.
 */
export function filterUsedNames(
	suggestions: string[],
	existingNames: string[],
	ownName?: string,
): string[] {
	const usedSet = new Set(existingNames.map((n) => n.toLowerCase()));
	if (ownName) {
		usedSet.delete(ownName.toLowerCase());
	}
	return suggestions.filter((s) => !usedSet.has(s.toLowerCase()));
}

// ─── Merged & sorted feature list ───────────────────────────────────────────

/**
 * A single entry in the merged, count-sorted map-feature list that is used to
 * drive the route-name suggestion UI.
 */
export type MergedFeatureEntry = AreaInfoEntry & {
	/** The merged dict key (`layerId::name`). */
	key: string;
};

/**
 * Merge two {@link AreaInfoDict} dictionaries (route tiles + enclosed tiles)
 * by summing their counts for matching keys, then return the entries sorted
 * by total count (descending).
 *
 * This gives a unified ranked view of every map feature encountered across
 * both the route path and the area it encloses, which is used to populate the
 * list of route-name suggestions in the rename modal.
 *
 * @param routeDict    – AreaInfoDict from the tiles the route passes through.
 * @param enclosedDict – AreaInfoDict from the tiles enclosed by the route loop
 *                       (may be an empty object for open routes).
 * @returns Array of {@link MergedFeatureEntry} sorted by count descending.
 */
export function buildMergedSortedAreaInfoList(
	routeDict: AreaInfoDict,
	enclosedDict: AreaInfoDict,
): MergedFeatureEntry[] {
	const merged: Record<string, MergedFeatureEntry> = {};

	const addEntry = (key: string, entry: AreaInfoEntry) => {
		const existing = merged[key];
		if (existing) {
			existing.count += entry.count;
		} else {
			merged[key] = { ...entry, key };
		}
	};

	for (const [key, entry] of Object.entries(routeDict)) {
		addEntry(key, entry);
	}
	for (const [key, entry] of Object.entries(enclosedDict)) {
		addEntry(key, entry);
	}

	return Object.values(merged).sort((a, b) => b.count - a.count);
}

// ─── High-level hex-tile → route-name suggestion API ────────────────────────

/**
 * Convert an array of H3 hex-tile IDs into `AreaFeatureQueryParams` objects
 * suitable for batch tile-feature queries.
 *
 * Each hex cell's boundary polygon is converted to an axis-aligned bounding
 * box.  Invalid cells are silently skipped.
 *
 * @param hexTileIds – Array of H3 cell index strings.
 * @returns Array of bounding-box query params (one per valid cell).
 */
export function hexTilesToAreaParams(hexTileIds: string[]): AreaFeatureQueryParams[] {
	const areas: AreaFeatureQueryParams[] = [];
	for (const id of hexTileIds) {
		try {
			const bounds: LatLngBounds = hexCellToBounds(id);
			areas.push({
				...bounds,
				filterOptions: { nameNullAllowList: ROUTE_NAME_LANDMARK_NAME_NULL_ALLOW },
			});
		} catch {
			// Skip invalid cells
		}
	}
	return areas;
}

/**
 * All-in-one function that takes arrays of hex-tile IDs for a route (and
 * optionally the enclosed area of a loop) and returns prioritised route-name
 * suggestions using the existing scoring / sorting algorithm.
 *
 * Steps performed:
 * 1. Convert hex-tile IDs to lat/lng bounding boxes via {@link hexCellToBounds}.
 * 2. Batch-fetch vector-tile features for all areas via
 *    {@link queryTileFeaturesForAreas} (tiles are cached, so overlapping /
 *    adjacent cells share HTTP requests).
 * 3. Build area-info dictionaries with {@link buildAreaInfoDict}.
 * 4. Generate scored name suggestions with {@link suggestRouteNames}.
 * 5. Optionally filter out already-used route names.
 *
 * @param routeHexTiles    – Ordered H3 cell IDs the route passes through.
 * @param enclosedHexTiles – H3 cell IDs enclosed by the route loop (empty
 *                           array when the route is not a closed loop).
 * @param existingNames    – Names already in use by other saved routes.
 * @param ownName          – The current route's own name (excluded from the
 *                           used-names filter).
 * @returns Ordered list of unique name suggestions (highest priority first).
 */
export async function suggestRouteNamesForHexTiles(
	routeHexTiles: string[],
	enclosedHexTiles: string[] = [],
	existingNames: string[] = [],
	ownName?: string,
): Promise<string[]> {
	// ── Build query params from hex-tile IDs ──────────────────────────────
	const routeAreas = hexTilesToAreaParams(routeHexTiles);
	const enclosedAreas = hexTilesToAreaParams(enclosedHexTiles);

	// ── Fetch features for all areas in one batch ─────────────────────────
	const allAreas = [...routeAreas, ...enclosedAreas];
	const allResults = allAreas.length > 0
		? await queryTileFeaturesForAreas(allAreas)
		: [];

	const routeResults = allResults.slice(0, routeAreas.length);
	const enclosedResults = allResults.slice(routeAreas.length);

	// ── Build area-info dictionaries ──────────────────────────────────────
	const routeGrouped: Record<string, MapFeatureInfo[]> = {};
	routeResults.forEach((features, idx) => {
		routeGrouped[`route-${idx}`] = features;
	});

	const enclosedGrouped: Record<string, MapFeatureInfo[]> = {};
	enclosedResults.forEach((features, idx) => {
		enclosedGrouped[`enclosed-${idx}`] = features;
	});

	const routeDict = buildAreaInfoDict(routeGrouped);
	const enclosedDict = buildAreaInfoDict(enclosedGrouped);

	// ── Generate & filter suggestions using existing algorithm ─────────────
	const suggestions = suggestRouteNames(routeDict, enclosedDict, existingNames, ownName);
	return filterUsedNames(suggestions, existingNames, ownName);
}
