import React, { memo, useCallback, useMemo, useState } from 'react';
import {
	ImageSourcePropType,
	ImageStyle,
	LayoutChangeEvent,
	StyleProp,
	StyleSheet,
	TouchableOpacity,
	TouchableOpacityProps,
	View,
	ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';

export interface CardWithTextProps extends TouchableOpacityProps {
	/**
	 * Optional image source for the upper section. When omitted the
	 * imageChildren prop can be used to render custom content (e.g. a map or QR code).
	 */
	imageSource?: ImageSourcePropType;
	containerStyle?: StyleProp<ViewStyle>;
	imageContainerStyle?: StyleProp<ViewStyle>;
	imageStyle?: StyleProp<ImageStyle>;
	contentStyle?: StyleProp<ViewStyle>;
	/**
	 * Optional top border radius for the card image area. Defaults to 0.
	 */
	topRadius?: number;
	/**
	 * Optional border color for the content section. If provided a 3 px
	 * divider is rendered between the image and the text area.
	 */
	borderColor?: string;
	/** Custom content rendered inside the image area (e.g. a map preview). */
	imageChildren?: React.ReactNode;
	/**
	 * Alternative content for the bottom section of the card. When provided it
	 * takes precedence over the regular children prop.
	 */
	bottomContent?: React.ReactNode;
	children?: React.ReactNode;
	/**
	 * When the card width is already known (e.g. computed from screen width),
	 * supply it here to skip the onLayout measurement pass.
	 */
	knownCardWidth?: number;
	/**
	 * Aspect ratio of the image area. Defaults to 1 (square).
	 * Pass `false` to omit the aspect-ratio constraint entirely.
	 */
	aspectRatio?: number | boolean;
}

const CardWithText: React.FC<CardWithTextProps> = ({
	imageSource,
	containerStyle,
	imageContainerStyle,
	imageStyle,
	contentStyle,
	topRadius = 0,
	borderColor,
	imageChildren,
	children,
	bottomContent,
	knownCardWidth,
	aspectRatio = 1,
	...rest
}) => {
	const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);

	const widthToUse = knownCardWidth ?? measuredWidth;

	const captionMinHeight = useMemo(() => {
		if (!widthToUse) return 84;
		const computed = Math.round(widthToUse * 0.22);
		return Math.max(64, Math.min(130, computed));
	}, [widthToUse]);

	const onLayoutCard = useCallback(
		(e: LayoutChangeEvent) => {
			if (knownCardWidth) return;
			const w = Math.round(e.nativeEvent.layout.width);
			if (w && w !== measuredWidth) {
				setMeasuredWidth(w);
			}
		},
		[knownCardWidth, measuredWidth],
	);

	const resolvedImageContainerStyle: StyleProp<ViewStyle>[] = Array.isArray(imageContainerStyle)
		? [styles.imageContainer, ...(imageContainerStyle as StyleProp<ViewStyle>[])]
		: [styles.imageContainer, imageContainerStyle as StyleProp<ViewStyle>];

	return (
		<TouchableOpacity
			activeOpacity={0.9}
			style={[styles.card, containerStyle]}
			onLayout={onLayoutCard}
			{...rest}
		>
			<View
				style={[
					styles.squareWrapper,
					{ borderTopLeftRadius: topRadius, borderTopRightRadius: topRadius },
					{ aspectRatio: aspectRatio === false ? undefined : (typeof aspectRatio === 'number' ? aspectRatio : 1) },
				]}
			>
				<View style={[{ borderTopLeftRadius: topRadius, borderTopRightRadius: topRadius }, ...resolvedImageContainerStyle]}>
					{imageSource ? (
						<Image source={imageSource} style={[styles.image, imageStyle]} contentFit="cover" cachePolicy="memory-disk" />
					) : null}
					{imageChildren}
				</View>
			</View>

			{borderColor ? <View style={[styles.divider, { backgroundColor: borderColor }]} /> : null}

			<View
				style={[
					styles.cardContent,
					{
						minHeight: captionMinHeight,
						paddingHorizontal: Math.round((widthToUse ?? 360) * 0.05),
					},
					contentStyle,
				]}
			>
				{bottomContent ?? children}
			</View>
		</TouchableOpacity>
	);
};

export default memo(CardWithText);

const styles = StyleSheet.create({
	card: {
		overflow: 'hidden',
		borderRadius: 12,
	},
	squareWrapper: {
		width: '100%',
		overflow: 'hidden',
		position: 'relative',
	},
	imageContainer: {
		width: '100%',
		height: '100%',
		overflow: 'hidden',
		position: 'relative',
	},
	image: {
		width: '100%',
		height: '100%',
	},
	divider: {
		width: '100%',
		height: 3,
	},
	cardContent: {
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'transparent',
	},
});
