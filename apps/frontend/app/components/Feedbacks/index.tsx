import {
	ActivityIndicator,
	Dimensions,
	Platform,
	Text,
	TextInput,
	TouchableOpacity,
	View,
} from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import FeedbackLabel from '../FeedbackLabel';
import { isWeb } from '@/constants/Constants';
import { useDispatch, useSelector } from 'react-redux';
import {
	getpreviousFeedback,
	numToOneDecimal,
} from '@/constants/HelperFunctions';
import { DatabaseTypes } from 'repo-depkit-common';
import { FoodFeedbackHelper } from '@/redux/actions/FoodFeedbacks/FoodFeedbacks';
import useToast from '@/hooks/useToast';
import { DateHelper } from 'repo-depkit-common';
import {
	DELETE_FOOD_FEEDBACK_LOCAL,
	UPDATE_FOOD_FEEDBACK_LOCAL,
} from '@/redux/Types/types';
import PermissionModal from '../PermissionModal/PermissionModal';
import { createSelector } from 'reselect';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/colorHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import { FeedbacksProps } from './types';
import { RootState } from '@/redux/reducer';

const loadingState = {
	submitLoading: false,
	deleteLoading: false,
};

const selectFeedbackData = createSelector(
	[(state: RootState) => state.food, (state: any, foodId: string) => foodId],
	(food, foodId) => ({
		labels: food.foodFeedbackLabels,
		labelEntries: food.ownfoodFeedbackLabelEntries,
		previousFeedback: getpreviousFeedback(food.ownFoodFeedbacks, foodId),
	})
);

