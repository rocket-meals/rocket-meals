import React, { useEffect, useMemo, useState } from 'react';
import { Linking, Text, View } from 'react-native';
import { useSelector } from 'react-redux';
import { useTheme } from '@/hooks/useTheme';
import styles from './styles';
import FoodLabelingInfo from '../FoodLabelingInfo';
import DebugView from '@/components/DebugView';
import SettingsListMarkingLabels from '@/components/SettingsListMarkingLabels';
import SettingsList from '@/components/SettingsList';
import { getFoodOffer } from '@/constants/HelperFunctions';
import { CollectibleAt, DatabaseTypes, sortMarkingsByGroup } from 'repo-depkit-common';
import { createSelector } from 'reselect';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { fetchFoodofferComponentsById } from '@/redux/actions/FoodOffers/FoodOffers';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import { getTextFromTranslation } from '@/helper/resourceHelper';

interface LabelsProps {
	foodDetails: any;
	offerId?: string;
	foodOfferDetails?: DatabaseTypes.Foodoffers | null;
	handleMenuSheet?: () => void;
	color: string;
}

const selectMarkings = (state: RootState) => state.food.markings;
const selectMarkingGroups = (state: RootState) => state.food.markingGroups;

export const selectFoodOffer = (offerId?: string) =>
	createSelector([(state: RootState) => state.canteenReducer.selectedCanteenFoodOffers], foodOffers =>
		offerId ? getFoodOffer(foodOffers, offerId) : undefined
	);

const Labels: React.FC<LabelsProps> = ({ foodDetails, offerId, foodOfferDetails, handleMenuSheet, color }) => {
	const { theme } = useTheme();
	const { translate, language } = useLanguage();
	const { primaryColor, appSettings } = useSelector((state: RootState) => state.settings);

	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

	let food_responsible_organization_name = appSettings?.food_responsible_organization_name || 'Verantwortliche Organisation';
	let food_responsible_organization_link = appSettings?.food_responsible_organization_link || 'https://www.studentenwerk-osnabrueck.de/';
	const handleRedirect = () => {
		Linking.openURL(food_responsible_organization_link).catch(err => console.error('Failed to open URL:', err));
	};

	const markings = useSelector(selectMarkings);
	const markingGroups = useSelector(selectMarkingGroups);
	const foodOfferSelector = useMemo(
		() => (offerId ? selectFoodOffer(offerId) : () => undefined),
		[offerId]
	);
	const foodOffer = useSelector(foodOfferSelector as (state: RootState) => DatabaseTypes.Foodoffers | undefined);

	// State for foodoffer components
	const [foodofferComponents, setFoodofferComponents] = useState<any[]>([]);

	// Fetch foodoffer components when offerId is available
	useEffect(() => {
		if (!offerId) return;
		const fetchComponents = async () => {
			try {
				const result = await fetchFoodofferComponentsById(offerId);
				const components = result?.data?.foodoffer_components;
				if (components) {
					setFoodofferComponents(components);
				}
			} catch (error) {
				console.error('Error fetching foodoffer components:', error);
			}
		};
		fetchComponents();
	}, [offerId]);

	const mappedFoodOfferMarkings = useMemo(() => {
		const offerMarkings = foodOfferDetails?.markings ?? foodOffer?.markings;
		if (!offerMarkings) return [];

		return offerMarkings
			?.map((marking: DatabaseTypes.FoodoffersMarkings) => markings.find((mark: DatabaseTypes.Markings) => mark.id === marking?.markings_id))
			.filter((mark: any): mark is DatabaseTypes.Markings => Boolean(mark));
	}, [foodOffer, foodOfferDetails, markings]);

	const foodMarkings = useMemo(() => {
		return sortMarkingsByGroup(mappedFoodOfferMarkings, markingGroups);
	}, [mappedFoodOfferMarkings, markingGroups]);

	const globalMarkingIds = useMemo(() => {
		const allComponentMarkingIds = new Set<string>(
			foodofferComponents.flatMap((component: any) =>
				(component?.component_foodoffers_id?.markings ?? []).map((m: any) => m?.markings_id)
			)
		);
		const foodOfferMarkingIds: string[] = (foodOfferDetails?.markings ?? foodOffer?.markings ?? [])
			.map((m: DatabaseTypes.FoodoffersMarkings) => m?.markings_id as string)
			.filter(Boolean);
		return foodOfferMarkingIds.filter(id => !allComponentMarkingIds.has(id));
	}, [foodofferComponents, foodOfferDetails, foodOffer]);

	return (
		<View style={styles.container}>
			<Text style={{ ...styles.heading, color: theme.screen.text }}>{translate(TranslationKeys.markings)}</Text>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers_details_markings} />
			<SettingsListMarkingLabels markingIds={foodMarkings.map((m: DatabaseTypes.Markings) => m.id)} handleMenuSheet={handleMenuSheet} />
			{foodMarkings.length === 0 && (
				<SettingsList title={translate(TranslationKeys.no_allergens_and_additives)} italic noIconIndent groupPosition="single" showSeparator={false} />
			)}

			<DebugView title="Foodoffer Components">
			{foodofferComponents.map((component: any) => {
				const componentFoodoffer = component?.component_foodoffers_id;
				if (!componentFoodoffer) return null;
				const componentName =
					getTextFromTranslation(componentFoodoffer?.translations, language) ||
					componentFoodoffer?.alias ||
					`Component #${componentFoodoffer?.id}`;
				const componentMarkingIds: string[] = (componentFoodoffer?.markings ?? []).map(
					(m: any) => m?.markings_id
				);
				return (
					<View key={componentFoodoffer?.id}>
						<SettingsGroupTitle fontSize={26}>{componentName}</SettingsGroupTitle>
						{componentMarkingIds.length === 0 ? (
							<SettingsList title="Keine Lebensmittelkennzeichnungsdaten übermittelt worden" italic noIconIndent groupPosition="single" showSeparator={false} />
						) : (
							<SettingsListMarkingLabels markingIds={componentMarkingIds} handleMenuSheet={handleMenuSheet} />
						)}
					</View>
				);
			})}
			{globalMarkingIds.length > 0 && (
				<View>
					<SettingsGroupTitle fontSize={26}>{translate(TranslationKeys.global_markings)}</SettingsGroupTitle>
					<SettingsListMarkingLabels markingIds={globalMarkingIds} handleMenuSheet={handleMenuSheet} />
				</View>
			)}
		</DebugView>

			<DebugView title="Foodoffer Markings Data">
				<Text style={{ ...styles.body, color: theme.screen.text }}>
					{JSON.stringify(
						{
							foodOfferMarkings: foodOfferDetails?.markings ?? foodOffer?.markings ?? [],
							mappedMarkings: mappedFoodOfferMarkings,
							sortedMarkings: foodMarkings,
						},
						null,
						2
					)}
				</Text>
			</DebugView>

			<DebugView title="Foodoffer Markings Count">
				<Text style={{ ...styles.body, color: theme.screen.text }}>{foodOfferDetails?.markings?.length ?? foodOffer?.markings?.length ?? 0}</Text>
			</DebugView>

			<FoodLabelingInfo textStyle={styles.body} backgroundColor={foods_area_color} />
		</View>
	);
};

export default Labels;