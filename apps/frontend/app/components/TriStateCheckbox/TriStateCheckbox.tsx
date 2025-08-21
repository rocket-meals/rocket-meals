import { Text, TouchableOpacity } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { MaterialIcons } from '@expo/vector-icons';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';

const TriStateCheckbox = ({
	id,
	value,
	onChange,
	isDisabled,
	custom_type,
}: {
	id: string;
	value: number; // 0: Unchecked, 1: Checked, 2: Indeterminate
	onChange: (id: string, value: number, custom_type: string) => void;
	isDisabled: boolean;
	custom_type: string;
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();

	const toggleState = () => {
		onChange(id, (value + 1) % 3, custom_type);
	};

	const getIcon = () => {
		if (value === 0) return 'check-box-outline-blank';
		if (value === 1) return 'check-box';
		return 'indeterminate-check-box';
	};

	return (
		<TouchableOpacity
			style={{
				...styles.checkboxContainer,
				backgroundColor: theme.screen.iconBg,
			}}
			onPress={toggleState}
			disabled={isDisabled}
		>
			<MaterialIcons name={getIcon()} size={24} color={theme.screen.text} />
			<Text style={{ ...styles.checkboxLabel, color: theme.screen.text }}>
				{value === 0
					? translate(TranslationKeys.unchecked)
					: value === 1
						? translate(TranslationKeys.checked)
						: translate(TranslationKeys.indeterminate)}
			</Text>
		</TouchableOpacity>
	);
};

export default TriStateCheckbox;
