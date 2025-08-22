import React, { memo } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import styles from './styles';
import { CardWithTextProps } from './types';

const CardWithText: React.FC<CardWithTextProps> = memo(({ 
	imageSource, 
	containerStyle, 
	imageContainerStyle, 
	imageStyle, 
	contentStyle, 
	topRadius = 18, 
	borderColor, 
	imageChildren, 
	children, 
	bottomContent, 
	...rest 
}) => {
	const contentBorder = borderColor ? { borderTopColor: borderColor, borderTopWidth: 3 } : null;

	const topRadiusStyle = {
		borderTopLeftRadius: topRadius,
		borderTopRightRadius: topRadius,
	};

	return (
		<TouchableOpacity style={[styles.card, topRadiusStyle, containerStyle]} {...rest}>
			<View style={[styles.imageContainer, topRadiusStyle, imageContainerStyle]}>
				{imageSource ? (
					<Image 
						style={[styles.image, topRadiusStyle, imageStyle]} 
						source={imageSource}
						cachePolicy="memory-disk"
						contentFit="cover"
						transition={200}
					/>
				) : null}
				{imageChildren}
			</View>
			<View style={[styles.cardContent, contentBorder, contentStyle]}>{bottomContent ?? children}</View>
		</TouchableOpacity>
	);
});

export default CardWithText;
