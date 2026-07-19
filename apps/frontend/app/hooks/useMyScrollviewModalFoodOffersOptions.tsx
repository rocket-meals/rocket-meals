import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons, MaterialIcons, FontAwesome6, MaterialCommunityIcons } from '@expo/vector-icons';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import SettingsList from '@/components/SettingsList/SettingsList';
import { ComponentIds } from '@/constants/ComponentIds';
import { useAppSelector } from '@/redux/hooks';
import { shallowEqual } from 'react-redux';
import FoodoffersAverageRatingToggle from '@/components/FoodoffersAverageRatingToggle';

interface FoodOffersOptionsContentProps {
	closeSheet: () => void;
	onSort: () => void;
	onPriceGroup: () => void;
	onEatingHabits: () => void;
	onCanteen: () => void;
	onCalendar: () => void;
	onBusinessHours: () => void;
	onSettings: () => void;
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
});

type NavigationOption = {
	key: string;
	kind: 'navigation';
	title: string;
	icon: React.ReactNode;
	onPress: () => void;
	nativeID?: string;
};

type BooleanToggleOption = {
	key: string;
	kind: 'boolean';
};

type OptionItem = NavigationOption | BooleanToggleOption;

const FoodOffersOptionsContent: React.FC<FoodOffersOptionsContentProps> = ({
	closeSheet,
	onSort,
	onPriceGroup,
	onEatingHabits,
	onCanteen,
	onCalendar,
	onBusinessHours,
	onSettings,
}) => {
	const { translate } = useLanguage();
	const appSettings = useAppSelector((state) => state.settings.appSettings, shallowEqual);

	const options: OptionItem[] = [
		{
			key: 'canteen',
			kind: 'navigation',
			title: translate(TranslationKeys.canteen),
			icon: <MaterialIcons name="restaurant-menu" size={20} />,
			onPress: () => { onCanteen(); },
		},
		{
			key: 'calendar',
			kind: 'navigation',
			title: translate(TranslationKeys.date),
			icon: <MaterialIcons name="calendar-month" size={20} />,
			onPress: () => { onCalendar(); },
		},
		{
			key: 'sort',
			kind: 'navigation',
			title: translate(TranslationKeys.sort),
			icon: <MaterialIcons name="sort" size={20} />,
			onPress: () => { onSort(); },
			nativeID: ComponentIds.FOODOFFERS_OPTION_SORT,
		},
		{
			key: 'priceGroup',
			kind: 'navigation',
			title: translate(TranslationKeys.price_group),
			icon: <FontAwesome6 name="euro-sign" size={20} />,
			onPress: () => { closeSheet(); onPriceGroup(); },
		},
		{
			key: 'eatingHabits',
			kind: 'navigation',
			title: translate(TranslationKeys.eating_habits),
			icon: <Ionicons name="bag-add" size={20} />,
			onPress: () => { closeSheet(); onEatingHabits(); },
		},
		{
			key: 'businessHours',
			kind: 'navigation',
			title: translate(TranslationKeys.businesshours),
			icon: <MaterialCommunityIcons name="clock-time-eight" size={20} />,
			onPress: () => { onBusinessHours(); },
		},
	];

	if (appSettings?.foods_ratings_average_display === true) {
		options.push({
			key: 'showAverageRatingOnCard',
			kind: 'boolean',
		});
	}

	options.push({
		key: 'settings',
		kind: 'navigation',
		title: translate(TranslationKeys.further_settings),
		icon: <MaterialCommunityIcons name="cog-outline" size={20} />,
		onPress: () => { closeSheet(); onSettings(); },
	});

	return (
		<View style={styles.container}>
			{options.map((option, index) => {
				const groupPosition =
					options.length === 1
						? 'single'
						: index === 0
							? 'top'
							: index === options.length - 1
								? 'bottom'
								: 'middle';
				const showSeparator = index !== options.length - 1;

				if (option.kind === 'boolean') {
					return (
						<FoodoffersAverageRatingToggle
							key={option.key}
							groupPosition={groupPosition}
						/>
					);
				}

				return (
					<SettingsList
						key={option.key}
						title={option.title}
						leftIcon={option.icon}
						onPress={option.onPress}
						groupPosition={groupPosition}
						showSeparator={showSeparator}
						nativeID={option.nativeID}
					/>
				);
			})}
		</View>
	);
};

interface UseMyScrollviewModalFoodOffersOptionsParams {
	onSort: () => void;
	onPriceGroup: () => void;
	onEatingHabits: () => void;
	onCanteen: () => void;
	onCalendar: () => void;
	onBusinessHours: () => void;
	onSettings: () => void;
}

export const useMyScrollviewModalFoodOffersOptions = (params: UseMyScrollviewModalFoodOffersOptionsParams) => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openFoodOffersOptionsModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.options_and_information),
			children: (
				<FoodOffersOptionsContent
					closeSheet={closeScrollViewModal}
					onSort={params.onSort}
					onPriceGroup={params.onPriceGroup}
					onEatingHabits={params.onEatingHabits}
					onCanteen={params.onCanteen}
					onCalendar={params.onCalendar}
					onBusinessHours={params.onBusinessHours}
					onSettings={params.onSettings}
				/>
			),
		});
	}, [closeScrollViewModal, showScrollViewModal, translate, params.onSort, params.onPriceGroup, params.onEatingHabits, params.onCanteen, params.onCalendar, params.onBusinessHours, params.onSettings]);

	return { openFoodOffersOptionsModal };
};

export default useMyScrollviewModalFoodOffersOptions;
