import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { CanteenFeedbackLabelProps, ModifiedCanteensFeedbacksLabelsEntries } from './types';
import { getIconComponent, getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import { DELETE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES, UPDATE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES } from '@/redux/Types/types';
import useAccountRequiredModal from '@/hooks/useAccountRequiredModal';
import { getImageUrl } from '@/constants/HelperFunctions';
import { CanteenFeedbackLabelEntryHelper } from '@/redux/actions/CanteenFeedbackLabelEntries/CanteenFeedbackLabelEntries';
import { isSameDay } from 'date-fns';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import SettingsList from '@/components/SettingsList';
import SettingsListLikeDislike from '@/components/SettingsListLikeDislike';

const CanteenFeedbackLabels: React.FC<CanteenFeedbackLabelProps> = ({ label, date, groupPosition, isAccountRequired }) => {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const canteenFeedbackLabelEntryHelper = new CanteenFeedbackLabelEntryHelper();
	const { openAccountRequiredModal } = useAccountRequiredModal();
	const [showTooltip, setShowTooltip] = useState(false);
	const { language } = useAppSelector((state) => state.settings);
	const [count, setCount] = useState({ likes: 0, dislikes: 0 });
	const { user, profile } = useAppSelector((state) => state.authReducer);
	const { ownCanteenFeedBackLabelEntries } = useAppSelector((state) => state.canteenReducer);
	const selectedCanteen = useSelectedCanteen();

	// Use useMemo to optimize the filtering processs
	const labelData = useMemo(() => {
		return ownCanteenFeedBackLabelEntries?.find((entry: DatabaseTypes.CanteensFeedbacksLabelsEntries) => entry.label === label?.id && entry.canteen === selectedCanteen?.id && entry.date && isSameDay(entry.date, date)) || ({} as DatabaseTypes.FoodsFeedbacksLabelsEntries);
	}, [ownCanteenFeedBackLabelEntries, date]);

	// Function to handle updating the entry
	const handleUpdateEntry = async (isLike: boolean | null) => {
		if (!user?.id) {
			openAccountRequiredModal();
			return;
		}
		if (!selectedCanteen?.id) return;
		let likeStats = null;
		if (isLike === true && labelData?.like === true) {
			likeStats = null;
		} else if (isLike === false && labelData?.like === false) {
			likeStats = null;
		} else {
			likeStats = isLike;
		}
		// Update the entry
		try {
			const result = (await canteenFeedbackLabelEntryHelper.updateCanteenFeedbackLabelEntry(profile.id, ownCanteenFeedBackLabelEntries, label?.id, likeStats, selectedCanteen.id, date)) as DatabaseTypes.CanteensFeedbacksLabelsEntries;
			getLabelEntries(label?.id);
			dispatch({
				type: result ? UPDATE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES : DELETE_OWN_CANTEEN_FEEDBACK_LABEL_ENTRIES,
				payload: result ? result : labelData.id,
			});
		} catch (error) {
			if ((error as any)?.status === 403) {
				openAccountRequiredModal();
			} else {
				console.error('Failed to update canteen feedback label entry:', error);
			}
		}
	};

	const getLabelEntries = async (labelId: string) => {
		if (!selectedCanteen?.id) return;
		const result = (await canteenFeedbackLabelEntryHelper.fetchCanteenFeedbackLabelEntries({}, date, selectedCanteen.id, labelId)) as unknown as ModifiedCanteensFeedbacksLabelsEntries[];
		if (result) {
			const likes = result?.find(entry => entry.like === true)?.count || 0;
			const dislikes = result?.find(entry => entry.like === false)?.count || 0;

			setCount({ likes: Number(likes), dislikes: Number(dislikes) });
		}
	};

	useEffect(() => {
		if (label?.id) {
			getLabelEntries(label?.id);
		}
	}, [label?.id, date]);

	const imageId = typeof label?.image === 'string' ? label.image : (label?.image as any)?.id;
	const labelText = getTextFromTranslation(label?.translations, language);

	const leftIconComponent = (
		<View style={styles.leftIconWrapper}>
			<CustomTooltip
				placement="top"
				isOpen={showTooltip}
				trigger={triggerProps => (
					<Pressable style={{ cursor: 'default' } as any} {...triggerProps} onHoverIn={() => setShowTooltip(true)} onHoverOut={() => setShowTooltip(false)}>
						{label?.image_remote_url || label?.image ? (
							<Image
								source={{
									uri: label?.image_remote_url || (imageId ? getImageUrl(imageId) : '') || '',
								}}
								style={styles.icon}
							/>
						) : (
							label?.icon && getIconComponent(label?.icon, theme.screen.icon)
						)}
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
			like={labelData?.like}
			onPressLike={() => handleUpdateEntry(true)}
			onPressDislike={() => handleUpdateEntry(false)}
			likeTooltipText={`${translate(TranslationKeys.i_like_that)}: ${translate(labelData?.like ? TranslationKeys.active : TranslationKeys.inactive)}: ${labelText}`}
			dislikeTooltipText={`${translate(TranslationKeys.i_dislike_that)}: ${translate(labelData?.like === false ? TranslationKeys.active : TranslationKeys.inactive)}: ${labelText}`}
			likeCount={count.likes > 0 ? count.likes : undefined}
			dislikeCount={count.dislikes > 0 ? count.dislikes : undefined}
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

export default CanteenFeedbackLabels;

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
