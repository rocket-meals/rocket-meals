import React from 'react';
import { Image, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import { useMyContrastColor } from '@/helper/ColorHelper';
import { iconLibraries } from '../Drawer/CustomDrawerContent';
import { getImageUrl } from '@/constants/HelperFunctions';
import styles from './styles';
import { DatabaseTypes } from 'repo-depkit-common';
import { RootState } from '@/redux/reducer';

interface MarkingIconProps {
	marking: DatabaseTypes.Markings;
	size?: number;
	color?: string;
	compact?: boolean;
}

const MarkingIcon: React.FC<MarkingIconProps> = ({ marking, size = 24, color, compact = false }) => {
	const { theme } = useTheme();
	const { selectedTheme: mode } = useSelector((state: RootState) => state.settings);

	const bgColor = marking?.background_color;
	const contrast = useMyContrastColor(bgColor, theme, mode === 'dark');

	if (!marking) return null;

	const markingImage = marking.image_remote_url ? { uri: marking.image_remote_url } : marking.image ? { uri: getImageUrl(String(marking.image)) } : null;
	const textColor = color || contrast;

	const iconParts = marking.icon?.split(':') || [];
	const [library, iconName] = iconParts;
	const Icon = library && iconLibraries[library];

	const isTextOnly = !!marking.short_code && !markingImage?.uri && !Icon;

	const hasImage = !!markingImage?.uri;
	const showBorder = !hasImage && !marking.hide_border;

	const containerStyle = [
		styles.container,
		{
			width: isTextOnly ? undefined : size,
			minWidth: size,
			height: size,
			backgroundColor: bgColor || 'transparent',
			borderWidth: showBorder ? 1 : 0,
			borderColor: showBorder ? textColor : 'transparent',
			borderRadius: bgColor ? 8 : 0,
			paddingHorizontal: isTextOnly ? 4 : undefined,
		},
	];

	const iconScale = compact ? 0.6 : 0.8;
	const textScale = compact ? 0.5 : 0.65;
	const lineHeightScale = compact ? 0.75 : 0.8;
	const imageScale = compact ? 0.8 : 1;

	if (markingImage?.uri) {
		return (
			<View style={containerStyle}>
				<Image
					source={markingImage}
					style={{
						width: size * imageScale,
						height: size * imageScale,
						resizeMode: 'contain',
						borderRadius: bgColor ? 8 : 0,
					}}
				/>
			</View>
		);
	}

	if (Icon) {
		return (
			<View style={containerStyle}>
				<Icon name={iconName} size={size * iconScale} color={textColor} />
			</View>
		);
	}

	if (marking.short_code) {
		return (
			<View style={containerStyle}>
				<Text
					style={{
						color: textColor,
						fontSize: size * textScale,
						lineHeight: size * lineHeightScale,
					}}
				>
					{marking.short_code}
				</Text>
			</View>
		);
	}

	return null;
};

export default MarkingIcon;
