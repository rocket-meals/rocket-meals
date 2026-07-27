import React, { useCallback, useEffect, useState } from 'react';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SettingsListGroupTitle } from 'repo-depkit-common-ui';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';
import SettingsList from '@/components/SettingsList/SettingsList';
import useAppRatingScore from '@/hooks/useAppRatingScore';
import useAppReview, { AppReviewTrigger } from '@/hooks/useAppReview';
import {
	MAX_ASKS_PER_YEAR,
	NEGATIVE_SIGNAL_BLOCK_DAYS,
	SCORE_THRESHOLD,
	pruneAskedTimestamps,
} from '@/hooks/appRatingDecision';
import { getAppUsageSessionId } from '@/helper/AppUsageEventHelper';
import { getVersion } from '@/config';

/**
 * Explains an `isAvailableAsync() === false` result, which is the single most confusing
 * part of testing the native prompt: on iOS the API reports false in TestFlight, where the
 * dialog can never appear no matter what the app does.
 */
function describeAvailability(isAvailable: boolean | null): string {
	if (isAvailable === null) {
		return '…';
	}
	if (isAvailable) {
		return 'true';
	}
	if (Platform.OS === 'ios') {
		return 'false — TestFlight build? The dialog never appears there.';
	}
	if (Platform.OS === 'android') {
		return 'false — not installed via Google Play?';
	}
	return 'false — web is not supported';
}

