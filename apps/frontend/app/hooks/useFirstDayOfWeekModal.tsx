import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { days } from '@/constants/SettingData';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { SET_FIRST_DAY_OF_THE_WEEK } from '@/redux/Types/types';
import { CollectibleAt } from 'repo-depkit-common';

const FirstDayOfWeekSheet: React.FC<{ closeSheet: () => void }> = ({ closeSheet }) => {
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { firstDayOfTheWeek, primaryColor } = useAppSelector((state) => state.settings);
	const [selectedOption, setSelectedOption] = useState<string | null>(null);

	const updateFirstDay = (day: { id: string; name: string }) => {
		setSelectedOption(day.id);
		dispatch({ type: SET_FIRST_DAY_OF_THE_WEEK, payload: day });
		closeSheet();
	};

	useEffect(() => {
		setSelectedOption(firstDayOfTheWeek?.id);
	}, [firstDayOfTheWeek]);

	return (
		<View style={{ width: '100%' }}>
			<SettingsListSelectOption
				options={days.map((day) => ({
					id: day.id,
					label: translate(day.name),
				}))}
				selectedOption={selectedOption}
				onSelect={(option) => {
					const selectedDay = days.find((day) => day.id === option.id);
					if (selectedDay) {
						updateFirstDay({ id: selectedDay.id, name: selectedDay.name });
					}
				}}
				selectionColor={primaryColor}
				noIconIndent
			/>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_settings_first_day_of_week} />
		</View>
	);
};

export const useFirstDayOfWeekModal = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openFirstDayOfWeekModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.first_day_of_week),
			onClose: closeScrollViewModal,
			children: <FirstDayOfWeekSheet closeSheet={closeScrollViewModal} />,
		});
	}, [closeScrollViewModal, showScrollViewModal, translate]);

	return { openFirstDayOfWeekModal };
};

export default useFirstDayOfWeekModal;
