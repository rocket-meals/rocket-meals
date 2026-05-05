import { TextInput, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

const MultiLineInput = ({ id, value, onChange, error, isDisabled, custom_type }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();

	return (
		<View style={styles.container}>
			<View style={styles.inputContainer}>
				<TextInput style={[styles.multiLineInput, { color: theme.screen.text }]} cursorColor={theme.screen.text} placeholderTextColor={theme.screen.placeholder} onChangeText={text => onChange(id, text, custom_type)} value={value} placeholder={translate(TranslationKeys.type_here)} multiline editable={!isDisabled} numberOfLines={3} enterKeyHint="next" textAlignVertical="top" />
			</View>
		</View>
	);
};

export default MultiLineInput;
