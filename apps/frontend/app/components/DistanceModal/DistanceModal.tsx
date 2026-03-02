import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import { myContrastColor } from '@/helper/ColorHelper';
import { TranslationKeys } from '@/locales/keys';
import type { RootState } from '@/redux/reducer';
import BaseBottomModal from '@/components/BaseBottomModal';

export interface DistanceModalProps {
	visible: boolean;
	onClose: () => void;
	onUseCurrentPosition: () => void;
}

const DistanceModal: React.FC<DistanceModalProps> = ({ visible, onClose, onUseCurrentPosition }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { appSettings, primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const housingAreaColor = appSettings?.housing_area_color ? appSettings.housing_area_color : primaryColor;
	const contrastColor = myContrastColor(housingAreaColor, theme, mode === 'dark');

	return (
		<BaseBottomModal visible={visible} onClose={onClose} title={translate(TranslationKeys.distance)}>
			<View style={{ gap: 20, padding: 20 }}>
				<Text style={{ color: theme.screen.text, textAlign: 'center' }}>{translate(TranslationKeys.distance_based_canteen_selection_or_if_asked_on_real_location)}</Text>
				<TouchableOpacity
					style={{
						backgroundColor: housingAreaColor,
						padding: 10,
						borderRadius: 8,
						alignItems: 'center',
					}}
					onPress={onUseCurrentPosition}
				>
					<Text style={{ color: contrastColor }}>{translate(TranslationKeys.use_current_position_for_distance)}</Text>
				</TouchableOpacity>
				<Text style={{ color: theme.screen.text }}>{'Wir teilen deinen aktuellen Standort nicht mit uns. Er wird ausschließlich auf deinem Handy verwendet, um die Entfernung zu berechnen. Aus Datenschutzgründen verlassen diese Daten niemals dein Gerät und werden nicht gespeichert. So kannst du sicher sein, dass deine Privatsphäre geschützt ist, während du den vollen Funktionsumfang testen kannst.'}</Text>
			</View>
		</BaseBottomModal>
	);
};

export default DistanceModal;
