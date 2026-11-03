import React, { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { MarkingLabelProps } from './types';

import { SET_MARKING_DETAILS, UPDATE_PROFILE } from '@/redux/Types/types';
import PermissionModal from '../PermissionModal/PermissionModal';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import styles from './styles';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import MarkingIcon from '../MarkingIcon';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UserHelper } from '@/helper/UserHelper';

const MarkingIconTrigger = ({
	triggerProps,
	onPress,
	onHoverIn,
	onHoverOut,
	marking,
	size,
}: {
	triggerProps: object;
	onPress: () => void;
	onHoverIn: () => void;
	onHoverOut: () => void;
	marking: any;
	size: number;
}) => (
	<Pressable {...triggerProps} onPress={onPress} onHoverIn={onHoverIn} onHoverOut={onHoverOut}>
		<MarkingIcon marking={marking} size={size} />
	</Pressable>
);

const makeMarkingIconTrigger = (props: Readonly<{
	onPress?: () => void;
	onHoverIn: () => void;
	onHoverOut: () => void;
	marking: any;
	size: number;
}>) => (triggerProps: object) => <MarkingIconTrigger triggerProps={triggerProps} {...props} />;

const MarkingLabelTextTrigger = ({
	triggerProps,
	onHoverIn,
	onHoverOut,
	text,
	textColor,
}: {
	triggerProps: object;
	onHoverIn: () => void;
	onHoverOut: () => void;
	text: string;
	textColor: string;
}) => (
	<Pressable {...triggerProps} onHoverIn={onHoverIn} onHoverOut={onHoverOut} style={styles.labelContainer}>
		<Text
			style={{
				...styles.label,
				color: textColor,
				fontSize: isWeb ? 18 : 14,
				textAlignVertical: 'center',
			}}
		>
			{text}
		</Text>
	</Pressable>
);

const makeMarkingLabelTextTrigger = (props: Readonly<{
	onHoverIn: () => void;
	onHoverOut: () => void;
	text: string;
	textColor: string;
}>) => (triggerProps: object) => <MarkingLabelTextTrigger triggerProps={triggerProps} {...props} />;

const MarkingReactionTrigger = ({
	triggerProps,
	onPress,
	onHoverIn,
	onHoverOut,
	buttonStyle,
	loading,
	active,
	activeIconName,
	inactiveIconName,
	iconSize,
	activeColor,
	inactiveColor,
}: {
	triggerProps: object;
	onPress: () => void;
	onHoverIn: () => void;
	onHoverOut: () => void;
	buttonStyle: any;
	loading: boolean;
	active: boolean;
	activeIconName: any;
	inactiveIconName: any;
	iconSize: number;
	activeColor: string;
	inactiveColor: string;
}) => (
	<Pressable onHoverIn={onHoverIn} onHoverOut={onHoverOut} style={buttonStyle} {...triggerProps} onPress={onPress}>
		{loading ? (
			<LoadingIndicator size={25} color={activeColor} />
		) : (
			<MaterialCommunityIcons name={active ? activeIconName : inactiveIconName} size={iconSize} color={active ? activeColor : inactiveColor} />
		)}
	</Pressable>
);

const makeMarkingReactionTrigger = (props: Readonly<{
	onPress: () => void;
	onHoverIn: () => void;
	onHoverOut: () => void;
	buttonStyle: any;
	loading: boolean;
	active: boolean;
	activeIconName: any;
	inactiveIconName: any;
	iconSize: number;
	activeColor: string;
	inactiveColor: string;
}>) => (triggerProps: object) => <MarkingReactionTrigger triggerProps={triggerProps} {...props} />;

// Applies the updated marking to the profile's markings array (removing, replacing, or adding it), mutating and returning profileData.
const applyMarkingUpdateToProfile = (profileData: any, updatedMarking: any, markingId: any): any => {
	let markingFound = false;

	profileData?.markings.forEach((profileMarkings: any, index: number) => {
		if (profileMarkings.markings_id === updatedMarking?.markings_id) {
			markingFound = true;
			if (updatedMarking?.like === null) {
				profileData.markings.splice(index, 1); // Remove if unliked
			} else {
				profileData.markings[index] = updatedMarking; // Update like status
			}
		}
	});

	// If the marking doesn't exist, add it
	if (!markingFound) {
		profileData.markings.push({
			...updatedMarking,
			markings_id: markingId,
			profiles_id: profileData?.id,
		});
	}

	return profileData;
};

