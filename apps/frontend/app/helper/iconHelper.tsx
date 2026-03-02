import { Entypo, FontAwesome, FontAwesome5, FontAwesome6, Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { IconProps as DefaultIconProps } from '@expo/vector-icons/build/createIconSet';
import { Text } from 'react-native';
import React from 'react';

// Define the available icon families as a union type
export type IconFamilyType = 'MaterialCommunityIcons' | 'MaterialIcons' | 'FontAwesome' | 'FontAwesome5' | 'FontAwesome6' | 'Ionicons' | 'Entypo';

// IconProps type updated to enforce family as a valid key
export type IconProps = DefaultIconProps<any> & {
	family?: IconFamilyType;
};

export const IconFamily = {
	MaterialCommunityIcons: 'MaterialCommunityIcons',
	MaterialIcons: 'MaterialIcons',
	FontAwesome: 'FontAwesome',
	FontAwesome5: 'FontAwesome5',
	FontAwesome6: 'FontAwesome6',
	Ionicons: 'Ionicons',
	Entypo: 'Entypo',
} as const;

export const IconParseDelimeter = ':';

// Optimized directus string parser
export function IconParseDirectusStringToIconAndFamily(iconString: string): {
	family: IconFamilyType;
	icon: string;
} {
	const [family = IconFamily.MaterialIcons, icon] = iconString.split(IconParseDelimeter);
	return { family: family as IconFamilyType, icon };
}

// Mapping of icon families to components
const iconFamilyComponents = {
	[IconFamily.MaterialCommunityIcons]: MaterialCommunityIcons,
	[IconFamily.MaterialIcons]: MaterialIcons,
	[IconFamily.FontAwesome]: FontAwesome,
	[IconFamily.FontAwesome5]: FontAwesome5,
	[IconFamily.FontAwesome6]: FontAwesome6,
	[IconFamily.Ionicons]: Ionicons,
	[IconFamily.Entypo]: Entypo,
};

export function Icon({ name, size, family, ...props }: IconProps) {
	const defaultSize = 24;
	let useSize = defaultSize;
	if (size) {
		useSize = size;
	}
	let usedFamily = family;
	if (!!name) {
		const parts = name.split(IconParseDelimeter);
		if (parts.length === 1) {
			name = parts[0];
		} else {
			usedFamily = parts[0];
			name = parts[1];
		}
	}
	if (usedFamily === undefined) {
		usedFamily = IconFamily.MaterialCommunityIcons;
	}

	let content = null;
	if (usedFamily === IconFamily.MaterialCommunityIcons) {
		content = <MaterialCommunityIcons name={name} size={useSize} {...props} />;
	}
	if (usedFamily === IconFamily.MaterialIcons) {
		content = <MaterialIcons name={name} size={useSize} {...props} />;
	}
	if (usedFamily === IconFamily.FontAwesome) {
		content = <FontAwesome name={name} size={useSize} {...props} />;
	}
	if (usedFamily === IconFamily.FontAwesome5) {
		content = <FontAwesome5 name={name} size={useSize} {...props} />;
	}
	if (usedFamily === IconFamily.FontAwesome6) {
		content = <FontAwesome6 name={name} size={useSize} {...props} />;
	}
	if (usedFamily === IconFamily.Ionicons) {
		content = <Ionicons name={name} size={useSize} {...props} />;
	}
	if (usedFamily === IconFamily.Entypo) {
		content = <Entypo name={name} size={useSize} {...props} />;
	}

	return <Text>{content}</Text>;
}
