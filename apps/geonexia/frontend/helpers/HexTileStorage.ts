import { File, Paths } from 'expo-file-system';

// ─── Enums ────────────────────────────────────────────────────────────────────

/**
 * Anchor positions within a hex cell for billboard placement.
 *
 * Degree values use a clockwise convention starting from the topmost vertex
 * (vertex[0], pointing north in a pointy-top H3 hex, 0°).  Degrees increase
 * clockwise: 0° = top, 90° = right, 180° = bottom, 270° = left.
 *
 * Three rings are defined:
 *  - CENTER               – hex centroid.
 *  - OUTER_N_DEGREE (12)  – on the hex boundary: the six vertices (0°, 60°,
 *                           120°, 180°, 240°, 300°) interleaved with the six
 *                           edge midpoints (30°, 90°, 150°, 210°, 270°, 330°).
 *  - MIDDLE_N_DEGREE (12) – midpoints between CENTER and the corresponding
 *                           OUTER position at the same degree.
 */
export enum BillboardAnchorPosition {
	// ── Center ────────────────────────────────────────────────────────────────
	CENTER = 'center',

	// ── Outer ring (hex boundary) ─────────────────────────────────────────────
	/** vertex[0] – topmost corner (0°) */
	OUTER_0_DEGREE   = 'outer_0',
	/** midpoint of edge between vertex[0] and vertex[1] (30°) */
	OUTER_30_DEGREE  = 'outer_30',
	/** vertex[1] – upper-right corner (60°) */
	OUTER_60_DEGREE  = 'outer_60',
	/** midpoint of edge between vertex[1] and vertex[2] (90°) */
	OUTER_90_DEGREE  = 'outer_90',
	/** vertex[2] – lower-right corner (120°) */
	OUTER_120_DEGREE = 'outer_120',
	/** midpoint of edge between vertex[2] and vertex[3] (150°) */
	OUTER_150_DEGREE = 'outer_150',
	/** vertex[3] – bottom corner (180°) */
	OUTER_180_DEGREE = 'outer_180',
	/** midpoint of edge between vertex[3] and vertex[4] (210°) */
	OUTER_210_DEGREE = 'outer_210',
	/** vertex[4] – lower-left corner (240°) */
	OUTER_240_DEGREE = 'outer_240',
	/** midpoint of edge between vertex[4] and vertex[5] (270°) */
	OUTER_270_DEGREE = 'outer_270',
	/** vertex[5] – upper-left corner (300°) */
	OUTER_300_DEGREE = 'outer_300',
	/** midpoint of edge between vertex[5] and vertex[0] (330°) */
	OUTER_330_DEGREE = 'outer_330',

	// ── Middle ring (halfway between center and outer boundary) ───────────────
	/** midpoint toward vertex[0] (0°) */
	MIDDLE_0_DEGREE   = 'middle_0',
	/** midpoint toward edge[0] midpoint (30°) */
	MIDDLE_30_DEGREE  = 'middle_30',
	/** midpoint toward vertex[1] (60°) */
	MIDDLE_60_DEGREE  = 'middle_60',
	/** midpoint toward edge[1] midpoint (90°) */
	MIDDLE_90_DEGREE  = 'middle_90',
	/** midpoint toward vertex[2] (120°) */
	MIDDLE_120_DEGREE = 'middle_120',
	/** midpoint toward edge[2] midpoint (150°) */
	MIDDLE_150_DEGREE = 'middle_150',
	/** midpoint toward vertex[3] (180°) */
	MIDDLE_180_DEGREE = 'middle_180',
	/** midpoint toward edge[3] midpoint (210°) */
	MIDDLE_210_DEGREE = 'middle_210',
	/** midpoint toward vertex[4] (240°) */
	MIDDLE_240_DEGREE = 'middle_240',
	/** midpoint toward edge[4] midpoint (270°) */
	MIDDLE_270_DEGREE = 'middle_270',
	/** midpoint toward vertex[5] (300°) */
	MIDDLE_300_DEGREE = 'middle_300',
	/** midpoint toward edge[5] midpoint (330°) */
	MIDDLE_330_DEGREE = 'middle_330',
}

