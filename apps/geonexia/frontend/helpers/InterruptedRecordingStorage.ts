import { File, Paths } from 'expo-file-system';
import type { RoutePoint } from './ActivityStorage';
import type { SportType } from '../store/sportTypeSlice';

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * Snapshot of an in-progress recording session, periodically persisted to disk
 * so that the recording can be recovered after an unexpected app crash.
 */
export type InterruptedRecordingSnapshot = {
	/** Unix timestamp (ms) when the recording was started */
	startedAt: number;
	/** Accumulated seconds before the most recent segment start */
	accumulatedSeconds: number;
	/** Unix timestamp (ms) of the current segment start */
	segmentStart: number;
	/** All GPS route points collected so far */
	routePoints: RoutePoint[];
	/** Ordered sequence of H3 hex tile indices visited so far */
	hexTilesOrdered: string[];
	/** The H3 resolution used during recording */
	h3Resolution: number;
	/** The sport type selected for this recording */
	sportType: SportType;
	/** ID of the pre-selected route (if any) */
	routeId?: string | null;
	/** Timestamp when this snapshot was written */
	savedAt: number;
};

// ─── Storage ──────────────────────────────────────────────────────────────────

function getSnapshotFile(): File {
	return new File(Paths.document, 'geonexia-interrupted-recording.json');
}

/**
 * Persist a recording snapshot to disk. Called periodically during recording.
 * Silently ignores write errors.
 */
export function saveRecordingSnapshot(snapshot: InterruptedRecordingSnapshot): void {
	try {
		getSnapshotFile().write(JSON.stringify(snapshot));
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
		const file = getSnapshotFile();
		if (!file.exists) return null;
		const content = await file.text();
		const data = JSON.parse(content) as InterruptedRecordingSnapshot;
		// Basic validation – a valid snapshot must at least have a startedAt timestamp
		if (typeof data.startedAt !== 'number' || data.startedAt <= 0) return null;
		if (!Array.isArray(data.routePoints)) return null;
		return data;
	} catch {
		return null;
	}
}

/**
 * Delete any saved recording snapshot. Called when a recording is stopped
 * cleanly so that no stale recovery prompt is shown on next launch.
 */
export function clearRecordingSnapshot(): void {
	try {
		const file = getSnapshotFile();
		if (file.exists) file.delete();
	} catch (err) {
		console.warn('[InterruptedRecordingStorage] Failed to clear snapshot:', err);
	}
}
