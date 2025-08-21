import React, { useState } from 'react';
import { TextInput, View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';

const CustomDateInput = ({ inputType = 'date' }) => {
	const { theme } = useTheme();
	const [value, setValue] = useState<string>('');

	const validateAndFormatInput = (text: string) => {
		let formattedValue = text;

		switch (inputType) {
			case 'date_hh_mm':
				// Format: YYYY-MM-DD HH:MM
				formattedValue = text.replace(/[^0-9 :-]/g, '').slice(0, 16);
				break;
			case 'date':
				// Format: YYYY-MM-DD
				formattedValue = text.replace(/[^0-9-]/g, '').slice(0, 10);
				break;
			case 'hh_mm':
				// Format: HH:MM
				formattedValue = text.replace(/[^0-9:]/g, '').slice(0, 5);
				break;
			case 'value_date-timestamp':
				// Only numbers allowed for timestamp
				formattedValue = text.replace(/[^0-9]/g, '');
				break;
			default:
				break;
		}

		setValue(formattedValue);
	};

	return (
		<View style={styles.container}>
			<View style={styles.inputContainer}>
				<TextInput
					style={[styles.customInput, { color: theme.screen.text }]}
					cursorColor={theme.screen.text}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={validateAndFormatInput}
					value={value}
					placeholder="YYYY-MM-DD HH:MM"
				/>
			</View>
		</View>
	);
};

export default CustomDateInput;
