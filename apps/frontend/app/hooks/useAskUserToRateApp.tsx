import React, { useCallback } from 'react';
import { Platform, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';

import { getValue, setValue } from '@/constants/AsyncStorageHelper';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';

const ASYNC_STORAGE_KEY_RATE_APP_FEATURE_PREFIX = 'rateAppAsked_';
const ASYNC_STORAGE_KEY_RATE_APP_LAST_ASKED_DATE = 'rateAppLastAskedDate';

/**
 * Check whether the user has already been asked for this specific feature.
 */
async function wasAskedForFeature(featureId: string): Promise<boolean> {
	const value = await getValue(ASYNC_STORAGE_KEY_RATE_APP_FEATURE_PREFIX + featureId);
	return value === true;
}

/**
 * Mark a specific feature as "already asked".
 */
async function markFeatureAsked(featureId: string): Promise<void> {
	await setValue(ASYNC_STORAGE_KEY_RATE_APP_FEATURE_PREFIX + featureId, true);
}

/**
 * Get the date string (YYYY-MM-DD) when the user was last asked (any feature).
 */
async function getLastAskedDate(): Promise<string | null> {
	const value = await getValue(ASYNC_STORAGE_KEY_RATE_APP_LAST_ASKED_DATE);
	return typeof value === 'string' ? value : null;
}

/**
 * Store today's date as the last-asked date.
 */
async function markAskedToday(): Promise<void> {
	const today = new Date().toISOString().split('T')[0];
	await setValue(ASYNC_STORAGE_KEY_RATE_APP_LAST_ASKED_DATE, today);
}

/**
 * Returns true when the user should NOT be prompted right now because they
 * were already asked at some point today (regardless of feature).
 */
async function wasAlreadyAskedToday(): Promise<boolean> {
	const lastDate = await getLastAskedDate();
	if (!lastDate) return false;
	const today = new Date().toISOString().split('T')[0];
	return lastDate === today;
}

/**
 * Hook that asks the user to rate the app at a contextually relevant moment.
 *
 * On native platforms it first tries the native in-app review dialog
 * (expo-store-review). If that is not available — or if the platform is web —
 * a modal with the RateAppSettingsItem is shown instead.
 *
 * Persistence rules (via AsyncStorage):
 * - Each feature is tracked individually so the same trigger only fires once.
 * - A global "last asked date" ensures the user is prompted at most once per day
 *   even when multiple features would trigger.
 */
const useAskUserToRateApp = () => {
	const { show: showModal } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const { theme } = useTheme();

	/**
	 * Open a fallback modal that contains the RateAppSettingsItem (store links).
	 */
	const showRateAppModal = useCallback(() => {
		showModal({
			title: translate(TranslationKeys.rate_app),
			children: (
				<View style={{ paddingVertical: 16, gap: 12 }}>
					<Text
						style={{
							color: theme.screen.text,
							textAlign: 'center',
							paddingHorizontal: 24,
							fontSize: 15,
						}}
					>
						{translate(TranslationKeys.rate_app_enjoy_feature)}
					</Text>
					<RateAppSettingsItem />
				</View>
			),
		});
	}, [showModal, translate, theme.screen.text]);

	/**
	 * Main entry point. Call this with a unique `featureId` (e.g. "canteen_visits")
	 * when the user has a positive experience and should be asked to rate the app.
	 *
	 * The function is a no-op when:
	 * - The user was already asked for this feature, OR
	 * - The user was already asked today (any feature).
	 */
	const askUserToRateApp = useCallback(
		async (featureId: string) => {
			try {
				const [featureAlreadyAsked, alreadyAskedToday] = await Promise.all([
					wasAskedForFeature(featureId),
					wasAlreadyAskedToday(),
				]);

				if (featureAlreadyAsked || alreadyAskedToday) {
					return;
				}

				// Persist immediately so subsequent calls during the same session are
				// suppressed even before the user interacts with the prompt.
				await Promise.all([markFeatureAsked(featureId), markAskedToday()]);

				if (Platform.OS !== 'web') {
					try {
						const isAvailable = await StoreReview.isAvailableAsync();
						if (isAvailable) {
							await StoreReview.requestReview();
							return;
						}
					} catch (error) {
						console.log('useAskUserToRateApp: native review not available', error);
					}
				}

				// Fallback: show modal with store links
				showRateAppModal();
			} catch (error) {
				console.log('useAskUserToRateApp: error', error);
			}
		},
		[showRateAppModal]
	);

	return { askUserToRateApp };
};

export default useAskUserToRateApp;
