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
import useBuildingFavorites from '@/hooks/useBuildingFavorites';

// Positive/favorite border color - matches the "liked" food offer card border (#00B050)
// used elsewhere in the app for a consistent good/positive accent.
const FAVORITE_BORDER_COLOR = '#00B050';


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

const NavigationTriggerButton = ({
	triggerProps,
	onPress,
	backgroundColor,
	iconColor,
}: {
	triggerProps: object;
	onPress: () => void;
	backgroundColor: string;
	iconColor: string;
}) => (
	<IconButton
		{...triggerProps}
		style={[styles.navigationButton, { backgroundColor }]}
		onPress={onPress}
	>
		<MaterialCommunityIcons name="navigation-variant" size={20} color={iconColor} />
	</IconButton>
);

const makeNavigationTrigger = (onPress: () => void, backgroundColor: string, iconColor: string) => (triggerProps: object) => (
	<NavigationTriggerButton triggerProps={triggerProps} onPress={onPress} backgroundColor={backgroundColor} iconColor={iconColor} />
);

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
	const { isBuildingFavorite, toggleBuildingFavorite } = useBuildingFavorites();
	const isFavorite = isBuildingFavorite(campus?.id ?? '');

	const defaultImage = useMemo(() => getImageUrl(projectLogo ?? ''), [projectLogo]);
	const campus_area_color = campusAreaColor || primaryColor;
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

	const handleToggleFavorite = useCallback(() => {
		if (!campus?.id) return;
		toggleBuildingFavorite(campus.id);
	}, [campus?.id, toggleBuildingFavorite]);

	const handleOpenNavigation = useCallback(() => {
		const coordinates = campus?.coordinates?.coordinates;
		if (coordinates?.length !== 2) {
			console.error('Invalid coordinates');
			return;
		}
		const [longitude, latitude] = coordinates;
		openLinkCoordinateModal({
			latlon: { latitude, longitude },
		});
	}, [campus, openLinkCoordinateModal, translate]);

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

	const renderCard = (triggerProps: any = {}) => (
		<CardWithText
			{...triggerProps}
			aspectRatio={false}
			onPress={() => handleNavigation(campus?.id)}
			imageSource={imageSource}
			imageAccessibilityLabel={campus?.alias ?? undefined}
			containerStyle={{
				width: '100%',
				backgroundColor: theme.card.background,
				flex: 1,
				...(isFavorite ? { borderWidth: 3, borderColor: FAVORITE_BORDER_COLOR } : {}),
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
							trigger={makeNavigationTrigger(handleOpenNavigation, campus_area_color, contrastColor)}
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

					<View style={styles.favoriteButtonContainer}>
						<TouchableOpacity style={styles.favoriteButton} onPress={handleToggleFavorite}>
							{isFavorite ? (
								<MaterialCommunityIcons name="heart" size={20} color={campus_area_color} />
							) : (
								<MaterialCommunityIcons name="heart-outline" size={20} color="white" />
							)}
						</TouchableOpacity>
					</View>

					<View style={styles.imageActionContainer}>
						{isManagement && (
							<TouchableOpacity
								style={styles.editImageButton}
								onPress={() => {
									onEditImage?.(campus);
								}}
							>
								<View />
							</TouchableOpacity>
						)}
						{!isManagement && isLastOpened && (
							<TouchableOpacity
								style={[styles.lastOpenedButton, { backgroundColor: campus_area_color }]}
								onPress={handleOpenLastOpenedModal}
							>
								<MaterialCommunityIcons name="clock-outline" size={20} color={contrastColor} />
							</TouchableOpacity>
						)}
						{!isManagement && !isLastOpened && <View />}

						{/* No distance without a reference point (no canteen chosen yet, no location) - "NaN m" otherwise. */}
						{Number.isFinite(campus?.distance) && (
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
						)}
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
		left: 10,
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
	},
	favoriteButtonContainer: {
		position: 'absolute',
		top: 10,
		right: 10,
	},
	favoriteButton: {
		width: 35,
		height: 35,
		borderRadius: 50,
		backgroundColor: 'rgba(0,0,0,0.45)',
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
