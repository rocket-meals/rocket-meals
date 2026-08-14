import { getStorageItem, setStorageItem, removeStorageItem } from 'repo-depkit-common-ui';
import type { RedLineRouteFields, RecordingSessionFields } from './ActivityRouteSharedTypes';
import type { GpsRoutePoint, SpeedStats as CommonSpeedStats } from 'repo-depkit-common';

// ─── Weather & Rating types ───────────────────────────────────────────────────

/**
 * Possible weather condition types for an activity.
 */
export type WeatherType =
	| 'sunny'
	| 'partly_cloudy'
	| 'cloudy'
	| 'rainy'
	| 'snowy'
	| 'stormy'
	| 'foggy'
	| 'windy';

export const WEATHER_TYPES: { type: WeatherType; label: string; icon: string }[] = [
	{ type: 'sunny', label: 'Sonnig', icon: 'wb-sunny' },
	{ type: 'partly_cloudy', label: 'Teilweise bewölkt', icon: 'cloud-queue' },
	{ type: 'cloudy', label: 'Bewölkt', icon: 'cloud' },
	{ type: 'rainy', label: 'Regnerisch', icon: 'water-drop' },
	{ type: 'snowy', label: 'Schnee', icon: 'ac-unit' },
	{ type: 'stormy', label: 'Stürmisch', icon: 'thunderstorm' },
	{ type: 'foggy', label: 'Nebelig', icon: 'blur-on' },
	{ type: 'windy', label: 'Windig', icon: 'air' },
];

/** Rating value 1–5 stars */
export type ActivityRating = 1 | 2 | 3 | 4 | 5;

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
 * Min/max/average speed observed over some span of GPS points.
 * Shared by `ComputedActivityData` and `RunStats`, which both track the same
 * three speed metrics for an activity. The shape lives in repo-depkit-common
 * because the rocket-meals jogging overlay tracks the same metrics.
 */
export type SpeedStats = CommonSpeedStats;

/**
 * Pre-computed data derived from an activity's raw GPS points.
 * Stored alongside the activity to avoid re-processing the full point array.
 *
 * These values are (re-)generated:
 *  1. Immediately after a recording is stopped.
 *  2. Whenever the map is rebuilt from activity history.
 */
