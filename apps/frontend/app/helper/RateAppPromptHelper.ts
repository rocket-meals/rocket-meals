import { Platform } from 'react-native';
import { getValue, setValue } from '@/constants/AsyncStorageHelper';

// ─── Constants ───────────────────────────────────────────────────────

/** Minimum number of days between any two rating prompts (global). */
export const MIN_DAYS_BETWEEN_PROMPTS = 7;

/**
 * Maximum number of native in-app review dialogs allowed per 365-day
 * rolling window on iOS. Apple may silently ignore requests beyond
 * this limit, so we enforce it on our side as well.
 */
export const MAX_NATIVE_REVIEWS_PER_YEAR_IOS = 3;

/** Number of days in the rolling window for the iOS native limit. */
const NATIVE_REVIEW_ROLLING_WINDOW_DAYS = 365;

// ─── Types ───────────────────────────────────────────────────────────

export type DevicePlatform = 'ios' | 'android' | 'web';

/**
 * All inputs the pure decision function needs. Every value is
 * pre-fetched so the function itself has **no side-effects**.
 */
export interface RateAppPromptInput {
	/** Current device platform. */
	platform: DevicePlatform;
	/** Identifier of the feature that triggers the prompt. */
	featureId: string;
	/** Reference timestamp (usually `new Date()`). */
	now: Date;
	/**
	 * Date (YYYY-MM-DD) when the user was last asked to rate the app
	 * — regardless of which feature triggered it.
	 * `null` if the user was never asked.
	 */
	lastAskedDateGlobal: string | null;
	/**
	 * Date (YYYY-MM-DD) when the user was last asked **for this
	 * specific feature**. `null` if this feature was never asked.
	 */
	lastAskedDateForFeature: string | null;
	/**
	 * Array of date strings (YYYY-MM-DD) recording every time the
	 * native in-app review dialog was actually shown.
	 */
	nativeReviewDates: string[];
}

/**
 * The decision produced by {@link shouldShowRateAppPrompt}.
 */
export interface RateAppPromptResult {
	/** Whether a rating prompt should be shown. */
	shouldPrompt: boolean;
	/** Human-readable reason for the decision (useful for debugging). */
	reason: string;
	/**
	 * Whether the native in-app review dialog can be used.
	 * When `false` (e.g. iOS yearly limit reached, or web platform),
	 * the caller should fall back to a modal with store links.
	 */
	canUseNativeReview: boolean;
}

// ─── Pure decision logic ─────────────────────────────────────────────

/**
 * Calculate the whole number of days between a stored date string
 * (`YYYY-MM-DD`) and a reference `Date`.
 *
 * Both values are normalised to midnight UTC to avoid timezone drift.
 */
