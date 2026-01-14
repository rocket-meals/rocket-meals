import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { CampusSortOption } from 'repo-depkit-common';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import { RootState } from '@/redux/reducer';
import { SET_CAMPUSES_SORTING } from '@/redux/Types/types';

const CampusSortSheet: React.FC<{ closeSheet: () => void }> = ({ closeSheet }) => {
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { campusesSortBy, primaryColor: projectColor, appSettings } = useSelector((state: RootState) => state.settings);
	const [selectedOption, setSelectedOption] = useState<CampusSortOption | null>(null);
	const campus_area_color = appSettings?.campus_area_color ? appSettings?.campus_area_color : projectColor;

	const sortingOptions = [
		{
			id: CampusSortOption.INTELLIGENT,
			label: TranslationKeys.sort_option_intelligent,
			icon: <MaterialCommunityIcons name="brain" size={24} />,
		},
		{
			id: CampusSortOption.DISTANCE,
			label: TranslationKeys.sort_option_distance,
			icon: <MaterialCommunityIcons name="map-marker-distance" size={24} />,
		},
		{
			id: CampusSortOption.ALPHABETICAL,
			label: TranslationKeys.sort_option_alphabetical,
			icon: <FontAwesome5 name="sort-alpha-down" size={24} />,
		},
		{
			id: CampusSortOption.NONE,
			label: TranslationKeys.sort_option_none,
			icon: <MaterialCommunityIcons name="sort-variant-remove" size={24} />,
		},
	];

	const updateSort = (option: { id: CampusSortOption }) => {
		setSelectedOption(option.id);
		dispatch({ type: SET_CAMPUSES_SORTING, payload: option.id });
		closeSheet();
	};

	useEffect(() => {
		setSelectedOption(campusesSortBy as CampusSortOption);
	}, [campusesSortBy]);

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
					iconBgColor={campus_area_color}
				/>
			</View>
		</View>
	);
};

export const useCampusSortingModal = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openCampusSortingModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.sort),
			onClose: closeScrollViewModal,
			children: <CampusSortSheet closeSheet={closeScrollViewModal} />,
		});
	}, [closeScrollViewModal, showScrollViewModal, translate]);

	return { openCampusSortingModal };
};

export default useCampusSortingModal;
