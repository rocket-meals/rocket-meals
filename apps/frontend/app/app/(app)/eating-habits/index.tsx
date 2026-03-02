import { Dimensions, SafeAreaView, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import FoodLabelingInfo from '@/components/FoodLabelingInfo';
import { useDispatch, useSelector } from 'react-redux';
import MarkingLabels from '@/components/MarkingLabels/MarkingLabels';
import { useLanguage } from '@/hooks/useLanguage';
import { excerpt } from '@/constants/HelperFunctions';
import animation from '@/assets/animations/allergist.json';
import LottieView from 'lottie-react-native';
import { useFocusEffect } from 'expo-router';
import { replaceLottieColors } from '@/helper/animationHelper';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import MarkingBottomSheet from '@/components/MarkingBottomSheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { RootState } from '@/redux/reducer';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import SettingsList from '@/components/SettingsList';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { UserHelper } from '@/helper/UserHelper';

const Index = () => {
	useSetPageTitle(TranslationKeys.eating_habits);
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const { markings } = useSelector((state: RootState) => state.food);
	const { primaryColor, appSettings, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const { user, profile } = useSelector((state: RootState) => state.authReducer);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');
	const [readMore, setReadMore] = useState(false);
	const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
	const animationRef = useRef<LottieView>(null);
	const [animationJson, setAmimationJson] = useState<any>(null);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const menuSheetRef = useRef<BottomSheet>(null);
	const [isActive, setIsActive] = useState(false);
	const profileHelper = useMemo(() => new ProfileHelper(), []);
	const isAnonymousUser = UserHelper.isAnonymousUser(user);

	const openMenuSheet = () => {
		menuSheetRef?.current?.expand();
	};

	const closeMenuSheet = () => {
		menuSheetRef?.current?.close();
	};

	useFocusEffect(
		useCallback(() => {
			setAmimationJson(replaceLottieColors(animation, primaryColor));
			return () => {
				setAmimationJson(null);
			};
		}, [])
	);

	useFocusEffect(
		useCallback(() => {
			setAutoPlay(appSettings?.animations_auto_start); // Enable when entering

			return () => {
				setAutoPlay(false); // Reset when leaving
				setAmimationJson(null);
			};
		}, [appSettings?.animations_auto_start])
	);

	useFocusEffect(
		useCallback(() => {
			setIsActive(true);
			return () => {
				setIsActive(false);
			};
		}, [])
	);

	useEffect(() => {
		if (animationJson && autoPlay && animationRef.current) {
			animationRef?.current?.play(); // Reset animation to ensure it starts fresh
		}
	}, [animationJson, autoPlay]);

	const renderLottie = useMemo(() => {
		if (animationJson) {
			return <LottieView ref={animationRef} source={animationJson} resizeMode="contain" style={{ width: '100%', height: '100%' }} autoPlay={autoPlay || false} loop={false} />;
		}
	}, [autoPlay, animationJson]);

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

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: theme.screen.background }}>
			<View style={{ flex: 1 }}>
				<ScrollView style={{ backgroundColor: theme.screen.background }} contentContainerStyle={styles.contentContainer}>
					<View style={styles.gifContainer}>{renderLottie}</View>
					<View
						style={{
							...styles.eatingHabitsContainer,
							width: isWeb ? (screenWidth > 600 ? '80%' : '100%') : '100%',
						}}
					>
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
						<View style={styles.feedbackLabelsContainer}>
                                                {markings?.map(marking => {
                                                        return <MarkingLabels key={marking?.id} markingId={marking?.id} handleMenuSheet={openMenuSheet} />;
                                                })}
                                        </View>
                                        <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_markings} />
                                </View>
                        </ScrollView>
                </View>
                {isActive && <MarkingBottomSheet ref={menuSheetRef} onClose={closeMenuSheet} />}
		</SafeAreaView>
	);
};

export default Index;
