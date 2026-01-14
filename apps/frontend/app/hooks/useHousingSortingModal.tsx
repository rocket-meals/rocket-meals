import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { ApartmentSortOption } from 'repo-depkit-common';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import { RootState } from '@/redux/reducer';
import { SET_APARTMENTS_SORTING } from '@/redux/Types/types';

const HousingSortSheet: React.FC<{ closeSheet: () => void }> = ({ closeSheet }) => {
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { apartmentsSortBy, primaryColor: projectColor, appSettings } = useSelector((state: RootState) => state.settings);
	const [selectedOption, setSelectedOption] = useState<ApartmentSortOption | null>(null);
	const housing_area_color = appSettings?.housing_area_color ? appSettings?.housing_area_color : projectColor;

	const sortingOptions = [
		{
			id: ApartmentSortOption.INTELLIGENT,
			label: TranslationKeys.sort_option_intelligent,
			icon: <MaterialCommunityIcons name="brain" size={24} />,
		},
		{
			id: ApartmentSortOption.FREE_ROOMS,
			label: TranslationKeys.free_rooms,
			icon: <MaterialCommunityIcons name="door-open" size={24} />,
		},
		{
			id: ApartmentSortOption.DISTANCE,
			label: TranslationKeys.sort_option_distance,
			icon: <MaterialCommunityIcons name="map-marker-distance" size={24} />,
		},
		{
			id: ApartmentSortOption.ALPHABETICAL,
			label: TranslationKeys.sort_option_alphabetical,
			icon: <MaterialCommunityIcons name="sort-alphabetical-ascending" size={24} />,
		},
		{
			id: ApartmentSortOption.NONE,
			label: TranslationKeys.sort_option_none,
			icon: <MaterialCommunityIcons name="sort-variant-remove" size={24} />,
		},
	];

	const updateSort = (option: { id: ApartmentSortOption }) => {
		setSelectedOption(option.id);
		dispatch({ type: SET_APARTMENTS_SORTING, payload: option.id });
		closeSheet();
	};

	useEffect(() => {
		setSelectedOption(apartmentsSortBy as ApartmentSortOption);
	}, [apartmentsSortBy]);

	return (
		<View style={{ width: '100%', gap: 12 }}>
			<View style={{ width: '100%', paddingHorizontal: 10, marginTop: 12 }}>
				<SettingsListSelectOption
					options={sortingOptions.map((option) => ({
						...option,
						label: translate(option.label),
					}))}
					selectedOption={selectedOption}
					onSelect={updateSort}
					iconBgColor={housing_area_color}
				/>
			</View>
		</View>
	);
};

export const useHousingSortingModal = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openHousingSortingModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.sort),
			onClose: closeScrollViewModal,
			children: <HousingSortSheet closeSheet={closeScrollViewModal} />,
		});
	}, [closeScrollViewModal, showScrollViewModal, translate]);

	return { openHousingSortingModal };
};

export default useHousingSortingModal;
