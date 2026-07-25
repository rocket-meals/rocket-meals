/**
 * Decision layer for the native "rate this app" prompt.
 *
 * Kept free of React and of `expo-store-review` on purpose: the OS dialog itself is
 * untestable in most environments (it never appears in TestFlight, and in production it is
 * silently rate limited), so the only part we can meaningfully verify is *when* we decide
 * to ask. That decision lives here and is covered by unit tests.
 *
 * This module has no imports from the hook or component layer, so both `useAppRatingScore`
 * and `RateAppSettingsItem` can use it without creating a cycle between them.
 */
import { Platform } from 'react-native';

/** Points needed before the app is allowed to ask at all. */
export const SCORE_THRESHOLD = 100;

/** Minimum distance between two prompt attempts. */
export const COOLDOWN_DAYS = 120;

/**
 * Maximum attempts per rolling year. Matches the iOS limit of three prompts per 365 days,
 * so we never waste a slot that the OS would have swallowed anyway.
 */
export const MAX_ASKS_PER_YEAR = 3;

/** How long a bad experience (low food rating, support ticket, request error) blocks asking. */
export const NEGATIVE_SIGNAL_BLOCK_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type AppRatingPlatform = 'ios' | 'android' | 'web';

/** Maps the RN platform onto the three cases the rules distinguish. */
export function getRatingPlatform(): AppRatingPlatform {
	if (Platform.OS === 'ios') {
		return 'ios';
	}
	return Platform.OS === 'android' ? 'android' : 'web';
}

export type AppRatingDecisionInput = {
	score: number;
	lastAskedAt: string | null;
	askedTimestamps: string[];
	negativeSignalAt: string | null;
	platform: AppRatingPlatform;
	now: Date;
};

/** The persisted slice the rules operate on. Matches `SettingsState['appRatingData']`. */
export type AppRatingStoredData = {
	score?: number;
	lastAskedAt?: string | null;
	askedTimestamps?: string[];
	negativeSignalAt?: string | null;
} | null | undefined;

export type AppRatingDecisionReason =
	| 'unsupported_platform'
	| 'below_threshold'
	| 'negative_signal'
	| 'cooldown'
	| 'yearly_budget';

export type AppRatingDecision =
	| { ask: true }
	| { ask: false; reason: AppRatingDecisionReason };

/**
 * Parses an ISO timestamp, returning null for missing or malformed values so that a
 * corrupted persisted state can never block asking forever.
 */
function parseTimestamp(value: string | null | undefined): number | null {
	if (!value) {
		return null;
	}
	const parsed = new Date(value).getTime();
	return Number.isNaN(parsed) ? null : parsed;
}

function daysBetween(laterMs: number, earlierMs: number): number {
	return (laterMs - earlierMs) / MS_PER_DAY;
}

/**
 * Drops attempts older than a year. Used both for the budget check and to keep the
 * persisted list from growing without bound.
 */
export function pruneAskedTimestamps(askedTimestamps: string[], now: Date): string[] {
	const nowMs = now.getTime();
	return askedTimestamps.filter((timestamp) => {
		const parsed = parseTimestamp(timestamp);
		if (parsed === null) {
			return false;
		}
		return daysBetween(nowMs, parsed) < 365;
	});
}

export function decideAppRating(input: AppRatingDecisionInput): AppRatingDecision {
	const { score, lastAskedAt, askedTimestamps, negativeSignalAt, platform, now } = input;
	const nowMs = now.getTime();

	if (platform === 'web') {
		return { ask: false, reason: 'unsupported_platform' };
	}

	if (score < SCORE_THRESHOLD) {
		return { ask: false, reason: 'below_threshold' };
	}

	const negativeSignalMs = parseTimestamp(negativeSignalAt);
	if (negativeSignalMs !== null && daysBetween(nowMs, negativeSignalMs) < NEGATIVE_SIGNAL_BLOCK_DAYS) {
		return { ask: false, reason: 'negative_signal' };
	}

	const lastAskedMs = parseTimestamp(lastAskedAt);
	if (lastAskedMs !== null && daysBetween(nowMs, lastAskedMs) < COOLDOWN_DAYS) {
		return { ask: false, reason: 'cooldown' };
	}

	if (pruneAskedTimestamps(askedTimestamps, now).length >= MAX_ASKS_PER_YEAR) {
		return { ask: false, reason: 'yearly_budget' };
	}

	return { ask: true };
}

/**
 * Convenience wrapper that evaluates the rules against the persisted Redux slice and the
 * current platform/time. Callers that only want to display or check the decision use this.
 */
export function decideAppRatingFromStoredData(
	data: AppRatingStoredData,
	now: Date = new Date()
): AppRatingDecision {
	return decideAppRating({
		score: data?.score ?? 0,
		lastAskedAt: data?.lastAskedAt ?? null,
		askedTimestamps: data?.askedTimestamps ?? [],
		negativeSignalAt: data?.negativeSignalAt ?? null,
		platform: getRatingPlatform(),
		now,
	});
}

/** Days left until the cooldown expires, or 0 when it already has. Debug display only. */
export function daysUntilCooldownOver(lastAskedAt: string | null, now: Date): number {
	const lastAskedMs = parseTimestamp(lastAskedAt);
	if (lastAskedMs === null) {
		return 0;
	}
	const remaining = COOLDOWN_DAYS - daysBetween(now.getTime(), lastAskedMs);
	return remaining > 0 ? Math.ceil(remaining) : 0;
}
