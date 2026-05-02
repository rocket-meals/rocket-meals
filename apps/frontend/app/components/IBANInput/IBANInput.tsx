import { Text, TextInput, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import { TranslationKeys } from '@/locales/keys';
import { StringHelper } from 'repo-depkit-common';

const IBANInput = ({ id, value, onChange, onError, error, isDisabled, custom_type, prefix, suffix }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; onError: (id: string, error: string) => void; error: string; isDisabled: boolean; custom_type: string; prefix: string | null | undefined; suffix: string | null | undefined }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const flag = !suffix && !prefix;

	const formatIBAN = (text: string) => {
		let cleaned = StringHelper.replaceAllWithOptions({ str: text, find: '[^A-Za-z0-9]', replace: '' });
		let formatted = StringHelper.replaceAllWithOptions({ str: cleaned, find: '(.{4})', replace: '$1 ' }).trim();
		return formatted;
	};

	const handleChangeText = (text: string) => {
		const formattedText = formatIBAN(text);
		onChange(id, formattedText, custom_type);
		if (formattedText.length > 0 && formattedText.length < 15) {
			onError(id, 'Invalid IBAN length');
		} else {
			onError(id, '');
		}
	};

	return (
		<View style={styles.container}>
			<View style={styles.inputContainer}>
				{prefix && (
					<View
						style={{
							...styles.prefix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{prefix}</Text>
					</View>
				)}
				<TextInput
					style={[
						styles.ibanInput,
						flag
							? {
									width: '100%',
									borderRadius: 10,
								}
							: {
									width: isWeb ? '90%' : '80%',
								},
						{ color: theme.screen.text },
					]}
					cursorColor={theme.screen.text}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={handleChangeText}
					value={value}
					placeholder={translate(TranslationKeys.iban_format)}
					keyboardType="default"
					enterKeyHint="next"
					autoCapitalize="characters"
					editable={!isDisabled}
					maxLength={34} // IBAN max length
				/>
				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{suffix}</Text>
					</View>
				)}
			</View>
			{Boolean(error) && <Text style={[styles.errorText, { color: 'red' }]}>{error}</Text>}
		</View>
	);
};

export default IBANInput;
