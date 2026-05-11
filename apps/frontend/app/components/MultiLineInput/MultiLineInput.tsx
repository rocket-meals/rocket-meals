import { View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';
import AppTextInput from '@/components/AppTextInput';

const MultiLineInput = ({ id, value, onChange, error, isDisabled, custom_type }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string }) => {
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const { translate, language } = useLanguage();
	const languageTextAlign = useLanguageTextAlign();

	return (
		<View style={styles.container}>
			<View style={styles.inputContainer}>
				<AppTextInput
					style={[styles.multiLineInput, { color: theme.screen.text }, { textAlign: languageTextAlign }]}
					inputStyle={{
						backgroundColor: 'transparent',
						paddingHorizontal: 20,
						minHeight: 100,
					}}
					borderWidth={0}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={text => onChange(id, text, custom_type)}
					value={value}
					placeholder={translate(TranslationKeys.type_here)}
					multiline
					editable={!isDisabled}
					numberOfLines={3}
					enterKeyHint="next"
					textAlignVertical="top"
				/>
			</View>
		</View>
	);
};

export default MultiLineInput;