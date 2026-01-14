import React, { memo, useMemo, useCallback } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import { useTheme } from '@/hooks/useTheme';
import { myContrastColor } from '@/helper/ColorHelper';
import { router } from 'expo-router';
import { getDistanceUnit } from '@/helper/distanceHelper';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useLinkCoordinateModal from '@/hooks/useLinkCoordinateModal';
import useMyScrollviewModalDistanceInformation from '@/hooks/useMyScrollviewModalDistanceInformation';
import CardWithText from '../CardWithText/CardWithText';
import CardDimensionHelper from '@/helper/CardDimensionHelper';


export interface BuildingItemPropsOptimized {
	campus: any;
	onEditImage?: (campus: any) => void;
	openDistanceSheet: () => void;
	settings: {
		amountColumnsForcard: number;
		primaryColor?: string;
		serverInfo?: any;
		appSettings?: any;
		selectedTheme?: string;
		screenWidth: number;
		isManagement?: boolean;
	};
}

const BuildingItem: React.FC<BuildingItemPropsOptimized> = ({ campus, onEditImage, openDistanceSheet, settings }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { openLinkCoordinateModal } = useLinkCoordinateModal();
	const { openDistanceInformationModal } = useMyScrollviewModalDistanceInformation();

	const { amountColumnsForcard, primaryColor, serverInfo, appSettings, selectedTheme: mode, screenWidth, isManagement = false } = settings;

	const defaultImage = useMemo(() => getImageUrl(serverInfo?.info?.project?.project_logo), [serverInfo]);
	const campus_area_color = appSettings?.campus_area_color ? appSettings?.campus_area_color : primaryColor;
	const contrastColor = myContrastColor(campus_area_color, theme, mode === 'dark');

	const handleNavigation = useCallback(
		(id: string) =>
			router.push({
				pathname: '/(app)/campus/details',
				params: { id },
			}),
		[]
	);

	const handleOpenNavigation = useCallback(() => {
		const coordinates = campus?.coordinates?.coordinates;
		if (!coordinates || coordinates.length !== 2) {
			console.error('Invalid coordinates');
			return;
		}
		const [longitude, latitude] = coordinates;
		openLinkCoordinateModal({
			latlon: { latitude, longitude },
		});
	}, [campus, openLinkCoordinateModal, translate]);

	const cardWidth = useMemo(() => {
		return amountColumnsForcard === 0 ? CardDimensionHelper.getCardDimension(screenWidth) : CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);
	}, [amountColumnsForcard, screenWidth]);

	const imageSource = useMemo(() => {
		if (campus?.image || campus?.image_remote_url) {
			return { uri: campus?.image_remote_url || getImageUrl(campus?.image) };
		}
		return { uri: defaultImage };
	}, [campus, defaultImage]);

	const cardSize =
		amountColumnsForcard === 0
		  ? CardDimensionHelper.getCardDimension(screenWidth)
		  : CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);

	return (
		<Tooltip
			placement="top"
			trigger={triggerProps => (
				<CardWithText
					{...triggerProps}
					onPress={() => handleNavigation(campus?.id)}
					imageSource={imageSource}
					containerStyle={{
						width: '100%',
						backgroundColor: theme.card.background,
						flex: 1,
					}}
					imageContainerStyle={{
						height: cardSize,
					}}
					contentStyle={{
						paddingHorizontal: 5,
						flex: 1,
						justifyContent: 'center'
					}}
					borderColor={campus_area_color}
					imageChildren={
						<>
							<Tooltip
								placement="top"
								trigger={triggerProps => (
									<TouchableOpacity
										{...triggerProps}
										style={[
											styles.navigationButton,
											{ backgroundColor: campus_area_color },
										]}
										onPress={handleOpenNavigation}
									>
										<MaterialCommunityIcons name="navigation-variant" size={20} color={contrastColor} />
									</TouchableOpacity>
								)}
							>
								<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
									<TooltipText fontSize="$sm" color={theme.tooltip.text}>
										{`${translate(TranslationKeys.open_navitation_to_location)}`}
									</TooltipText>
								</TooltipContent>
							</Tooltip>

							<View style={styles.imageActionContainer}>
								{isManagement ? (
									<TouchableOpacity
										style={styles.editImageButton}
										onPress={() => {
											onEditImage?.(campus);
										}}
									>
										<View />
									</TouchableOpacity>
								) : (
									<View />
								)}

								<View style={styles.distanceActions}>
									<TouchableOpacity
										style={{
											...styles.directionButton,
											backgroundColor: campus_area_color,
										}}
										onPress={openDistanceInformationModal}
										onLongPress={openDistanceSheet}
									>
										<MaterialCommunityIcons name="map-marker-distance" size={20} color={contrastColor} />
										<Text style={{ ...styles.distance, color: contrastColor }}>{getDistanceUnit(campus?.distance)}</Text>
									</TouchableOpacity>
								</View>
							</View>
						</>
					}
				>
					<Text style={{ ...styles.campusName, color: theme.screen.text }}>{isWeb ? excerpt(campus?.alias, 70) : excerpt(campus?.alias, 40)}</Text>
				</CardWithText>
			)}
		>
			<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
				<TooltipText fontSize="$sm" color={theme.tooltip.text}>
					{`${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.image)}`}
				</TooltipText>
			</TooltipContent>
		</Tooltip>
	);
};

function areEqual(prev: BuildingItemPropsOptimized, next: BuildingItemPropsOptimized) {
	const p = prev.campus;
	const n = next.campus;

	if (String(p?.id ?? '') !== String(n?.id ?? '')) return false;
	if (String(p?.alias ?? '') !== String(n?.alias ?? '')) return false;
	const pImg = String(p?.image_remote_url ?? p?.image ?? '');
	const nImg = String(n?.image_remote_url ?? n?.image ?? '');
	if (pImg !== nImg) return false;
	if (Number(p?.distance ?? 0) !== Number(n?.distance ?? 0)) return false;

	if (prev.settings.amountColumnsForcard !== next.settings.amountColumnsForcard) return false;
	if (prev.settings.screenWidth !== next.settings.screenWidth) return false;

	return true;
}

export default memo(BuildingItem, areEqual);

const styles = StyleSheet.create({
	overlay: {
		width: '100%',
		height: '100%',
		position: 'absolute',
		top: 0,
		left: 0,
		backgroundColor: 'rgba(0,0,0,0.2)',
		borderTopRightRadius: 18,
		borderTopLeftRadius: 18,
	},
	imageActionContainer: {
		width: '100%',
		position: 'absolute',
		bottom: 0,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	editImageButton: {
		width: 35,
		height: 35,
		borderRadius: 50,
		backgroundColor: 'rgba(0,0,0,0.5)',
		justifyContent: 'center',
		alignItems: 'center',
	},
	navigationButton: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
	},
	directionButton: {
		borderRadius: 8,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 10,
		paddingVertical: 5,
		paddingHorizontal: 10,
	},
	distanceActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	distance: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
	},
	campusName: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
		textAlign: 'center',
		marginBottom: 5,
	},
	dummy: {},
	placeholder: {
		width: 1,
		height: 1,
		opacity: 0,
	},
});
