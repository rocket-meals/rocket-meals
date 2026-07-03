import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';

import { getValue, setValue } from '@/constants/AsyncStorageHelper';

const ASYNC_STORAGE_KEY_WAS_ASKED_FOR_RATING = 'wasAskedForRating';
const ASYNC_STORAGE_KEY_LAST_ASKED_FOR_RATING_AT = 'lastAskedForRatingAt';

/** Minimum cooldown between rating prompts (in milliseconds) – 7 days */
const RATING_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Hook that wraps native StoreReview logic and tracks whether the user
 * has already been asked for a rating via AsyncStorage.
 *
 * Reusable by both RateAppSettingsItem and the collectible-event
 * congratulations modal.
 */
const useNativeQuickRateApp = () => {
	const [wasAskedForRating, setWasAskedForRating] = useState(false);
	const [lastAskedForRatingAt, setLastAskedForRatingAt] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		Promise.all([
			getValue(ASYNC_STORAGE_KEY_WAS_ASKED_FOR_RATING),
			getValue(ASYNC_STORAGE_KEY_LAST_ASKED_FOR_RATING_AT),
		])
			.then(([wasAsked, lastAskedAt]) => {
				if (wasAsked === true) {
					setWasAskedForRating(true);
				}
				if (lastAskedAt) {
					setLastAskedForRatingAt(lastAskedAt);
				}
			})
			.catch(() => {})
			.finally(() => setIsLoading(false));
	}, []);

	/**
	 * Returns whether the user can be asked for a rating based on cooldown.
	 * The user can be asked if they were never asked, or if the cooldown has elapsed.
	 */
	const canBeAskedForRating = useCallback((): boolean => {
		if (!lastAskedForRatingAt) {
			return true;
		}
		const lastAskedTime = new Date(lastAskedForRatingAt).getTime();
		const now = Date.now();
		return now - lastAskedTime >= RATING_COOLDOWN_MS;
	}, [lastAskedForRatingAt]);

	/**
	 * Updates the last-asked timestamp in state and AsyncStorage.
	 */
	const updateLastAskedTimestamp = useCallback(async () => {
		const now = new Date().toISOString();
		setLastAskedForRatingAt(now);
		await setValue(ASYNC_STORAGE_KEY_LAST_ASKED_FOR_RATING_AT, now);
	}, []);

	const requestNativeReview = useCallback(async (): Promise<boolean> => {
		if (Platform.OS === 'web') {
			return false;
		}

		if (wasAskedForRating) {
			return false;
		}

		try {
			const isAvailable = await StoreReview.isAvailableAsync();
			if (isAvailable) {
				await StoreReview.requestReview();
				setWasAskedForRating(true);
				await setValue(ASYNC_STORAGE_KEY_WAS_ASKED_FOR_RATING, true);
				await updateLastAskedTimestamp();
				return true;
			}
		} catch (error) {
			console.log('useNativeQuickRateApp: error requesting review', error);
		}

		return false;
	}, [wasAskedForRating, updateLastAskedTimestamp]);

	return {
		wasAskedForRating,
		lastAskedForRatingAt,
		isLoading,
		canBeAskedForRating,
		updateLastAskedTimestamp,
		requestNativeReview,
	};
};

export default useNativeQuickRateApp;
