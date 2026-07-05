import React, { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
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

const SCORE_THRESHOLD = 100;

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
 * - lastAskedAppVersion: app version when last asked
 * - lastFocusTime: last focus time for debug display
 *
 * Only asks once per app version.
 */
const useAppRatingScore = () => {
const dispatch = useDispatch();
const appRatingData = useAppSelector((state) => state.settings.appRatingData);
const score = appRatingData?.score ?? 0;
const debugMode = useDebugMode();
const { show } = useMyScrollViewModal();
const { translate } = useLanguage();
const { theme } = useTheme();

const scoreRef = useRef(score);
useEffect(() => {
scoreRef.current = score;
}, [score]);

const appRatingDataRef = useRef(appRatingData);
useEffect(() => {
appRatingDataRef.current = appRatingData;
}, [appRatingData]);

const setScore = useCallback((newScore: number) => {
dispatch({ type: SET_APP_RATING_DATA, payload: { score: newScore } });
}, [dispatch]);

const addPoints = useCallback((points: number) => {
const newScore = scoreRef.current + points;
dispatch({ type: SET_APP_RATING_DATA, payload: { score: newScore } });
}, [dispatch]);

const setLastFocusTime = useCallback((time: string) => {
dispatch({ type: SET_APP_RATING_DATA, payload: { lastFocusTime: time } });
}, [dispatch]);

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
 * Called when the foodoffer screen gains focus or a modal closes.
 * If score >= threshold, attempt to show rating.
 * Only asks once per app version.
 * In debug mode, always shows the debug rating modal (ignoring version check).
 */
const checkAndRequestRatingOnFocus = useCallback(async () => {
const currentScore = scoreRef.current;
if (currentScore < SCORE_THRESHOLD) return;

const currentVersion = getVersion();
const data = appRatingDataRef.current;

// In debug mode, always show modal regardless of version
if (debugMode) {
dispatch({ type: SET_APP_RATING_DATA, payload: {
score: 0,
lastAskedAt: new Date().toISOString(),
lastAskedAppVersion: currentVersion,
} });
// Small delay to ensure the foodoffers screen is fully mounted before showing modal
setTimeout(() => {
showDebugRatingModal();
}, 500);
return;
}

// Only ask once per app version (non-debug)
if (data?.lastAskedAppVersion === currentVersion) {
return;
}

if (Platform.OS === 'web') {
return;
}

try {
const isAvailable = await StoreReview.isAvailableAsync();
if (isAvailable) {
await StoreReview.requestReview();
dispatch({ type: SET_APP_RATING_DATA, payload: {
score: 0,
lastAskedAt: new Date().toISOString(),
lastAskedAppVersion: currentVersion,
} });
return;
}
} catch (error) {
console.log('useAppRatingScore: error requesting review', error);
}
}, [debugMode, dispatch, showDebugRatingModal]);

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
showDebugRatingModal,
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
