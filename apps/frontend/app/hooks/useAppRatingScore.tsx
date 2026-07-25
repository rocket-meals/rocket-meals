import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import * as StoreReview from 'expo-store-review';
import { useDispatch } from 'react-redux';

import { useAppSelector } from '@/redux/hooks';
import { SET_APP_RATING_DATA } from '@/redux/Types/types';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { RateAppSettingsItem } from '@/components/RateAppSettingsItem/RateAppSettingsItem';
import { TranslationKeys } from '@/locales/keys';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import useDebugMode from '@/hooks/useDebugMode';
import { getVersion } from '@/config';
import {
	type AppRatingDecision,
	SCORE_THRESHOLD,
	decideAppRatingFromStoredData,
	pruneAskedTimestamps,
} from '@/hooks/appRatingDecision';

export { SCORE_THRESHOLD };

const SCORE_FOODOFFER_DETAILS_OPEN = 10;
const SCORE_FOODOFFER_DETAILS_TAB_SWITCH = 10;
const SCORE_BALANCE_READ = 30;
const SCORE_MAP_OPEN = 10;
const SCORE_EATING_HABITS_OPEN = 10;
const SCORE_EATING_HABITS_DETAIL_MODAL = 10;
const SCORE_FOOD_RATING_5_STARS = 10;
const SCORE_LABEL_POSITIVE = 10;

/**
 * Hook that manages a persistent "App Rating Score" via Redux store.
 * Points accumulate through user interactions. When the score reaches the threshold (100),
 * the app attempts to show the native rating dialog on foodoffer screen focus.
 *
 * The state is stored as an object containing:
 * - score: current accumulated score
 * - lastAskedAt: ISO timestamp of last rating prompt
 * - lastAskedAppVersion: app version when last asked (debug display only)
 * - lastFocusTime: last focus time for debug display
 * - askedTimestamps: attempts within the last year, for the yearly budget
 * - negativeSignalAt: timestamp of the last bad experience
 *
 * Whether we are actually allowed to ask is decided by `decideAppRating`, which is a pure
 * function so the rules can be unit tested — the OS dialog itself never appears in
 * TestFlight and is silently rate limited in production, so it cannot be relied on in tests.
 */
