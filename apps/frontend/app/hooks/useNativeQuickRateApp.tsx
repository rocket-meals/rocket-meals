import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as StoreReview from 'expo-store-review';

import { getValue, setValue } from '@/constants/AsyncStorageHelper';

const ASYNC_STORAGE_KEY_WAS_ASKED_FOR_RATING = 'wasAskedForRating';
const ASYNC_STORAGE_KEY_LAST_NATIVE_REVIEW_DATE = 'lastNativeReviewDate';

/** Minimum days between native review prompts. */
const NATIVE_REVIEW_COOLDOWN_DAYS = 90;

/**
 * Hook that wraps native StoreReview logic and tracks whether the user
 * has already been asked for a rating via AsyncStorage.
 *
 * Uses a cooldown period instead of a permanent one-time flag so the
 * native review dialog can be shown again after enough time has passed.
 *
 * Reusable by both RateAppSettingsItem and the collectible-event
 * congratulations modal.
 */
const useNativeQuickRateApp = () => {
	const [wasAskedForRating, setWasAskedForRating] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		(async () => {
			try {
				const lastDateStr = await getValue(ASYNC_STORAGE_KEY_LAST_NATIVE_REVIEW_DATE);
				if (lastDateStr && typeof lastDateStr === 'string') {
					const daysSince = Math.floor(
						(Date.now() - new Date(lastDateStr).getTime()) / (1000 * 60 * 60 * 24)
					);
					if (daysSince < NATIVE_REVIEW_COOLDOWN_DAYS) {
						setWasAskedForRating(true);
					}
				} else {
					// Respect the legacy boolean flag for users who were already asked
					const legacyValue = await getValue(ASYNC_STORAGE_KEY_WAS_ASKED_FOR_RATING);
					if (legacyValue === true) {
						setWasAskedForRating(true);
					}
				}
			} catch {
				// Ignore read errors
			} finally {
				setIsLoading(false);
			}
		})();
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
				await setValue(ASYNC_STORAGE_KEY_LAST_NATIVE_REVIEW_DATE, new Date().toISOString());
				return true;
			}
		} catch (error) {
			console.log('useNativeQuickRateApp: error requesting review', error);
		}

		return false;
	}, [wasAskedForRating]);

	return { wasAskedForRating, isLoading, requestNativeReview };
};

export default useNativeQuickRateApp;
