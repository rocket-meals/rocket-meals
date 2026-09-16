import React, { useCallback } from 'react';
import { Linking } from 'react-native';
import { Entypo, Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import SettingsList from '../SettingsList';
import type { SettingsListProps } from '../SettingsList/types';
import PrintHidden from '../PrintHidden';

export type LinkCoordinate = {
	latitude: number;
	longitude: number;
};

export type SettingsListCoordinateProps = React.PropsWithChildren<
	{
		location?: LinkCoordinate;
		label?: string;
		value?: string;
		leftIcon?: React.ReactElement;
		rightIcon?: React.ReactElement;
		mapsLabel?: string;
	} & Omit<SettingsListProps, 'label' | 'value' | 'leftIcon' | 'rightIcon' | 'handleFunction' | 'onPress'>
>;

const SettingsListCoordinate: React.FC<SettingsListCoordinateProps> = ({
	location,
	label = 'Location',
	value,
	leftIcon,
	rightIcon,
	mapsLabel = 'Open in Maps',
	...props
}) => {
	const { theme } = useTheme();
	const hasLocation =
		Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);

	const handleOpenLocation = useCallback(() => {
		if (!hasLocation || !location) {
			return;
		}
		const url = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
		Linking.openURL(url).catch(() => {
			const fallback = `https://maps.apple.com/?q=${location.latitude},${location.longitude}`;
			Linking.openURL(fallback);
		});
	}, [hasLocation, location]);

	const resolvedValue = value ?? mapsLabel;
	const resolvedLeftIcon = leftIcon ?? (
		<Ionicons name="location-sharp" size={24} color={theme.screen.icon} />
	);
	const resolvedRightIcon = rightIcon ?? (
		<PrintHidden>
			<Entypo name="chevron-small-right" size={26} color={theme.screen.icon} />
		</PrintHidden>
	);

	return (
		<SettingsList
			{...props}
			label={label}
			value={resolvedValue}
			leftIcon={resolvedLeftIcon}
			rightIcon={resolvedRightIcon}
			handleFunction={hasLocation ? handleOpenLocation : undefined}
		/>
	);
};

export default SettingsListCoordinate;
