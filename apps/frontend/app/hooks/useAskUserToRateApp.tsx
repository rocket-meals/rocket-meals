import React, { useCallback } from 'react';
import { Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';
import {
	shouldShowRateAppPrompt,
	getLastAskedDateForFeature,
	getLastAskedDateGlobal,
	getNativeReviewDates,
	markFeatureAsked,
	markAskedGlobally,
	addNativeReviewDate,
	getDevicePlatform,
	getTodayDateString,
} from '@/helper/RateAppPromptHelper';

/**
 * Hook that asks the user to rate the app at a contextually relevant moment.
 *
 * On native platforms it first tries the native in-app review dialog
 * (expo-store-review). If that is not available — or if the platform is web —
 * a modal with the {@link RateAppSettingsItem} (store links) is shown instead.
 *
 * All gating logic is delegated to the **pure** function
 * {@link shouldShowRateAppPrompt} in `RateAppPromptHelper.ts`.
 *
 * Persistence rules (via AsyncStorage):
 * - Each feature records the date it last triggered a prompt so the
 *   same feature does not re-trigger within 7 days.
 * - A global last-asked date ensures no prompt at all within 7 days of
 *   the previous one, regardless of which feature triggers.
 * - On iOS, the dates when the native dialog was shown are tracked so
 *   we stay within Apple's 3-per-year guideline.
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
	 * Main entry point. Call this with a unique `featureId`
	 * (e.g. `"canteen_visits"`) when the user has a positive experience
	 * and should be asked to rate the app.
	 *
	 * The function is a no-op when the pure logic in
	 * {@link shouldShowRateAppPrompt} decides the prompt should not be
	 * shown (cooldown not elapsed, iOS limit reached, etc.).
	 */
	const askUserToRateApp = useCallback(
		async (featureId: string) => {
			try {
				const now = new Date();
				const todayStr = getTodayDateString(now);
				const platform = getDevicePlatform();

				// Fetch all persisted state in parallel.
				const [lastAskedDateGlobal, lastAskedDateForFeature, nativeReviewDates] =
					await Promise.all([
						getLastAskedDateGlobal(),
						getLastAskedDateForFeature(featureId),
						getNativeReviewDates(),
					]);

				// ── Pure decision ────────────────────────────────────
				const result = shouldShowRateAppPrompt({
					platform,
					featureId,
					now,
					lastAskedDateGlobal,
					lastAskedDateForFeature,
					nativeReviewDates,
				});

				if (!result.shouldPrompt) {
					return;
				}

				// Persist immediately so subsequent calls during the
				// same session are suppressed.
				await Promise.all([
					markFeatureAsked(featureId, todayStr),
					markAskedGlobally(todayStr),
				]);

				// ── Try native in-app review ─────────────────────────
				if (result.canUseNativeReview) {
					try {
						const isAvailable = await StoreReview.isAvailableAsync();
						if (isAvailable) {
							await StoreReview.requestReview();
							await addNativeReviewDate(todayStr);
							return;
						}
					} catch (error) {
						console.log('useAskUserToRateApp: native review not available', error);
					}
				}

				// ── Fallback: show modal with store links ────────────
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
