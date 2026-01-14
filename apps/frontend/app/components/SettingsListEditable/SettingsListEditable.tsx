// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import SettingsList from '@/components/SettingsList';
import { useTheme } from '@/hooks/useTheme';
import { SettingsListEditableProps } from './types';

const SettingsListEditable: React.FC<SettingsListEditableProps> = ({ editable = true, rightElement, rightIcon, ...props }) => {
	const { theme } = useTheme();
	const resolvedRightIcon = editable && !rightElement && !rightIcon ? <MaterialCommunityIcons name="pencil" size={24} color={theme.screen.icon} /> : rightIcon;

	return <SettingsList {...props} rightElement={rightElement} rightIcon={resolvedRightIcon} />;
};

export default SettingsListEditable;
