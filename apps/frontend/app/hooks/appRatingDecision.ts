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

/**
 * Backstop on top of the once-per-version rule. Matches the iOS limit of three prompts per
 * 365 days, so a burst of releases can never turn into a burst of prompts.
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
	lastAskedAppVersion: string | null;
	currentAppVersion: string;
	askedTimestamps: string[];
	negativeSignalAt: string | null;
	platform: AppRatingPlatform;
	now: Date;
};

/** The persisted slice the rules operate on. Matches `SettingsState['appRatingData']`. */
export type AppRatingStoredData = {
	score?: number;
	lastAskedAppVersion?: string | null;
	askedTimestamps?: string[];
	negativeSignalAt?: string | null;
} | null | undefined;

export type AppRatingDecisionReason =
	| 'unsupported_platform'
	| 'below_threshold'
	| 'negative_signal'
	| 'already_asked_this_version'
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

/**
 * Decides whether the *automatic* prompt (a celebration moment) may fire right now.
 *
 * The once-per-version rule is the primary safety net: if a release ever asks at the wrong
 * moment, or a bug makes a celebration fire repeatedly, the user still sees at most one
 * prompt until the next build. The yearly budget guards against the opposite failure —
 * many releases in quick succession.
 */
export function decideAppRating(input: AppRatingDecisionInput): AppRatingDecision {
	const { score, lastAskedAppVersion, currentAppVersion, askedTimestamps, negativeSignalAt, platform, now } = input;

	if (platform === 'web') {
		return { ask: false, reason: 'unsupported_platform' };
	}

	if (score < SCORE_THRESHOLD) {
		return { ask: false, reason: 'below_threshold' };
	}

	const negativeSignalMs = parseTimestamp(negativeSignalAt);
	if (negativeSignalMs !== null && daysBetween(now.getTime(), negativeSignalMs) < NEGATIVE_SIGNAL_BLOCK_DAYS) {
		return { ask: false, reason: 'negative_signal' };
	}

	if (lastAskedAppVersion !== null && lastAskedAppVersion === currentAppVersion) {
		return { ask: false, reason: 'already_asked_this_version' };
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
	currentAppVersion: string,
	now: Date = new Date()
): AppRatingDecision {
	return decideAppRating({
		score: data?.score ?? 0,
		lastAskedAppVersion: data?.lastAskedAppVersion ?? null,
		currentAppVersion,
		askedTimestamps: data?.askedTimestamps ?? [],
		negativeSignalAt: data?.negativeSignalAt ?? null,
		platform: getRatingPlatform(),
		now,
	});
}

/**
 * Whether the native dialog was already attempted on this build. The explicit entry point
 * uses this to send repeat taps straight to the store instead of into a likely no-op.
 */
export function wasAskedOnThisVersion(
	data: AppRatingStoredData,
	currentAppVersion: string
): boolean {
	const lastAsked = data?.lastAskedAppVersion ?? null;
	return lastAsked !== null && lastAsked === currentAppVersion;
}
