import { Text, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import { TranslationKeys } from '@/locales/keys';
import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';
import AppTextInput from '@/components/AppTextInput';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EmailInput = ({
	id,
	value,
	onChange,
	onError,
	error,
	isDisabled,
	custom_type,
	prefix,
	suffix,
}: {
	id: string;
	value: string;
	onChange: (id: string, value: string, custom_type: string) => void;
	onError: (id: string, error: string) => void;
	error: string;
	isDisabled: boolean;
	custom_type: string;
	prefix: string | null | undefined;
	suffix: string | null | undefined;
}) => {
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const { translate, language } = useLanguage();
	const languageTextAlign = useLanguageTextAlign();
	const flag = !suffix && !prefix;

	const validateEmail = (text: string) => {
		const cleaned = text.trim();
		onChange(id, cleaned, custom_type);
		if (!emailRegex.test(cleaned)) {
			onError(id, 'Invalid email format');
		} else {
			onError(id, '');
		}
	};

	return (
		<View style={styles.container}>
			<View style={[styles.inputContainer]}>
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
				<AppTextInput
					containerStyle={
						flag
							? {
								flex: 1,
							}
							: {
								width: isWeb ? '90%' : '80%',
							}
					}
					style={[
						styles.input,
						{ color: theme.screen.text },
						{ textAlign: languageTextAlign },
						flag ? { borderRadius: 10 } : {},
					]}
					inputStyle={{
						backgroundColor: 'transparent',
						paddingHorizontal: 20,
						height: 50,
					}}
					borderWidth={0}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={validateEmail}
					value={value}
					editable={!isDisabled}
					placeholder={translate(TranslationKeys.enter_email)}
					keyboardType="email-address"
					autoCapitalize="none"
					enterKeyHint="next"
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
			{Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

export default EmailInput;

