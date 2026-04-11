/**
 * ActivityMapRebuildHelper
 *
 * Two responsibilities:
 *
 *  1. `computeActivityData` – derive the `ComputedActivityData` blob that is
 *     stored on a `SavedActivity`.  Needs to be called once after recording
 *     stops (before saving) and whenever an old activity is migrated.
 *
 *  2. `rebuildMapFromActivities` – reconstruct the complete hex-tile map state
 *     from a list of activities, returning fresh `HexTileRecord` and
 *     `walkedEdges` values that can be loaded into the Redux store.
 *
 * Both functions are pure (no side-effects, no Redux dispatch) so they are
 * easy to test and call from any context.
 */

import { latLngToCell, cellToLatLng, cellToBoundary, gridDisk, gridDistance, areNeighborCells, isAvailable as isH3Available, cellToParent, cellToChildren, cellToCenterChild, getResolution } from './H3Helper';
import { BillboardAnchorPosition, ActivityReference, HexTileRecord, computeHexTileLevel } from './HexTileStorage';
import { ComputedActivityData, ComputedHexTileEntry, RoutePoint, SavedActivity } from './ActivityStorage';
import type { SavedRoute } from './RouteStorage';
import type { HexTileFeatureCache } from './HexTileFeatureStorage';
import type { MapFeatureInfo } from './RouteNameSuggestionHelper';
import { OpenMapTilesLayerId, LandcoverClass, LandcoverSubclass, ParkClass } from './OpenMapTilesSchema';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Monotonically increasing integer that identifies the current world-building
 * logic version.  Increment this value whenever the rebuild algorithm changes
 * in a way that should force all users' worlds to be recalculated from their
 * activity history on the next app start.
 */
export const WORLD_BUILDING_ID = 12;

/** Fallback H3 resolution used for activities that pre-date the stored field. */
export const H3_RESOLUTION_FALLBACK = 10;
const H3_RESOLUTION_MIN = 0;
const H3_RESOLUTION_MAX = 15;

/** Padding added to the bounding box (degrees) when enumerating candidate cells. */
const BBOX_PADDING_DEG = 0.001;

/** Safety cap on the grid-disk radius used to enumerate candidate cells. */
const MAX_GRID_DISK_RADIUS = 30;

/**
 * Minimum number of walked hex tiles required to form a valid polygon for
 * enclosed-tile detection.  Both `findEnclosedCellsFromHexTiles` and the
 * guard checks in `rebuildMapFromActivities` / the activity-detail screen use
 * this value.
 */
export const MIN_TILES_FOR_ENCLOSED_POLYGON = 3;

/**
 * Billboard key for the treePineLarge sprite (index 50 in OBJECT_SPRITES).
 * Placed at CENTER on enclosed forest tiles.
 */
export const BILLBOARD_PINE_TREE_LARGE = 'objects:50';

/**
 * Billboard key for the treePineSmall sprite (index 51 in OBJECT_SPRITES).
 * Placed at a MIDDLE ring position on enclosed forest tiles (determined by hex ID).
 */
export const BILLBOARD_PINE_TREE_SMALL = 'objects:51';

/**
 * Billboard key for the pathRounded sprite (index 58 in OBJECT_SPRITES).
 * Placed flat at MIDDLE ring anchors on walked tiles toward walked neighbors.
 */
const BILLBOARD_PATH_ROUNDED = 'objects:58';

/**
 * Billboard key for the castle2 sprite (index 12 in OBJECT_SPRITES).
 * Placed at CENTER on the player's home hex tile.
 */
const BILLBOARD_CASTLE2 = 'objects:12';
const TILE_IMAGE_DIRT = 'Dirt/dirt';

/**
 * Billboard key for the bench sprite (index 8 in OBJECT_SPRITES).
 * Placed at CENTER on the dirt tile where the player was most often slowest
 * along a route (computed from the last 5 activities on that route).
 */
export const BILLBOARD_BENCH = 'objects:8';

/** Terrain image key applied to tiles that are enclosed but not walked on. */
const TILE_IMAGE_GRASS = 'Grass/grass';

/** Terrain image key applied to tiles that are enclosed on rocky / stony terrain. */
const TILE_IMAGE_STONE = 'Stone/stone';

// ─── Edge anchor helpers ──────────────────────────────────────────────────────

