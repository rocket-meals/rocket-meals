import { Text, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { TextInput } from 'react-native-gesture-handler';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import { TranslationKeys } from '@/locales/keys';

const SingleLineInput = ({ id, value, onChange, error, isDisabled, custom_type, prefix, suffix, autoFocus }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string; prefix: string | null | undefined; suffix: string | null | undefined; autoFocus?: boolean }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
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
				<TextInput
					style={[
						styles.input,
						{
							width: '100%',
							borderTopLeftRadius: prefix ? 0 : 10,
							borderBottomLeftRadius: prefix ? 0 : 10,
							borderTopRightRadius: suffix ? 0 : 10,
							borderBottomRightRadius: suffix ? 0 : 10,
						},
						{ color: theme.screen.text },
					]}
					cursorColor={theme.screen.text}
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
