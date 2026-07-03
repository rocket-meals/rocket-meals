import { useCallback, useEffect, useState } from 'react';
import { getValue, setValue, removeValue } from '@/constants/AsyncStorageHelper';

const ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE = 'ratingEngagementScore';
const ASYNC_STORAGE_KEY_RATING_SHOULD_ATTEMPT = 'ratingShouldAttempt';

/** Engagement threshold – once the score reaches this value, the rating prompt can be triggered */
const RATING_ENGAGEMENT_THRESHOLD = 100;

/** Point values for various user actions */
export const RatingEngagementPoints = {
	FOOD_DETAILS_OPENED: 10,
	TAB_SWITCHED: 10,
	APP_OPENED: 5,
} as const;

/** Module-level score that survives re-renders and is shared across hook instances */
const scoreRef: { current: number } = { current: 0 };
/** Flag indicating that rating should be attempted on next opportunity */
const shouldAttemptRef: { current: boolean } = { current: false };
/** Track whether the initial load from AsyncStorage has completed */
let storageLoaded = false;
/** Queue of point additions that happened before storage was loaded */
let pendingPoints = 0;
/** Single initialization promise to prevent parallel loads */
let initPromise: Promise<void> | null = null;
/** Listeners that want to be notified when shouldAttempt changes */
const shouldAttemptListeners: Set<(value: boolean) => void> = new Set();

function notifyShouldAttemptListeners(value: boolean) {
	shouldAttemptListeners.forEach((listener) => listener(value));
}

function initFromStorage(): Promise<void> {
	if (initPromise) return initPromise;
	initPromise = Promise.all([
		getValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE),
		getValue(ASYNC_STORAGE_KEY_RATING_SHOULD_ATTEMPT),
	])
		.then(([stored, storedFlag]) => {
			const parsed = typeof stored === 'number' ? stored : 0;
			const resolved = parsed + pendingPoints;
			pendingPoints = 0;
			scoreRef.current = resolved;
			shouldAttemptRef.current = storedFlag === true;
			storageLoaded = true;
			if (resolved !== parsed) {
				setValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE, resolved).catch(() => {});
			}
			// If pending points pushed us over the threshold, set the flag
			if (resolved >= RATING_ENGAGEMENT_THRESHOLD && !shouldAttemptRef.current) {
				shouldAttemptRef.current = true;
				setValue(ASYNC_STORAGE_KEY_RATING_SHOULD_ATTEMPT, true).catch(() => {});
				notifyShouldAttemptListeners(true);
			}
		})
		.catch(() => {
			storageLoaded = true;
			scoreRef.current = pendingPoints;
			pendingPoints = 0;
		});
	return initPromise;
}

const useRatingEngagement = () => {
	const [score, setScore] = useState<number>(scoreRef.current);
	const [isLoaded, setIsLoaded] = useState(storageLoaded);
	const [shouldAttemptRating, setShouldAttemptRating] = useState(shouldAttemptRef.current);

	useEffect(() => {
		if (storageLoaded) {
			setScore(scoreRef.current);
			setShouldAttemptRating(shouldAttemptRef.current);
			setIsLoaded(true);
			return;
		}
		initFromStorage().finally(() => {
			setScore(scoreRef.current);
			setShouldAttemptRating(shouldAttemptRef.current);
			setIsLoaded(true);
		});
	}, []);

	// Subscribe to shouldAttempt changes from other hook instances
	useEffect(() => {
		const listener = (value: boolean) => setShouldAttemptRating(value);
		shouldAttemptListeners.add(listener);
		return () => { shouldAttemptListeners.delete(listener); };
	}, []);

	const addPoints = useCallback((points: number) => {
		if (!storageLoaded) {
			// Storage hasn't loaded yet – queue the points
			pendingPoints += points;
			scoreRef.current += points;
			setScore(scoreRef.current);
			return;
		}
		const previousScore = scoreRef.current;
		const updated = previousScore + points;
		scoreRef.current = updated;
		setScore(updated);
		setValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE, updated).catch(() => {});

		// First time crossing threshold → set the flag
		if (previousScore < RATING_ENGAGEMENT_THRESHOLD && updated >= RATING_ENGAGEMENT_THRESHOLD && !shouldAttemptRef.current) {
			shouldAttemptRef.current = true;
			setShouldAttemptRating(true);
			setValue(ASYNC_STORAGE_KEY_RATING_SHOULD_ATTEMPT, true).catch(() => {});
			notifyShouldAttemptListeners(true);
		}
	}, []);

	/** Clear the shouldAttemptRating flag (call when rating is attempted) */
	const clearShouldAttemptRating = useCallback(() => {
		shouldAttemptRef.current = false;
		setShouldAttemptRating(false);
		setValue(ASYNC_STORAGE_KEY_RATING_SHOULD_ATTEMPT, false).catch(() => {});
		notifyShouldAttemptListeners(false);
	}, []);

	const resetScore = useCallback(() => {
		scoreRef.current = 0;
		pendingPoints = 0;
		setScore(0);
		setValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE, 0).catch(() => {});
	}, []);

	const setScoreTo = useCallback((value: number) => {
		scoreRef.current = value;
		pendingPoints = 0;
		setScore(value);
		setValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE, value).catch(() => {});
		// If manually setting above threshold, also set the flag
		if (value >= RATING_ENGAGEMENT_THRESHOLD && !shouldAttemptRef.current) {
			shouldAttemptRef.current = true;
			setShouldAttemptRating(true);
			setValue(ASYNC_STORAGE_KEY_RATING_SHOULD_ATTEMPT, true).catch(() => {});
			notifyShouldAttemptListeners(true);
		}
	}, []);

	const hasReachedThreshold = useCallback((): boolean => {
		return scoreRef.current >= RATING_ENGAGEMENT_THRESHOLD;
	}, []);

	return { score, isLoaded, addPoints, resetScore, setScoreTo, hasReachedThreshold, shouldAttemptRating, clearShouldAttemptRating };
};

export default useRatingEngagement;

/**
 * Resets the engagement score in storage. Call during logout.
 */
export const resetRatingEngagementOnLogout = async () => {
	scoreRef.current = 0;
	shouldAttemptRef.current = false;
	pendingPoints = 0;
	storageLoaded = false;
	initPromise = null;
	await removeValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE);
	await removeValue(ASYNC_STORAGE_KEY_RATING_SHOULD_ATTEMPT);
};
