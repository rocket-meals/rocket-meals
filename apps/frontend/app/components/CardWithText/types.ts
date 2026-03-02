import { ImageSourcePropType, ImageStyle, StyleProp, TouchableOpacityProps, ViewStyle } from 'react-native';
import React from 'react';

export interface CardWithTextProps extends TouchableOpacityProps {
	/**
	 * Optional image source for the upper section. When omitted the
	 * imageChildren prop can be used to render custom content (e.g. a QR code).
	 */
	imageSource?: ImageSourcePropType;
	containerStyle?: StyleProp<ViewStyle>;
	imageContainerStyle?: StyleProp<ViewStyle>;
	imageStyle?: StyleProp<ImageStyle>;
	contentStyle?: StyleProp<ViewStyle>;
	/**
	 * Optional top border radius for the card. Defaults to 18 to keep
	 * backwards compatibility with existing cards.
	 */
	topRadius?: number;
	/**
	 * Optional border color for the content section. If provided the component
	 * will automatically apply a border with a default width.
	 */
	borderColor?: string;
	imageChildren?: React.ReactNode;
	/**
	 * Alternative content for the bottom section of the card. When provided it
	 * takes precedence over the regular children prop.
	 */
	bottomContent?: React.ReactNode;
	children?: React.ReactNode;
}
