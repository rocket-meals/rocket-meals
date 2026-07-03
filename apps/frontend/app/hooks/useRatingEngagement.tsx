import { useCallback, useEffect, useRef, useState } from 'react';
import { getValue, setValue } from '@/constants/AsyncStorageHelper';

const ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE = 'ratingEngagementScore';

/** Engagement threshold – once the score reaches this value, the rating prompt can be triggered */
const RATING_ENGAGEMENT_THRESHOLD = 100;

/** Point values for various user actions */
export const RatingEngagementPoints = {
	FOOD_DETAILS_OPENED: 10,
	TAB_SWITCHED: 10,
	APP_OPENED: 5,
} as const;

const scoreRef: { current: number } = { current: 0 };

const useRatingEngagement = () => {
	const [score, setScore] = useState<number>(scoreRef.current);
	const [isLoaded, setIsLoaded] = useState(false);

	useEffect(() => {
		getValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE)
			.then((stored) => {
				const parsed = typeof stored === 'number' ? stored : 0;
				scoreRef.current = parsed;
				setScore(parsed);
			})
			.catch(() => {})
			.finally(() => setIsLoaded(true));
	}, []);

	const addPoints = useCallback((points: number) => {
		const updated = scoreRef.current + points;
		scoreRef.current = updated;
		setScore(updated);
		setValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE, updated).catch(() => {});
	}, []);

	const resetScore = useCallback(() => {
		scoreRef.current = 0;
		setScore(0);
		setValue(ASYNC_STORAGE_KEY_RATING_ENGAGEMENT_SCORE, 0).catch(() => {});
	}, []);

	const hasReachedThreshold = useCallback((): boolean => {
		return scoreRef.current >= RATING_ENGAGEMENT_THRESHOLD;
	}, []);

	return { score, isLoaded, addPoints, resetScore, hasReachedThreshold };
};

export default useRatingEngagement;
