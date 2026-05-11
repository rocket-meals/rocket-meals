import React, { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { FeedbackLabelProps } from './types';
import { getIconComponent, getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import { FoodFeedbackLabelEntryHelper } from '@/redux/actions/FoodFeeedbackLabelEntries/FoodFeedbackLabelEntries';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { DELETE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL, UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL } from '@/redux/Types/types';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import SettingsList from '@/components/SettingsList';
import SettingsListLikeDislike from '@/components/SettingsListLikeDislike';

const FeedbackLabel: React.FC<FeedbackLabelProps> = ({ label, icon, imageUrl, labelEntries, foodId, offerId, groupPosition, isAccountRequired }) => {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const { language } = useAppSelector((state) => state.settings);
	const [showTooltip, setShowTooltip] = useState(false);
	const { user, profile } = useAppSelector((state) => state.authReducer);
	const selectedCanteen = useSelectedCanteen();
	const { openAccountRequiredModal } = useAccountRequiredModal();
	const foodFeedbackLabelEntryHelper = new FoodFeedbackLabelEntryHelper();

	// Use useMemo to optimize the filtering process
	const labelData = useMemo(() => {
		return labelEntries?.find((entry: DatabaseTypes.FoodsFeedbacksLabelsEntries) => entry.label === label[0]?.foods_feedbacks_labels_id && entry.food === foodId) || ({} as DatabaseTypes.FoodsFeedbacksLabelsEntries);
	}, [label, labelEntries]);

	// Function to handle updating the entry
	const handleUpdateEntry = async (isLike: boolean | null) => {
		if (!user?.id) {
			openAccountRequiredModal();
			return;
		}
		let likeStats = null;
		if (isLike === true && like === true) {
			likeStats = null;
		} else if (isLike === false && like === false) {
			likeStats = null;
		} else {
			likeStats = isLike;
		}
		// Update the entry
		const result = (await foodFeedbackLabelEntryHelper.updateFoodFeedbackLabelEntry(foodId, profile.id, labelEntries, String(label[0]?.foods_feedbacks_labels_id), likeStats, selectedCanteen?.id, offerId)) as DatabaseTypes.FoodsFeedbacksLabelsEntries;
		dispatch({
			type: result ? UPDATE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL : DELETE_OWN_FOOD_FEEDBACK_LABEL_ENTRIES_LOCAL,
			payload: result ? result : labelData.id,
		});
	};

	const { like } = labelData;
	const labelText = getTextFromTranslation(label, language);

	const leftIconComponent = (
		<View style={styles.leftIconWrapper}>
			<CustomTooltip
				placement="top"
				isOpen={showTooltip}
				trigger={triggerProps => (
					<Pressable {...triggerProps} onHoverIn={() => setShowTooltip(true)} onHoverOut={() => setShowTooltip(false)} style={{ cursor: 'default' } as any}>
						{imageUrl && <Image source={{ uri: imageUrl }} style={styles.icon} />}
						{icon && getIconComponent(icon, theme.screen.icon)}
					</Pressable>
				)}
			>
				<TooltipContent
					bg={theme.tooltip.background}
					py="$1"
					px="$2"
				>
					<TooltipText fontSize="$sm" color={theme.tooltip.text}>
						{labelText}
					</TooltipText>
				</TooltipContent>
			</CustomTooltip>
		</View>
	);

	const rightElement = (
		<SettingsListLikeDislike
			like={like}
			onPressLike={() => handleUpdateEntry(true)}
			onPressDislike={() => handleUpdateEntry(false)}
			likeTooltipText={`${translate(TranslationKeys.i_like_that)}: ${translate(like ? TranslationKeys.active : TranslationKeys.inactive)}: ${labelText}`}
			dislikeTooltipText={`${translate(TranslationKeys.i_dislike_that)}: ${translate(like === false ? TranslationKeys.active : TranslationKeys.inactive)}: ${labelText}`}
		/>
	);

	return (
		<SettingsList
			leftIconComponent={leftIconComponent}
			title={labelText || ''}
			rightElement={rightElement}
			groupPosition={groupPosition}
			isAccountRequired={isAccountRequired}
			onAccountRequired={openAccountRequiredModal}
		/>
	);
};

export default FeedbackLabel;

const styles = StyleSheet.create({
	leftIconWrapper: {
		marginRight: 10,
	},
	icon: {
		width: 30,
		height: 30,
		resizeMode: 'cover',
		borderRadius: 25,
	},
});
