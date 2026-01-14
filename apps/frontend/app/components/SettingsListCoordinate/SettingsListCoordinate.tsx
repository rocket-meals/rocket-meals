// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React, { useCallback } from 'react';
import { Entypo, Ionicons } from '@expo/vector-icons';

import SettingsList from '@/components/SettingsList';
import useLinkCoordinateModal from '@/hooks/useLinkCoordinateModal';
import { useLanguage } from '@/hooks/useLanguage';
import { useTheme } from '@/hooks/useTheme';
import { TranslationKeys } from '@/locales/keys';
import type { LinkCoordinate } from '@/hooks/useLinkCoordinateModal';
import type { SettingsListProps } from '@/components/SettingsList';

type SettingsListCoordinateProps = React.PropsWithChildren<{
	location?: LinkCoordinate;
	label?: string;
	value?: string;
	leftIcon?: React.ReactElement;
	rightIcon?: React.ReactElement;
} & Omit<SettingsListProps, 'label' | 'value' | 'leftIcon' | 'rightIcon' | 'handleFunction' | 'onPress'>>;

const SettingsListCoordinate: React.FC<SettingsListCoordinateProps> = ({
	location,
	label,
	value,
	leftIcon,
	rightIcon,
	...props
}) => {
	const { openLinkCoordinateModal } = useLinkCoordinateModal();
	const { translate } = useLanguage();
	const { theme } = useTheme();
	const hasLocation = Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude);

	const handleOpenLocation = useCallback(() => {
		if (!hasLocation || !location) {
			console.error('Invalid coordinates');
			return;
		}

		openLinkCoordinateModal({
			latlon: location,
		});
	}, [hasLocation, location, openLinkCoordinateModal]);

	const resolvedLabel = label ?? translate(TranslationKeys.location);
	const resolvedValue = value ?? translate(TranslationKeys.show);
	const resolvedLeftIcon = leftIcon ?? <Ionicons name="location-sharp" size={24} color={theme.screen.icon} />;
	const resolvedRightIcon = rightIcon ?? <Entypo name="chevron-small-right" size={26} color={theme.screen.icon} />;

	return (
		<SettingsList
			{...props}
			label={resolvedLabel}
			value={resolvedValue}
			leftIcon={resolvedLeftIcon}
			rightIcon={resolvedRightIcon}
			handleFunction={hasLocation ? handleOpenLocation : undefined}
		/>
	);
};

export default SettingsListCoordinate;
