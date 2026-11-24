import React, { useCallback, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { MaterialCommunityIcons, Octicons } from '@expo/vector-icons';
import { shallowEqual } from 'react-redux';
import { DatabaseTypes, doesNewsMatchCanteen, getNewsFoodoffersLocation, isNewsShownAt, NewsFoodoffersPosition } from 'repo-depkit-common';
import PopupEventSheet from '@/components/PopupEventSheet/PopupEventSheet';
import MyImage from '@/components/MyImage';
import SettingsList from '@/components/SettingsList';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { getNewsImageUrl } from '@/constants/HelperFunctions';
import { getTitleFromTranslation } from '@/helper/resourceHelper';
import { useTheme } from '@/hooks/useTheme';
import { useAppSelector } from '@/redux/hooks';
import CardDimensionHelper from '@/helper/CardDimensionHelper';

type FoodoffersNews = DatabaseTypes.News;

type NewsFoodoffersHintProps = {
	canteenId: string;
	position: NewsFoodoffersPosition;
};

/**
 * News with `display_locations` "foodoffers_top" or "foodoffers_bottom", as compact cards above the food
 * offers or below the first day (`position` picks which ones). They come with the popup news
 * (`state.food.popupEvents`, loaded in the app layout). Only the news for the shown canteen (a news
 * without canteens is meant for all of them). A tap opens the full news. The cards cannot be hidden:
 * they stay as long as the news is meant for the food offers (no "x", and the opened news has no
 * "do not show again" button, that one is only for popups and their `isOpen` flag). A `SettingsList`
 * row like the feature wishes tile, with the primary colour as accent on the left and the side spacing
 * of the food cards.
 */
const NewsFoodoffersHint: React.FC<NewsFoodoffersHintProps> = ({ canteenId, position }) => {
	const { theme } = useTheme();
	const { show: showModal, close: closeModal } = useMyScrollViewModal();
	const { primaryColor, language } = useAppSelector(state => state.settings);
	const { width: screenWidth } = useWindowDimensions();
	const popupEvents = useAppSelector(state => state.food.popupEvents, shallowEqual) as FoodoffersNews[];

	const visibleEvents = useMemo(() => (popupEvents ?? []).filter(event => isNewsShownAt(event, getNewsFoodoffersLocation(position)) && doesNewsMatchCanteen(event, canteenId)), [popupEvents, canteenId, position]);

	const openDetails = useCallback(
		(event: FoodoffersNews) => {
			showModal({
				children: <PopupEventSheet closeSheet={closeModal} eventData={event} showDismissButton={false} />,
			});
		},
		[showModal, closeModal]
	);

	if (visibleEvents.length === 0) {
		return null;
	}

	return (
		<View style={[styles.container, { paddingHorizontal: CardDimensionHelper.getItemGap(screenWidth) }]}>
			{visibleEvents.map(event => {
				const title = (event.translations ? getTitleFromTranslation(event.translations, language) : '') || event.alias || '';
				const imageUrl = getNewsImageUrl(event);
				return (
					<SettingsList
						key={event.id}
						iconBgColor={primaryColor}
						accentColor={primaryColor}
						leftIcon={<MaterialCommunityIcons name="bullhorn-outline" size={24} color={theme.screen.icon} />}
						leftIconComponent={
							imageUrl ? (
								<View style={styles.imageContainer}>
									<MyImage style={styles.image} remote_image_url={imageUrl} />
								</View>
							) : undefined
						}
						label={title}
						titleNumberOfLines={2}
						rightIcon={<Octicons name="chevron-right" size={24} color={theme.screen.icon} />}
						handleFunction={() => openDetails(event)}
						groupPosition="single"
					/>
				);
			})}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		width: '100%',
		gap: 8,
		marginVertical: 12,
	},
	imageContainer: {
		width: 34,
		height: 34,
		borderRadius: 8,
		overflow: 'hidden',
		marginRight: 10,
	},
	image: {
		width: '100%',
		height: '100%',
	},
});

export default NewsFoodoffersHint;
