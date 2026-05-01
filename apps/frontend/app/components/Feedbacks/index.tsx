import React, { memo, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { AntDesign, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import FeedbackLabel from '../FeedbackLabel';
import { isWeb } from '@/constants/Constants';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { getpreviousFeedback, numToOneDecimal } from '@/constants/HelperFunctions';
import { DatabaseTypes, DateHelper } from 'repo-depkit-common';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import useToast from '@/hooks/useToast';
import { DELETE_FOOD_FEEDBACK_LOCAL, UPDATE_FOOD_FEEDBACK_LOCAL } from '@/redux/Types/types';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/ColorHelper';
import SettingsList from '@/components/SettingsList';
import SettingsListTextInput from '@/components/SettingsListTextInput';
import { TranslationKeys } from '@/locales/keys';
import { FeedbacksProps } from './types';
import { RootState } from '@/redux/reducer';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';

const loadingState = {
	submitLoading: false,
	deleteLoading: false,
};

const Feedbacks: React.FC<FeedbacksProps> = ({ foodDetails, offerId, canteenId }) => {
	const toast = useToast();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const foodOfferCanteenId = canteenId;
	const { width: screenWidth } = useWindowDimensions();
	
	const user = useAppSelector((state) => state.authReducer.user, shallowEqual);
	const profile = useAppSelector((state) => state.authReducer.profile, shallowEqual);
	const primaryColor = useAppSelector((state) => state.settings.primaryColor);
	const appSettings = useAppSelector((state) => state.settings.appSettings, shallowEqual);
	const mode = useAppSelector((state) => state.settings.selectedTheme);

	const [commentType, setCommentType] = useState('');
	const [loading, setLoading] = useState(loadingState);
	const [comment, setComment] = useState('');
	const { openAccountRequiredModal } = useAccountRequiredModal();
	const foodFeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);

	// Optimized Selectors
	const foodId = foodDetails?.id;
	const labels = useAppSelector((state) => state.food.foodFeedbackLabels, shallowEqual);
	const labelEntries = useAppSelector((state) => state.food.ownfoodFeedbackLabelEntries, shallowEqual);
	const ownFoodFeedbacks = useAppSelector((state) => state.food.ownFoodFeedbacks, shallowEqual);
	
	const previousFeedback = useMemo(() => {
		return getpreviousFeedback(ownFoodFeedbacks, foodId);
	}, [ownFoodFeedbacks, foodId]);

	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
	const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');

	useEffect(() => {
		if (appSettings?.foods_feedbacks_comments_type) {
			setCommentType(appSettings?.foods_feedbacks_comments_type);
		}
	}, [appSettings?.foods_feedbacks_comments_type]);

	const submitCommentFeedback = async (string: string | null) => {
		if (!user?.id) {
			openAccountRequiredModal();
			return;
		}

		if (string !== null && !string.trim()) {
			toast('Please write a comment', 'error');
			return;
		}

		// Set loading state based on whether string is null or not
		setLoading(prev => ({
			...prev,
			[string === null ? 'deleteLoading' : 'submitLoading']: true,
		}));

		try {
			const result = (await foodFeedbackHelper.updateFoodFeedback(foodDetails?.id, profile?.id, { ...previousFeedback, comment: string, canteen: foodOfferCanteenId })) as DatabaseTypes.FoodsFeedbacks;
			// Dispatch the correct action
			dispatch({
				type: result?.id ? UPDATE_FOOD_FEEDBACK_LOCAL : DELETE_FOOD_FEEDBACK_LOCAL,
				payload: result?.id ? result : previousFeedback.id,
			});

			// Clear comment and reset loading state
			setComment('');
			setLoading(loadingState);
		} catch (error) {
			console.error('Error submitting comment feedback:', error);
			setLoading(loadingState);
		}
	};

	useEffect(() => {
		if (previousFeedback.comment) {
			setComment(previousFeedback.comment);
		}
	}, [previousFeedback]);

	const handleTextChange = (text: string) => {
		if (!user?.id) {
			openAccountRequiredModal();
			return;
		}

		if (text.length > 120) {
			toast('Comment should be less than 500 characters', 'error');
			return;
		}
		setComment(text);
	};

	const resp = screenWidth > 800;
	
    const ratingSummaryItems = useMemo(() => {
        const rating = foodDetails?.rating_average ?? foodDetails?.rating_average_legacy;
        const ratingAmount = foodDetails?.rating_amount ?? foodDetails?.rating_amount_legacy;
        const showRatingsAmount = appSettings?.foods_ratings_amount_display;
        const showRatingsAverage = appSettings?.foods_ratings_average_display;
        const items = [];
        if (showRatingsAmount) {
            items.push({
                key: 'ratings-amount',
                icon: <Ionicons name="bar-chart" size={20} />,
                leftText: translate(TranslationKeys.amount_ratings),
                rightText: ratingAmount !== null && ratingAmount !== undefined ? `${ratingAmount}` : '-',
            });
        }
        if (showRatingsAverage) {
            items.push({
                key: 'ratings-average',
                icon: <AntDesign name="star" size={20} />,
                leftText: translate(TranslationKeys.average_rating),
                rightText: typeof rating === 'number' && !Number.isNaN(rating) ? `${numToOneDecimal(rating)}` : '-',
            });
        }
        return items;
    }, [foodDetails?.rating_average, foodDetails?.rating_average_legacy, foodDetails?.rating_amount, foodDetails?.rating_amount_legacy, appSettings?.foods_ratings_amount_display, appSettings?.foods_ratings_average_display, translate]);

    const showRatingsAmount = appSettings?.foods_ratings_amount_display;
    const showRatingsAverage = appSettings?.foods_ratings_average_display;

	const otherComments = useMemo(() => {
        return foodDetails?.feedbacks?.filter((feedback: any) => feedback.profile !== profile?.id && feedback.comment)
            .sort((a: any, b: any) => new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime()) || [];
    }, [foodDetails?.feedbacks, profile?.id]);

	return (
		<View style={styles.container}>
			{showRatingsAmount ||
				(showRatingsAverage && (
					<Text
						style={[
							styles.heading,
							isWeb ? styles.headingWeb : styles.headingMobile,
							{ color: theme.screen.text }
						]}
					>
						{translate(TranslationKeys.food_feedbacks)}
					</Text>
				))}
			{ratingSummaryItems.length > 0 && (
				<View style={styles.ratingSummaryContainer}>
					{ratingSummaryItems.map((item, index) => {
						const groupPosition =
							ratingSummaryItems.length === 1 ? 'single' : index === 0 ? 'top' : index === ratingSummaryItems.length - 1 ? 'bottom' : 'middle';
						return (
							<SettingsList
								key={item.key}
								iconBgColor={foods_area_color}
								leftIcon={item.icon}
								label={item.leftText}
								value={item.rightText}
								groupPosition={groupPosition}
							/>
						);
					})}
				</View>
			)}

			<Text
				style={[
					styles.heading,
					isWeb ? styles.headingWeb : styles.headingMobile,
					{ color: theme.screen.text }
				]}
			>
				{translate(TranslationKeys.feedback_labels)}
			</Text>
			{labels.map((label: any, index: number) => {
				const total = labels.length;
				const groupPosition = total === 1 ? 'single' : index === 0 ? 'top' : index === total - 1 ? 'bottom' : 'middle';
				return (
					<FeedbackLabel key={label.id} label={label.translations} icon={label.icon ? label.icon : undefined} imageUrl={label.image ? label.image : undefined} labelEntries={labelEntries} foodId={foodDetails?.id} offerId={offerId} groupPosition={groupPosition} isAccountRequired={!user?.id} />
				);
			})}
			{commentType !== 'disabled' && commentType !== 'read' && (
				<View style={styles.commentSectionContainer}>
					<SettingsListTextInput
						label={translate(TranslationKeys.your_comment)}
						value={comment || translate(TranslationKeys.write_a_comment)}
						initialValue={comment || ''}
						placeholder={translate(TranslationKeys.your_comment)}
						onSave={submitCommentFeedback}
						leftIcon={<MaterialCommunityIcons name="chat-outline" size={20} />}
						iconBgColor={foods_area_color}
						multiline={true}
						numberOfLines={3}
						groupPosition="single"
						saveLabel={translate(TranslationKeys.save_comment)}
						checkTextInput={(value) => ({ isValid: value.length <= 120, value })}
						isAccountRequired={!user?.id}
						onAccountRequired={openAccountRequiredModal}
					/>
				</View>
			)}
			{commentType !== 'disabled' && (
				<>
					{previousFeedback && previousFeedback.comment && (
						<View style={styles.commentsContainer}>
							<View style={styles.commentsHeader}>
								<Text
									style={[
										styles.heading,
										styles.subHeading,
										{ color: theme.screen.text }
									]}
								>
									{translate(TranslationKeys.your_comment)}
								</Text>
								<TouchableOpacity
									style={[
										styles.deleteButton,
										{ backgroundColor: theme.screen.iconBg }
									]}
									onPress={() => submitCommentFeedback(null)}
								>
									{loading.deleteLoading ? <ActivityIndicator color={foods_area_color} size={20} /> : <MaterialIcons name="delete-outline" size={24} color={'red'} />}
								</TouchableOpacity>
							</View>
							<View style={styles.comment}>
								<Text style={[styles.commentText, { color: theme.screen.text }]}>{previousFeedback.comment}</Text>
								<Text style={[styles.commentDate, { color: theme.screen.text }]}>{DateHelper.formatOfferDateToReadable(previousFeedback.updated_at, true, true)}</Text>
								<View style={styles.divider} />
							</View>
						</View>
					)}
					{commentType !== 'write' && (
						<>
							{otherComments?.length > 0 && (
								<View style={styles.commentsContainer}>
									<Text
										style={[
											styles.heading,
											styles.subHeading,
											{ color: theme.screen.text }
										]}
									>
										{translate(TranslationKeys.others_comments)}
									</Text>
									{otherComments.map(feedback => (
										<View key={feedback.id} style={styles.comment}>
											<Text
												style={[
													styles.commentText,
													{ color: theme.screen.text }
												]}
											>
												{feedback.comment}
											</Text>
											<Text
												style={[
													styles.commentDate,
													{ color: theme.screen.text }
												]}
											>
												{DateHelper.formatOfferDateToReadable(feedback.date_updated, true, true)}
											</Text>
											<View style={styles.divider} />
										</View>
									))}
								</View>
							)}
						</>
					)}
				</>
			)}

		</View>
	);
};

export default memo(Feedbacks, (prevProps, nextProps) => {
    return (
        prevProps.offerId === nextProps.offerId &&
        prevProps.canteenId === nextProps.canteenId &&
        prevProps.foodDetails?.id === nextProps.foodDetails?.id &&
        prevProps.foodDetails?.rating_average === nextProps.foodDetails?.rating_average &&
        prevProps.foodDetails?.rating_amount === nextProps.foodDetails?.rating_amount &&
        prevProps.foodDetails?.feedbacks === nextProps.foodDetails?.feedbacks
    );
});