/**
 * Maps boundary edge index (0–5) to the corresponding MIDDLE BillboardAnchorPosition
 * for edge-midpoint positions (halfway between center and the hex boundary).
 *
 * After reflecting all anchor positions across the 300°–120° axis
 * (new° = (240 − original° + 360) % 360), the edge-to-anchor mapping updates so
 * that each edge still resolves to the correct halfway point toward its geometric
 * direction:
 *   edge[0]: geometric 330° → MIDDLE_270_DEGREE
 *   edge[1]: geometric  30° → MIDDLE_210_DEGREE
 *   edge[2]: geometric  90° → MIDDLE_150_DEGREE
 *   edge[3]: geometric 150° → MIDDLE_90_DEGREE
 *   edge[4]: geometric 210° → MIDDLE_30_DEGREE
 *   edge[5]: geometric 270° → MIDDLE_330_DEGREE
 */
const EDGE_INDEX_TO_ANCHOR: BillboardAnchorPosition[] = [
	BillboardAnchorPosition.MIDDLE_270_DEGREE, // edge 0: vertex[0](300°)→vertex[1](0°)
	BillboardAnchorPosition.MIDDLE_210_DEGREE, // edge 1: vertex[1](0°)→vertex[2](60°)
	BillboardAnchorPosition.MIDDLE_150_DEGREE, // edge 2: vertex[2](60°)→vertex[3](120°)
	BillboardAnchorPosition.MIDDLE_90_DEGREE,  // edge 3: vertex[3](120°)→vertex[4](180°)
	BillboardAnchorPosition.MIDDLE_30_DEGREE,  // edge 4: vertex[4](180°)→vertex[5](240°)
	BillboardAnchorPosition.MIDDLE_330_DEGREE, // edge 5: vertex[5](240°)→vertex[0](300°)
];

/**
 * All 12 MIDDLE ring anchor positions in clockwise degree order (0°, 30°, …, 330°).
 * Used to deterministically pick a tree placement position from the hex ID.
 */
export const MIDDLE_RING_BY_DEGREE: BillboardAnchorPosition[] = [
	BillboardAnchorPosition.MIDDLE_0_DEGREE,
	BillboardAnchorPosition.MIDDLE_30_DEGREE,
	BillboardAnchorPosition.MIDDLE_60_DEGREE,
	BillboardAnchorPosition.MIDDLE_90_DEGREE,
	BillboardAnchorPosition.MIDDLE_120_DEGREE,
	BillboardAnchorPosition.MIDDLE_150_DEGREE,
	BillboardAnchorPosition.MIDDLE_180_DEGREE,
	BillboardAnchorPosition.MIDDLE_210_DEGREE,
	BillboardAnchorPosition.MIDDLE_240_DEGREE,
	BillboardAnchorPosition.MIDDLE_270_DEGREE,
	BillboardAnchorPosition.MIDDLE_300_DEGREE,
	BillboardAnchorPosition.MIDDLE_330_DEGREE,
];

/**
 * Find which edge index (0–5) of `hexId` faces toward `neighborId`.
 * Uses the hex boundary vertices: the edge whose midpoint is closest to the
 * neighbor's centroid is the shared edge.
 * Returns -1 when the boundary cannot be computed or H3 is unavailable.
 */
function getEdgeIndexTowardNeighbor(hexId: string, neighborId: string): number {
	try {
		// cellToBoundary with geoJsonOrder=true returns [lng,lat] pairs and closes
		// the ring (first vertex repeated at end). We have n unique vertices.
		const boundary = cellToBoundary(hexId, true) as Array<[number, number]>;
		const n = boundary.length - 1; // exclude the repeated closing vertex
		if (n < 6) return -1;

		const [nLat, nLng] = cellToLatLng(neighborId);

		let bestIdx = 0;
		let bestDist = Infinity;
		for (let i = 0; i < n; i++) {
			const [lng1, lat1] = boundary[i];
			const [lng2, lat2] = boundary[(i + 1) % n];
			const midLng = (lng1 + lng2) / 2;
			const midLat = (lat1 + lat2) / 2;
			const dLat = midLat - nLat;
			const dLng = midLng - nLng;
			const dist = dLat * dLat + dLng * dLng;
			if (dist < bestDist) {
				bestDist = dist;
				bestIdx = i;
			}
		}
		return bestIdx;
	} catch {
		return -1;
	}
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/** Ray-casting point-in-polygon test. Polygon is an array of [lng, lat] pairs. */
function pointInPolygon(lng: number, lat: number, polygon: Array<[number, number]>): boolean {
	let inside = false;
	for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
		const [xi, yi] = polygon[i];
		const [xj, yj] = polygon[j];
		const intersect =
			yi > lat !== yj > lat &&
			lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
		if (intersect) inside = !inside;
	}
	return inside;
}