export type ComputedActivityData = SpeedStats & {
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

// The base point shape lives in repo-depkit-common because the rocket-meals
// jogging overlay records the same GPS track points.
export type RoutePoint = GpsRoutePoint & {
	/**
	 * True when this point was synthetically generated to fill a gap in the
	 * recorded GPS track (e.g. after a crash recovery), rather than being
	 * measured directly by the device's location hardware.
	 */
	interpolated?: boolean;
};

export type RunStats = SpeedStats & {
	distanceKm: number;
	durationSeconds: number;
	paceMinPerKm: number;
	medianSpeedKmh: number;
	/**
	 * Lower/upper quartile of the (windowed) speed samples, in km/h. Optional because
	 * activities saved before the speed boxplot was introduced don't have them yet;
	 * they get backfilled on next load, see the migration in activities/[id].tsx.
	 */
	q1SpeedKmh?: number;
	q3SpeedKmh?: number;
	kcal: number;
	steps: number;
	elevationGainM: number;
	elevationLossM: number;
	fluidNeedsMl: number;
};

export type SavedActivity = RedLineRouteFields &
	RecordingSessionFields & {
		endedAt: number;
		stats: RunStats;
		/** Number of hex tiles visited (walked on) during the activity. Optional for backward-compat. */
		visitedTileCount?: number;
		/** Number of hex tiles enclosed by the activity route. Optional for backward-compat. */
		enclosedTileCount?: number;
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
		/**
		 * Weather temperature in °C at the time of the activity.
		 * Optional – user can set this manually after the activity.
		 */
		weatherTemperature?: number | null;
		/**
		 * Weather condition type during the activity.
		 * Optional – user can set this manually after the activity.
		 */
		weatherType?: WeatherType | null;
		/**
		 * User rating of the activity (1–5 stars).
		 * Optional – user can rate the activity afterwards.
		 */
		rating?: ActivityRating | null;
		/**
		 * Whether this activity was created manually (duration-only, no GPS data).
		 * Manual activities only have a duration and are assigned to an existing route.
		 */
		isManual?: boolean;
	};

/**
 * Return the effective set of enclosed hex tile IDs for an activity, preferring
 * the current `enclosedHexTiles` field and falling back to the legacy
 * `hexTilesEnclosed` field for activities saved by older app versions.
 */
export function getEffectiveEnclosedHexTiles(activity: { enclosedHexTiles?: string[]; hexTilesEnclosed?: string[] }): string[] {
	return activity.enclosedHexTiles ?? activity.hexTilesEnclosed ?? [];
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

// One key per activity, plus an index key listing which activity IDs exist
// (mirrors the old one-file-per-activity directory layout, since the sqlite kv
// store has no directory-listing equivalent).
const ACTIVITIES_INDEX_KEY = 'geonexia-activities-index.json';
const CONSENT_KEY = 'geonexia-osm-consent.json';

function getActivityKey(id: string): string {
	return `geonexia-activity-${id}.json`;
}

async function getActivityIds(): Promise<string[]> {
	try {
		const raw = await getStorageItem(ACTIVITIES_INDEX_KEY);
		if (raw === null) return [];
		const ids = JSON.parse(raw);
		return Array.isArray(ids) ? ids : [];
	} catch {
		return [];
	}
}

// ─── Activity persistence ─────────────────────────────────────────────────────

export async function saveActivity(activity: SavedActivity): Promise<void> {
	await setStorageItem(getActivityKey(activity.id), JSON.stringify(activity));
	const ids = await getActivityIds();
	if (!ids.includes(activity.id)) {
		ids.push(activity.id);
		await setStorageItem(ACTIVITIES_INDEX_KEY, JSON.stringify(ids));
	}
}

export async function loadActivities(): Promise<SavedActivity[]> {
	const ids = await getActivityIds();
	const activities: SavedActivity[] = [];
	for (const id of ids) {
		try {
			const raw = await getStorageItem(getActivityKey(id));
			if (raw === null) continue;
			activities.push(JSON.parse(raw) as SavedActivity);
		} catch {
			// Skip corrupted entries
		}
	}
	// Sort by startedAt descending (newest first)
	activities.sort((a, b) => b.startedAt - a.startedAt);
	return activities;
}

export async function loadActivity(id: string): Promise<SavedActivity | null> {
	try {
		const raw = await getStorageItem(getActivityKey(id));
		if (raw === null) return null;
		return JSON.parse(raw) as SavedActivity;
	} catch {
		return null;
	}
}

export async function deleteActivity(id: string): Promise<void> {
	try {
		await removeStorageItem(getActivityKey(id));
		const ids = await getActivityIds();
		const filtered = ids.filter((existingId) => existingId !== id);
		if (filtered.length !== ids.length) {
			await setStorageItem(ACTIVITIES_INDEX_KEY, JSON.stringify(filtered));
		}
	} catch {
		// Ignore errors
	}
}

export async function deleteAllActivities(): Promise<void> {
	try {
		const ids = await getActivityIds();
		for (const id of ids) {
			await removeStorageItem(getActivityKey(id));
		}
		await removeStorageItem(ACTIVITIES_INDEX_KEY);
	} catch {
		// Ignore errors
	}
}

// ─── OSM consent persistence ──────────────────────────────────────────────────

export async function saveOsmConsent(consented: boolean): Promise<void> {
	try {
		await setStorageItem(CONSENT_KEY, JSON.stringify({ consented }));
	} catch {
		// Ignore write errors
	}
}

export async function loadOsmConsent(): Promise<boolean> {
	try {
		const raw = await getStorageItem(CONSENT_KEY);
		if (raw === null) return false;
		const data = JSON.parse(raw) as { consented?: boolean };
		return data.consented === true;
	} catch {
		return false;
	}
}