const MarkingLabels: React.FC<MarkingLabelProps> = ({ markingId, handleMenuSheet, size = 30 }) => {
	const { theme } = useTheme();
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const [warning, setWarning] = useState(false);
	const [showTooltip, setShowTooltip] = useState(false);
	const primaryColor = useAppSelector(state => state.settings.primaryColor);
	const language = useAppSelector(state => state.settings.language);
	const appSettings = useAppSelector(state => state.settings.appSettings);

	const user = useAppSelector(state => state.authReducer.user);
	const profile = useAppSelector(state => state.authReducer.profile);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
	const markings = useAppSelector(state => state.food.markings);
	const marking = markings?.find((mark: any) => mark.id === markingId);
	const ownMarking = profile?.markings?.find((mark: any) => mark.markings_id === markingId);
	const [likeLoading, setLikeLoading] = useState(false);
	const [dislikeLoading, setDislikeLoading] = useState(false);
	const profileHelper = new ProfileHelper();
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
		const profileData = { ...profile };
		let markingFound = false;

		// Update or remove marking in the profile
		profileData?.markings?.forEach((profileMarkings: any, index: number) => {
			if (profileMarkings?.markings_id === markingId) {
				const likeStats = profileMarkings?.like === like ? null : like;
				markingFound = true;
				if (likeStats === null) {
					profileData?.markings.splice(index, 1); // Remove if unliked
				} else {
					profileData.markings[index] = { ...ownMarking, like: like }; // Update like status
				}
			}
		});

		// If the marking doesn't exist, add it
		if (!markingFound) {
			profileData?.markings?.push({
				...ownMarking,
				like: like,
				markings_id: markingId,
				profiles_id: profileData?.id,
			});
		}

		dispatch({ type: UPDATE_PROFILE, payload: profileData });
	};

	// Fetch profile function
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
			const setLoadingState = like ? setLikeLoading : setDislikeLoading;
			setLoadingState(true);
			if (isAnonymousUser) {
				handleAnonymousMarking(like);
				setLoadingState(false);
			} else {
				try {
					const likeStats = ownMarking?.like === like ? null : like;
					const updatedMarking = { ...ownMarking, like: likeStats };

					const profileData = applyMarkingUpdateToProfile({ ...profile }, updatedMarking, markingId);

					dispatch({ type: UPDATE_PROFILE, payload: profileData });

					// Update profile on the server
					const result = (await profileHelper.updateProfile(profileData)) as DatabaseTypes.Profiles;
					if (result) {
						void fetchProfile();
						setLoadingState(false);
					}
				} catch (error) {
					console.error('Error updating marking:', error);
				} finally {
					setLoadingState(false);
				}
			}
		},
		[user?.id, profile, ownMarking, markingId, dispatch, profileHelper, fetchProfile]
	);

	// Early return AFTER all hooks have been called
	if (!marking) return null;

	const markingText = getTextFromTranslation(marking?.translations, language);
	const iconSize = isWeb ? 24 : 22;

	return (
		<View style={styles.row}>
			<View style={styles.col}>
				{handleMenuSheet ? (
					<CustomTooltip
						placement="top"
						trigger={makeMarkingIconTrigger({
							onPress: () => openMarkingLabel(marking),
							onHoverIn: () => setShowTooltip(true),
							onHoverOut: () => setShowTooltip(false),
							marking,
							size,
						})}
					>
						<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
							<TooltipText fontSize="$sm" color={theme.tooltip.text}>
								{`${markingText}`}
							</TooltipText>
						</TooltipContent>
					</CustomTooltip>
				) : (
					<MarkingIcon marking={marking} size={size} />
				)}
				<CustomTooltip
					placement="top"
					isOpen={showTooltip}
					trigger={makeMarkingLabelTextTrigger({
						onHoverIn: () => setShowTooltip(true),
						onHoverOut: () => setShowTooltip(false),
						text: markingText,
						textColor: theme.screen.text,
					})}
				>
					<TooltipContent
						bg={theme.tooltip.background}
						py="$1"
						px="$2"
						left="100%"
						transform={[{ translateX: -50 }]} // Adjust to truly center it
					>
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{`${translate(TranslationKeys.markings)}: ${markingText}`}
						</TooltipText>
					</TooltipContent>
				</CustomTooltip>
			</View>
			{/* REACTION SIDE */}

			<View style={styles.col2}>
				<CustomTooltip
					placement="top"
					trigger={makeMarkingReactionTrigger({
						onPress: () => handleUpdateMarking(true),
						onHoverIn: () => setShowTooltip(true),
						onHoverOut: () => setShowTooltip(false),
						buttonStyle: styles.likeButton,
						loading: likeLoading,
						active: !!ownMarking?.like,
						activeIconName: "thumb-up",
						inactiveIconName: "thumb-up-outline",
						iconSize,
						activeColor: foods_area_color,
						inactiveColor: theme.screen.icon,
					})}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{`${translate(TranslationKeys.i_like_that)}: ${translate(ownMarking?.like ? TranslationKeys.active : TranslationKeys.inactive)}: ${translate(TranslationKeys.markings)}: ${markingText}`}
						</TooltipText>
					</TooltipContent>
				</CustomTooltip>
				<CustomTooltip
					placement="top"
					trigger={makeMarkingReactionTrigger({
						onPress: () => handleUpdateMarking(false),
						onHoverIn: () => setShowTooltip(true),
						onHoverOut: () => setShowTooltip(false),
						buttonStyle: styles.dislikeButton,
						loading: dislikeLoading,
						active: ownMarking?.like === false,
						activeIconName: "thumb-down",
						inactiveIconName: "thumb-down-outline",
						iconSize,
						activeColor: foods_area_color,
						inactiveColor: theme.screen.icon,
					})}
				>
					<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
						<TooltipText fontSize="$sm" color={theme.tooltip.text}>
							{`${translate(TranslationKeys.i_dislike_that)}: ${translate(ownMarking?.like === false ? TranslationKeys.active : TranslationKeys.inactive)}: ${translate(TranslationKeys.markings)}: ${markingText}`}
						</TooltipText>
					</TooltipContent>
				</CustomTooltip>
			</View>
			<PermissionModal isVisible={warning} setIsVisible={setWarning} />
		</View>
	);
};

export default MarkingLabels;