const RateApp = () => {
	useSetPageTitle(TranslationKeys.rate_app);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const {
		appRatingData,
		score,
		setScore,
		getCurrentDecision,
		registerNegativeSignal,
		resetRatingState,
		showDebugRatingModal,
	} = useAppRatingScore();
	const { requestAppReview } = useAppReview();

	const [hasAction, setHasAction] = useState<string>('…');
	const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
	const [storeUrl, setStoreUrl] = useState<string>('…');
	const [lastOutcome, setLastOutcome] = useState<string>('-');

	useEffect(() => {
		StoreReview.hasAction().then((v) => setHasAction(String(v)));
		StoreReview.isAvailableAsync().then((v) => setIsAvailable(v));
		setStoreUrl(StoreReview.storeUrl() ?? 'null');
	}, []);

	const handleRequestReview = useCallback(async () => {
		await StoreReview.requestReview();
	}, []);

	/** Exercises the two real entry points, so the debug screen tests the shipped paths. */
	const runTrigger = useCallback(
		async (trigger: AppReviewTrigger) => {
			const outcome = await requestAppReview(trigger, { screenName: 'debug-rate-app' });
			setLastOutcome(
				`${trigger}: ${outcome.kind}${outcome.kind === 'skipped' ? ` (${outcome.reason})` : ''}`
			);
		},
		[requestAppReview]
	);

	const now = new Date();
	const decision = getCurrentDecision();
	const asksThisYear = pruneAskedTimestamps(appRatingData?.askedTimestamps ?? [], now).length;

	const icon = (name: React.ComponentProps<typeof MaterialCommunityIcons>['name']) => (
		<MaterialCommunityIcons name={name} size={22} color={theme.screen.icon} />
	);

	return (
		<ScrollView
			style={[styles.container, { backgroundColor: theme.screen.background }]}
			contentContainerStyle={{ backgroundColor: theme.screen.background }}
		>
			<View style={styles.content}>
				<Text style={[styles.heading, { color: theme.screen.text }]}>{translate(TranslationKeys.rate_app)}</Text>
				<RateAppSettingsItem debug />

				<SettingsListGroupTitle title="Entscheidung" />
				<SettingsList
					label="Would ask right now?"
					value={decision.ask ? 'yes' : `no — ${decision.reason}`}
					groupPosition="top"
					showSeparator
					leftIcon={icon('gavel')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Score"
					value={`${score} / ${SCORE_THRESHOLD}`}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('counter')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={`Asks in last 365 days (max ${MAX_ASKS_PER_YEAR})`}
					value={String(asksThisYear)}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('calendar-check')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Current build"
					value={getVersion()}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('cellphone-arrow-down')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Asked on build (once-per-build cap)"
					value={appRatingData?.lastAskedAppVersion || '-'}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('lock-outline')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Last asked at"
					value={appRatingData?.lastAskedAt ? new Date(appRatingData.lastAskedAt).toLocaleString() : '-'}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('clock-outline')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label={`Negative signal (blocks ${NEGATIVE_SIGNAL_BLOCK_DAYS} days)`}
					value={
						appRatingData?.negativeSignalAt
							? new Date(appRatingData.negativeSignalAt).toLocaleString()
							: '-'
					}
					groupPosition="bottom"
					showSeparator={false}
					leftIcon={icon('thumb-down-outline')}
					iconBgColor="transparent"
				/>

				<SettingsListGroupTitle title="Native API" />
				<SettingsList
					label="hasAction()"
					value={hasAction}
					groupPosition="top"
					showSeparator
					leftIcon={icon('information-outline')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="isAvailableAsync()"
					value={describeAvailability(isAvailable)}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('check-circle-outline')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="requestReview()"
					handleFunction={handleRequestReview}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('star-outline')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="storeUrl()"
					value={storeUrl}
					groupPosition="bottom"
					showSeparator={false}
					leftIcon={icon('link-variant')}
					iconBgColor="transparent"
				/>
				<Text style={[styles.note, { color: theme.screen.text }]}>
					{'Der native Dialog erscheint nie in TestFlight und ist in Produktion auf 3x/365 Tage begrenzt. ' +
						'Unbegrenzt testbar ist er nur in einem lokalen iOS-Build (Xcode) bzw. auf Android über den ' +
						'Play Internal Test Track — dort greift die Quota nicht. Der Review-Link unten funktioniert ' +
						'dagegen in jeder Umgebung.'}
				</Text>

				<SettingsListGroupTitle title="requestAppReview() — der eine Eintrittspunkt" />
				<SettingsList
					label="EXPLICIT (fällt auf Store zurück)"
					handleFunction={() => runTrigger(AppReviewTrigger.EXPLICIT)}
					groupPosition="top"
					showSeparator
					leftIcon={icon('gesture-tap-button')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="CELEBRATION (still, regelgeprüft)"
					handleFunction={() => runTrigger(AppReviewTrigger.CELEBRATION)}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('party-popper')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Letztes Ergebnis"
					value={lastOutcome}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('receipt-text-outline')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Usage-Event session_id"
					value={getAppUsageSessionId()}
					groupPosition="bottom"
					showSeparator={false}
					leftIcon={icon('identifier')}
					iconBgColor="transparent"
				/>

				<SettingsListGroupTitle title="Test-Aktionen" />
				<SettingsList
					label="Score auf Schwelle setzen"
					handleFunction={() => setScore(SCORE_THRESHOLD)}
					groupPosition="top"
					showSeparator
					leftIcon={icon('target')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Negatives Signal setzen"
					handleFunction={registerNegativeSignal}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('thumb-down')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Rating-State zurücksetzen"
					handleFunction={resetRatingState}
					groupPosition="middle"
					showSeparator
					leftIcon={icon('backup-restore')}
					iconBgColor="transparent"
				/>
				<SettingsList
					label="Open App Rating Modal"
					handleFunction={showDebugRatingModal}
					groupPosition="bottom"
					showSeparator={false}
					leftIcon={icon('star-shooting-outline')}
					iconBgColor="transparent"
				/>
			</View>
		</ScrollView>
	);
};

export default RateApp;

const styles = StyleSheet.create({
	container: {
		flex: 1,
	},
	content: {
		width: '100%',
		height: '100%',
		padding: 20,
	},
	heading: {
		fontSize: 24,
		fontFamily: 'Poppins_700Bold',
		marginVertical: 10,
	},
	note: {
		fontSize: 12,
		fontStyle: 'italic',
		opacity: 0.7,
		marginTop: 10,
	},
});
