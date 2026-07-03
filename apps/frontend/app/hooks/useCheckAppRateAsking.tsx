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
		appendLog('Showing web rating modal');
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
	}, [show, theme.screen.text, translate, appendLog]);

	const checkAndShowAppRating = useCallback(() => {
		const canAsk = canBeAskedForRating();
		appendLog(`checkAndShowAppRating | canAsk=${canAsk} | debug=${debugMode} | lastAsked=${lastAskedForRatingAt ?? 'Never'} | platform=${Platform.OS}`);

		if (!debugMode && !canAsk) {
			appendLog('Cooldown not elapsed: skipping rating prompt');
			return;
		}

		// Always show the web rating modal synchronously so it appears before navigation
		showWebRatingModal();
		updateLastAskedTimestamp();

		// On native, also try the native review dialog in the background
		if (Platform.OS !== 'web') {
			requestNativeReview().then((shown) => {
				appendLog(shown ? 'Native review dialog also shown' : 'Native review not available');
			}).catch((err) => {
				appendLog(`Native review error: ${err}`);
			});
		}
	}, [debugMode, canBeAskedForRating, showWebRatingModal, appendLog, lastAskedForRatingAt, updateLastAskedTimestamp, requestNativeReview]);

	return { checkAndShowAppRating };
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
