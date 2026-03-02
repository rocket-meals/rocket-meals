import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { FilterFormSheetProps } from './types';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { SET_FORM_FILTER } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import ModalComponent from '@/components/ModalSetting/ModalComponent';
import { myContrastColor } from '@/helper/ColorHelper';

const iconLibraries: any = {
	MaterialIcons,
	MaterialCommunityIcons,
};

const FilterFormSheet: React.FC<FilterFormSheetProps> = ({ closeSheet, isVisible, isFormSubmission, setSelectedOption, selectedOption, options, isEditMode = false }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const dispatch = useDispatch();
	const { primaryColor, selectedTheme: mode } = useSelector((state: RootState) => state.settings);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');

	const updateSort = (option: { id: string }) => {
		setSelectedOption(option.id);
		if (isFormSubmission) {
			dispatch({ type: SET_FORM_FILTER, payload: option.id });
		}
		closeSheet();
	};

	return (
		<ModalComponent isVisible={isVisible} onClose={closeSheet} onSave={closeSheet} title={translate(TranslationKeys.filter)} showButtons={false}>
			<ScrollView contentContainerStyle={styles.modalContent}>
				{options.map((option, index) => {
					if (isEditMode && option.label === 'syncing') {
						return null; // hide syncing when in edit mode
					}

					const IconComponent = option.icon && iconLibraries[option.icon.library] ? iconLibraries[option.icon.library] : null;
					const isSelected = selectedOption === option.id;

					return (
						<TouchableOpacity
							key={option.id + index}
							style={[
								styles.actionItem,
								{
									backgroundColor: isSelected ? primaryColor : theme.screen.iconBg,
									borderColor: isSelected ? primaryColor : theme.screen.iconBg,
								},
							]}
							onPress={() => updateSort(option)}
						>
							<View style={styles.col}>
								{IconComponent && <IconComponent name={option.icon.name} size={22} color={isSelected ? contrastColor : theme.screen.text} />}
								<Text style={[styles.label, { color: isSelected ? contrastColor : theme.screen.text }]}>{translate(option.label)}</Text>
							</View>
							{isSelected && <MaterialCommunityIcons name="check" size={22} color={contrastColor} />}
						</TouchableOpacity>
					);
				})}
			</ScrollView>
		</ModalComponent>
	);
};

export default FilterFormSheet;
