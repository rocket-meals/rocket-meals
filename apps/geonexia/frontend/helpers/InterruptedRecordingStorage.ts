import { getStorageItem, setStorageItem, removeStorageItem } from 'repo-depkit-common-ui';
import type { RecordingSessionFields } from './ActivityRouteSharedTypes';
import type { RoutePoint } from './ActivityStorage';
import type { SportType } from '../store/sportTypeSlice';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Snapshot of an in-progress recording session, periodically persisted to disk
 * so that the recording can be recovered after an unexpected app crash.
 *
 * Unlike `SavedActivity`, a snapshot is always written fresh while recording
 * is active, so `sportType`, `h3Resolution` and `hexTilesOrdered` are
 * narrowed back to required here (they are optional on
 * `RecordingSessionFields` for `SavedActivity`'s backward-compat needs).
 */
export type InterruptedRecordingSnapshot = RecordingSessionFields & {
	/** Accumulated seconds before the most recent segment start */
	accumulatedSeconds: number;
	/** Unix timestamp (ms) of the current segment start */
	segmentStart: number;
	/** Ordered sequence of H3 hex tile indices visited so far */
	hexTilesOrdered: string[];
	/** The H3 resolution used during recording */
	h3Resolution: number;
	/** The sport type selected for this recording */
	sportType: SportType;
	/** Timestamp when this snapshot was written */
	savedAt: number;
};

// ─── Storage ──────────────────────────────────────────────────────────────────

const SNAPSHOT_KEY = 'geonexia-interrupted-recording.json';

/**
 * Maximum age of a snapshot that still counts as an interrupted-but-ongoing
 * recording. Mirrors the 24h recovery window used by the record screen.
 */
export const SNAPSHOT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Persist a recording snapshot to disk. Called periodically during recording.
 * Silently ignores write errors.
 */
export async function saveRecordingSnapshot(snapshot: InterruptedRecordingSnapshot): Promise<void> {
	try {
		await setStorageItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
	} catch (err) {
		console.warn('[InterruptedRecordingStorage] Failed to save snapshot:', err);
	}
}

/**
 * Load a previously saved recording snapshot from disk. Returns null when
 * the file does not exist or cannot be parsed.
 */
export async function loadRecordingSnapshot(): Promise<InterruptedRecordingSnapshot | null> {
	try {
		const raw = await getStorageItem(SNAPSHOT_KEY);
		if (raw === null) return null;
		const data = JSON.parse(raw) as InterruptedRecordingSnapshot;
		// Basic validation – a valid snapshot must at least have a startedAt timestamp
		if (typeof data.startedAt !== 'number' || data.startedAt <= 0) return null;
		if (!Array.isArray(data.routePoints)) return null;
		return data;
	} catch {
		return null;
	}
}

/**
 * Append freshly received GPS points to the persisted recording snapshot.
 *
 * Used by the background location task when it fires in a JS runtime that has
 * no active recording in memory (e.g. the OS killed the app process
 * mid-recording and relaunched the runtime headlessly). The in-memory
 * recording state is gone, but the run keeps being captured on disk so the
 * crash recovery on the next app start has the complete GPS track instead of
 * only the points up to the last pre-kill snapshot.
 *
 * Returns true when a fresh snapshot existed and was updated, false when
 * there is no (fresh) snapshot – i.e. there is no ongoing recording and the
 * caller should stop the background location task.
 */
export async function appendPointsToRecordingSnapshot(points: RoutePoint[]): Promise<boolean> {
	if (points.length === 0) return false;
	const snapshot = await loadRecordingSnapshot();
	if (!snapshot) return false;
	const now = Date.now();
	// A recording that started more than the recovery window ago, or whose
	// snapshot has not been touched within it, is treated as ended – never
	// keep GPS alive indefinitely without an active recording.
	if (now - snapshot.startedAt > SNAPSHOT_MAX_AGE_MS) return false;
	if (now - snapshot.savedAt > SNAPSHOT_MAX_AGE_MS) return false;
	const lastTimestamp = snapshot.routePoints.at(-1)?.timestamp ?? 0;
	const freshPoints = points.filter((p) => p.timestamp > lastTimestamp);
	if (freshPoints.length > 0) {
		snapshot.routePoints = [...snapshot.routePoints, ...freshPoints];
		snapshot.savedAt = now;
		await saveRecordingSnapshot(snapshot);
	}
	return true;
}

/**
 * Delete any saved recording snapshot. Called when a recording is stopped
 * cleanly so that no stale recovery prompt is shown on next launch.
 */
export async function clearRecordingSnapshot(): Promise<void> {
	try {
		await removeStorageItem(SNAPSHOT_KEY);
	} catch (err) {
		console.warn('[InterruptedRecordingStorage] Failed to clear snapshot:', err);
	}
}
