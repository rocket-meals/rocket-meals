import React, { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { createSelector } from 'reselect';
import { useAppSelector } from '@/redux/hooks';
import { DatabaseTypes } from 'repo-depkit-common';
import SettingsList from '@/components/SettingsList';
import { SettingsListProps } from '@/components/SettingsList/types';
import SettingsListLikeDislikeFast from '@/components/SettingsListLikeDislikeFast';
import { RootState } from '@/redux/reducer';

export interface SettingsListOrganisationFastProps {
	organisationId: string;
	like: boolean | null | undefined;
	onPressLike: (organisationId: string) => void;
	onPressDislike: (organisationId: string) => void;
	groupPosition?: SettingsListProps['groupPosition'];
}

const makeSelectOrganisation = (organisationId: string) =>
	createSelector(
		[(state: RootState) => state.canteenReducer.organisations],
		(organisations) => organisations?.find((o: DatabaseTypes.Organizations) => o.id === organisationId)
	);

const SettingsListOrganisationFast: React.FC<SettingsListOrganisationFastProps> = ({
	organisationId,
	like,
	onPressLike,
	onPressDislike,
	groupPosition,
}) => {
	const selectOrganisation = useMemo(() => makeSelectOrganisation(organisationId), [organisationId]);
	const organisation = useAppSelector(selectOrganisation);

	const handlePressLike = useMemo(() => () => onPressLike(organisationId), [onPressLike, organisationId]);
	const handlePressDislike = useMemo(() => () => onPressDislike(organisationId), [onPressDislike, organisationId]);

	const rightElement = useMemo(
		() => (
			<SettingsListLikeDislikeFast
				like={like}
				onPressLike={handlePressLike}
				onPressDislike={handlePressDislike}
			/>
		),
		[like, handlePressLike, handlePressDislike]
	);

	const leftIconComponent = useMemo(() => {
		if (organisation?.map_marker_color) {
			return (
				<View style={[styles.imageWrapper, { backgroundColor: organisation.map_marker_color }]}>
					{organisation.image_remote_url ? (
						<Image
							source={{ uri: organisation.image_remote_url }}
							style={styles.image}
							resizeMode="cover"
						/>
					) : null}
				</View>
			);
		}
		if (!organisation?.image_remote_url) return undefined;
		return (
			<View style={styles.imageWrapper}>
				<Image
					source={{ uri: organisation.image_remote_url }}
					style={styles.image}
					resizeMode="cover"
				/>
			</View>
		);
	}, [organisation?.map_marker_color, organisation?.image_remote_url]);

	if (!organisation) return null;

	return (
		<SettingsList
			title={organisation.alias ?? organisation.id}
			leftIconComponent={leftIconComponent}
			rightElement={rightElement}
			groupPosition={groupPosition}
			noIconIndent={!leftIconComponent}
		/>
	);
};

export default React.memo(SettingsListOrganisationFast);

const ICON_SIZE = 34;
const ICON_BORDER_RADIUS = 8;
const ICON_MARGIN_RIGHT = 10;

const styles = StyleSheet.create({
	imageWrapper: {
		width: ICON_SIZE,
		height: ICON_SIZE,
		borderRadius: ICON_BORDER_RADIUS,
		overflow: 'hidden',
		marginRight: ICON_MARGIN_RIGHT,
	},
	image: {
		width: ICON_SIZE,
		height: ICON_SIZE,
	},
});
