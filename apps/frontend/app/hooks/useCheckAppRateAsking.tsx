import React, { useCallback } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';
import { TranslationKeys } from '@/locales/keys';
import useDebugMode from '@/hooks/useDebugMode';
import useNativeQuickRateApp from '@/hooks/useNativeQuickRateApp';
import useRatingDebugLog from '@/hooks/useRatingDebugLog';
import useRatingEngagement from '@/hooks/useRatingEngagement';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';

const useCheckAppRateAsking = () => {
	const debugMode = useDebugMode();
	const { requestNativeReview, canBeAskedForRating, lastAskedForRatingAt, updateLastAskedTimestamp } = useNativeQuickRateApp();
	const { appendLog } = useRatingDebugLog();
	const { score, hasReachedThreshold, resetScore, shouldAttemptRating, clearShouldAttemptRating } = useRatingEngagement();
	const { show } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const { theme } = useTheme();

	/**
	 * Shows the rating modal and updates state (timestamp, score reset).
	 */
	const showAppRating = useCallback(() => {
		appendLog(`showAppRating | score=${score} | debug=${debugMode} | lastAsked=${lastAskedForRatingAt ?? 'Never'} | platform=${Platform.OS}`);

		show({
			children: (
				<View style={styles.container}>
					<Text style={[styles.prompt, { color: theme.screen.text }]}>
						{translate(TranslationKeys.collectible_event_rate_app_prompt)}
					</Text>
					<RateAppSettingsItem />
				</View>
			),
		});

		updateLastAskedTimestamp();
		resetScore();

		if (Platform.OS !== 'web') {
			requestNativeReview().then((shown) => {
				appendLog(shown ? 'Native review dialog also shown' : 'Native review not available');
			}).catch((err) => {
				appendLog(`Native review error: ${err}`);
			});
		}
	}, [show, theme.screen.text, translate, appendLog, score, debugMode, lastAskedForRatingAt, updateLastAskedTimestamp, resetScore, requestNativeReview]);

	/**
	 * Attempts to show the rating prompt if the shouldAttemptRating flag is set.
	 * The flag is always cleared on attempt.
	 * In debug mode: cooldown is skipped (so developer can test without waiting 7 days).
	 * In production: cooldown must be elapsed.
	 * Returns true if the rating was shown.
	 */
	const checkAndShowAppRating = useCallback((): boolean => {
		if (!shouldAttemptRating) {
			appendLog(`checkAndShowAppRating | skipped (flag not set) | score=${score} | threshold=${hasReachedThreshold()}`);
			return false;
		}

		// Clear the flag regardless of whether we actually show the rating
		clearShouldAttemptRating();

		const cooldownOk = debugMode ? true : canBeAskedForRating();
		appendLog(`checkAndShowAppRating | flagSet=true | cooldown=${cooldownOk} | score=${score} | debug=${debugMode}`);

		if (!cooldownOk) {
			return false;
		}

		showAppRating();
		return true;
	}, [shouldAttemptRating, clearShouldAttemptRating, showAppRating, appendLog, score, hasReachedThreshold, canBeAskedForRating, debugMode]);

	return { shouldAttemptRating, showAppRating, checkAndShowAppRating };
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
