import React, { memo, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
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
import SettingsList from '@/components/SettingsList';
import SettingsListTextInput from '@/components/SettingsListTextInput';
import { TranslationKeys } from '@/locales/keys';
import { FeedbacksProps } from './types';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import useFoodFeedbackPermissions from '@/hooks/useFoodFeedbackPermissions';
import usePushNotificationOptInPrompt from '@/hooks/usePushNotificationOptInPrompt';
import { PushNotificationOptInCategory } from '@/helper/PushNotificationOptInHelper';

const loadingState = {
	submitLoading: false,
	deleteLoading: false,
};

const getGroupPosition = (index: number, total: number): 'single' | 'top' | 'bottom' | 'middle' => {
	if (total === 1) {
		return 'single';
	}
	if (index === 0) {
		return 'top';
	}
	if (index === total - 1) {
		return 'bottom';
	}
	return 'middle';
};

const Feedbacks: React.FC<FeedbacksProps> = ({ foodDetails, offerId, canteenId, isManagement }) => {
	const toast = useToast();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const foodOfferCanteenId = canteenId;
	
	const user = useAppSelector((state) => state.authReducer.user, shallowEqual);
	const profile = useAppSelector((state) => state.authReducer.profile, shallowEqual);
	const primaryColor = useAppSelector((state) => state.settings.primaryColor);
	const appSettings = useAppSelector((state) => state.settings.appSettings, shallowEqual);

	// Unverified profiles (guests) may have a different comments type, see useFoodFeedbackPermissions.
	// The input is shown whenever verified accounts may write; for anyone who may not (anonymous
	// users, guests when only verified accounts may write) it is locked.
	const { commentsType: commentType, canWriteComments, showCommentInput, writingCommentsRequiresVerifiedAccount } = useFoodFeedbackPermissions();
	const [loading, setLoading] = useState(loadingState);
	const [comment, setComment] = useState('');
	const [adminFeedbacks, setAdminFeedbacks] = useState<DatabaseTypes.FoodsFeedbacks[]>([]);
	const { openAccountRequiredModal } = useAccountRequiredModal();
	const { askForPushNotifications } = usePushNotificationOptInPrompt();
	const isCommentInputLocked = !user?.id || !canWriteComments;
	const openCommentLockedModal = () => openAccountRequiredModal({ verifiedAccountRequired: writingCommentsRequiresVerifiedAccount });
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

	useEffect(() => {
		if (!isManagement || !foodId) return;
		foodFeedbackHelper.fetchAllFoodFeedbacks({
			filter: {
				_and: [
					{ food: { _eq: foodId } },
					{ comment: { _nnull: true } },
				],
			},
			sort: ['-date_updated'],
		}).then((result) => {
			setAdminFeedbacks(Array.isArray(result) ? result : []);
		}).catch((error) => {
			console.error('Error fetching admin feedbacks:', error);
		});
	}, [isManagement, foodId, foodFeedbackHelper]);

	const submitCommentFeedback = async (string: string | null) => {
		// Deleting the own comment (null) stays possible, writing needs the right to write.
		if (!user?.id || (string !== null && !canWriteComments)) {
			openCommentLockedModal();
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
			if (string !== null) {
				void askForPushNotifications(PushNotificationOptInCategory.FOOD_COMMENT);
			}
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
        const feedbackSource = (isManagement && adminFeedbacks.length > 0)
            ? adminFeedbacks
            : (foodDetails?.feedbacks ?? []);
        return feedbackSource
            .filter((feedback: any) => feedback.profile !== profile?.id && feedback.comment)
            .sort((a: any, b: any) => new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime());
    }, [isManagement, adminFeedbacks, foodDetails?.feedbacks, profile?.id]);

	const commentTypeIncludesRead = commentType === 'read' || commentType === 'readAndWrite';
	const showOtherCommentsForAdmin = isManagement === true && otherComments.length > 0 && !commentTypeIncludesRead;

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
						const groupPosition = getGroupPosition(index, ratingSummaryItems.length);
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
				const groupPosition = getGroupPosition(index, total);
				return (
					<FeedbackLabel key={label.id} label={label.translations} icon={label.icon ? label.icon : undefined} imageUrl={label.image ? label.image : undefined} labelEntries={labelEntries} foodId={foodDetails?.id} offerId={offerId} groupPosition={groupPosition} isAccountRequired={!user?.id} />
				);
			})}
			{showCommentInput && (
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
						hint={translate(TranslationKeys.no_personal_data_hint)}
						checkTextInput={(value) => ({ isValid: value.length <= 120, value })}
						isAccountRequired={isCommentInputLocked}
						onAccountRequired={openCommentLockedModal}
					/>
				</View>
			)}
			{commentType !== 'disabled' && (
				<>
					{previousFeedback?.comment && (
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
									{loading.deleteLoading ? <LoadingIndicator color={foods_area_color} size={20} /> : <MaterialIcons name="delete-outline" size={24} color={'red'} />}
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
			{showOtherCommentsForAdmin && (
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
					<Text style={[styles.adminNoticeText, { color: foods_area_color }]}>
						{translate(TranslationKeys.admin_only_comments_notice)}
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

		</View>
	);
};

export default memo(Feedbacks, (prevProps, nextProps) => {
    return (
        prevProps.offerId === nextProps.offerId &&
        prevProps.canteenId === nextProps.canteenId &&
        prevProps.isManagement === nextProps.isManagement &&
        prevProps.foodDetails?.id === nextProps.foodDetails?.id &&
        prevProps.foodDetails?.rating_average === nextProps.foodDetails?.rating_average &&
        prevProps.foodDetails?.rating_amount === nextProps.foodDetails?.rating_amount &&
        prevProps.foodDetails?.feedbacks === nextProps.foodDetails?.feedbacks
    );
});
