import React from 'react';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { Text, TouchableOpacity } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/colorHelper';
import { useSelector } from 'react-redux';
import { TranslationKeys } from '@/locales/keys';
import type { RootState } from '@/redux/reducer';
import { DistanceInfoSheetProps } from './types';

const DistanceInfoSheet: React.FC<DistanceInfoSheetProps> = ({
	closeSheet,
	onUseCurrentPosition,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const {
		appSettings,
		primaryColor,
		selectedTheme: mode,
	} = useSelector((state: RootState) => state.settings);
	const housingAreaColor = appSettings?.housing_area_color
		? appSettings?.housing_area_color
		: primaryColor;
	const contrastColor = myContrastColor(
		housingAreaColor,
		theme,
		mode === 'dark'
	);

	return (
		<BottomSheetView style={{ gap: 20, padding: 20 }}>
			<Text style={{ color: theme.screen.text, textAlign: 'center' }}>
				{translate(
					TranslationKeys.distance_based_canteen_selection_or_if_asked_on_real_location
				)}
			</Text>
			<TouchableOpacity
				style={{
					backgroundColor: housingAreaColor,
					padding: 10,
					borderRadius: 8,
					alignItems: 'center',
				}}
				onPress={onUseCurrentPosition}
			>
				<Text style={{ color: contrastColor }}>
					{translate(TranslationKeys.use_current_position_for_distance)}
				</Text>
			</TouchableOpacity>
		</BottomSheetView>
	);
};

export default DistanceInfoSheet;