/**
 * Find all H3 cells enclosed by the polygon formed by the centroids of the
 * visited hex tiles (in visit order). Visited tiles are excluded from the
 * result. Returns an empty array when:
 *  – fewer than 3 tiles were visited,
 *  – the first and last hex tiles are not the same cell or adjacent neighbours
 *    (open route), or
 *  – the H3 library is unavailable.
 *
 * Using hex-tile centroids instead of raw GPS points is faster because the
 * polygon has far fewer vertices (one per unique visited tile).
 *
 * When a route was completed via GPS interpolation (the runner stopped short
 * and the app added synthetic points to close the loop), callers should pass
 * the output of `buildFullRouteTileIds` instead of the raw `hexTilesOrdered`
 * list so that the closing segment is included in the polygon and the
 * adjacency check succeeds.
 */
export function findEnclosedCellsFromHexTiles(
	visitedHexIds: string[],
	resolution: number,
): string[] {
	if (!isH3Available() || visitedHexIds.length < MIN_TILES_FOR_ENCLOSED_POLYGON) return [];

	const h3Res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(resolution)));

	// Build a polygon ([lng, lat] pairs) from the centroids of the visited tiles.
	const polygon: Array<[number, number]> = [];
	for (const hexId of visitedHexIds) {
		try {
			const [lat, lng] = cellToLatLng(hexId);
			polygon.push([lng, lat]);
		} catch {
			// skip invalid cells
		}
	}
	if (polygon.length < MIN_TILES_FOR_ENCLOSED_POLYGON) return [];

	// Check loop closure: first and last hex tiles must be the same cell or adjacent neighbors.
	const firstHex = visitedHexIds[0];
	const lastHex = visitedHexIds[visitedHexIds.length - 1];
	if (firstHex !== lastHex && !areNeighborCells(firstHex, lastHex)) return [];

	// Bounding box with small padding.
	const lngs = polygon.map(([lng]) => lng);
	const lats = polygon.map(([, lat]) => lat);
	const minLat = Math.min(...lats) - BBOX_PADDING_DEG;
	const maxLat = Math.max(...lats) + BBOX_PADDING_DEG;
	const minLng = Math.min(...lngs) - BBOX_PADDING_DEG;
	const maxLng = Math.max(...lngs) + BBOX_PADDING_DEG;

	const centerLat = (maxLat + minLat) / 2;
	const centerLng = (maxLng + minLng) / 2;
	const centerCell = latLngToCell(centerLat, centerLng, h3Res);

	let maxK = 0;
	const corners: Array<[number, number]> = [
		[maxLat, maxLng],
		[maxLat, minLng],
		[minLat, maxLng],
		[minLat, minLng],
	];
	for (const [lat, lng] of corners) {
		try {
			const cornerCell = latLngToCell(lat, lng, h3Res);
			const dist = gridDistance(centerCell, cornerCell);
			if (dist > maxK) maxK = dist;
		} catch {
			// ignore
		}
	}

	const visitedSet = new Set(visitedHexIds);
	const candidates = gridDisk(centerCell, Math.min(maxK + 1, MAX_GRID_DISK_RADIUS));
	const enclosed: string[] = [];
	for (const cell of candidates) {
		if (visitedSet.has(cell)) continue;
		try {
			const [cellLat, cellLng] = cellToLatLng(cell);
			if (pointInPolygon(cellLng, cellLat, polygon)) {
				enclosed.push(cell);
			}
		} catch {
			// ignore invalid cells
		}
	}
	return enclosed;
}

/**
 * Build an ordered, deduplicated list of H3 hex tile IDs from the full GPS
 * route, including any tiles derived from interpolated GPS points.
 *
 * During a recording, `hexTilesOrdered` is populated only by the tiles the
 * runner physically visited.  When the runner stopped short and the app added
 * synthetic (interpolated) GPS points to close the loop back to the start,
 * those closing tiles are present in `routePoints` (flagged with
 * `interpolated: true`) but are NOT reflected in `hexTilesOrdered`.
 *
 * This function merges both sources so that the resulting list represents the
 * complete route polygon – enabling `findEnclosedCellsFromHexTiles` to detect
 * loop closure and correctly compute the enclosed area.
 *
 * @param hexTilesOrdered  Ordered H3 tile IDs of physically walked tiles.
 * @param routePoints      All GPS route points, including interpolated ones.
 * @param resolution       H3 resolution to use for cell lookup.
 * @returns Combined ordered tile list: walked tiles first, then any additional
 *          tiles from interpolated points (in GPS timestamp order).
 */