/**
 * A back-reference linking a hex tile to a specific activity that visited or
 * enclosed it.  At most one entry per activity is stored per tile.
 *
 * - `walkedIndex`         – index of this tile in the activity's `computed.hexTilesVisited` list
 * - `enclosedIndex`       – index of this tile in the activity's `computed.enclosedHexTiles` list
 *
 * One reference object can carry multiple indices when the tile was walked,
 * enclosed in the same activity.
 */
export type ActivityReference = {
	activityId: string;
	/** Position in the activity's ordered hex tile sequence, if the tile was visited. */
	walkedIndex?: number;
	/** Position in the activity's enclosed hex tile list, if the tile was enclosed. */
	enclosedIndex?: number;
};

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Persistent record for a single H3 hex tile, tracking visit and enclosure history.
 *
 * `level` is a computed 0–10 score that drives the map colour gradient:
 *   0  = unvisited / never enclosed  → transparent
 *   1  = lightest green (e.g. enclosed once)
 *   10 = darkest green  (e.g. visited 5+ times)
 *
 * Formula: level = min(10, visitCount * 2 + enclosedCount)
 */
export type HexTileRecord = {
	/** H3 cell index (e.g. "89283082813ffff") */
	h3Index: string;
	/** Unix timestamp (ms) of the last time the user passed through this tile */
	lastVisitedAt: number | null;
	/** Unix timestamp (ms) of the last time this tile was enclosed by a run loop */
	lastEnclosedAt: number | null;
	/** Total number of runs where the user visited this tile */
	visitCount: number;
	/** Total number of times this tile was enclosed by a completed run loop */
	enclosedCount: number;
	/** Colour level 0–10, recomputed after each update */
	level: number;
	/**
	 * Whether the user has physically walked on this tile (i.e. GPS tracked).
	 * Tiles that are only enclosed (but not walked on) remain false.
	 */
	walkedOn: boolean;
	/**
	 * Key of the selected terrain tile image (e.g. "Grass/grass_01").
	 * Null or undefined means no custom tile image.
	 */
	tileImage?: string | null;
	/**
	 * Key of the selected billboard placed on this tile (e.g. "tree").
	 * Billboards are upright 2-D sprites rendered as map markers.
	 * Null or undefined means no billboard.
	 */
	billboard?: string | null;
	/**
	 * Anchor position for billboard placement within the hex cell.
	 * Should be a `BillboardAnchorPosition` value.
	 * @deprecated Use `billboards` instead. Kept for backward compatibility.
	 */
	billboardAnchorColor?: string | null;
	/**
	 * Per-anchor billboard map. Keys are BillboardAnchorPosition values.
	 * Each key maps to a billboard key (e.g. "objects:47") or null.
	 * When present, this field takes precedence over the legacy `billboard` and
	 * `billboardAnchorColor` fields, allowing multiple billboards on one tile.
	 */
	billboards?: Record<string, string | null>;
	/**
	 * Per-anchor flat-rendering flag. Keys are BillboardAnchorPosition values.
	 * When `true` for an anchor, the billboard at that position is rendered flat
	 * on the map surface (pitch-alignment = 'map') instead of facing the camera
	 * (pitch-alignment = 'viewport').  Defaults to false when absent.
	 * @deprecated Use `billboardsTexture` for flat anchor-positioned sprites.
	 */
	billboardsFlat?: Record<string, boolean>;
	/**
	 * Per-anchor texture adaption map. Keys are BillboardAnchorPosition values.
	 * Each key maps to a billboard/sprite key (e.g. "objects:47") or null.
	 * Unlike `billboards` (Hex Objects, always face-camera), texture adaptions
	 * are always rendered flat on the map surface (pitch-alignment = 'map').
	 * This is the "Hex Texture Adaption" layer, sitting between the Hex Textur
	 * fill and the Hex Objects in the render stack.
	 */
	billboardsTexture?: Record<string, string | null>;
	/**
	 * Back-references to the activities that contributed to this tile's
	 * visit/enclosure counts.  There is at most one entry per activity.
	 * Used by the map-rebuild helper to recompute counts from activity history
	 * without re-processing raw GPS points.
	 * Optional for backward-compat with older saves.
	 */
	activityReferences?: ActivityReference[];
	/**
	 * H3 index of the parent cell (one resolution level coarser, i.e. resolution - 1).
	 * Null for resolution-0 cells (no parent exists) or when the H3 library is unavailable.
	 * Populated automatically during map rebuild.
	 */
	parentH3Index?: string | null;
	/**
	 * Position of this cell among its parent's 7 children (0–6).
	 * Children are sorted by H3 index string ascending; the center child (via
	 * `cellToCenterChild`) receives index 0 and the remaining 6 surrounding
	 * children receive indices 1–6 in ascending H3-string order.
	 * Null for resolution-0 cells or when the H3 library is unavailable.
	 * Populated automatically during map rebuild.
	 */
	parentChildIndex?: number | null;
};

