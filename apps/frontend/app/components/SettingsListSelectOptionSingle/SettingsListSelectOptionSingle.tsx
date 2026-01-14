// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SettingsList from '@/components/SettingsList';
import { useTheme } from '@/hooks/useTheme';

import { SettingsListProps } from '@/components/SettingsList/types';

type SettingsListSelectOptionSingleProps = {
	label: string;
	leftIcon?: React.ReactNode;
	iconBgColor?: string;
	selectionColor?: string;
	isSelected: boolean;
	onPress: () => void;
	groupPosition?: SettingsListProps['groupPosition'];
	showSeparator?: boolean;
	noIconIndent?: boolean;
};

const SettingsListSelectOptionSingle: React.FC<SettingsListSelectOptionSingleProps> = ({
	label,
	leftIcon,
	iconBgColor,
	selectionColor,
	isSelected,
	onPress,
	groupPosition,
	showSeparator = true,
	noIconIndent = false,
}) => {
	const { theme } = useTheme();
	const resolvedSelectionColor = selectionColor ?? iconBgColor;

	return (
		<SettingsList
			label={label}
			leftIcon={leftIcon}
			iconBgColor={iconBgColor}
			groupPosition={groupPosition}
			showSeparator={showSeparator}
			noIconIndent={noIconIndent}
			rightIcon={
				<MaterialCommunityIcons
					name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
					size={24}
					color={isSelected ? resolvedSelectionColor : theme.screen.icon}
				/>
			}
			handleFunction={onPress}
		/>
	);
};

export default SettingsListSelectOptionSingle;
