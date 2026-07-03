import React, { useCallback } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';
import { TranslationKeys } from '@/locales/keys';
import useDebugMode from '@/hooks/useDebugMode';
import useNativeQuickRateApp from '@/hooks/useNativeQuickRateApp';
import useRatingDebugLog from '@/hooks/useRatingDebugLog';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';

const useCheckAppRateAsking = () => {
	const debugMode = useDebugMode();
	const { requestNativeReview, canBeAskedForRating, lastAskedForRatingAt, updateLastAskedTimestamp } = useNativeQuickRateApp();
	const { appendLog } = useRatingDebugLog();
	const { show } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const { theme } = useTheme();

	const showWebRatingModal = useCallback(() => {
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
	}, [show, theme.screen.text, translate]);

	const showAppRating = useCallback(async () => {
		if (Platform.OS !== 'web') {
			const shown = await requestNativeReview();
			if (!shown) {
				appendLog('Native review not shown, falling back to web modal');
				showWebRatingModal();
			} else {
				appendLog('Native review dialog shown');
			}
		} else {
			appendLog('Web platform: showing web rating modal');
			showWebRatingModal();
		}
		await updateLastAskedTimestamp();
	}, [requestNativeReview, showWebRatingModal, updateLastAskedTimestamp, appendLog]);

	const checkAndShowAppRating = useCallback(() => {
		const canAsk = canBeAskedForRating();
		appendLog(`checkAndShowAppRating called | canAsk=${canAsk} | debugMode=${debugMode} | lastAsked=${lastAskedForRatingAt ?? 'Never'} | platform=${Platform.OS}`);

		if (debugMode) {
			appendLog('Debug mode: showing rating modal for testing');
			showAppRating();
			return;
		}

		if (canAsk) {
			appendLog('Cooldown elapsed: showing rating prompt');
			showAppRating();
		} else {
			appendLog('Cooldown not elapsed: skipping rating prompt');
		}
	}, [debugMode, canBeAskedForRating, showAppRating, appendLog, lastAskedForRatingAt]);

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
