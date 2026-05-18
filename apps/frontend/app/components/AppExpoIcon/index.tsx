import React from 'react';
import { iconLibraries } from '@/components/Drawer/CustomDrawerContent';

export interface AppExpoIconProps {
	iconString?: string | null;
	size?: number;
	color?: string;
	style?: any;
}

const AppExpoIcon: React.FC<AppExpoIconProps> = ({ iconString, size = 24, color, style }) => {
	if (!iconString) return null;
	const [library, name] = iconString.split(':') ?? [];
	const IconComponent = iconLibraries[library];
	if (!IconComponent) return null;
	return <IconComponent name={name} size={size} color={color} style={style} />;
};

export default AppExpoIcon;
