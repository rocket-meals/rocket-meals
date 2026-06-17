import React, { memo, useMemo, useCallback } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { isWeb } from '@/constants/Constants';
import { excerpt, getImageUrl } from '@/constants/HelperFunctions';
import { useTheme } from '@/hooks/useTheme';
import { myContrastColor } from '@/helper/ColorHelper';
import { getDistanceUnit } from '@/helper/distanceHelper';
import { CustomTooltip, TooltipContent, TooltipText } from '@/components/CustomTooltip';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useLinkCoordinateModal from '@/hooks/useLinkCoordinateModal';
import useMyScrollviewModalDistanceInformation from '@/hooks/useMyScrollviewModalDistanceInformation';
import useBuildingDetailsModal from '@/hooks/useBuildingDetailsModal';
import CardWithText from '../CardWithText/CardWithText';
import CardDimensionHelper from '@/helper/CardDimensionHelper';
import IconButton from '../UI/IconButton';
import { CardLayoutProps } from '@/components/shared/cardLayoutProps';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';


export interface BuildingItemPropsOptimized extends CardLayoutProps {
	campus: any;
	onEditImage?: (campus: any) => void;
	openDistanceSheet: () => void;
	// Flattened settings to improve memoization stability
	// amountColumnsForcard and screenWidth are required here (narrowed from optional in CardLayoutProps)
	amountColumnsForcard: number;
	projectLogo?: string; // Replaces serverInfo
	campusAreaColor?: string; // Replaces appSettings logic
	selectedTheme?: string;
	screenWidth: number;
	isLastOpened?: boolean;
}

const BuildingItem: React.FC<BuildingItemPropsOptimized> = ({ 
	campus, 
	onEditImage, 
	openDistanceSheet, 
	amountColumnsForcard,
	primaryColor,
	projectLogo,
	campusAreaColor,
	selectedTheme: mode,
	screenWidth,
	isManagement = false,
	isLastOpened = false,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { openLinkCoordinateModal } = useLinkCoordinateModal();
	const { openDistanceInformationModal } = useMyScrollviewModalDistanceInformation();
	const { openBuildingDetailsModal } = useBuildingDetailsModal();
	const { show: showScrollViewModal } = useMyScrollViewModal();

	const defaultImage = useMemo(() => getImageUrl(projectLogo ?? ''), [projectLogo]);
	const campus_area_color = campusAreaColor ? campusAreaColor : primaryColor;
	const contrastColor = myContrastColor(campus_area_color, theme, mode === 'dark');

	const handleNavigation = useCallback(
		(id: string) => openBuildingDetailsModal(id),
		[openBuildingDetailsModal]
	);

	const handleOpenLastOpenedModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.last_opened_buildings),
			children: (
				<Text style={[styles.lastOpenedInfoText, { color: theme.screen.text }]}>
					{translate(TranslationKeys.last_opened_building_info)}
				</Text>
			),
		});
	}, [showScrollViewModal, translate, theme.screen.text]);

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

	const cardSize =
		amountColumnsForcard === 0
		  ? CardDimensionHelper.getCardDimension(screenWidth)
		  : CardDimensionHelper.getCardWidth(screenWidth, amountColumnsForcard);

	const renderCard = (triggerProps: any = {}) => (
		<CardWithText
			{...triggerProps}
			aspectRatio={false}
			onPress={() => handleNavigation(campus?.id)}
			directus_asset_id={campus?.image}
			remote_image_url={campus?.image_remote_url}
			defaultImageUrl={defaultImage}
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
			knownCardWidth={cardSize}
			imageChildren={
				<>
					{isWeb ? (
						<CustomTooltip
							placement="top"
							trigger={innerTriggerProps => (
								<IconButton
									{...innerTriggerProps}
									style={[
										styles.navigationButton,
										{ backgroundColor: campus_area_color },
									]}
									onPress={handleOpenNavigation}
								>
									<MaterialCommunityIcons name="navigation-variant" size={20} color={contrastColor} />
								</IconButton>
							)}
						>
							<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
								<TooltipText fontSize="$sm" color={theme.tooltip.text}>
									{`${translate(TranslationKeys.open_navitation_to_location)}`}
								</TooltipText>
							</TooltipContent>
						</CustomTooltip>
					) : (
						<IconButton
							style={[
								styles.navigationButton,
								{ backgroundColor: campus_area_color },
							]}
							onPress={handleOpenNavigation}
						>
							<MaterialCommunityIcons name="navigation-variant" size={20} color={contrastColor} />
						</IconButton>
					)}

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
						) : isLastOpened ? (
							<TouchableOpacity
								style={[styles.lastOpenedButton, { backgroundColor: campus_area_color }]}
								onPress={handleOpenLastOpenedModal}
							>
								<MaterialCommunityIcons name="clock-outline" size={20} color={contrastColor} />
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
	);

	if (isWeb) {
		return (
			<CustomTooltip
				placement="top"
				trigger={triggerProps => renderCard(triggerProps)}
			>
				<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
					<TooltipText fontSize="$sm" color={theme.tooltip.text}>
						{`${translate(TranslationKeys.edit)}: ${translate(TranslationKeys.image)}`}
					</TooltipText>
				</TooltipContent>
			</CustomTooltip>
		);
	}

	return renderCard();
};

export default memo(BuildingItem, (prev, next) => {
    return prev.campus === next.campus &&
        prev.amountColumnsForcard === next.amountColumnsForcard &&
        prev.primaryColor === next.primaryColor &&
        prev.projectLogo === next.projectLogo &&
        prev.campusAreaColor === next.campusAreaColor &&
        prev.selectedTheme === next.selectedTheme &&
        prev.screenWidth === next.screenWidth &&
        prev.isManagement === next.isManagement &&
        prev.isLastOpened === next.isLastOpened &&
        prev.onEditImage === next.onEditImage &&
        prev.openDistanceSheet === next.openDistanceSheet;
});

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
	lastOpenedButton: {
		width: 36,
		height: 36,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
	},
	lastOpenedInfoText: {
		fontSize: 16,
		fontFamily: 'Poppins_400Regular',
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
