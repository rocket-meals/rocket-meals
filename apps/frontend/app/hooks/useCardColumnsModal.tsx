import React, { useCallback, useEffect, useState } from 'react';
import { View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { AmountColumn } from '@/constants/SettingData';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { SET_AMOUNT_COLUMNS_FOR_CARDS } from '@/redux/Types/types';
import { CollectibleAt } from 'repo-depkit-common';

const CardColumnsSheet: React.FC<{ closeSheet: () => void }> = ({ closeSheet }) => {
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { amountColumnsForcard, primaryColor } = useSelector((state: RootState) => state.settings);
	const [selectedOption, setSelectedOption] = useState<number | null>(null);

	const updateColumns = (value: number) => {
		setSelectedOption(value);
		dispatch({ type: SET_AMOUNT_COLUMNS_FOR_CARDS, payload: value });
		closeSheet();
	};

	useEffect(() => {
		setSelectedOption(amountColumnsForcard);
	}, [amountColumnsForcard]);

	return (
		<View style={{ width: '100%', gap: 12 }}>
			<View style={{ width: '100%', paddingHorizontal: 10, marginTop: 12 }}>
				<SettingsListSelectOption
					options={AmountColumn.map((column) => ({
						id: column.id,
						label: column.id === 0 ? translate(TranslationKeys.automatic) : column.name,
					}))}
					selectedOption={selectedOption}
					onSelect={(option) => updateColumns(option.id)}
					selectionColor={primaryColor}
					noIconIndent
				/>
			</View>
			<CollectibleSpot collectibleKey={CollectibleAt.collectible_at_settings_amount_column} />
		</View>
	);
};

export const useCardColumnsModal = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openCardColumnsModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.amount_columns_for_cards),
			onClose: closeScrollViewModal,
			children: <CardColumnsSheet closeSheet={closeScrollViewModal} />,
		});
	}, [closeScrollViewModal, showScrollViewModal, translate]);

	return { openCardColumnsModal };
};

export default useCardColumnsModal;