// ─── Level computation ────────────────────────────────────────────────────────

/**
 * Compute the colour level (0–10) for a hex tile based on its visit and
 * enclosure counts.
 *
 * Formula: level = min(10, visitCount * 2 + enclosedCount)
 *
 *   0  = unvisited / never enclosed (transparent)
 *   1  = lightest green (e.g. enclosed once, never walked)
 *   10 = darkest green  (e.g. visited 5 times)
 *
 * Visiting a tile contributes twice as much as being enclosed,
 * so active running has more visual impact than passive territory capture.
 */
export function computeHexTileLevel(record: Pick<HexTileRecord, 'visitCount' | 'enclosedCount'>): number {
	const score = record.visitCount * 2 + record.enclosedCount;
	if (score <= 0) return 0;
	return Math.min(10, score);
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function getHexTileFile(): File {
	return new File(Paths.document, 'geonexia-hex-tiles.json');
}

function getDevHexTileFile(): File {
	return new File(Paths.document, 'geonexia-dev-hex-tiles.json');
}

function getDevModeFlagFile(): File {
	return new File(Paths.document, 'geonexia-dev-mode.json');
}

function getWalkedEdgesFile(): File {
	return new File(Paths.document, 'geonexia-walked-edges.json');
}

function getDevWalkedEdgesFile(): File {
	return new File(Paths.document, 'geonexia-dev-walked-edges.json');
}

/**
 * Persist the full hex tile record map to disk (synchronous write).
 * Silently ignores write errors to avoid crashing on storage failures.
 */
export function saveHexTileState(records: Record<string, HexTileRecord>): void {
	try {
		getHexTileFile().write(JSON.stringify(records));
	} catch (err) {
		console.warn('[HexTileStorage] Failed to save hex tile state:', err);
	}
}

/**
 * Load hex tile records from disk. Returns an empty object when the file does
 * not yet exist or cannot be parsed.
 */
export async function loadHexTileState(): Promise<Record<string, HexTileRecord>> {
	try {
		const file = getHexTileFile();
		if (!file.exists) return {};
		const content = await file.text();
		return JSON.parse(content) as Record<string, HexTileRecord>;
	} catch {
		return {};
	}
}

/**
 * Persist the dev-mode hex tile record map to disk.
 * Silently ignores write errors to avoid crashing on storage failures.
 */
export function saveDevHexTileState(records: Record<string, HexTileRecord>): void {
	try {
		getDevHexTileFile().write(JSON.stringify(records));
	} catch (err) {
		console.warn('[HexTileStorage] Failed to save dev hex tile state:', err);
	}
}

/**
 * Load dev-mode hex tile records from disk. Returns an empty object when the
 * file does not yet exist or cannot be parsed.
 */
export async function loadDevHexTileState(): Promise<Record<string, HexTileRecord>> {
	try {
		const file = getDevHexTileFile();
		if (!file.exists) return {};
		const content = await file.text();
		return JSON.parse(content) as Record<string, HexTileRecord>;
	} catch {
		return {};
	}
}

/**
 * Persist the walked edges array to disk (synchronous write).
 * Each edge is stored as "cellA:cellB" with the lexicographically smaller
 * index first so duplicate edges are naturally deduplicated.
 * Silently ignores write errors.
 */
export function saveWalkedEdges(edges: string[]): void {
	try {
		getWalkedEdgesFile().write(JSON.stringify(edges));
	} catch (err) {
		console.warn('[HexTileStorage] Failed to save walked edges:', err);
	}
}

/**
 * Load walked edges from disk. Returns an empty array when the file does
 * not yet exist or cannot be parsed.
 */
export async function loadWalkedEdges(): Promise<string[]> {
	try {
		const file = getWalkedEdgesFile();
		if (!file.exists) return [];
		const content = await file.text();
		return JSON.parse(content) as string[];
	} catch {
		return [];
	}
}

/**
 * Persist the dev-mode walked edges array to disk.
 * Silently ignores write errors.
 */
export function saveDevWalkedEdges(edges: string[]): void {
	try {
		getDevWalkedEdgesFile().write(JSON.stringify(edges));
	} catch (err) {
		console.warn('[HexTileStorage] Failed to save dev walked edges:', err);
	}
}

/**
 * Load dev-mode walked edges from disk. Returns an empty array when the file
 * does not yet exist or cannot be parsed.
 */
export async function loadDevWalkedEdges(): Promise<string[]> {
	try {
		const file = getDevWalkedEdgesFile();
		if (!file.exists) return [];
		const content = await file.text();
		return JSON.parse(content) as string[];
	} catch {
		return [];
	}
}

/**
 * Persist the dev-mode active flag to disk.
 * Silently ignores write errors.
 */
export function saveDevModeFlag(isDevMode: boolean): void {
	try {
		getDevModeFlagFile().write(JSON.stringify({ active: isDevMode }));
	} catch (err) {
		console.warn('[HexTileStorage] Failed to save dev mode flag:', err);
	}
}

/**
 * Load the dev-mode active flag from disk. Returns false when the file does
 * not yet exist or cannot be parsed.
 */
export async function loadDevModeFlag(): Promise<boolean> {
	try {
		const file = getDevModeFlagFile();
		if (!file.exists) return false;
		const content = await file.text();
		const data = JSON.parse(content) as { active?: boolean };
		return data.active === true;
	} catch {
		return false;
	}
}

// ─── World building ID ────────────────────────────────────────────────────────

function getWorldBuildingIdFile(): File {
	return new File(Paths.document, 'geonexia-world-building-id.json');
}

function getDevWorldBuildingIdFile(): File {
	return new File(Paths.document, 'geonexia-dev-world-building-id.json');
}

/**
 * Persist the world building ID to disk.
 * Silently ignores write errors.
 */
export function saveWorldBuildingId(id: number): void {
	try {
		getWorldBuildingIdFile().write(JSON.stringify({ id }));
	} catch (err) {
		console.warn('[HexTileStorage] Failed to save world building id:', err);
	}
}

/**
 * Load the world building ID from disk. Returns null when the file does not
 * yet exist or cannot be parsed.
 */
export async function loadWorldBuildingId(): Promise<number | null> {
	try {
		const file = getWorldBuildingIdFile();
		if (!file.exists) return null;
		const content = await file.text();
		const data = JSON.parse(content) as { id?: number };
		return typeof data.id === 'number' ? data.id : null;
	} catch {
		return null;
	}
}

/**
 * Persist the dev-mode world building ID to disk.
 * Silently ignores write errors.
 */
export function saveDevWorldBuildingId(id: number): void {
	try {
		getDevWorldBuildingIdFile().write(JSON.stringify({ id }));
	} catch (err) {
		console.warn('[HexTileStorage] Failed to save dev world building id:', err);
	}
}

/**
 * Load the dev-mode world building ID from disk. Returns null when the file
 * does not yet exist or cannot be parsed.
 */
export async function loadDevWorldBuildingId(): Promise<number | null> {
	try {
		const file = getDevWorldBuildingIdFile();
		if (!file.exists) return null;
		const content = await file.text();
		const data = JSON.parse(content) as { id?: number };
		return typeof data.id === 'number' ? data.id : null;
	} catch {
		return null;
	}
}

// ─── Debug mode flag ──────────────────────────────────────────────────────────

function getDebugModeFlagFile(): File {
	return new File(Paths.document, 'geonexia-debug-mode.json');
}

/**
 * Persist the debug mode active flag to disk.
 * Silently ignores write errors.
 */
export function saveDebugModeFlag(isDebugMode: boolean): void {
	try {
		getDebugModeFlagFile().write(JSON.stringify({ active: isDebugMode }));
	} catch (err) {
		console.warn('[HexTileStorage] Failed to save debug mode flag:', err);
	}
}

/**
 * Load the debug mode active flag from disk. Returns false when the file does
 * not yet exist or cannot be parsed.
 */
export async function loadDebugModeFlag(): Promise<boolean> {
	try {
		const file = getDebugModeFlagFile();
		if (!file.exists) return false;
		const content = await file.text();
		const data = JSON.parse(content) as { active?: boolean };
		return data.active === true;
	} catch {
		return false;
	}
}
