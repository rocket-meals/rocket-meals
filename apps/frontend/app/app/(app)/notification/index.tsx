import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import { useLanguage } from '@/hooks/useLanguage';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { fetchFoodDetailsById } from '@/redux/actions/FoodOffers/FoodOffers';
import { excerpt } from '@/constants/HelperFunctions';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import { DELETE_FOOD_FEEDBACK_LOCAL, UPDATE_FOOD_FEEDBACK_LOCAL } from '@/redux/Types/types';
import animation from '@/assets/animations/notificationBell.json';
import type LottieView from 'lottie-react-native';
import { useFocusEffect } from 'expo-router';
import { replaceLottieColors } from '@/helper/animationHelper';
import { TranslationKeys } from '@/locales/keys';
import useSetPageTitle from '@/hooks/useSetPageTitle';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';
import SafeLottieView from '@/components/SafeLottieView/SafeLottieView';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import AppScreen from '@/components/AppScreen';
import AppListItem from '@/components/AppListItem';

const NotificationScreen = () => {
	useSetPageTitle(TranslationKeys.notification);
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { language, primaryColor, appSettings } = useAppSelector((state) => state.settings);
	const isLtrLanguage = useIsLtrLanguage();
	const isRtl = !isLtrLanguage;
	const { profile } = useAppSelector((state) => state.authReducer);
	const foodFeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);
	const [foodWithFeedback, setFoodWithFeedback] = useState<any[]>([]);
	const [autoPlay, setAutoPlay] = useState(appSettings?.animations_auto_start);
	const animationRef = useRef<LottieView>(null);
	const [animationJson, setAmimationJson] = useState<any>(null);
	const [windowWidth, setWindowWidth] = useState(Dimensions.get('window').width);
	const ownFoodFeedbacksDict = useAppSelector((state) => state.food.ownFoodFeedbacksDict);
	const foodFeedbacks = useMemo(() => Object.values(ownFoodFeedbacksDict || {}), [ownFoodFeedbacksDict]);

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

	useEffect(() => {
		if (animationJson && autoPlay && animationRef.current) {
			animationRef?.current?.play(); // Reset animation to ensure it starts fresh
		}
	}, [animationJson, autoPlay]);

	const renderLottie = useMemo(() => {
		if (animationJson) {
			return (
				<SafeLottieView
					ref={animationRef}
					source={animationJson}
					resizeMode="contain"
					style={isWeb ? { width: 250, height: 250 } : { width: '100%', height: '100%' }}
					autoPlay={autoPlay || false}
					loop={false}
				/>
			);
		}
	}, [autoPlay, animationJson]);

	// Fetch food details for all feedback
	const getFoodDetails = async () => {
		try {
			const foodDetailsPromises = foodFeedbacks.map((feedback: any) =>
				fetchFoodDetailsById(feedback.food).then(foodDetails => ({
					...foodDetails,
					feedback,
				}))
			);
			let foodDetails = await Promise.all(foodDetailsPromises);
			foodDetails = foodDetails.filter(food => food.feedback.notify === true);

			setFoodWithFeedback(foodDetails);
		} catch (error) {
			console.error('Error fetching food details:', error);
		}
	};

	// Update notification status
	const updateFoodFeedbackNotification = async (feedbackData: DatabaseTypes.FoodsFeedbacks) => {
		try {
			const payload = {
				...feedbackData,
				notify: feedbackData?.notify ? null : true,
			};
			const updateFeedbackResult = (await foodFeedbackHelper.updateFoodFeedback(String(feedbackData?.food), profile?.id, payload)) as DatabaseTypes.FoodsFeedbacks;
			if (updateFeedbackResult?.id) {
				dispatch({
					type: UPDATE_FOOD_FEEDBACK_LOCAL,
					payload: updateFeedbackResult,
				});
			} else {
				dispatch({
					type: DELETE_FOOD_FEEDBACK_LOCAL,
					payload: feedbackData?.id,
				});
			}
		} catch (e) {
			console.error('Error creating feedback:', e);
		}
	};

	useEffect(() => {
		if (foodFeedbacks.length > 0) {
			getFoodDetails();
		}
	}, [foodFeedbacks]);

	useEffect(() => {
		const onChange = ({ window }: { window: { width: number } }) => setWindowWidth(window.width);
		const subscription = Dimensions.addEventListener('change', onChange);

		return () => subscription.remove();
	}, []);

	return (
		<AppScreen fullWidth={windowWidth < 600}>
			<View style={styles.imageContainer}>{renderLottie}</View>
			<View style={[styles.infoContainer, { width: '100%' }]}>
				<Text
					style={{
						...styles.label,
						color: theme.header.text,
						fontSize: windowWidth < 500 ? 16 : 18,
						textAlign: 'center',
						writingDirection: isRtl ? 'rtl' : 'ltr',
						alignSelf: 'stretch',
					}}
				>
					{translate(TranslationKeys.notification_index_introduction)}
				</Text>
				<View style={styles.infoRow}></View>
				<Text
					style={{
						...styles.value,
						color: theme.header.text,
						fontSize: windowWidth < 500 ? 16 : 18,
						textAlign: isRtl ? 'right' : 'left',
						writingDirection: isRtl ? 'rtl' : 'ltr',
						alignSelf: 'stretch',
					}}
				>
					{translate(TranslationKeys.foods)}
				</Text>
				{foodWithFeedback &&
					foodWithFeedback?.map((item, index) => (
						<AppListItem
							key={index}
							title={excerpt(getTextFromTranslation(item.data?.translations, language), 90)}
							onPress={() => updateFoodFeedbackNotification(item.feedback)}
							showChevron={false}
							rightElement={
								item?.feedback?.notify ? (
									<View
										style={{
											...styles.bellIconAtiveContainer,
											backgroundColor: primaryColor,
											padding: isWeb ? 12 : 8,
										}}
									>
										<MaterialIcons name="notifications-active" size={24} color={theme.light} />
									</View>
								) : (
									<View
										style={{
											...styles.bellIconContainer,
											borderColor: primaryColor,
											padding: isWeb ? 12 : 8,
										}}
									>
										<MaterialIcons name="notifications" size={24} color={theme.screen.icon} />
									</View>
								)
							}
						/>
					))}
			</View>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_notification} />
		</AppScreen>
	);
};

export default NotificationScreen;
