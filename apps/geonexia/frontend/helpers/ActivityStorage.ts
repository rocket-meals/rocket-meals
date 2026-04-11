import { Directory, File, Paths } from 'expo-file-system';
import { SportType } from '../store/sportTypeSlice';

// ─── Shared types ─────────────────────────────────────────────────────────────

/**
 * A single hex tile entry in the computed ordered sequence of an activity,
 * storing the tile index and the average GPS speed observed while traversing it.
 */
export type ComputedHexTileEntry = {
	/** H3 cell index */
	hexId: string;
	/** Average speed in km/h across all GPS points recorded within this tile */
	avgSpeedKmh: number;
};

/**
 * Pre-computed data derived from an activity's raw GPS points.
 * Stored alongside the activity to avoid re-processing the full point array.
 *
 * These values are (re-)generated:
 *  1. Immediately after a recording is stopped.
 *  2. Whenever the map is rebuilt from activity history.
 */
export type ComputedActivityData = {
	/** Maximum speed in km/h observed during the activity */
	maxSpeedKmh: number;
	/** Minimum speed in km/h observed during the activity */
	minSpeedKmh: number;
	/** Average speed in km/h during the activity */
	avgSpeedKmh: number;
	/**
	 * Ordered sequence of hex tiles visited during the activity, each paired
	 * with the average GPS speed recorded while inside that tile.
	 * Mirrors `SavedActivity.hexTilesOrdered` but enriched with speed data.
	 */
	hexTilesVisited: ComputedHexTileEntry[];
	/**
	 * H3 cell indices that were enclosed by the completed route loop but were
	 * not physically walked on during the activity.
	 */
	enclosedHexTiles: string[];
};

export type RoutePoint = {
	lat: number;
	lng: number;
	altitude: number | null;
	speed: number | null;
	timestamp: number;
	/**
	 * True when this point was synthetically generated to fill a gap in the
	 * recorded GPS track (e.g. after a crash recovery), rather than being
	 * measured directly by the device's location hardware.
	 */
	interpolated?: boolean;
};

export type RunStats = {
	distanceKm: number;
	durationSeconds: number;
	paceMinPerKm: number;
	maxSpeedKmh: number;
	minSpeedKmh: number;
	avgSpeedKmh: number;
	medianSpeedKmh: number;
	kcal: number;
	steps: number;
	elevationGainM: number;
	elevationLossM: number;
	fluidNeedsMl: number;
};

export type SavedActivity = {
	id: string;
	startedAt: number;
	endedAt: number;
	routePoints: RoutePoint[];
	stats: RunStats;
	/** Sport type recorded for this activity. Optional for backward-compat with older saves. */
	sportType?: SportType;
	/** H3 resolution used during recording. Optional for backward-compat with older saves. */
	h3Resolution?: number;
	/** Number of hex tiles visited (walked on) during the activity. Optional for backward-compat. */
	visitedTileCount?: number;
	/** Number of hex tiles enclosed by the activity route. Optional for backward-compat. */
	enclosedTileCount?: number;
	/**
	 * Ordered sequence of H3 hex tile indices visited during the activity.
	 * This is a coarser representation of the route (not the raw GPS data).
	 * Each tile appears only once, in the order it was first entered.
	 * Optional for backward-compat with older saves.
	 */
	hexTilesOrdered?: string[];
	/**
	 * H3 cell indices that were enclosed by the completed route loop but were
	 * not physically walked on during the activity.
	 * Optional for backward-compat with older saves.
	 */
	enclosedHexTiles?: string[];
	/**
	 * @deprecated Use `enclosedHexTiles` instead.
	 * Kept for reading activities saved by older app versions.
	 */
	hexTilesEnclosed?: string[];
	/**
	 * ID of the saved route this activity was matched or assigned to.
	 * - `undefined` (field absent): the user has not yet been asked to assign a route.
	 * - `null`: the user explicitly chose not to assign any route.
	 * - `string`: the ID of the assigned `SavedRoute`.
	 */
	routeId?: string | null;
	/**
	 * Device battery level at the start of the activity (0–1, where 1 = 100%).
	 * Optional for backward-compat with older saves.
	 */
	batteryLevelStart?: number | null;
	/**
	 * Device battery level at the end of the activity (0–1, where 1 = 100%).
	 * Optional for backward-compat with older saves.
	 */
	batteryLevelEnd?: number | null;
	/**
	 * Pre-computed data derived from the raw GPS points and the route geometry.
	 * Generated when the activity is saved and when the map is rebuilt.
	 * Optional for backward-compat with older saves.
	 */
	computed?: ComputedActivityData;
};

// ─── Storage directories and files ───────────────────────────────────────────

function getActivitiesDir(): Directory {
	return new Directory(Paths.document, 'geonexia-activities');
}

function getActivityFile(id: string): File {
	return new File(getActivitiesDir(), id + '.json');
}

function getConsentFile(): File {
	return new File(Paths.document, 'geonexia-osm-consent.json');
}

// ─── Activity persistence ─────────────────────────────────────────────────────

export function saveActivity(activity: SavedActivity): void {
	const dir = getActivitiesDir();
	if (!dir.exists) {
		dir.create({ idempotent: true });
	}
	getActivityFile(activity.id).write(JSON.stringify(activity));
}

export async function loadActivities(): Promise<SavedActivity[]> {
	const dir = getActivitiesDir();
	if (!dir.exists) return [];

	let entries: (File | Directory)[];
	try {
		entries = dir.list();
	} catch {
		return [];
	}

	const activities: SavedActivity[] = [];
	for (const entry of entries) {
		if (!(entry instanceof File)) continue;
		if (!entry.name.endsWith('.json')) continue;
		try {
			const content = await entry.text();
			activities.push(JSON.parse(content) as SavedActivity);
		} catch {
			// Skip corrupted files
		}
	}
	// Sort by startedAt descending (newest first)
	activities.sort((a, b) => b.startedAt - a.startedAt);
	return activities;
}

export async function loadActivity(id: string): Promise<SavedActivity | null> {
	const file = getActivityFile(id);
	if (!file.exists) return null;
	try {
		const content = await file.text();
		return JSON.parse(content) as SavedActivity;
	} catch {
		return null;
	}
}

export function deleteActivity(id: string): void {
	try {
		const file = getActivityFile(id);
		if (file.exists) file.delete();
	} catch {
		// Ignore errors
	}
}

export function deleteAllActivities(): void {
	try {
		const dir = getActivitiesDir();
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

// ─── OSM consent persistence ──────────────────────────────────────────────────

export function saveOsmConsent(consented: boolean): void {
	try {
		getConsentFile().write(JSON.stringify({ consented }));
	} catch {
		// Ignore write errors
	}
}

export async function loadOsmConsent(): Promise<boolean> {
	try {
		const file = getConsentFile();
		if (!file.exists) return false;
		const content = await file.text();
		const data = JSON.parse(content) as { consented?: boolean };
		return data.consented === true;
	} catch {
		return false;
	}
}
