import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import React, { memo, useEffect, useState } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import { useTheme } from '@/hooks/useTheme';
import { useSelector } from 'react-redux';
import { router } from 'expo-router';
import { getDistanceUnit } from '@/helper/distanceHelper';
import { BuildingItemProps } from './types';
import styles from './styles';
import { myContrastColor } from '@/helper/ColorHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import CardWithText from '../CardWithText/CardWithText';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import AvailableFromModal from '../AvailableFromModal';
import useMyScrollviewModalDistanceInformation from '@/hooks/useMyScrollviewModalDistanceInformation';

const ApartmentItem: React.FC<BuildingItemProps> = ({ apartment, onEditImage, openDistanceSheet }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor: projectColor, appSettings, serverInfo, selectedTheme: mode, amountColumnsForcard } = useSelector((state: RootState) => state.settings);
	const defaultImage = getImageUrl(serverInfo?.info?.project?.project_logo);
	const { isManagement } = useSelector((state: RootState) => state.authReducer);
	const { openDistanceInformationModal } = useMyScrollviewModalDistanceInformation();
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [showFreeModal, setShowFreeModal] = useState(false);
	const housing_area_color = appSettings?.housing_area_color ? appSettings?.housing_area_color : projectColor;
	const contrastColor = myContrastColor(housing_area_color, theme, mode === 'dark');

	const handleNavigation = (id: string) => {
		router.push({
			pathname: '/(app)/housing/details',
			params: { id },
		});
	};

	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	const cardSize =
    amountColumnsForcard === 0
      ? CardDimensionHelper.getCardDimension(screenWidth)
      : CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);

	const getCardDimension = () => CardDimensionHelper.getCardDimension(screenWidth);

	const getCardWidth = () => CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);

	useEffect(() => {
		const cardWidth = CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);
	}, [amountColumnsForcard, screenWidth]);

	return (
		<>
			<Tooltip
				placement="top"
				trigger={triggerProps => (
					<CardWithText
						{...triggerProps}
						onPress={() => handleNavigation(apartment?.id)}
						imageSource={
							apartment?.image || apartment?.image_remote_url
								? {
										uri: apartment?.image_remote_url || getImageUrl(apartment?.image),
									}
								: { uri: defaultImage }
						}
						containerStyle={{
							...styles.card,
							width: '100%',
              				backgroundColor: theme.card.background,
							flex: 1,
						}}
						imageContainerStyle={{
							...styles.imageContainer,
							height: cardSize,
						}}
						contentStyle={{
							...styles.cardContent,
							paddingHorizontal: 5,
							flex: 1,
							justifyContent: 'center'
						}}
						borderColor={housing_area_color}
						imageChildren={
							<>
								{apartment?.available_from && (
									<TouchableOpacity
										style={{
											...styles.freeBadge,
											backgroundColor: housing_area_color,
										}}
										onPress={() => setShowFreeModal(true)}
									>
										<MaterialCommunityIcons name="door-open" size={20} color={contrastColor} />
										<Text style={{ ...styles.freeBadgeText, color: contrastColor }}>{translate(TranslationKeys.free_rooms)}</Text>
									</TouchableOpacity>
								)}
								<View style={styles.imageActionContainer}>
									{isManagement ? (
										<Tooltip
											placement="top"
											trigger={triggerProps => (
												<TouchableOpacity
													{...triggerProps}
													style={styles.editImageButton}
													onPress={() => {
														onEditImage?.(apartment);
													}}
												>
													<MaterialCommunityIcons name="image-edit" size={20} color={'white'} />
												</TouchableOpacity>
											)}
										>
											<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
												<TooltipText fontSize="$sm" color={theme.tooltip.text}>
													{`${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.image)}`}
												</TooltipText>
											</TooltipContent>
										</Tooltip>
									) : (
										<View />
									)}
									<View style={styles.distanceActions}>
										<TouchableOpacity
											style={{
												...styles.directionButton,
												backgroundColor: housing_area_color,
											}}
											onPress={openDistanceInformationModal}
											onLongPress={openDistanceSheet}
										>
											<MaterialCommunityIcons name="map-marker-distance" size={20} color={contrastColor} />
											<Text style={{ ...styles.distance, color: contrastColor }}>{getDistanceUnit(apartment?.distance)}</Text>
										</TouchableOpacity>
									</View>
								</View>
							</>
						}
					>
						<Text style={{ ...styles.campusName, color: theme.screen.text }}>{isWeb ? excerpt(apartment?.alias, 70) : excerpt(apartment?.alias, 40)}</Text>
					</CardWithText>
				)}
			>
				<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
					<TooltipText fontSize="$sm" color={theme.tooltip.text}>
						{apartment?.alias}
					</TooltipText>
				</TooltipContent>
			</Tooltip>
			<AvailableFromModal visible={showFreeModal} onClose={() => setShowFreeModal(false)} availableFrom={String(apartment?.available_from)} />
		</>
	);
};

export default memo(ApartmentItem);
