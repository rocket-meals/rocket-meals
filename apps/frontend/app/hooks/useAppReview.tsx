import { useCallback } from 'react';
import * as StoreReview from 'expo-store-review';
import { useDispatch, useSelector } from 'react-redux';

import { RootState } from '@/redux/reducer';
import { SET_APP_RATING_DATA } from '@/redux/Types/types';
import { getVersion } from '@/config';
import { CommonSystemActionHelper } from '@/helper/SystemActionHelper';
import { buildReviewUrl } from '@/helper/ReviewLinkHelper';
import {
	AppUsageEventName,
	AppUsageEventType,
	logAppUsageEvent,
} from '@/helper/AppUsageEventHelper';
import {
	decideAppRatingFromStoredData,
	getRatingPlatform,
	pruneAskedTimestamps,
	wasAskedOnThisVersion,
} from '@/hooks/appRatingDecision';

/**
 * Why the app is asking. This is the only knob callers need.
 */
export enum AppReviewTrigger {
	/**
	 * The user asked for it — a "rate this app" row inside a popup event, an info modal or
	 * the settings. Something visible must always happen, so when the native dialog is not
	 * possible the store review page is opened instead.
	 */
	EXPLICIT = 'explicit',
	/**
	 * A celebration moment (collectible event, ranking) offers a good opportunity. Fully
	 * rule-gated and silent: when the native dialog is not possible, nothing happens at all.
	 * Never sends the user to the store, because they did not ask to go there.
	 */
	CELEBRATION = 'celebration',
}

export type AppReviewOutcome =
	/** The native dialog was requested. The OS may still have suppressed it — see below. */
	| { kind: 'native_requested' }
	/** The store review page was opened in the browser / store app. */
	| { kind: 'store_opened'; url: string }
	/** Nothing happened, with the reason the rules or the platform gave. */
	| { kind: 'skipped'; reason: string };

/**
 * The single entry point for everything app-rating related.
 *
 * Two things about the native API shape the design and cannot be worked around:
 *
 * 1. `requestReview()` resolves whether or not the dialog appeared — there is no return
 *    value and no callback. The app can never know if the user saw or used it. That is why
 *    the `app_usage_events` record is written right *before* the call: it counts how many
 *    users were offered a review, which is the only number that is actually knowable.
 * 2. `isAvailableAsync()` reports false on iOS in TestFlight and on Android outside of a
 *    Play install, but it cannot see the per-user quota. So a request can still be a no-op
 *    even when everything looks available.
 */
const useAppReview = () => {
	const dispatch = useDispatch();
	const { appSettings, appRatingData } = useSelector((state: RootState) => state.settings);

	/**
	 * Opens the review page of one store. `store` defaults to the running platform; it is a
	 * parameter because on web there is no single correct store — a web caller has to say
	 * which one it means (or render one row per store, as `RateAppSettingsItem` does).
	 */
	const openStoreReviewPage = useCallback(
		(store?: 'ios' | 'android', screenName?: string): AppReviewOutcome => {
			const platform = getRatingPlatform();
			const target = store ?? (platform === 'android' ? 'android' : 'ios');
			const configuredUrl =
				target === 'android' ? appSettings?.app_stores_url_to_google : appSettings?.app_stores_url_to_apple;
			const url = buildReviewUrl(target, configuredUrl);

			if (!url) {
				return { kind: 'skipped', reason: 'no_store_url' };
			}

			logAppUsageEvent({
				eventType: AppUsageEventType.APP_RATING,
				eventName: AppUsageEventName.STORE_REVIEW_PAGE_OPENED,
				screenName,
				payload: { platform, store: target },
			});
			CommonSystemActionHelper.openExternalURL(url, true);
			return { kind: 'store_opened', url };
		},
		[appSettings?.app_stores_url_to_apple, appSettings?.app_stores_url_to_google]
	);

	/**
	 * Records the attempt so the once-per-build cap holds, and resets the score so the points
	 * have to be earned again before the next build may ask.
	 *
	 * Shared by both triggers on purpose: someone who just rated from the explicit row should
	 * not be prompted again by a celebration on the same build. It also means a second tap on
	 * the row goes to the store instead of into a dialog the OS has likely already used up.
	 */
	const recordAttempt = useCallback(() => {
		const now = new Date();
		const previous = appRatingData?.askedTimestamps ?? [];
		dispatch({
			type: SET_APP_RATING_DATA,
			payload: {
				score: 0,
				lastAskedAt: now.toISOString(),
				lastAskedAppVersion: getVersion(),
				askedTimestamps: [...pruneAskedTimestamps(previous, now), now.toISOString()],
			},
		});
	}, [appRatingData?.askedTimestamps, dispatch]);

	const requestNativeDialog = useCallback(
		async (screenName?: string): Promise<AppReviewOutcome> => {
			let isAvailable = false;
			try {
				isAvailable = await StoreReview.isAvailableAsync();
			} catch (error) {
				console.log('useAppReview: isAvailableAsync failed', error);
			}

			if (!isAvailable) {
				return { kind: 'skipped', reason: 'native_unavailable' };
			}

			// Logged before the request, not after: this is the point at which the app has
			// decided to offer a review, and it is the last moment we know anything at all.
			logAppUsageEvent({
				eventType: AppUsageEventType.APP_RATING,
				eventName: AppUsageEventName.STORE_REVIEW_REQUESTED,
				screenName,
				payload: { platform: getRatingPlatform(), appVersion: getVersion() },
			});

			try {
				await StoreReview.requestReview();
			} catch (error) {
				console.log('useAppReview: requestReview failed', error);
				return { kind: 'skipped', reason: 'native_error' };
			}

			recordAttempt();
			return { kind: 'native_requested' };
		},
		[recordAttempt]
	);

	/**
	 * Call this — and only this — whenever the app wants a rating.
	 *
	 * @example
	 * // A "rate this app" row in a popup event or info modal:
	 * await requestAppReview(AppReviewTrigger.EXPLICIT, { screenName: 'popup-event' });
	 *
	 * // After a celebration, silent when not possible:
	 * await requestAppReview(AppReviewTrigger.CELEBRATION, { screenName: 'collectible-event' });
	 */
	const requestAppReview = useCallback(
		async (
			trigger: AppReviewTrigger,
			options?: { screenName?: string; store?: 'ios' | 'android' }
		): Promise<AppReviewOutcome> => {
			const { screenName, store } = options ?? {};
			const currentVersion = getVersion();

			if (trigger === AppReviewTrigger.EXPLICIT) {
				// The user tapped something, so the score threshold and celebration rules do
				// not apply. Only the once-per-build cap does, so a second tap goes to the
				// store rather than into a dialog the OS is likely to swallow silently.
				if (getRatingPlatform() === 'web' || wasAskedOnThisVersion(appRatingData, currentVersion)) {
					return openStoreReviewPage(store, screenName);
				}

				const outcome = await requestNativeDialog(screenName);
				return outcome.kind === 'native_requested' ? outcome : openStoreReviewPage(store, screenName);
			}

			// Deliberately not logged as a usage event. This runs on every screen focus, so
			// the overwhelmingly common outcomes ("score too low", "already asked on this
			// build") would flood the collection with one write per focus. Only the two
			// events that represent something actually happening are logged.
			const decision = decideAppRatingFromStoredData(appRatingData, currentVersion);
			if (!decision.ask) {
				return { kind: 'skipped', reason: decision.reason };
			}

			return requestNativeDialog(screenName);
		},
		[appRatingData, openStoreReviewPage, requestNativeDialog]
	);

	return { requestAppReview };
};

export default useAppReview;
