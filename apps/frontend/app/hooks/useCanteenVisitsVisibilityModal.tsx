import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { SET_CANTEEN_VISITS_VISIBILITY } from '@/redux/Types/types';

type CanteenVisitsVisibility = 'all' | 'friends_only' | 'public_only' | 'off';

interface VisibilitySheetProps {
	closeSheet: () => void;
}

const styles = StyleSheet.create({
	visibilityListContainer: {
		width: '100%',
		paddingHorizontal: 10,
		marginTop: 12,
	},
});

export const VisibilitySheet: React.FC<VisibilitySheetProps> = ({ closeSheet }) => {
	const { translate } = useLanguage();

	const dispatch = useDispatch();
	const { primaryColor, appSettings } = useAppSelector((state) => state.settings);
	const canteenVisitsVisibility = useAppSelector((state) => (state.settings as any).canteenVisits?.visibility ?? 'all') as CanteenVisitsVisibility;
	const [selectedOption, setSelectedOption] = useState<CanteenVisitsVisibility | null>(null);
	const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

	const visibilityOptions = [
		{
			id: 'all' as CanteenVisitsVisibility,
			label: translate(TranslationKeys.canteen_visits_visibility_all),
			icon: <MaterialCommunityIcons name="eye" size={24} />,
		},
		{
			id: 'friends_only' as CanteenVisitsVisibility,
			label: translate(TranslationKeys.canteen_visits_visibility_friends_only),
			icon: <MaterialCommunityIcons name="account-heart" size={24} />,
		},
		{
			id: 'public_only' as CanteenVisitsVisibility,
			label: translate(TranslationKeys.canteen_visits_visibility_public_only),
			icon: <MaterialCommunityIcons name="account-group" size={24} />,
		},
		{
			id: 'off' as CanteenVisitsVisibility,
			label: translate(TranslationKeys.canteen_visits_visibility_off),
			icon: <MaterialCommunityIcons name="eye-off" size={24} />,
		},
	];

	const updateVisibility = (option: { id: CanteenVisitsVisibility }) => {
		setSelectedOption(option.id);
		dispatch({ type: SET_CANTEEN_VISITS_VISIBILITY, payload: option.id });
		closeSheet();
	};

	useEffect(() => {
		setSelectedOption(canteenVisitsVisibility);
	}, [canteenVisitsVisibility]);

	return (
		<View style={{ width: '100%', gap: 12 }}>
			<View style={styles.visibilityListContainer}>
				<SettingsListSelectOption
					options={visibilityOptions}
					selectedOption={selectedOption}
					onSelect={updateVisibility}
					iconBgColor={foods_area_color}
				/>
			</View>
		</View>
	);
};

export const useCanteenVisitsVisibilityModal = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();
	const openCanteenVisitsVisibilityModal = useCallback(() => {
		showScrollViewModal(
			{
				title: translate(TranslationKeys.canteen_visits_visibility),
				onClose: closeScrollViewModal,
				children: <VisibilitySheet closeSheet={closeScrollViewModal} />,
			},
			{ noGrip: true }
		);
	}, [closeScrollViewModal, showScrollViewModal, translate]);

	return { openCanteenVisitsVisibilityModal };
};

export default useCanteenVisitsVisibilityModal;
