import { useCallback, useEffect, useState } from 'react';
import { getValue, setValue, removeValue } from '@/constants/AsyncStorageHelper';

const ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE = 'ratingEngagementScore';

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
/** Track whether the initial load from AsyncStorage has completed */
let storageLoaded = false;
/** Queue of point additions that happened before storage was loaded */
let pendingPoints = 0;
/** Single initialization promise to prevent parallel loads */
let initPromise: Promise<void> | null = null;

function initFromStorage(): Promise<void> {
	if (initPromise) return initPromise;
	initPromise = getValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE)
		.then((stored) => {
			const parsed = typeof stored === 'number' ? stored : 0;
			const resolved = parsed + pendingPoints;
			pendingPoints = 0;
			scoreRef.current = resolved;
			storageLoaded = true;
			if (resolved !== parsed) {
				setValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE, resolved).catch(() => {});
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

	useEffect(() => {
		if (storageLoaded) {
			setScore(scoreRef.current);
			setIsLoaded(true);
			return;
		}
		initFromStorage().finally(() => {
			setScore(scoreRef.current);
			setIsLoaded(true);
		});
	}, []);

	const addPoints = useCallback((points: number) => {
		if (!storageLoaded) {
			// Storage hasn't loaded yet – queue the points
			pendingPoints += points;
			scoreRef.current += points;
			setScore(scoreRef.current);
			return;
		}
		const updated = scoreRef.current + points;
		scoreRef.current = updated;
		setScore(updated);
		setValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE, updated).catch(() => {});
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
	}, []);

	const hasReachedThreshold = useCallback((): boolean => {
		return scoreRef.current >= RATING_ENGAGEMENT_THRESHOLD;
	}, []);

	return { score, isLoaded, addPoints, resetScore, setScoreTo, hasReachedThreshold };
};

export default useRatingEngagement;

/**
 * Resets the engagement score in storage. Call during logout.
 */
export const resetRatingEngagementOnLogout = async () => {
	scoreRef.current = 0;
	pendingPoints = 0;
	storageLoaded = false;
	initPromise = null;
	await removeValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE);
};
