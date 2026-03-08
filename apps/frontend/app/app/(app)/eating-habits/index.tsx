import { ActivityIndicator, Dimensions, InteractionManager, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import FoodLabelingInfo from '@/components/FoodLabelingInfo';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import SettingsListMarkingLabelsFast from '@/components/SettingsListMarkingLabelsFast';
import { useLanguage } from '@/hooks/useLanguage';
import { excerpt } from '@/constants/HelperFunctions';
import { useFocusEffect } from 'expo-router';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt, DatabaseTypes } from 'repo-depkit-common';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import SettingsList from '@/components/SettingsList';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { UserHelper } from '@/helper/UserHelper';
import DebugView from '@/components/DebugView';

// Tracks whether the heavy markings list has been rendered at least once so that
// subsequent navigations (even after a full remount) skip the deferred-render delay.
let _markingContentLoaded = false;

const Index = () => {
	useSetPageTitle(TranslationKeys.eating_habits);
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { translate, language } = useLanguage();
	const { markings, markingGroups } = useAppSelector((state) => state.food);
	const { primaryColor, appSettings, selectedTheme: mode } = useAppSelector((state) => state.settings);
	const { user, profile } = useAppSelector((state) => state.authReducer);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const [readMore, setReadMore] = useState(false);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const menuSheetRef = useRef<BottomSheet>(null);
	const [isActive, setIsActive] = useState(false);
	// Initialized from the module-level flag so content appears instantly on re-entry
	// even if the component was fully unmounted and remounted.
	const [isContentVisible, setIsContentVisible] = useState(_markingContentLoaded);
	const profileHelper = useMemo(() => new ProfileHelper(), []);
	const isAnonymousUser = UserHelper.isAnonymousUser(user);

	// Performance timing refs
	const mountTimeRef = useRef<number>(performance.now());
	const [contentVisibleMs, setContentVisibleMs] = useState<number | null>(null);

	const markingsSections = useMemo(() => {
		if (!markings || markings.length === 0) return [];

		if (!markingGroups || markingGroups.length === 0) {
			return [{ group: null, markingIds: markings.map((m: DatabaseTypes.Markings) => m.id) }];
		}

		const sortedGroups = [...markingGroups].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
		const groupedMarkingIds = new Set<string>();
		const sections: { group: DatabaseTypes.MarkingsGroups | null; markingIds: string[] }[] = [];

		for (const group of sortedGroups) {
			const groupMarkingIds = markings
				.filter((m: DatabaseTypes.Markings) => {
					const groupId = typeof m.group === 'string' ? m.group : (m.group as DatabaseTypes.MarkingsGroups)?.id;
					return groupId === group.id;
				})
				.map((m: DatabaseTypes.Markings) => m.id);

			if (groupMarkingIds.length > 0) {
				sections.push({ group, markingIds: groupMarkingIds });
				groupMarkingIds.forEach((id: string) => groupedMarkingIds.add(id));
			}
		}

		const ungroupedIds = markings
			.filter((m: DatabaseTypes.Markings) => !groupedMarkingIds.has(m.id))
			.map((m: DatabaseTypes.Markings) => m.id);

		if (ungroupedIds.length > 0) {
			sections.push({ group: null, markingIds: ungroupedIds });
		}

		return sections;
	}, [markings, markingGroups]);

	const openMenuSheet = () => {
		menuSheetRef?.current?.expand();
	};

	const closeMenuSheet = () => {
		menuSheetRef?.current?.close();
	};

	useFocusEffect(
		useCallback(() => {
			const timer = setTimeout(() => {
				setIsActive(true);
			}, 100);
			return () => {
				clearTimeout(timer);
				setIsActive(false);
			};
		}, [])
	);

	// Defer rendering the markings list until after the navigation animation
	// so the transition is never blocked.
	useFocusEffect(
		useCallback(() => {
			if (_markingContentLoaded) {
				// Content was already loaded on a previous visit – nothing to do.
				// isContentVisible is already true (initialized from the flag or preserved
				// across navigations), so no state update is needed.
				return;
			}
			const task = InteractionManager.runAfterInteractions(() => {
				_markingContentLoaded = true;
				setIsContentVisible(true);
				setContentVisibleMs(Math.round(performance.now() - mountTimeRef.current));
			});
			return () => {
				task.cancel();
			};
		}, [])
	);

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
			if (Dimensions.get('window').width > 600) {
				setReadMore(true);
			}
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const handleReadMore = () => {
		setReadMore(!readMore);
	};

	const handleClearMarkings = useCallback(async () => {
		if (!profile) return;

		const updatedProfile = {
			...profile,
			markings: [],
		};

		dispatch({ type: UPDATE_PROFILE, payload: updatedProfile });

		if (isAnonymousUser) return;

		try {
			const result = await profileHelper.updateProfile(updatedProfile);
			if (result) {
				dispatch({ type: UPDATE_PROFILE, payload: result });
			}
		} catch (error) {
			console.error('Error clearing markings:', error);
		}
	}, [dispatch, isAnonymousUser, profile, profileHelper]);

	const totalMarkingsCount = useMemo(() => markings?.length ?? 0, [markings]);

	const debugLogs = useMemo(() => [
		`${translate(TranslationKeys.eating_habits_debug_markings_count)}: ${totalMarkingsCount}`,
		contentVisibleMs !== null
			? `${translate(TranslationKeys.eating_habits_debug_content_time)}: ${contentVisibleMs}ms`
			: isContentVisible
				? `${translate(TranslationKeys.eating_habits_debug_content_time)}: cached (instant)`
				: `${translate(TranslationKeys.eating_habits_debug_content_time)}: …`,
	], [totalMarkingsCount, contentVisibleMs, isContentVisible, translate]);

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<View style={{ flex: 1 }}>
				<ScrollView style={{ backgroundColor: theme.screen.background }} contentContainerStyle={styles.contentContainer}>
					<View
						style={{
							...styles.eatingHabitsContainer,
							width: isWeb ? (screenWidth > 600 ? '80%' : '100%') : '100%',
						}}
					>
						<DebugView title="Performance" logs={debugLogs} showInDevMode />
						<Text style={{ ...styles.body1, color: theme.screen.text }}>{readMore ? translate(TranslationKeys.eatinghabits_introduction) : excerpt(translate(TranslationKeys.eatinghabits_introduction), 120)}</Text>
						{readMore && <FoodLabelingInfo textStyle={styles.body2} backgroundColor={primaryColor} />}
						<View style={styles.readMoreContainer}>
							<TouchableOpacity
								onPress={handleReadMore}
								style={{
									...styles.readMoreButton,
									backgroundColor: theme.primary,
								}}
							>
								<Text style={{ ...styles.readMore, color: contrastColor }}>{readMore ? translate(TranslationKeys.read_less) : translate(TranslationKeys.read_more)}</Text>
							</TouchableOpacity>
						</View>
						<SettingsGroupTitle>{translate(TranslationKeys.settings)}</SettingsGroupTitle>
						<SettingsList
							iconBgColor={primaryColor}
							leftIcon={<MaterialCommunityIcons name="broom" size={22} color={theme.screen.icon} />}
							label={translate(TranslationKeys.clear_markings_selection)}
							handleFunction={handleClearMarkings}
							groupPosition="single"
						/>
						{isContentVisible ? (
							markingsSections.map((section) => (
								<View key={section.group?.id || 'ungrouped'}>
									{section.group && (
										<SettingsGroupTitle>
											{getTextFromTranslation(section.group.translations, language) || section.group.alias || ''}
										</SettingsGroupTitle>
									)}
									<SettingsListMarkingLabelsFast
										markingIds={section.markingIds}
										handleMenuSheet={openMenuSheet}
									/>
								</View>
							))
						) : (
							<ActivityIndicator color={primaryColor} style={{ marginTop: 20 }} />
						)}
                                        <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_markings} />
                                </View>
                        </ScrollView>
                </View>
                {isActive && <MarkingBottomSheet ref={menuSheetRef} onClose={closeMenuSheet} />}
		</SafeAreaView>
	);
};

export default Index;
