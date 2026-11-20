import React, { memo, useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { AntDesign, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import FeedbackLabel from '../FeedbackLabel';
import { isWeb } from '@/constants/Constants';
import { useDispatch, shallowEqual } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { getpreviousFeedback, numToOneDecimal } from '@/constants/HelperFunctions';
import { DatabaseTypes, DateHelper, FoodFeedbackCommentHistoryHelper, FoodFeedbackCommentUpdate } from 'repo-depkit-common';
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
import FoodFeedbackCommentTimeline, { FOOD_FEEDBACK_COMMENT_MAX_LENGTH } from '@/components/FoodFeedbackCommentTimeline';

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

	const ownCommentEntries = useMemo(() => FoodFeedbackCommentHistoryHelper.getEntries(previousFeedback), [previousFeedback]);

	/**
	 * Saves a change of the own comments. A new comment is added on top of the earlier ones, so the
	 * history shows how the impression changed. `comment` always holds the newest entry.
	 */
	const saveCommentUpdate = async (update: FoodFeedbackCommentUpdate, addsText: boolean) => {
		// Deleting own comments stays possible, writing needs the right to write.
		if (!user?.id || (addsText && !canWriteComments)) {
			openCommentLockedModal();
			return;
		}

		setLoading(prev => ({
			...prev,
			[addsText ? 'submitLoading' : 'deleteLoading']: true,
		}));

		try {
			const result = (await foodFeedbackHelper.updateFoodFeedback(foodDetails?.id, profile?.id, { ...previousFeedback, ...update, canteen: foodOfferCanteenId })) as DatabaseTypes.FoodsFeedbacks;
			dispatch({
				type: result?.id ? UPDATE_FOOD_FEEDBACK_LOCAL : DELETE_FOOD_FEEDBACK_LOCAL,
				payload: result?.id ? result : previousFeedback.id,
			});
			setLoading(loadingState);
			if (addsText) {
				void askForPushNotifications(PushNotificationOptInCategory.FOOD_COMMENT);
			}
		} catch (error) {
			console.error('Error submitting comment feedback:', error);
			setLoading(loadingState);
		}
	};

	const submitNewComment = async (text: string) => {
		if (!text.trim()) {
			toast('Please write a comment', 'error');
			return;
		}
		await saveCommentUpdate(FoodFeedbackCommentHistoryHelper.addComment(previousFeedback, text), true);
	};

	const editOwnComment = async (index: number, text: string) => {
		await saveCommentUpdate(FoodFeedbackCommentHistoryHelper.editEntry(previousFeedback, index, text), !!text.trim());
	};

	const deleteOwnComment = async (index: number) => {
		await saveCommentUpdate(FoodFeedbackCommentHistoryHelper.removeEntry(previousFeedback, index), false);
	};

	const deleteAllOwnComments = async () => {
		await saveCommentUpdate(FoodFeedbackCommentHistoryHelper.removeAll(), false);
	};

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
						label={translate(TranslationKeys.write_new_comment)}
						value={translate(TranslationKeys.write_a_comment)}
						initialValue={''}
						placeholder={translate(TranslationKeys.your_comment)}
						onSave={submitNewComment}
						leftIcon={<MaterialCommunityIcons name="chat-outline" size={20} />}
						iconBgColor={foods_area_color}
						multiline={true}
						numberOfLines={3}
						groupPosition="single"
						saveLabel={translate(TranslationKeys.save_comment)}
						hint={translate(TranslationKeys.no_personal_data_hint)}
						checkTextInput={(value) => ({ isValid: value.length <= FOOD_FEEDBACK_COMMENT_MAX_LENGTH, value })}
						isAccountRequired={isCommentInputLocked}
						onAccountRequired={openCommentLockedModal}
					/>
				</View>
			)}
			{commentType !== 'disabled' && (
				<>
					<FoodFeedbackCommentTimeline
						entries={ownCommentEntries}
						onEdit={editOwnComment}
						onDelete={deleteOwnComment}
						onDeleteAll={deleteAllOwnComments}
						loading={loading.deleteLoading || loading.submitLoading}
						accentColor={foods_area_color}
						headingStyle={[styles.heading, styles.subHeading]}
					/>
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
