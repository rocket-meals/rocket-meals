import { Text, TouchableOpacity, View } from 'react-native';
import React, { memo } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import { getDistanceUnit } from '@/helper/distanceHelper';
import { BuildingItemProps } from './types';
import styles from './styles';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import CardWithText from '../CardWithText/CardWithText';
import useMyScrollviewModalDistanceInformation from '@/hooks/useMyScrollviewModalDistanceInformation';
import useMyScrollviewModalApartmentAvailableFrom from '@/hooks/useMyScrollviewModalApartmentAvailableFrom';
import useApartmentDetailsModal from '@/hooks/useApartmentDetailsModal';

const ApartmentItem: React.FC<BuildingItemProps> = ({
	apartment,
	onEditImage,
	openDistanceSheet,
	knownCardWidth,
	housingAreaColor,
	defaultImage,
	theme,
	translate,
	isManagement,
	mode
}) => {
	const { openDistanceInformationModal } = useMyScrollviewModalDistanceInformation();
	const { openApartmentDetailsModal } = useApartmentDetailsModal();
	const { openApartmentAvailableFromModal } = useMyScrollviewModalApartmentAvailableFrom();

	const contrastColor = myContrastColor(housingAreaColor || theme.primary, theme, mode === 'dark');

	const handleNavigation = (id: string) => {
		openApartmentDetailsModal(id);
	};

	const cardSize = knownCardWidth || 200;

	return (
			<CardWithText
				{...{}}
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
				aspectRatio={false}
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
				borderColor={housingAreaColor}
				knownCardWidth={knownCardWidth}
				imageChildren={
					<>
						{apartment?.available_from && (
							<TouchableOpacity
								style={{
									...styles.freeBadge,
									backgroundColor: housingAreaColor,
								}}
								onPress={() => openApartmentAvailableFromModal(apartment.available_from as string)}
							>
								<MaterialCommunityIcons name="door-open" size={20} color={contrastColor} />
								<Text style={{ ...styles.freeBadgeText, color: contrastColor }}>{translate(TranslationKeys.free_rooms)}</Text>
							</TouchableOpacity>
						)}
						{isManagement && (
							<TouchableOpacity
								style={styles.editImageButton}
								onPress={() => {
									onEditImage?.(apartment);
								}}
							>
								<MaterialCommunityIcons name="image-edit" size={20} color="white" />
							</TouchableOpacity>
						)}
						{/* No distance without a reference point (no canteen chosen yet, no location) - "NaN m" otherwise. */}
						{Number.isFinite(apartment?.distance) && (
							<View style={styles.distanceActions}>
								<TouchableOpacity
									style={{
										...styles.directionButton,
										backgroundColor: housingAreaColor,
									}}
									onPress={openDistanceInformationModal}
									onLongPress={openDistanceSheet}
								>
									<MaterialCommunityIcons name="map-marker-distance" size={20} color={contrastColor} />
									<Text style={{ ...styles.distance, color: contrastColor }}>{getDistanceUnit(apartment?.distance)}</Text>
								</TouchableOpacity>
							</View>
						)}
					</>
				}
			>
				<Text style={{ ...styles.campusName, color: theme.screen.text }}>{isWeb ? excerpt(apartment?.alias, 70) : excerpt(apartment?.alias, 40)}</Text>
			</CardWithText>
	);
};

const arePropsEqual = (prevProps: BuildingItemProps, nextProps: BuildingItemProps) => {
	return (
		prevProps.apartment?.id === nextProps.apartment?.id &&
		prevProps.apartment?.distance === nextProps.apartment?.distance &&
		prevProps.apartment?.alias === nextProps.apartment?.alias &&
		prevProps.apartment?.available_from === nextProps.apartment?.available_from &&
		prevProps.apartment?.image === nextProps.apartment?.image &&
		prevProps.housingAreaColor === nextProps.housingAreaColor &&
		prevProps.knownCardWidth === nextProps.knownCardWidth &&
		prevProps.theme === nextProps.theme &&
		prevProps.isManagement === nextProps.isManagement &&
		prevProps.mode === nextProps.mode
	);
};

export default memo(ApartmentItem, arePropsEqual);
