import React, { useCallback } from 'react';
import { View } from 'react-native';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import SettingsListSelectOption from '@/components/SettingsListSelectOption/SettingsListSelectOption';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import { SET_ASSET_IMAGE_QUALITY } from '@/redux/Types/types';
import { DEFAULT_ASSET_IMAGE_QUALITY } from '@/constants/HelperFunctions';

const IMAGE_QUALITY_OPTIONS = [100, 90, 80, 70, 60, 50];

const ImageQualitySheet: React.FC<{ closeSheet: () => void }> = ({ closeSheet }) => {
	const dispatch = useDispatch();
	const { assetImageQuality, primaryColor } = useAppSelector((state) => state.settings);

	const selectQuality = (value: number) => {
		dispatch({ type: SET_ASSET_IMAGE_QUALITY, payload: value });
		closeSheet();
	};

	return (
		<View style={{ width: '100%' }}>
			<SettingsListSelectOption
				options={IMAGE_QUALITY_OPTIONS.map((quality) => ({ id: quality, label: String(quality) }))}
				selectedOption={assetImageQuality || DEFAULT_ASSET_IMAGE_QUALITY}
				onSelect={(option) => selectQuality(option.id)}
				selectionColor={primaryColor}
				noIconIndent
			/>
		</View>
	);
};

/** Developer setting: quality the server encodes resized images with (see getImageUrl) */
export const useImageQualityModal = () => {
	const { show: showScrollViewModal, close: closeScrollViewModal } = useMyScrollViewModal();
	const { translate } = useLanguage();

	const openImageQualityModal = useCallback(() => {
		showScrollViewModal({
			title: translate(TranslationKeys.image_quality),
			onClose: closeScrollViewModal,
			children: <ImageQualitySheet closeSheet={closeScrollViewModal} />,
		});
	}, [closeScrollViewModal, showScrollViewModal, translate]);

	return { openImageQualityModal };
};

export default useImageQualityModal;
