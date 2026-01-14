import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import FoodLabelingInfo from '../FoodLabelingInfo';
import MarkingLabels from '../MarkingLabels/MarkingLabels';
import { getFoodOffer } from '@/constants/HelperFunctions';
import { CollectibleAt, DatabaseTypes, sortMarkingsByGroup } from 'repo-depkit-common';
import { createSelector } from 'reselect';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { MarkingGroupsHelper } from '@/redux/actions/MarkingGroups/MarkingGroups';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';

interface LabelsProps {
        foodDetails: any;
        offerId?: string;
        handleMenuSheet?: () => void;
        color: string;
}

const selectMarkings = (state: RootState) => state.food.markings;

export const selectFoodOffer = (offerId?: string) =>
        createSelector([(state: RootState) => state.canteenReducer.selectedCanteenFoodOffers], foodOffers =>
                offerId ? getFoodOffer(foodOffers, offerId) : undefined
        );

const Labels: React.FC<LabelsProps> = ({ foodDetails, offerId, handleMenuSheet, color }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, appSettings } = useSelector((state: RootState) => state.settings);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

	let food_responsible_organization_name = appSettings?.food_responsible_organization_name || 'Verantwortliche Organisation';
	let food_responsible_organization_link = appSettings?.food_responsible_organization_link || 'https://www.studentenwerk-osnabrueck.de/';
	const handleRedirect = () => {
		Linking.openURL(food_responsible_organization_link).catch(err => console.error('Failed to open URL:', err));
	};

        const markings = useSelector(selectMarkings);
        const foodOfferSelector = useMemo(
                () => (offerId ? selectFoodOffer(offerId) : () => undefined),
                [offerId]
        );
        const foodOffer = useSelector(foodOfferSelector as (state: RootState) => DatabaseTypes.Foodoffers | undefined);

	// State for marking groups
	const [markingGroups, setMarkingGroups] = useState<DatabaseTypes.MarkingsGroups[]>([]);

	// Fetch marking groups
	useEffect(() => {
		const fetchMarkingGroups = async () => {
			try {
				const markingGroupsHelper = new MarkingGroupsHelper();
				const result = await markingGroupsHelper.fetchMarkingGroups({});
				if (result) {
					setMarkingGroups(result);
				}
			} catch (error) {
				console.error('Error fetching marking groups:', error);
			}
		};

		fetchMarkingGroups();
	}, []);

	const foodMarkings = useMemo(() => {
		if (!foodOffer?.markings) return [];

		// First, map food offer markings to actual marking objects
		const mappedMarkings = foodOffer.markings?.map((marking: DatabaseTypes.FoodoffersMarkings) => markings.find((mark: DatabaseTypes.Markings) => mark.id === marking?.markings_id)).filter((mark: any): mark is DatabaseTypes.Markings => Boolean(mark));

		// Then sort them using the sortMarkingsByGroup function
		return sortMarkingsByGroup(mappedMarkings, markingGroups);
	}, [foodOffer, markings, markingGroups]);

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.markings)}</Text>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers_details_markings} />
                        {foodMarkings?.map((marking: DatabaseTypes.Markings) => (
                                <MarkingLabels key={marking.id} markingId={marking.id} handleMenuSheet={handleMenuSheet} />
                        ))}

                        <FoodLabelingInfo textStyle={styles.body} backgroundColor={foods_area_color} />

                </View>
        );
};

export default Labels;