export function buildFullRouteTileIds(
	hexTilesOrdered: string[],
	routePoints: RoutePoint[],
	resolution: number,
): string[] {
	if (!isH3Available()) return hexTilesOrdered;

	const h3Res = Math.max(H3_RESOLUTION_MIN, Math.min(H3_RESOLUTION_MAX, Math.floor(resolution)));
	const seen = new Set<string>(hexTilesOrdered);
	const result = [...hexTilesOrdered];

	for (const point of routePoints) {
		if (!point.interpolated) continue;
		try {
			const cell = latLngToCell(point.lat, point.lng, h3Res);
			if (!seen.has(cell)) {
				seen.add(cell);
				result.push(cell);
			}
		} catch {
			// skip invalid GPS points
		}
	}
	return result;
}

/**
 * indicates a forest / wooded area.  Checks:
 *  - `landcover` layer with `class = 'wood'` or `subclass = 'forest'`
 *  - `park` layer with `class = 'forest'`
 */
export function hasForestFeature(features: MapFeatureInfo[]): boolean {
	return features.some(
		(f) =>
			(f.layerId === OpenMapTilesLayerId.LANDCOVER &&
				(f.class === LandcoverClass.WOOD || f.subclass === LandcoverSubclass.FOREST)) ||
			(f.layerId === OpenMapTilesLayerId.PARK && f.class === ParkClass.FOREST),
	);
}

/**
 * Deterministically compute the MIDDLE ring anchor position for the small pine
 * tree billboard on a given hex tile.  Uses the same FNV-style hash as
 * `checkAndApplyForest` so callers that need to dispatch the billboard
 * individually (outside a full record mutation) produce identical results.
 *
 * @param hexId H3 cell index string.
 * @returns The `BillboardAnchorPosition` for the small tree.
 */
export function getSmallTreeAnchorForHexId(hexId: string): BillboardAnchorPosition {
	let hash = 0;
	for (let i = 0; i < hexId.length; i++) {
		hash = (hash * 31 + hexId.charCodeAt(i)) >>> 0;
	}
	return MIDDLE_RING_BY_DEGREE[hash % MIDDLE_RING_BY_DEGREE.length];
}

/**
 * Check whether the cached features for a tile indicate a forest, and if so
 * apply forest tree billboards to the record.
 *
 * Called for tiles that are already confirmed to be enclosed and not visited.
 * Places:
 *  - a `treePineLarge` billboard at CENTER (hex centroid).
 *  - a `treePineLarge` billboard at a MIDDLE ring position that is deterministically
 *    chosen from the last hex character of `hexId` (parsed as a hex digit modulo 12).
 *
 * Does nothing when `features` is undefined or contains no forest indicator.
 */

export function checkAndApplyForest(
	hexId: string,
	rec: HexTileRecord,
	features: MapFeatureInfo[] | undefined,
): void {
	if (!features || !hasForestFeature(features)) return;
	if (!rec.billboards) rec.billboards = {};

	// Large tree at the hex centroid.
	rec.billboards[BillboardAnchorPosition.CENTER] = BILLBOARD_PINE_TREE_LARGE;

	// Additional tree at a MIDDLE ring position derived from the hex ID.
	rec.billboards[getSmallTreeAnchorForHexId(hexId)] = BILLBOARD_PINE_TREE_SMALL;
}

/**
 * Returns `true` when the given feature list contains at least one feature that
 * indicates rocky / stony ground (pebble-stone terrain).  Checks:
 *  - `landcover` layer with `class = 'rock'`
 */
export function hasPebbleStoneFeature(features: MapFeatureInfo[]): boolean {
	return features.some(
		(f) =>
			f.layerId === OpenMapTilesLayerId.LANDCOVER &&
			f.class === LandcoverClass.ROCK,
	);
}

/**
 * Check whether the cached features for a tile indicate rocky / stony terrain,
 * and if so apply the pebble-stone terrain image to the record.
 *
 * Called for tiles that are already confirmed to be enclosed and not visited.
 * Sets `tileImage = 'Stone/stone'` – at the terrain (tileImage) level only,
 * not as a billboard (hex object) and not as a flat texture adaption (hex texture).
 *
 * Does nothing when `features` is undefined or contains no rock indicator.
 */
export function checkAndApplyPebbleStone(
	rec: HexTileRecord,
	features: MapFeatureInfo[] | undefined,
): void {
	if (!features || !hasPebbleStoneFeature(features)) return;
	rec.tileImage = TILE_IMAGE_STONE;
}

function getOrCreateRecord(
	records: Record<string, HexTileRecord>,
	h3Index: string,
): HexTileRecord {
	if (!records[h3Index]) {
		records[h3Index] = {
			h3Index,
			lastVisitedAt: null,
			lastEnclosedAt: null,
			visitCount: 0,
			enclosedCount: 0,
			level: 0,
			walkedOn: false,
		};
	}
	return records[h3Index];
}

