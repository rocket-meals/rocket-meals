import { Dimensions, Text, View } from 'react-native';
import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { DatabaseTypes } from 'repo-depkit-common';
import { useTheme } from '@/hooks/useTheme';
import { RootState } from '@/redux/reducer';
import { canteensData, isWeb } from '@/constants/Constants';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import CardWithText from '../CardWithText/CardWithText';
import styles from '../CanteenSelectionSheet/styles';

interface CanteenSelectionProps {
	onSelectCanteen: (canteen: DatabaseTypes.Canteens) => void;
}

const CanteenSelection: React.FC<CanteenSelectionProps> = ({ onSelectCanteen }) => {
	const { theme } = useTheme();
	const { serverInfo, appSettings, primaryColor } = useSelector((state: RootState) => state.settings);
	const { canteens, selectedCanteen } = useSelector((state: RootState) => state.canteenReducer);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

	const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	return (
		<View
			style={{
				...styles.canteensContainer,
				width: '100%',
				gap: isWeb ? (screenWidth < 500 ? 10 : 20) : 5,
				marginTop: isWeb ? 40 : 20,
			}}
		>
			{canteens.map((canteen, index: number) => {
				const isSelected = selectedCanteen && String(selectedCanteen.id) === String(canteen.id);
				return (
					<CardWithText
						key={canteen.id + canteen.alias}
						onPress={() => {
							onSelectCanteen(canteen);
						}}
						imageSource={
							canteen?.image_url || canteensData[index]?.image
								? {
										uri: canteen?.image_url || canteensData[index]?.image,
									}
								: { uri: defaultImage }
						}
						containerStyle={{
							width: screenWidth > 800 ? 210 : 160,
							backgroundColor: theme.card.background,
							marginBottom: 10,
							borderColor: isSelected ? foods_area_color : 'transparent',
							borderWidth: isSelected ? 3 : 0,
						}}
						imageContainerStyle={{
							height: screenWidth > 800 ? 210 : 160,
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
				);
			})}
		</View>
	);
};

export default CanteenSelection;
