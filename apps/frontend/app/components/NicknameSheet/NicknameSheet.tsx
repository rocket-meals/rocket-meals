import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { useSelector } from 'react-redux';
import styles from './styles';
import { NicknameSheetProps } from './types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import { myContrastColor } from '@/helper/colorHelper';

const NicknameSheet: React.FC<NicknameSheetProps> = ({
	closeSheet,
	value,
	onChange,
	onSave,
	disableSave,
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor, selectedTheme: mode } = useSelector(
		(state: RootState) => state.settings
	);
	const contrastColor = myContrastColor(primaryColor, theme, mode === 'dark');

	return (
		<BottomSheetView
			style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
		>
			<View style={styles.sheetHeader}>
				<View />
				<Text style={{ ...styles.sheetHeading, color: theme.sheet.text }}>
					{translate(TranslationKeys.nickname)}
				</Text>
			</View>
			<TextInput
				style={{
					...styles.sheetInput,
					color: theme.sheet.text,
					backgroundColor: theme.sheet.inputBg,
					borderColor: theme.sheet.inputBorder,
				}}
				placeholder={translate(TranslationKeys.nickname)}
				placeholderTextColor={theme.sheet.placeholder}
				cursorColor={theme.sheet.text}
				selectionColor={primaryColor}
				value={value}
				onChangeText={onChange}
			/>
			<View style={styles.buttonContainer}>
				<TouchableOpacity
					onPress={closeSheet}
					style={{ ...styles.cancelButton, borderColor: primaryColor }}
				>
					<Text style={[styles.buttonText, { color: theme.screen.text }]}>
						{translate(TranslationKeys.cancel)}
					</Text>
				</TouchableOpacity>
				<TouchableOpacity
					onPress={onSave}
					disabled={disableSave}
					style={{ ...styles.saveButton, backgroundColor: primaryColor }}
				>
					<Text style={[styles.buttonText, { color: contrastColor }]}>
						{translate(TranslationKeys.save)}
					</Text>
				</TouchableOpacity>
			</View>
		</BottomSheetView>
	);
};

export default NicknameSheet;
