import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_MARKING_DETAILS, UPDATE_PROFILE } from '@/redux/Types/types';
import PermissionModal from '../PermissionModal/PermissionModal';
import { useTheme } from '@/hooks/useTheme';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import MarkingIcon from '../MarkingIcon';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UserHelper } from '@/helper/UserHelper';
import SettingsList from '@/components/SettingsList';
import SettingsListLikeDislike from '@/components/SettingsListLikeDislike';
import { MarkingLabelProps } from '@/components/MarkingLabels/types';

export interface SettingsListMarkingLabelProps extends MarkingLabelProps {}
// All props are defined in MarkingLabelProps; this named export is kept for
// backwards compatibility and as the canonical type for this component.

const SettingsListMarkingLabel: React.FC<SettingsListMarkingLabelProps> = ({
	markingId,
	handleMenuSheet,
	size = 30,
	groupPosition,
}) => {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const [warning, setWarning] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const language = useAppSelector(state => state.settings.language);
	const user = useAppSelector(state => state.authReducer.user);
	const profile = useAppSelector(state => state.authReducer.profile);
	const markings = useAppSelector(state => state.food.markings);
	const marking = markings?.find((mark: any) => mark.id === markingId);
	const ownMarking = profile?.markings?.find((mark: any) => mark.markings_id === markingId);
	const [likeLoading, setLikeLoading] = useState(false);
	const [dislikeLoading, setDislikeLoading] = useState(false);
	const profileHelper = useMemo(() => new ProfileHelper(), []);
	const isAnonymousUser = UserHelper.isAnonymousUser(user);

	const openMarkingLabel = (marking: DatabaseTypes.Markings) => {
		if (handleMenuSheet) {
			dispatch({
				type: SET_MARKING_DETAILS,
				payload: marking,
			});
			handleMenuSheet();
		}
	};

	const handleAnonymousMarking = (like: boolean) => {
		const markingsCopy = [...(profile?.markings ?? [])];
		const existingIndex = markingsCopy.findIndex((m: any) => m.markings_id === markingId);

		if (existingIndex >= 0) {
			const likeStats = markingsCopy[existingIndex].like === like ? null : like;
			if (likeStats === null) {
				markingsCopy.splice(existingIndex, 1);
			} else {
				markingsCopy[existingIndex] = { ...markingsCopy[existingIndex], like };
			}
		} else {
			markingsCopy.push({
				...ownMarking,
				like,
				markings_id: markingId,
				profiles_id: profile?.id,
			});
		}

		dispatch({ type: UPDATE_PROFILE, payload: { ...profile, markings: markingsCopy } });
	};

	const fetchProfile = async () => {
		try {
			const profile = (await profileHelper.fetchProfileById(user?.profile, {})) as DatabaseTypes.Profiles;
			if (profile) {
				dispatch({ type: UPDATE_PROFILE, payload: profile });
			}
		} catch (error) {
			console.error('Error fetching profiles:', error);
		}
	};

	const handleUpdateMarking = useCallback(
		async (like: boolean) => {
			if (like) {
				setLikeLoading(true);
			} else {
				setDislikeLoading(true);
			}
			if (isAnonymousUser) {
				handleAnonymousMarking(like);
				if (like) {
					setLikeLoading(false);
				} else {
					setDislikeLoading(false);
				}
				return;
			} else {
				try {
					const likeStats = ownMarking?.like === like ? null : like;
					const updatedMarking = { ...ownMarking, like: likeStats };

					const profileData = { ...profile };
					let markingFound = false;

					profileData?.markings.forEach((profileMarkings: any, index: number) => {
						if (profileMarkings.markings_id === updatedMarking?.markings_id) {
							markingFound = true;
							if (updatedMarking?.like === null) {
								profileData.markings.splice(index, 1);
							} else {
								profileData.markings[index] = updatedMarking;
							}
						}
					});

					if (!markingFound) {
						profileData.markings.push({
							...updatedMarking,
							markings_id: markingId,
							profiles_id: profileData?.id,
						});
					}

					dispatch({ type: UPDATE_PROFILE, payload: profileData });

					const result = (await profileHelper.updateProfile(profileData)) as DatabaseTypes.Profiles;
					if (result) {
						fetchProfile();
						if (like) {
							setLikeLoading(false);
						} else {
							setDislikeLoading(false);
						}
					}
				} catch (error) {
					console.error('Error updating marking:', error);
				} finally {
					if (like) {
						setLikeLoading(false);
					} else {
						setDislikeLoading(false);
					}
				}
			}
		},
		[user?.id, profile, ownMarking, markingId, dispatch, profileHelper, fetchProfile]
	);

	// Early return AFTER all hooks have been called
	if (!marking) return null;

	const markingText = getTextFromTranslation(marking?.translations, language);

	const leftIconComponent = (
		<View style={styles.leftIconWrapper}>
			<CustomTooltip
				placement="top"
				trigger={triggerProps =>
					handleMenuSheet ? (
						<Pressable
							{...triggerProps}
							onPress={() => openMarkingLabel(marking)}
							onHoverIn={() => setShowTooltip(true)}
							onHoverOut={() => setShowTooltip(false)}
						>
							<MarkingIcon marking={marking} size={size} />
						</Pressable>
					) : (
						<Pressable
							{...triggerProps}
							onHoverIn={() => setShowTooltip(true)}
							onHoverOut={() => setShowTooltip(false)}
						>
							<MarkingIcon marking={marking} size={size} />
						</Pressable>
					)
				}
			>
				<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
					<TooltipText fontSize="$sm" color={theme.tooltip.text}>
						{`${markingText}`}
					</TooltipText>
				</TooltipContent>
			</CustomTooltip>
		</View>
	);

	const rightElement = (
		<View style={styles.rightRow}>
			<SettingsListLikeDislike
				like={ownMarking?.like}
				onPressLike={() => handleUpdateMarking(true)}
				onPressDislike={() => handleUpdateMarking(false)}
				likeTooltipText={`${translate(TranslationKeys.i_like_that)}: ${translate(ownMarking?.like ? TranslationKeys.active : TranslationKeys.inactive)}: ${translate(TranslationKeys.markings)}: ${markingText}`}
				dislikeTooltipText={`${translate(TranslationKeys.i_dislike_that)}: ${translate(ownMarking?.like === false ? TranslationKeys.active : TranslationKeys.inactive)}: ${translate(TranslationKeys.markings)}: ${markingText}`}
				likeLoading={likeLoading}
				dislikeLoading={dislikeLoading}
			/>
			<PermissionModal isVisible={warning} setIsVisible={setWarning} />
		</View>
	);

	return (
		<SettingsList
			leftIconComponent={leftIconComponent}
			title={markingText || ''}
			rightElement={rightElement}
			groupPosition={groupPosition}
		/>
	);
};

export default SettingsListMarkingLabel;

const styles = StyleSheet.create({
	leftIconWrapper: {
		marginRight: 10,
	},
	rightRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
});
