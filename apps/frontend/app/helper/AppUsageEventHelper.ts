import { Platform } from 'react-native';
import * as Crypto from 'expo-crypto';

import { AppUsageEvents } from '@/redux/actions/AppUsageEvents/AppUsageEvents';
import { getVersion } from '@/config';

/**
 * Fire-and-forget logging into `app_usage_events`.
 *
 * This is the first producer for that collection, so the naming below defines the
 * convention: `event_type` groups a feature area, `event_name` is the concrete thing that
 * happened. Both are snake_case, matching the DB-facing strings used elsewhere in the repo.
 */
export enum AppUsageEventType {
	APP_RATING = 'app_rating',
}

/**
 * Only outcomes that represent something actually happening are logged. Skips are not: the
 * celebration path is evaluated on every screen focus, so logging "score too low" or
 * "already asked on this build" would mean one write per focus.
 */
export enum AppUsageEventName {
	/** Logged immediately before the native store review dialog is requested. */
	STORE_REVIEW_REQUESTED = 'store_review_requested',
	/** Logged when the user was sent to the store review page instead. */
	STORE_REVIEW_PAGE_OPENED = 'store_review_page_opened',
}

/**
 * Identifies one app run. Regenerated on every cold start, deliberately not persisted: the
 * `session_id` column is indexed so events of a single run can be grouped in Directus, and a
 * stable per-install id would defeat that. It is a random value with no link to the user.
 */
const SESSION_ID = Crypto.randomUUID();

let sequenceNumber = 0;

export type LogAppUsageEventArgs = {
	eventType: AppUsageEventType;
	eventName: AppUsageEventName;
	screenName?: string;
	payload?: Record<string, unknown>;
};

/**
 * Sends one event. Never throws and is never awaited by callers on a user-visible path:
 * `CollectionHelper.handleRequest` re-throws on failure, and a network hiccup must not be
 * able to suppress a rating prompt or delay it behind a request.
 */
export function logAppUsageEvent({ eventType, eventName, screenName, payload }: LogAppUsageEventArgs): void {
	sequenceNumber += 1;

	const event = {
		event_type: eventType,
		event_name: eventName,
		screen_name: screenName ?? null,
		payload: payload ?? null,
		platform: Platform.OS,
		app_version: getVersion(),
		client_timestamp: new Date().toISOString(),
		session_id: SESSION_ID,
		sequence_number: sequenceNumber,
	};

	new AppUsageEvents()
		.createEvent(event)
		.catch((error) => {
			console.log('logAppUsageEvent: failed to log ' + eventName, error);
		});
}

/** Exposed for the debug screen so the current session can be correlated in Directus. */
export function getAppUsageSessionId(): string {
	return SESSION_ID;
}
