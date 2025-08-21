import React from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import CardWithText from '../CardWithText/CardWithText';
import { DownloadItemProps } from './types';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import QrCode from '@/components/QrCode';
import CardDimensionHelper from '@/helper/CardDimensionHelper';

const DownloadItem: React.FC<DownloadItemProps> = ({
	label,
	imageSource,
	onPress,
	containerStyle,
	qrValue,
}) => {
	const { theme } = useTheme();
	const { primaryColor, amountColumnsForcard } = useSelector(
		(state: RootState) => state.settings
	);
	const { width: screenWidth } = useWindowDimensions();
	const size =
		amountColumnsForcard === 0
			? CardDimensionHelper.getCardDimension(screenWidth)
			: CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);
	return (
		<CardWithText
			onPress={onPress}
			containerStyle={[
				styles.card,
				{ backgroundColor: theme.card.background, width: size },
				containerStyle,
			]}
			imageContainerStyle={[styles.imageContainer, { height: size }]}
			contentStyle={{ paddingHorizontal: 5 }}
			topRadius={0}
			borderColor={primaryColor}
			imageChildren={
				qrValue ? (
					<View style={styles.qrContainer} pointerEvents="none">
						<QrCode value={qrValue} size={size} image={imageSource} innerSize={25} />
					</View>
				) : undefined
			}
			bottomContent={
				<Text style={[styles.label, { color: theme.screen.text }]}>{label}</Text>
			}
		/>
	);
};

export default DownloadItem;
