import React, { useCallback } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { AppFeedbackSourceIdentifier, DatabaseTypes, StringHelper } from 'repo-depkit-common';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';
import { TranslationKeys } from '@/locales/keys';
import useDebugMode from '@/hooks/useDebugMode';
import useNativeQuickRateApp from '@/hooks/useNativeQuickRateApp';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { AppRatingTracker } from '@/helper/AppRatingTracker';
import { AppFeedback } from '@/redux/actions/AppFeedback/AppFeedback';

/**
 * Compute the average store rating from app_feedbacks that originate from
 * Apple or Google Play (i.e. real store reviews).
 * Returns `null` when no store reviews exist or on error.
 */
async function fetchAverageStoreRating(): Promise<number | null> {
	try {
		const helper = new AppFeedback();
		const feedbacks = await helper.fetchAppFeedback({
			fields: ['source_rating_raw', 'source_identifier'],
			filter: {
				source_identifier: {
					_in: [AppFeedbackSourceIdentifier.APPLE, AppFeedbackSourceIdentifier.GOOGLE_PLAY],
				},
				source_rating_raw: { _nnull: true },
			},
			limit: 500,
		}) as DatabaseTypes.AppFeedbacks[];

		if (!feedbacks || !Array.isArray(feedbacks) || feedbacks.length === 0) {
			return null;
		}

		const ratings = feedbacks
			.map((f) => f.source_rating_raw)
			.filter((r): r is number => typeof r === 'number');

		if (ratings.length === 0) {
			return null;
		}

		const sum = ratings.reduce((a, b) => a + b, 0);
		return Math.round((sum / ratings.length) * 10) / 10;
	} catch {
		return null;
	}
}

const useCheckAppRateAsking = () => {
	const debugMode = useDebugMode();
	const { requestNativeReview } = useNativeQuickRateApp();
	const { show } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const { theme } = useTheme();

	const showWebRatingModal = useCallback((averageRating: number | null) => {
		let promptText = translate(TranslationKeys.collectible_event_rate_app_prompt);

		if (averageRating !== null) {
			const ratingTemplate = translate(TranslationKeys.rate_app_average_prompt);
			promptText = StringHelper.replaceAllLiteralWithOptions({
				str: ratingTemplate,
				find: '{{rating}}',
				replace: String(averageRating),
			});
		}

		show({
			children: (
				<View style={styles.container}>
					<Text style={[styles.prompt, { color: theme.screen.text }]}>
						{promptText}
					</Text>
					<RateAppSettingsItem />
				</View>
			),
		});
	}, [show, theme.screen.text, translate]);

	const showAppRating = useCallback(async (averageRating: number | null = null) => {
		await AppRatingTracker.recordAsked();

		if (Platform.OS !== 'web') {
			const shown = await requestNativeReview();
			if (!shown) {
				showWebRatingModal(averageRating);
			}
		} else {
			showWebRatingModal(averageRating);
		}
	}, [requestNativeReview, showWebRatingModal]);

	const checkAndShowAppRating = useCallback(async () => {
		if (debugMode) {
			const avgRating = await fetchAverageStoreRating();
			showAppRating(avgRating);
			return;
		}

		const shouldAsk = await AppRatingTracker.shouldAskForRating();
		if (shouldAsk) {
			const avgRating = await fetchAverageStoreRating();
			showAppRating(avgRating);
		}
	}, [debugMode, showAppRating]);

	return { checkAndShowAppRating, showAppRating };
};

const styles = StyleSheet.create({
	container: {
		paddingVertical: 24,
		gap: 12,
	},
	prompt: {
		textAlign: 'center',
		paddingHorizontal: 24,
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},
});

export default useCheckAppRateAsking;