const useAppRatingScore = () => {
	const dispatch = useDispatch();
	const appRatingData = useAppSelector((state) => state.settings.appRatingData);
	const score = appRatingData?.score ?? 0;
	const debugMode = useDebugMode();
	const { show } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const { theme } = useTheme();

	const appRatingDataRef = useRef(appRatingData);
	useEffect(() => {
		appRatingDataRef.current = appRatingData;
	}, [appRatingData]);

	const setScore = useCallback((newScore: number) => {
		dispatch({ type: SET_APP_RATING_DATA, payload: { score: newScore } });
	}, [dispatch]);

	const addPoints = useCallback((points: number) => {
		const currentScore = appRatingDataRef.current?.score ?? 0;
		dispatch({ type: SET_APP_RATING_DATA, payload: { score: currentScore + points } });
	}, [dispatch]);

	const setLastFocusTime = useCallback((time: string) => {
		dispatch({ type: SET_APP_RATING_DATA, payload: { lastFocusTime: time } });
	}, [dispatch]);

	/**
	 * Records a bad experience (low food rating, opening support, failed request). This
	 * blocks the prompt for a while. It deliberately does not ask the user how they feel —
	 * Google's in-app review guidelines forbid any sentiment question around the review flow.
	 */
	const registerNegativeSignal = useCallback(() => {
		dispatch({ type: SET_APP_RATING_DATA, payload: { negativeSignalAt: new Date().toISOString() } });
	}, [dispatch]);

	const resetRatingState = useCallback(() => {
		dispatch({
			type: SET_APP_RATING_DATA,
			payload: {
				score: 0,
				lastAskedAt: null,
				lastAskedAppVersion: null,
				askedTimestamps: [],
				negativeSignalAt: null,
			},
		});
	}, [dispatch]);

	/** Evaluates the current rules without any side effect. Used by the debug screen. */
	const getCurrentDecision = useCallback((): AppRatingDecision => {
		return decideAppRatingFromStoredData(appRatingDataRef.current);
	}, []);

	const showDebugRatingModal = useCallback(() => {
		show({
			children: (
				<View style={styles.container}>
					<Text style={[styles.prompt, { color: theme.screen.text }]}>
						{translate(TranslationKeys.collectible_event_rate_app_prompt)}
					</Text>
					<Text style={[styles.debugInfo, { color: theme.screen.text }]}>
						{'[Debug] Rating not available natively - showing modal'}
					</Text>
					<RateAppSettingsItem debug />
				</View>
			),
		});
	}, [show, theme.screen.text, translate]);

	/**
	 * Records an attempt. Note that `requestReview()` resolves even when the OS silently
	 * suppressed the dialog (there is no return value), so this counts attempts, not
	 * impressions. That is why the rules use a cooldown rather than a one-shot flag: a
	 * suppressed attempt is retried at the next good moment instead of being lost forever.
	 */
	const recordAskAttempt = useCallback(() => {
		const now = new Date();
		const previous = appRatingDataRef.current?.askedTimestamps ?? [];
		dispatch({
			type: SET_APP_RATING_DATA,
			payload: {
				score: 0,
				lastAskedAt: now.toISOString(),
				lastAskedAppVersion: getVersion(),
				askedTimestamps: [...pruneAskedTimestamps(previous, now), now.toISOString()],
			},
		});
	}, [dispatch]);

	/**
	 * Single entry point for every "good moment" in the app that wants to ask for a rating.
	 * Applies the shared rules first, so callers never have to know about cooldowns or
	 * budgets. Resolves to true when an attempt was made — note that this still does not
	 * mean the dialog was actually shown, see `recordAskAttempt`.
	 */
	const requestReviewIfAllowed = useCallback(async (): Promise<boolean> => {
		if (!getCurrentDecision().ask) {
			return false;
		}

		try {
			const isAvailable = await StoreReview.isAvailableAsync();
			if (!isAvailable) {
				// iOS returns false in TestFlight, where the dialog can never appear.
				return false;
			}
			await StoreReview.requestReview();
			recordAskAttempt();
			return true;
		} catch (error) {
			console.log('useAppRatingScore: error requesting review', error);
			return false;
		}
	}, [getCurrentDecision, recordAskAttempt]);

	/**
	 * Called when the foodoffer screen gains focus or a modal closes.
	 * In debug mode the in-app modal is shown instead, since the native dialog is not
	 * reliably available in development builds.
	 */
	const checkAndRequestRatingOnFocus = useCallback(async () => {
		if ((appRatingDataRef.current?.score ?? 0) < SCORE_THRESHOLD) {
			return;
		}

		if (debugMode) {
			recordAskAttempt();
			// Small delay to ensure the foodoffers screen is fully mounted before showing modal
			setTimeout(() => {
				showDebugRatingModal();
			}, 500);
			return;
		}

		await requestReviewIfAllowed();
	}, [debugMode, recordAskAttempt, requestReviewIfAllowed, showDebugRatingModal]);

	const addPointsForDetailsOpen = useCallback(() => {
		addPoints(SCORE_FOODOFFER_DETAILS_OPEN);
	}, [addPoints]);

	const addPointsForTabSwitch = useCallback(() => {
		addPoints(SCORE_FOODOFFER_DETAILS_TAB_SWITCH);
	}, [addPoints]);

	const addPointsForBalanceRead = useCallback(() => {
		addPoints(SCORE_BALANCE_READ);
	}, [addPoints]);

	const addPointsForMapOpen = useCallback(() => {
		addPoints(SCORE_MAP_OPEN);
	}, [addPoints]);

	const addPointsForEatingHabitsOpen = useCallback(() => {
		addPoints(SCORE_EATING_HABITS_OPEN);
	}, [addPoints]);

	const addPointsForEatingHabitsDetailModal = useCallback(() => {
		addPoints(SCORE_EATING_HABITS_DETAIL_MODAL);
	}, [addPoints]);

	const addPointsForFoodRating5Stars = useCallback(() => {
		addPoints(SCORE_FOOD_RATING_5_STARS);
	}, [addPoints]);

	const addPointsForLabelPositive = useCallback(() => {
		addPoints(SCORE_LABEL_POSITIVE);
	}, [addPoints]);

	return {
		score,
		appRatingData,
		setScore,
		setLastFocusTime,
		checkAndRequestRatingOnFocus,
		requestReviewIfAllowed,
		showDebugRatingModal,
		getCurrentDecision,
		registerNegativeSignal,
		resetRatingState,
		addPointsForDetailsOpen,
		addPointsForTabSwitch,
		addPointsForBalanceRead,
		addPointsForMapOpen,
		addPointsForEatingHabitsOpen,
		addPointsForEatingHabitsDetailModal,
		addPointsForFoodRating5Stars,
		addPointsForLabelPositive,
	};
};

const styles = StyleSheet.create({
	container: {
		paddingVertical: 0,
	},
	prompt: {
		textAlign: 'center',
		paddingHorizontal: 24,
		paddingVertical: 12,
		fontSize: 16,
		fontFamily: 'Poppins_700Bold',
	},
	debugInfo: {
		textAlign: 'center',
		paddingHorizontal: 24,
		paddingBottom: 8,
		fontSize: 12,
		fontStyle: 'italic',
		opacity: 0.7,
	},
});

export default useAppRatingScore;