export function daysBetween(dateStr: string, now: Date): number {
	const past = new Date(dateStr + 'T00:00:00Z');
	const todayStr = now.toISOString().split('T')[0];
	const today = new Date(todayStr + 'T00:00:00Z');
	const diffMs = today.getTime() - past.getTime();
	return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Determine whether a rating prompt should be shown **right now**.
 *
 * This is a **pure function** — it performs no I/O and has no
 * side-effects. All required data is passed via `input`.
 *
 * Rules (evaluated in order):
 * 1. **Per-feature cooldown** – The same feature must not trigger a
 *    prompt within {@link MIN_DAYS_BETWEEN_PROMPTS} days.
 * 2. **Global cooldown** – No prompt at all within
 *    {@link MIN_DAYS_BETWEEN_PROMPTS} days of the previous one.
 * 3. **iOS native limit** – On iOS the native review dialog is capped
 *    at {@link MAX_NATIVE_REVIEWS_PER_YEAR_IOS} times per rolling
 *    365-day window. When exceeded the prompt can still be shown via
 *    a fallback modal, but `canUseNativeReview` will be `false`.
 */
export function shouldShowRateAppPrompt(input: RateAppPromptInput): RateAppPromptResult {
	const {
		platform,
		featureId,
		now,
		lastAskedDateGlobal,
		lastAskedDateForFeature,
		nativeReviewDates,
	} = input;

	// 1. Per-feature cooldown
	if (lastAskedDateForFeature !== null) {
		const daysSinceFeature = daysBetween(lastAskedDateForFeature, now);
		if (daysSinceFeature < MIN_DAYS_BETWEEN_PROMPTS) {
			return {
				shouldPrompt: false,
				canUseNativeReview: false,
				reason: `Feature "${featureId}" was asked ${daysSinceFeature} day(s) ago (minimum: ${MIN_DAYS_BETWEEN_PROMPTS}).`,
			};
		}
	}

	// 2. Global cooldown
	if (lastAskedDateGlobal !== null) {
		const daysSinceGlobal = daysBetween(lastAskedDateGlobal, now);
		if (daysSinceGlobal < MIN_DAYS_BETWEEN_PROMPTS) {
			return {
				shouldPrompt: false,
				canUseNativeReview: false,
				reason: `Last asked globally ${daysSinceGlobal} day(s) ago (minimum: ${MIN_DAYS_BETWEEN_PROMPTS}).`,
			};
		}
	}

	// 3. Native review availability
	let canUseNativeReview = platform !== 'web';

	if (platform === 'ios') {
		const windowStart = new Date(now);
		windowStart.setDate(windowStart.getDate() - NATIVE_REVIEW_ROLLING_WINDOW_DAYS);
		const windowStartStr = windowStart.toISOString().split('T')[0];

		const reviewsInWindow = nativeReviewDates.filter(d => d >= windowStartStr).length;
		if (reviewsInWindow >= MAX_NATIVE_REVIEWS_PER_YEAR_IOS) {
			canUseNativeReview = false;
			// Note: we still allow prompting via fallback modal.
		}
	}

	return {
		shouldPrompt: true,
		canUseNativeReview,
		reason: 'All checks passed.',
	};
}

// ─── AsyncStorage keys ───────────────────────────────────────────────

const KEY_FEATURE_PREFIX = 'rateAppAsked_';
const KEY_LAST_ASKED_DATE = 'rateAppLastAskedDate';
const KEY_NATIVE_REVIEW_DATES = 'rateAppNativeReviewDates';

// ─── Storage helpers ─────────────────────────────────────────────────

/**
 * Read the date (YYYY-MM-DD) when the user was last prompted for a
 * specific feature.
 *
 * Handles migration from the legacy format (boolean `true`) by
 * converting it to today's date on first read. After 7 days the
 * feature may trigger again.
 */
export async function getLastAskedDateForFeature(featureId: string): Promise<string | null> {
	const key = KEY_FEATURE_PREFIX + featureId;
	const value = await getValue(key);

	// New format: date string
	if (typeof value === 'string') return value;

	// Legacy format: boolean `true` (old code stored this permanently).
	// Migrate by writing today's date so the 7-day cooldown starts now.
	if (value === true) {
		const today = getTodayDateString();
		await setValue(key, today);
		return today;
	}

	return null;
}

/**
 * Read the global last-asked date (YYYY-MM-DD).
 */
export async function getLastAskedDateGlobal(): Promise<string | null> {
	const value = await getValue(KEY_LAST_ASKED_DATE);
	return typeof value === 'string' ? value : null;
}

/**
 * Read the list of dates when the native review dialog was shown.
 * Automatically prunes entries older than the rolling window.
 */
export async function getNativeReviewDates(): Promise<string[]> {
	const value = await getValue(KEY_NATIVE_REVIEW_DATES);
	if (!Array.isArray(value)) return [];

	// Prune dates older than the rolling window to keep storage small.
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - NATIVE_REVIEW_ROLLING_WINDOW_DAYS);
	const cutoffStr = cutoff.toISOString().split('T')[0];

	const pruned = value.filter((d: unknown) => typeof d === 'string' && d >= cutoffStr);

	// Persist the pruned list if anything was removed.
	if (pruned.length !== value.length) {
		await setValue(KEY_NATIVE_REVIEW_DATES, pruned);
	}

	return pruned;
}

/**
 * Record that a specific feature triggered a prompt today.
 */
export async function markFeatureAsked(featureId: string, dateStr: string): Promise<void> {
	await setValue(KEY_FEATURE_PREFIX + featureId, dateStr);
}

/**
 * Record the global last-asked date.
 */
export async function markAskedGlobally(dateStr: string): Promise<void> {
	await setValue(KEY_LAST_ASKED_DATE, dateStr);
}

/**
 * Append a date to the native-review-dates list (after successfully
 * showing the native dialog).
 */
export async function addNativeReviewDate(dateStr: string): Promise<void> {
	const existing = await getNativeReviewDates();
	existing.push(dateStr);
	await setValue(KEY_NATIVE_REVIEW_DATES, existing);
}

// ─── Utility ─────────────────────────────────────────────────────────

/**
 * Return the current device platform as a {@link DevicePlatform}.
 */
export function getDevicePlatform(): DevicePlatform {
	if (Platform.OS === 'ios') return 'ios';
	if (Platform.OS === 'android') return 'android';
	return 'web';
}

/**
 * Return `now` (or the current instant) formatted as `YYYY-MM-DD`.
 */
export function getTodayDateString(now?: Date): string {
	return (now ?? new Date()).toISOString().split('T')[0];
}