const Feedbacks: React.FC<FeedbacksProps> = ({
	foodDetails,
	offerId,
	canteenId,
}) => {
	const toast = useToast();
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const foodOfferCanteenId = canteenId;
	const { user, profile } = useSelector((state: RootState) => state.authReducer);
	const {
		appSettings,
		primaryColor,
		selectedTheme: mode,
	} = useSelector((state: RootState) => state.settings);
	const [commentType, setCommentType] = useState('');
	const [loading, setLoading] = useState(loadingState);
	const [warning, setWarning] = useState(false);
	const [comment, setComment] = useState('');
	const foodFeedbackHelper = useMemo(() => new FoodFeedbackHelper(), []);
	const { labels, labelEntries, previousFeedback } = useSelector((state: any) =>
		selectFeedbackData(state, foodDetails?.id)
	);
	const foods_area_color = appSettings?.foods_area_color
		? appSettings?.foods_area_color
		: primaryColor;
	const contrastColor = myContrastColor(
		foods_area_color,
		theme,
		mode === 'dark'
	);
	useEffect(() => {
		if (appSettings?.foods_feedbacks_comments_type) {
			setCommentType(appSettings?.foods_feedbacks_comments_type);
		}
	}, [appSettings]);

	const submitCommentFeedback = async (string: string | null) => {
		if (!user?.id) {
			setWarning(true);
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
			const result = (await foodFeedbackHelper.updateFoodFeedback(
				foodDetails?.id,
				profile?.id,
				{ ...previousFeedback, comment: string, canteen: foodOfferCanteenId }
			)) as DatabaseTypes.FoodsFeedbacks;
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
			setWarning(true);
			return;
		}

		if (text.length > 120) {
			toast('Comment should be less than 500 characters', 'error');
			return;
		}
		setComment(text);
	};

	const resp = Dimensions.get('window').width > 800;
	const rating =
		foodDetails?.rating_average ?? foodDetails?.rating_average_legacy;

	const otherComments = foodDetails?.feedbacks
		?.filter(feedback => feedback.profile !== profile.id && feedback.comment)
		.sort(
			(a, b) =>
				new Date(b.date_updated).getTime() - new Date(a.date_updated).getTime()
		);
	return (
		<View style={styles.container}>
			{appSettings?.foods_ratings_amount_display ||
				(appSettings?.foods_ratings_average_display && (
					<Text
						style={{
							...styles.heading,
							color: theme.screen.text,
							fontSize: isWeb ? 26 : 24,
						}}
					>
						{translate(TranslationKeys.food_feedbacks)}
					</Text>
				))}
			{appSettings?.foods_ratings_amount_display && (
				<Tooltip
					placement="top"
					trigger={triggerProps => (
						<TouchableOpacity
							{...triggerProps}
							style={{ ...styles.row, cursor: 'default' }}
						>
							<View style={styles.col}>
								<Ionicons
									name="bar-chart"
									size={isWeb ? 24 : 22}
									color={theme.screen.text}
								/>
								<Text
									style={{
										...styles.label,
										color: theme.screen.text,
										fontSize: isWeb ? 18 : 14,
									}}
								>
									{translate(TranslationKeys.amount_ratings)}
								</Text>
							</View>
							<Text
								style={{
									...styles.label,
									color: theme.screen.text,
									fontSize: isWeb ? 18 : 14,
								}}
							>
								{foodDetails?.rating_amount || foodDetails?.rating_amount_legacy}
							</Text>
						</TouchableOpacity>
					)}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{translate(TranslationKeys.amount_ratings)}
						</TooltipText>
					</TooltipContent>
				</Tooltip>
			)}
			{appSettings?.foods_ratings_average_display && (
				<Tooltip
					placement="top"
					trigger={triggerProps => (
						<TouchableOpacity
							{...triggerProps}
							style={{ ...styles.row, cursor: 'default' }}
						>
							<View style={styles.col}>
								<AntDesign
									name="areachart"
									size={isWeb ? 24 : 22}
									color={theme.screen.icon}
								/>
								<Text
									style={{
										...styles.label,
										color: theme.screen.text,
										fontSize: isWeb ? 18 : 14,
										marginTop: 2,
									}}
								>
									{translate(TranslationKeys.average_rating)}
								</Text>
							</View>
							<Text
								style={{
									...styles.label,
									color: theme.screen.text,
									fontSize: isWeb ? 18 : 14,
									marginTop: 2,
								}}
							>
								{typeof rating === 'number' && !isNaN(rating) && (
									<Text>{numToOneDecimal(rating)}</Text>
								)}
							</Text>
						</TouchableOpacity>
					)}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{translate(TranslationKeys.average_rating)}
						</TooltipText>
					</TooltipContent>
				</Tooltip>
			)}

			<Text
				style={{
					...styles.heading,
					color: theme.screen.text,
					fontSize: isWeb ? 26 : 24,
				}}
			>
				{translate(TranslationKeys.feedback_labels)}
			</Text>
			{labels.map((label: any) => (
				<FeedbackLabel
					key={label.id}
					label={label.translations}
					icon={label.icon ? label.icon : undefined}
					imageUrl={label.image ? label.image : undefined}
					labelEntries={labelEntries}
					foodId={foodDetails?.id}
					offerId={offerId}
				/>
			))}
			{commentType !== 'disabled' && commentType !== 'read' && (
				<View
					style={{
						...styles.searchContainer,
						backgroundColor: theme.screen.iconBg,
						flexDirection: resp ? 'row' : 'column',
						borderRadius: resp ? 50 : 8,
						gap: 20,
					}}
				>
					<TextInput
						style={[
							styles.input,
							{ width: resp ? '70%' : '100%' },
							Platform.OS === 'web' && ({ outlineStyle: 'none' } as any),
						]}
						cursorColor={theme.modal.text}
						placeholderTextColor={theme.modal.placeholder}
						onChangeText={handleTextChange}
						value={comment}
						placeholder={translate(TranslationKeys.your_comment)}
						editable={
							commentType === 'disabled' || commentType === 'read' ? false : true
						}
					/>
					<TouchableOpacity
						style={{
							...styles.commentButton,
							width: resp ? 220 : '90%',
							borderRadius: resp ? 50 : 50,
							backgroundColor: foods_area_color,
						}}
						onPress={() => {
							submitCommentFeedback(comment);
						}}
						disabled={previousFeedback?.comment === comment}
					>
						{loading.submitLoading ? (
							<ActivityIndicator color={theme.background} size={22} />
						) : (
							<Text style={[styles.commentLabel, { color: contrastColor }]}>
								{translate(TranslationKeys.save_comment)}
							</Text>
						)}
					</TouchableOpacity>
				</View>
			)}
			{commentType !== 'disabled' && (
				<>
					{previousFeedback && previousFeedback.comment && (
						<View style={styles.commentsContainer}>
							<View
								style={{
									width: '100%',
									flexDirection: 'row',
									justifyContent: 'space-between',
									alignItems: 'center',
								}}
							>
								<Text
									style={{
										...styles.heading,
										color: theme.screen.text,
										fontSize: 24,
									}}
								>
									{translate(TranslationKeys.your_comment)}
								</Text>
								<TouchableOpacity
									style={{
										...styles.deleteButton,
										backgroundColor: theme.screen.iconBg,
									}}
									onPress={() => submitCommentFeedback(null)}
								>
									{loading.deleteLoading ? (
										<ActivityIndicator color={foods_area_color} size={20} />
									) : (
										<MaterialIcons name="delete-outline" size={24} color={'red'} />
									)}
								</TouchableOpacity>
							</View>
							<View style={styles.comment}>
								<Text style={{ ...styles.commentText, color: theme.screen.text }}>
									{previousFeedback.comment}
								</Text>
								<Text style={{ ...styles.commentDate, color: theme.screen.text }}>
									{DateHelper.formatOfferDateToReadable(
										previousFeedback.updated_at,
										true,
										true
									)}
								</Text>
								<View style={styles.divider} />
							</View>
						</View>
					)}
					{commentType !== 'write' && (
						<>
							{otherComments?.length > 0 && (
								<View style={styles.commentsContainer}>
									<Text
										style={{
											...styles.heading,
											color: theme.screen.text,
											fontSize: 24,
										}}
									>
										{translate(TranslationKeys.others_comments)}
									</Text>
									{otherComments.map(feedback => (
										<View key={feedback.id} style={styles.comment}>
											<Text
												style={{
													...styles.commentText,
													color: theme.screen.text,
												}}
											>
												{feedback.comment}
											</Text>
											<Text
												style={{
													...styles.commentDate,
													color: theme.screen.text,
												}}
											>
												{DateHelper.formatOfferDateToReadable(
													feedback.date_updated,
													true,
													true
												)}
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

			<PermissionModal isVisible={warning} setIsVisible={setWarning} />
		</View>
	);
};

export default Feedbacks;
