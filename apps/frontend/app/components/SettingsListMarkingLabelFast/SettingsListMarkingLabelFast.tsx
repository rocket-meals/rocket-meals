import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { SET_MARKING_DETAILS, UPDATE_PROFILE } from '@/redux/Types/types';
import PermissionModal from '../PermissionModal/PermissionModal';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import MarkingIcon from '../MarkingIcon';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UserHelper } from '@/helper/UserHelper';
import SettingsList from '@/components/SettingsList';
import { SettingsListProps } from '@/components/SettingsList/types';
import SettingsListLikeDislikeFast from '@/components/SettingsListLikeDislikeFast';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { createSelector } from 'reselect';
import { RootState } from '@/redux/reducer';

export interface SettingsListMarkingLabelFastProps {
	markingId: string;
	handleMenuSheet?: () => void;
	size?: number;
	groupPosition?: SettingsListProps['groupPosition'];
}

// Module-level selectors shared across all component instances.
// The index is built once per state change (O(n)) instead of once per
// component instance per state change (O(n²)).
const selectMarkingsById = createSelector(
	[(state: RootState) => state.food.markings],
	(markings): Record<string, DatabaseTypes.Markings> =>
		Object.fromEntries((markings ?? []).map((m: DatabaseTypes.Markings) => [m.id, m]))
);

const selectProfileMarkingsById = createSelector(
	[(state: RootState) => state.authReducer.profile?.markings],
	(profileMarkings): Record<string, any> =>
		Object.fromEntries((profileMarkings ?? []).map((m: any) => [m.markings_id, m]))
);

const SettingsListMarkingLabelFast: React.FC<SettingsListMarkingLabelFastProps> = ({
	markingId,
	handleMenuSheet,
	size = 30,
	groupPosition,
}) => {
	const dispatch = useDispatch();
	const { translate } = useLanguage();
	const [warning, setWarning] = useState(false);
	const language = useAppSelector(state => state.settings.language);
	const user = useAppSelector(state => state.authReducer.user);
	const profile = useAppSelector(state => state.authReducer.profile);

	// O(1) lookups using the shared module-level index selectors.
	// useAppSelector compares the returned marking by reference, so components
	// only re-render when their specific marking object changes.
	const marking = useAppSelector((state) => selectMarkingsById(state)[markingId] ?? null);
	const ownMarking = useAppSelector((state) => selectProfileMarkingsById(state)[markingId] ?? null);

	const [likeLoading, setLikeLoading] = useState(false);
	const [dislikeLoading, setDislikeLoading] = useState(false);
	const profileHelper = useMemo(() => new ProfileHelper(), []);
	const isAnonymousUser = useMemo(() => UserHelper.isAnonymousUser(user), [user]);

	const openMarkingLabel = useCallback((markingItem: DatabaseTypes.Markings) => {
		if (handleMenuSheet) {
			dispatch({
				type: SET_MARKING_DETAILS,
				payload: markingItem,
			});
			handleMenuSheet();
		}
	}, [dispatch, handleMenuSheet]);

	const fetchProfile = useCallback(async () => {
		try {
			const fetchedProfile = (await profileHelper.fetchProfileById(user?.profile, {})) as DatabaseTypes.Profiles;
			if (fetchedProfile) {
				dispatch({ type: UPDATE_PROFILE, payload: fetchedProfile });
			}
		} catch (error) {
			console.error('Error fetching profiles:', error);
		}
	}, [profileHelper, user?.profile, dispatch]);

	const handleUpdateMarking = useCallback(
		async (like: boolean) => {
			if (like) {
				setLikeLoading(true);
			} else {
				setDislikeLoading(true);
			}
			try {
				const newLike = ownMarking?.like === like ? null : like;

				// Create a new array reference so Redux selectors recompute after dispatch
				const markingsCopy = [...(profile?.markings ?? [])];
				const existingIndex = markingsCopy.findIndex((m: any) => m.markings_id === markingId);

				if (existingIndex >= 0) {
					if (newLike === null) {
						markingsCopy.splice(existingIndex, 1);
					} else {
						markingsCopy[existingIndex] = { ...markingsCopy[existingIndex], like: newLike };
					}
				} else {
					markingsCopy.push({
						...(ownMarking ?? {}),
						like: newLike,
						markings_id: markingId,
						profiles_id: profile?.id,
					});
				}

				const profileData = { ...profile, markings: markingsCopy };
				dispatch({ type: UPDATE_PROFILE, payload: profileData });

				if (isAnonymousUser) return;

				const result = (await profileHelper.updateProfile(profileData)) as DatabaseTypes.Profiles;
				if (result) {
					fetchProfile();
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
		},
		[profile, ownMarking, markingId, dispatch, profileHelper, fetchProfile, isAnonymousUser]
	);

	const handlePressLike = useCallback(() => handleUpdateMarking(true), [handleUpdateMarking]);
	const handlePressDislike = useCallback(() => handleUpdateMarking(false), [handleUpdateMarking]);

	const markingText = useMemo(
		() => getTextFromTranslation(marking?.translations, language),
		[marking?.translations, language]
	);

	const leftIconComponent = useMemo(() => (
		<View style={styles.leftIconWrapper}>
			{handleMenuSheet && marking ? (
				<Pressable onPress={() => openMarkingLabel(marking)}>
					<MarkingIcon marking={marking} size={size} />
				</Pressable>
			) : marking ? (
				<MarkingIcon marking={marking} size={size} />
			) : null}
		</View>
	), [marking, size, handleMenuSheet, openMarkingLabel]);

	const rightElement = useMemo(() => (
		<View style={styles.rightRow}>
			<SettingsListLikeDislikeFast
				like={ownMarking?.like}
				onPressLike={handlePressLike}
				onPressDislike={handlePressDislike}
				likeLoading={likeLoading}
				dislikeLoading={dislikeLoading}
			/>
			<PermissionModal isVisible={warning} setIsVisible={setWarning} />
		</View>
	), [ownMarking?.like, handlePressLike, handlePressDislike, likeLoading, dislikeLoading, warning]);

	// Early return AFTER all hooks have been called
	if (!marking) return null;

	return (
		<SettingsList
			leftIconComponent={leftIconComponent}
			title={markingText || ''}
			rightElement={rightElement}
			groupPosition={groupPosition}
		/>
	);
};

export default React.memo(SettingsListMarkingLabelFast);

const styles = StyleSheet.create({
	leftIconWrapper: {
		marginRight: 10,
	},
	rightRow: {
		flexDirection: 'row',
		alignItems: 'center',
	},
});