/**
 * Compute the parent H3 index and the child's position (0–6) among its
 * siblings at the parent's resolution.
 *
 * The center child (returned by `cellToCenterChild`) receives index 0.
 * The remaining 6 children are sorted by their H3 index string ascending
 * and receive indices 1–6.
 *
 * Returns `null` for resolution-0 cells (no parent exists) or when the H3
 * library is unavailable.
 */
function computeParentInfo(
	h3Index: string,
): { parentH3Index: string; parentChildIndex: number } | null {
	if (!isH3Available()) return null;
	try {
		const res = getResolution(h3Index);
		if (res <= 0) return null;
		const parentRes = res - 1;
		const parentH3Index = cellToParent(h3Index, parentRes);
		if (!parentH3Index) return null;

		const centerChild = cellToCenterChild(parentH3Index, res);
		if (centerChild === h3Index) {
			return { parentH3Index, parentChildIndex: 0 };
		}

		const allChildren = cellToChildren(parentH3Index, res);
		const nonCenterChildren = allChildren
			.filter((c) => c !== centerChild)
			.sort();
		const idx = nonCenterChildren.indexOf(h3Index);
		// idx is 0–5 for the non-center children → add 1 to reserve 0 for center
		const parentChildIndex = idx >= 0 ? idx + 1 : -1;
		if (parentChildIndex < 0) return null;
		return { parentH3Index, parentChildIndex };
	} catch {
		return null;
	}
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute the `ComputedActivityData` blob for a `SavedActivity`.
 *
 * Call this:
 *  - immediately after a recording stops (before `saveActivity`), so the data
 *    is persisted alongside the raw GPS points.
 *  - during a full map rebuild for any activity that is missing the field.
 *
 * @param activity        The activity whose GPS points will be processed.
 * @param enclosedHexTiles  Hex cell IDs that were enclosed by the route loop
 *                          but not physically walked on.  Pass the value
 *                          computed by `findEnclosedCells` at recording time.
 */
export function computeActivityData(
	activity: SavedActivity,
	enclosedHexTiles: string[],
): ComputedActivityData {
	const h3Resolution = activity.h3Resolution ?? H3_RESOLUTION_FALLBACK;
	const hexTilesOrdered = activity.hexTilesOrdered ?? [];

	// Build a map from H3 cell → list of GPS speeds (km/h) recorded inside it.
	const hexSpeeds: Record<string, number[]> = {};

	if (isH3Available()) {
		for (const point of activity.routePoints) {
			if (point.speed == null || point.speed < 0) continue;
			try {
				const cell = latLngToCell(point.lat, point.lng, h3Resolution);
				if (!hexSpeeds[cell]) hexSpeeds[cell] = [];
				// Expo Location speed is in m/s → convert to km/h
				hexSpeeds[cell].push(point.speed * 3.6);
			} catch {
				// Skip invalid GPS points
			}
		}
	}

	const hexTilesVisited: ComputedHexTileEntry[] = hexTilesOrdered.map((hexId) => {
		const speeds = hexSpeeds[hexId] ?? [];
		const avgSpeedKmh =
			speeds.length > 0
				? speeds.reduce((sum, s) => sum + s, 0) / speeds.length
				: 0;
		return { hexId, avgSpeedKmh };
	});

	return {
		maxSpeedKmh: activity.stats.maxSpeedKmh,
		minSpeedKmh: activity.stats.minSpeedKmh,
		avgSpeedKmh: activity.stats.avgSpeedKmh,
		hexTilesVisited,
		enclosedHexTiles,
	};
}

/**
 * Rebuild the complete hex-tile map state from a list of saved activities.
 *
 * The function reads the `computed` field of each activity (falling back to
 * the raw `hexTilesOrdered` list for older saves without `computed`).
 * It aggregates per-tile visit/enclosure counts, stores back-references for
 * fast future lookups, and applies automatic terrain customisations:
 *
 *  - **Visited tiles** (visitCount > 0)
 *      → tileImage = "Dirt/dirt"
 *      → pathRounded billboard (flat) at each edge midpoint that faces a walked neighbor
 *  - **Enclosed-only tiles** (enclosedCount > 0, visitCount = 0)
 *      → tileImage = "Grass/grass"
 *      → pineTreeLarge billboard at purple anchor (hex centroid), only when the
 *         hex-tile feature cache confirms a forest / wooded area on that tile
 *
 * @param activities         All saved activities to process.
 * @param hexTileFeatureCache  Optional per-hex feature cache.  When provided,
 *                             the pineTreeLarge billboard is only placed on
 *                             enclosed tiles that have a forest feature
 *                             (landcover class=wood / subclass=forest, or
 *                             park class=forest).  Tiles without cached
 *                             features receive only the grass terrain image.
 * @param homeHexTile        Optional H3 cell index of the player's home tile.
 *                           When provided, a castle2 billboard is placed at
 *                           the CENTER of that tile after the rebuild.
 * @returns `{ records, walkedEdges }` – fresh state ready to be loaded into
 *          the Redux hex-tile slice via `loadPersistedState` /
 *          `loadWalkedEdgesState`.
 */
export function rebuildMapFromActivities(
	activities: SavedActivity[],
	hexTileFeatureCache: HexTileFeatureCache = {},
	homeHexTile?: string | null,
): { records: Record<string, HexTileRecord>; walkedEdges: string[] } {
	const records: Record<string, HexTileRecord> = {};
	const edgeSet = new Set<string>();

	for (const activity of activities) {
		const activityId = activity.id;
		const endedAt = activity.endedAt;

		// ── Derive the ordered and enclosed tile lists ────────────────────────
		// Prefer the pre-computed field; fall back to the raw ordered list for
		// activities saved before the computed field was introduced.
		// For backward-compat, also accept the legacy `orderedHexTiles` field name.
		const orderedHexTiles: ComputedHexTileEntry[] =
			activity.computed?.hexTilesVisited ??
			(activity.computed as { orderedHexTiles?: ComputedHexTileEntry[] } | undefined)?.orderedHexTiles ??
			(activity.hexTilesOrdered ?? []).map((hexId) => ({ hexId, avgSpeedKmh: 0 }));

		// Always recompute enclosed tiles from the route when enough walked tiles
		// are available.  This ensures that stale stored values (e.g. an activity
		// that was recorded with a closed loop but later the route was found to be
		// open) are corrected: if the route does not form a closed loop, the
		// recomputation returns [] and overrides the stored (now-incorrect) data.
		// Include tiles derived from interpolated GPS points so that routes
		// completed via route interpolation produce a properly closed polygon.
		let enclosedHexTiles: string[];
		if ((activity.hexTilesOrdered?.length ?? 0) >= MIN_TILES_FOR_ENCLOSED_POLYGON) {
			const visitedIds = activity.hexTilesOrdered ?? [];
			const h3Res = activity.h3Resolution ?? H3_RESOLUTION_FALLBACK;
			const fullRouteIds = buildFullRouteTileIds(visitedIds, activity.routePoints, h3Res);
			enclosedHexTiles = findEnclosedCellsFromHexTiles(fullRouteIds, h3Res);
		} else {
			// Not enough walked tiles to form a polygon; fall back to any stored
			// value for legacy activities that pre-date hexTilesOrdered.
			enclosedHexTiles =
				activity.computed?.enclosedHexTiles ??
				activity.enclosedHexTiles ??
				activity.hexTilesEnclosed ??
				[];
		}

		// ── Process visited (walked) tiles ────────────────────────────────────
		// Pre-build a map for O(1) lookup of existing references for this activity.
		const refByHexId = new Map<string, ActivityReference>();
		for (const rec of Object.values(records)) {
			if (!rec.activityReferences) continue;
			const ref = rec.activityReferences.find(
				(r: ActivityReference) => r.activityId === activityId,
			);
			if (ref) refByHexId.set(rec.h3Index, ref);
		}

		for (let i = 0; i < orderedHexTiles.length; i++) {
			const { hexId } = orderedHexTiles[i];
			const rec = getOrCreateRecord(records, hexId);

			// Update timestamps
			if (rec.lastVisitedAt === null || endedAt > rec.lastVisitedAt) {
				rec.lastVisitedAt = endedAt;
			}

			// Add or merge the activity reference
			if (!rec.activityReferences) rec.activityReferences = [];
			const existingRef = refByHexId.get(hexId);
			if (existingRef) {
				existingRef.walkedIndex = i;
			} else {
				const newRef: ActivityReference = { activityId, walkedIndex: i };
				rec.activityReferences.push(newRef);
				refByHexId.set(hexId, newRef);
			}

			// Build walked edges from consecutive tile pairs
			if (i > 0) {
				const prev = orderedHexTiles[i - 1].hexId;
				const edge = prev < hexId ? `${prev}:${hexId}` : `${hexId}:${prev}`;
				edgeSet.add(edge);
			}
		}

		// ── Process enclosed tiles ────────────────────────────────────────────
		for (let i = 0; i < enclosedHexTiles.length; i++) {
			const hexId = enclosedHexTiles[i];
			const rec = getOrCreateRecord(records, hexId);

			// Update timestamps
			if (rec.lastEnclosedAt === null || endedAt > rec.lastEnclosedAt) {
				rec.lastEnclosedAt = endedAt;
			}

			// Add or merge the activity reference
			if (!rec.activityReferences) rec.activityReferences = [];
			const existingRef = refByHexId.get(hexId);
			if (existingRef) {
				existingRef.enclosedIndex = i;
			} else {
				const newRef: ActivityReference = { activityId, enclosedIndex: i };
				rec.activityReferences.push(newRef);
				refByHexId.set(hexId, newRef);
			}
		}
	}

	// ── Second pass (2a): compute counts and levels for ALL tiles first ───────
	// This must be a separate loop so that every tile's enclosedCount and
	// visitCount are fully populated before the terrain/tree assignment pass
	// (2b) reads those values on neighbour tiles.
	for (const rec of Object.values(records)) {
		const refs: ActivityReference[] = rec.activityReferences ?? [];

		// Count distinct activities that visited / enclosed this tile.
		const visitedActivities = new Set(
			refs.filter((r) => r.walkedIndex !== undefined).map((r) => r.activityId),
		);
		const enclosedActivities = new Set(
			refs.filter((r) => r.enclosedIndex !== undefined).map((r) => r.activityId),
		);

		rec.visitCount = visitedActivities.size;
		rec.enclosedCount = enclosedActivities.size;
		rec.walkedOn = rec.visitCount > 0;
		rec.level = computeHexTileLevel(rec);
	}

	// ── Second pass (2b): apply tile-image and billboard assignments ──────────
	// All counts are now fully computed, so it is safe to query neighbour
	// tiles' enclosedCount when deciding whether to place trees.
	for (const [hexId, rec] of Object.entries(records)) {
		// Apply automatic tile-image and billboard assignments.
		if (rec.visitCount > 0) {
			// Visited tile → dirt terrain
			rec.tileImage = TILE_IMAGE_DIRT;

			// Place a path object (flat) at each MIDDLE ring anchor that faces a
			// walked neighbor tile, indicating the route direction.
			if (isH3Available()) {
				const neighbors = gridDisk(hexId, 1).filter((n) => n !== hexId);
				for (const neighbor of neighbors) {
					const edgeStr = hexId < neighbor ? `${hexId}:${neighbor}` : `${neighbor}:${hexId}`;
					if (!edgeSet.has(edgeStr)) continue;
					const edgeIdx = getEdgeIndexTowardNeighbor(hexId, neighbor);
					if (edgeIdx < 0 || edgeIdx >= EDGE_INDEX_TO_ANCHOR.length) continue;
					const anchorPosition = EDGE_INDEX_TO_ANCHOR[edgeIdx];
					if (!rec.billboardsTexture) rec.billboardsTexture = {};
					rec.billboardsTexture[anchorPosition] = BILLBOARD_PATH_ROUNDED;
				}
			}
		} else if (rec.enclosedCount > 0) {
			// Enclosed but not visited → grass terrain; forest
			// trees only when the feature cache confirms a forest / wooded area.
			rec.tileImage = TILE_IMAGE_GRASS;
			checkAndApplyForest(hexId, rec, hexTileFeatureCache[hexId]);
			// Override tileImage to stone when the feature cache confirms rocky
			// ground (pebble-stone terrain).  This is a tileImage-level change only –
			// not a billboard (hex object) and not a texture adaption (hex texture).
			// Note: pebbleStone runs after forest so the stone terrain wins when
			// both features are present.  In practice, ROCK and WOOD landcovers
			// are mutually exclusive in OpenMapTiles data, so this scenario does
			// not occur on real tiles.
			checkAndApplyPebbleStone(rec, hexTileFeatureCache[hexId]);
		}
	}

	// Apply home tile castle2 billboard if a home tile is set.
	if (homeHexTile) {
		const homeRec = getOrCreateRecord(records, homeHexTile);
		if (!homeRec.billboards) homeRec.billboards = {};
		homeRec.billboards[BillboardAnchorPosition.CENTER] = BILLBOARD_CASTLE2;
	}

	// ── Fourth pass: populate parent chain for all tiles ─────────────────────
	// For every tile in `records`, set `parentH3Index` and `parentChildIndex`,
	// and ensure ancestor records (up to resolution 0) also exist in `records`
	// with their own parent info.  Ancestor records added here have level 0 and
	// no visit/enclosure data; they serve purely as hierarchy metadata.
	if (isH3Available()) {
		// Snapshot the keys so that newly created ancestor records are also
		// processed (we iterate until no new keys are added).
		let keysToProcess = Object.keys(records);
		while (keysToProcess.length > 0) {
			const nextKeys: string[] = [];
			for (const h3Index of keysToProcess) {
				const rec = records[h3Index];
				// Skip tiles whose parent info is already set.
				if (rec.parentH3Index !== undefined) continue;
				const info = computeParentInfo(h3Index);
				if (!info) {
					rec.parentH3Index = null;
					rec.parentChildIndex = null;
					continue;
				}
				rec.parentH3Index = info.parentH3Index;
				rec.parentChildIndex = info.parentChildIndex;
				// Create the parent record if it does not yet exist.
				if (!records[info.parentH3Index]) {
					getOrCreateRecord(records, info.parentH3Index);
					nextKeys.push(info.parentH3Index);
				}
			}
			keysToProcess = nextKeys;
		}
	}

	return { records, walkedEdges: Array.from(edgeSet) };
}

/**
 * Maximum number of recent activities per route to consider when computing
 * the slowest-tile heuristic.
 */
const BENCH_MAX_ACTIVITIES_PER_ROUTE = 5;

/**
 * For each saved route, find the dirt hex tile where the player was most often
 * slowest (lowest average speed across the last `BENCH_MAX_ACTIVITIES_PER_ROUTE`
 * activities on that route) and place a bench billboard at its CENTER anchor –
 * but only when the tile has no CENTER billboard yet.
 *
 * Exclusions (never receive a bench):
 *  - The first and last hex tile of the route itself.
 *  - The first and last hex tile of each activity's visited sequence.
 *
 * Per-tile speed is the mean of `computed.hexTilesVisited[i].avgSpeedKmh`
 * across all qualifying activities that visited the tile.  Tiles are sorted by
 * this mean speed ascending, and the first tile that (a) is a dirt tile in the
 * map and (b) has no existing CENTER billboard receives the bench.
 *
 * Mutates `records` in place; no return value.
 *
 * @param records    The rebuilt hex-tile map (from `rebuildMapFromActivities`).
 * @param activities All saved activities (used to look up route membership).
 * @param routes     All saved routes.
 */
export function applyRouteBenches(
	records: Record<string, HexTileRecord>,
	activities: SavedActivity[],
	routes: SavedRoute[],
): void {
	for (const route of routes) {
		if (route.hexTiles.length < 2) continue;

		// Tiles to exclude: first and last of the route.
		const routeExcluded = new Set<string>([
			route.hexTiles[0],
			route.hexTiles[route.hexTiles.length - 1],
		]);

		// Last BENCH_MAX_ACTIVITIES_PER_ROUTE activities assigned to this route,
		// sorted by endedAt descending (most recent first).
		const routeActivities = activities
			.filter((a) => a.routeId === route.id)
			.sort((a, b) => b.endedAt - a.endedAt)
			.slice(0, BENCH_MAX_ACTIVITIES_PER_ROUTE);

		if (routeActivities.length === 0) continue;

		// Accumulate average speed per hex tile across activities.
		const hexSpeedSum: Record<string, number> = {};
		const hexActivityCount: Record<string, number> = {};

		for (const activity of routeActivities) {
			// Skip activities without speed data – a zero-speed fallback would
			// artificially rank tiles from legacy activities as the slowest.
			if (!activity.computed?.hexTilesVisited) continue;
			const hexTilesVisited = activity.computed.hexTilesVisited;

			// Need at least 3 tiles so there is at least one tile remaining after
			// excluding the first and last.
			if (hexTilesVisited.length < 3) continue;

			// Exclude first and last tiles of this activity's visited sequence.
			const activityExcluded = new Set<string>([
				hexTilesVisited[0].hexId,
				hexTilesVisited[hexTilesVisited.length - 1].hexId,
			]);

			for (const { hexId, avgSpeedKmh } of hexTilesVisited) {
				if (activityExcluded.has(hexId)) continue;
				if (routeExcluded.has(hexId)) continue;
				hexSpeedSum[hexId] = (hexSpeedSum[hexId] ?? 0) + avgSpeedKmh;
				hexActivityCount[hexId] = (hexActivityCount[hexId] ?? 0) + 1;
			}
		}

		// Sort eligible tiles by mean speed ascending (slowest first).
		const candidates = Object.keys(hexSpeedSum)
			.map((hexId) => ({
				hexId,
				meanSpeed: hexSpeedSum[hexId] / hexActivityCount[hexId],
			}))
			.sort((a, b) => a.meanSpeed - b.meanSpeed);

		// Place bench on the first dirt tile that has no CENTER billboard yet.
		for (const { hexId } of candidates) {
			const rec = records[hexId];
			if (!rec) continue;
			if (rec.tileImage !== TILE_IMAGE_DIRT) continue;
			if (rec.billboards?.[BillboardAnchorPosition.CENTER]) continue;

			if (!rec.billboards) rec.billboards = {};
			rec.billboards[BillboardAnchorPosition.CENTER] = BILLBOARD_BENCH;
			break;
		}
	}
}
