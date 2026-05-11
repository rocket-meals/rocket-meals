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

const SingleLineInput = ({ id, value, onChange, error, isDisabled, custom_type, prefix, suffix, autoFocus }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string; prefix: string | null | undefined; suffix: string | null | undefined; autoFocus?: boolean }) => {
	const { theme } = useTheme();
	const isLtrLanguage = useIsLtrLanguage();
	const { translate, language } = useLanguage();
	const languageTextAlign = useLanguageTextAlign();
	const flag = !suffix && !prefix;

	return (
		<View style={styles.container}>
			<View
				style={{
					...styles.inputContainer,
				}}
			>
				{prefix && (
					<View
						style={{
							...styles.prefix,
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{prefix}</Text>
					</View>
				)}
				<AppTextInput
					containerStyle={{
						flex: 1,
					}}
					style={[
						styles.input,
						{
							borderTopLeftRadius: prefix ? 0 : 10,
							borderBottomLeftRadius: prefix ? 0 : 10,
							borderTopRightRadius: suffix ? 0 : 10,
							borderBottomRightRadius: suffix ? 0 : 10,
						},
						{ color: theme.screen.text },
						{ textAlign: languageTextAlign },
					]}
					inputStyle={{
						backgroundColor: 'transparent',
						paddingHorizontal: 20,
						height: 50,
					}}
					borderWidth={0}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={text => onChange(id, text, custom_type)}
					value={value}
					editable={!isDisabled}
					enterKeyHint="next"
					placeholder={translate(TranslationKeys.type_here)}
					autoFocus={autoFocus}
				/>
				{suffix && (
					<View style={{ ...styles.suffix, backgroundColor: theme.screen.iconBg }}>
						<Text
							style={{
								...styles.label,
								color: theme.screen.text,
							}}
						>
							{suffix}
						</Text>
					</View>
				)}
			</View>
		</View>
	);
};

export default SingleLineInput;

