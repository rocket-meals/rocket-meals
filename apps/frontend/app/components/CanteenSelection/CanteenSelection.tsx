import { Dimensions, Text, View } from 'react-native';
import React, { useEffect, useMemo, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatabaseTypes } from 'repo-depkit-common';
import { useTheme } from '@/hooks/useTheme';
import { canteensData } from '@/constants/Constants';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import CardWithText from '../CardWithText/CardWithText';
import styles from '../CanteenSelectionSheet/styles';
import { useAppSelector } from '@/redux/hooks';
import CardDimensionHelper from '@/helper/CardDimensionHelper';

interface CanteenSelectionProps {
	onSelectCanteen: (canteen: DatabaseTypes.Canteens) => void;
}

const CanteenSelection: React.FC<CanteenSelectionProps> = ({ onSelectCanteen }) => {
	const { theme } = useTheme();
	const { serverInfo, appSettings, primaryColor } = useAppSelector((state) => state.settings);
	const { canteens, selectedCanteen } = useAppSelector((state) => state.canteenReducer);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [listWidth, setListWidth] = useState<number | null>(null);

	const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const effectiveWidth = listWidth || screenWidth;

	const numColumns = useMemo(() => {
		return CardDimensionHelper.getGridNumColumns(effectiveWidth);
	}, [effectiveWidth]);

	const itemGap = useMemo(() => {
		return CardDimensionHelper.getItemGap(screenWidth);
	}, [screenWidth]);

	const cardWidth = useMemo(() => {
		if (!effectiveWidth || !numColumns) return undefined;
		return CardDimensionHelper.getGridCardWidth(effectiveWidth, numColumns, itemGap);
	}, [effectiveWidth, numColumns, itemGap]);

	return (
		<View
			style={{
				...styles.canteensContainer,
				width: '100%',
			}}
			onLayout={(e) => {
				const w = e.nativeEvent.layout.width;
				if (w && (!listWidth || Math.abs(w - listWidth) > 10)) {
					setListWidth(w);
				}
			}}
		>
			{canteens.map((canteen, index: number) => {
				const isSelected = selectedCanteen && String(selectedCanteen.id) === String(canteen.id);
				const imageUrl = canteen?.image_url || canteensData[index]?.image;
				return (
					<View
						key={canteen.id + canteen.alias}
						style={{
							width: cardWidth || '100%',
							marginHorizontal: itemGap,
							marginVertical: itemGap,
							alignItems: 'center',
						}}
					>
						<CardWithText
							onPress={() => {
								onSelectCanteen(canteen);
							}}
							imageSource={{ uri: imageUrl || defaultImage || '' }}
							containerStyle={{
								width: '100%',
								backgroundColor: theme.card.background,
								borderColor: isSelected ? foods_area_color : 'transparent',
								borderWidth: isSelected ? 3 : 0,
							}}
							imageContainerStyle={{
								height: cardWidth || 160,
							}}
						>
							{canteen.status === 'archived' && (
								<View style={styles.archiveContainer}>
									<MaterialCommunityIcons name="archive" size={18} color={theme.screen.text} />
								</View>
							)}
							<Text style={{ ...styles.foodName, color: theme.screen.text }} numberOfLines={3} ellipsizeMode="tail">
								{excerpt(String(canteen.alias), 20)}
							</Text>
						</CardWithText>
					</View>
				);
			})}
		</View>
	);
};

export default CanteenSelection;
