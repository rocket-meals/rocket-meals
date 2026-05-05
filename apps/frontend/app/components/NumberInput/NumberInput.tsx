import { Text, TextInput, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { isWeb } from '@/constants/Constants';
import { TranslationKeys } from '@/locales/keys';
import { StringHelper } from 'repo-depkit-common';

const NumberInput = ({ id, value, onChange, error, isDisabled, custom_type, prefix, suffix }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; error: string; isDisabled: boolean; custom_type: string; prefix: string | null | undefined; suffix: string | null | undefined }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const flag = !suffix && !prefix;

	const handleTextChange = (text: string) => {
		let formattedText = StringHelper.replaceAllWithOptions({ str: text, find: '[^0-9,]', replace: '' });

		const parts = formattedText.split(',');
		if (parts.length > 2) {
			formattedText = parts[0] + ',' + StringHelper.replaceAllLiteralWithOptions({ str: parts.slice(1).join(''), find: ',', replace: '' });
		}

		onChange(id, formattedText, custom_type);
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
						styles.numberInput,
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
					onChangeText={handleTextChange}
					value={value}
					editable={!isDisabled}
					placeholder={translate(TranslationKeys.enter_number)}
					keyboardType="decimal-pad"
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
		</View>
	);
};

export default NumberInput;
