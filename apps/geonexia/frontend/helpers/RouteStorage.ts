import { Directory, File, Paths } from 'expo-file-system';
import { SportType } from '../store/sportTypeSlice';

// ─── Shared types ─────────────────────────────────────────────────────────────

export type SavedRoute = {
	id: string;
	name: string;
	/** Ordered sequence of H3 hex tile indices representing the route. */
	hexTiles: string[];
	/** H3 resolution used when recording the route. */
	h3Resolution: number;
	/** Unix timestamp (ms) when the route was first created. */
	createdAt: number;
	/** Sport type associated with the route (optional). */
	sportType?: SportType;
	/**
	 * Actual hex-to-hex transitions that occurred along the route, stored as
	 * "cellA:cellB" strings where cellA is lexicographically smaller than cellB.
	 * Used to draw walk path lines between hexagons on the route detail screen.
	 * Optional for backward-compat with older saves that lack this field.
	 */
	walkedEdges?: string[];
	/**
	 * IDs of activities that have been assigned to this route.
	 * Maintained as the reverse side of `SavedActivity.routeId`.
	 * Optional for backward-compat with older saves that lack this field.
	 */
	activityIds?: string[];
	/**
	 * H3 cell indices of the tiles enclosed by the route loop.
	 * Computed once on the route detail screen and cached here to avoid
	 * recomputation on every screen visit.  An empty array means the route
	 * was checked and found to enclose no cells (not a closed loop).
	 * `undefined` means not yet computed (older saves or shape changed).
	 * Optional for backward-compat with older saves that lack this field.
	 */
	enclosedTiles?: string[];
	/**
	 * Ordered H3 cell transitions at the red-line resolution (finer than the
	 * displayed h10 hex tiles), stored as "cellA:cellB" strings where cellA is
	 * lexicographically smaller than cellB.  Used to draw the red walk path
	 * line at a finer granularity than the h10 tile centres.
	 *
	 * Computed from the first activity's `routePoints` and cached here.
	 * `undefined` means not yet computed (older saves before this field was
	 * introduced, or the route's tile set was manually edited).  In that case
	 * the display falls back to `walkedEdges` (h10).
	 * Optional for backward-compat with older saves that lack this field.
	 */
	walkedEdgesRedLine?: string[];
	/**
	 * H3 resolution used to compute `walkedEdgesRedLine`.
	 * Stored alongside the edges so consumers do not need to hard-code the
	 * resolution — the field is the single source of truth.
	 * Optional for backward-compat with older saves that lack this field.
	 */
	walkedEdgesRedLineResolution?: number;
};

// ─── Storage directories and files ───────────────────────────────────────────

function getRoutesDir(): Directory {
	return new Directory(Paths.document, 'geonexia-routes');
}

function getRouteFile(id: string): File {
	return new File(getRoutesDir(), id + '.json');
}

// ─── Route persistence ───────────────────────────────────────────────────────

function isValidRoute(obj: unknown): obj is SavedRoute {
	if (typeof obj !== 'object' || obj === null) return false;
	const r = obj as Record<string, unknown>;
	return (
		typeof r.id === 'string' &&
		typeof r.name === 'string' &&
		Array.isArray(r.hexTiles) &&
		typeof r.h3Resolution === 'number' &&
		typeof r.createdAt === 'number'
	);
}

/**
 * Migrate a route loaded from disk to the current schema.
 * Handles old saves that used `walkedEdgesH11` (resolution hard-coded in the
 * field name) by copying the edges to `walkedEdgesRedLine` and setting
 * `walkedEdgesRedLineResolution = 11`.
 */
function migrateRoute(route: SavedRoute): SavedRoute {
	const r = route as SavedRoute & { walkedEdgesH11?: string[] };
	if (r.walkedEdgesH11 !== undefined && route.walkedEdgesRedLine === undefined) {
		const { walkedEdgesH11, ...rest } = r;
		return { ...rest, walkedEdgesRedLine: walkedEdgesH11, walkedEdgesRedLineResolution: 11 };
	}
	return route;
}

export function saveRoute(route: SavedRoute): void {
	const dir = getRoutesDir();
	if (!dir.exists) {
		dir.create({ idempotent: true });
	}
	getRouteFile(route.id).write(JSON.stringify(route));
}

export async function loadRoutes(): Promise<SavedRoute[]> {
	const dir = getRoutesDir();
	if (!dir.exists) return [];

	let entries: (File | Directory)[];
	try {
		entries = dir.list();
	} catch {
		return [];
	}

	const routes: SavedRoute[] = [];
	for (const entry of entries) {
		if (!(entry instanceof File)) continue;
		if (!entry.name.endsWith('.json')) continue;
		try {
			const content = await entry.text();
			const parsed = JSON.parse(content);
			if (isValidRoute(parsed)) {
				routes.push(migrateRoute(parsed));
			}
		} catch {
			// Skip corrupted files
		}
	}
	// Sort by createdAt descending (newest first)
	routes.sort((a, b) => b.createdAt - a.createdAt);
	return routes;
}

export async function loadRoute(id: string): Promise<SavedRoute | null> {
	const file = getRouteFile(id);
	if (!file.exists) return null;
	try {
		const content = await file.text();
		const parsed = JSON.parse(content);
		return isValidRoute(parsed) ? migrateRoute(parsed) : null;
	} catch {
		return null;
	}
}

export function deleteRoute(id: string): void {
	try {
		const file = getRouteFile(id);
		if (file.exists) file.delete();
	} catch {
		// Ignore errors
	}
}

export function deleteAllRoutes(): void {
	try {
		const dir = getRoutesDir();
		if (!dir.exists) return;
		const entries = dir.list();
		for (const entry of entries) {
			if (entry instanceof File && entry.name.endsWith('.json')) {
				entry.delete();
			}
		}
	} catch {
		// Ignore errors
	}
}
