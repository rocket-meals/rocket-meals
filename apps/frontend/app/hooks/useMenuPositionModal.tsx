import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { drawers } from '@/constants/SettingData';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { SET_DRAWER_POSITION } from '@/redux/Types/types';
import { CollectibleAt } from 'repo-depkit-common';

const MenuPositionSheet: React.FC<{ closeSheet: () => void }> = ({ closeSheet }) => {
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { drawerPosition, primaryColor } = useSelector((state: RootState) => state.settings);
	const [selectedOption, setSelectedOption] = useState<string | null>(null);

	const updatePosition = (position: string) => {
		setSelectedOption(position);
		dispatch({ type: SET_DRAWER_POSITION, payload: position });
		closeSheet();
	};

	useEffect(() => {
		setSelectedOption(drawerPosition);
	}, [drawerPosition]);

	return (
		<View style={{ width: '100%', gap: 12 }}>
			<View style={{ width: '100%', paddingHorizontal: 10, marginTop: 12 }}>
				<SettingsListSelectOption
					options={drawers.map((drawer) => ({
						id: drawer.id,
						label: translate(drawer.name),
						icon: <MaterialCommunityIcons name={drawer.icon} size={24} />,
					}))}
					selectedOption={selectedOption}
					onSelect={(option) => updatePosition(option.id)}
					iconBgColor={primaryColor}
				/>
			</View>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_settings_menuposition} />
		</View>
	);
};

export const useMenuPositionModal = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openMenuPositionModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.drawer_config_position),
			onClose: closeScrollViewModal,
			children: <MenuPositionSheet closeSheet={closeScrollViewModal} />,
		});
	}, [closeScrollViewModal, showScrollViewModal, translate]);

	return { openMenuPositionModal };
};

export default useMenuPositionModal;
