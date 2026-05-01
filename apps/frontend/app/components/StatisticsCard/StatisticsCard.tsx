import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import MyImage from '@/components/MyImage';
import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StatisticsCardProps } from './types';
import { getImageUrl } from '@/constants/HelperFunctions';
import { useAppSelector } from '@/redux/hooks';
import { RootState } from '@/redux/reducer';

const StatisticsCard: React.FC<StatisticsCardProps> = ({ food, handleImageSheet, setSelectedFoodId }) => {
	const { theme } = useTheme();
	const { serverInfo, appSettings } = useAppSelector((state) => state.settings);
	const defaultImage = getImageUrl(String(appSettings.foods_placeholder_image)) || appSettings.foods_placeholder_image_remote_url || getImageUrl(serverInfo?.info?.project?.project_logo);
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);

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
				...styles.container,
				borderColor: theme.screen.icon,
				flexDirection: screenWidth > 950 ? 'row' : 'column',
				height: screenWidth > 950 ? 180 : 190,
			}}
		>
			<View
				style={{
					...styles.imageContainer,
					width: screenWidth > 950 ? 178 : 90,
					height: screenWidth > 950 ? 178 : 90,
				}}
			>
				<MyImage
					style={styles.image}
					remote_image_url={food?.image_remote_url}
					directus_asset_id={food?.image}
					defaultImageUrl={defaultImage}
				/>
				<TouchableOpacity
					style={styles.uploadImage}
					onPress={() => {
						setSelectedFoodId(food?.id);
						handleImageSheet();
					}}
				>
					<MaterialCommunityIcons name="image-edit" size={20} color={'white'} />
				</TouchableOpacity>
			</View>
			<View
				style={{
					...styles.ratingContainer,
					padding: screenWidth > 950 ? 15 : 5,
					marginTop: screenWidth > 950 ? 0 : 10,
				}}
			>
				<View style={{ ...styles.row, marginBottom: screenWidth > 950 ? 20 : 10 }}>
					<View style={{ ...styles.col, gap: screenWidth > 950 ? 10 : 5 }}>
						<MaterialCommunityIcons name="chart-bar" color={theme.screen.icon} size={screenWidth > 950 ? 24 : 20} />
						<Text
							style={{
								...styles.label,
								color: theme.screen.text,
								fontSize: screenWidth > 950 ? 18 : 12,
							}}
						>
							Number of Ratings
						</Text>
					</View>
					<Text
						style={{
							...styles.value,
							color: theme.screen.text,
							fontSize: screenWidth > 950 ? 18 : 12,
						}}
					>
						{food?.rating_amount}
					</Text>
				</View>
				<View style={{ ...styles.row, marginBottom: screenWidth > 950 ? 20 : 10 }}>
					<View style={{ ...styles.col, gap: screenWidth > 950 ? 10 : 5 }}>
						<MaterialCommunityIcons name="chart-areaspline" color={theme.screen.icon} size={screenWidth > 950 ? 24 : 20} />
						<Text
							style={{
								...styles.label,
								color: theme.screen.text,
								fontSize: screenWidth > 950 ? 18 : 12,
							}}
						>
							Average Rating
						</Text>
					</View>
					<Text
						style={{
							...styles.value,
							color: theme.screen.text,
							fontSize: screenWidth > 950 ? 18 : 12,
						}}
					>
						{food?.rating_average?.toFixed(2)}
					</Text>
				</View>
			</View>
		</View>
	);
};

export default StatisticsCard;
