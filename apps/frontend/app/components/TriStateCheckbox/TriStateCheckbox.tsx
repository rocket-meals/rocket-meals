import { Text, TouchableOpacity, View } from 'react-native';
import React from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { MaterialIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';
import { TranslationKeys } from '@/locales/keys';

const TriStateCheckbox = ({
	id,
	value,
	onChange,
	isDisabled,
	custom_type,
	onlyTwo = false,
}: {
	id: string;
	value?: number | null | undefined; // 1: true, 0: false, null/undefined: indeterminate/none (tri-state)
	onChange: (id: string, value?: number | null | undefined, custom_type?: string) => void;
	isDisabled?: boolean;
	custom_type?: string;
	onlyTwo?: boolean; // if true, force two-state (Ja/Nein)
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

	// If onlyTwo === true we normalize any non-1 value to 0 (false).
	// Otherwise keep tri-state semantics where value can be 1, 0 or null/undefined.
	const currentValue: number | null | undefined = onlyTwo ? (value === 1 ? 1 : 0) : value === 2 ? null : value;

	const translation_yes = translate(TranslationKeys.yes);
	const translation_no = translate(TranslationKeys.no);
	const translation_undefined = translate(TranslationKeys.undefined);

	// Build options depending on mode
	const options: Array<{ key: string; val: number | null; label: string }> = onlyTwo
		? [
			{ key: 'yes', val: 1, label: translation_yes },
			{ key: 'no', val: 0, label: translation_no },
		]
		: [
			{ key: 'yes', val: 1, label: translation_yes },
			{ key: 'no', val: 0, label: translation_no },
			{ key: 'undef', val: null, label: translation_undefined },
		];

	const handlePress = (optionVal: number | null) => {
		if (onlyTwo) {
			// set explicitly to 1 or 0
			onChange(id, optionVal as number, custom_type ?? '');
			return;
		}

		// tri-state toggle behavior: selecting an already selected option clears the value (undefined)
		const isSelected = optionVal === null ? currentValue === null : currentValue === optionVal;
		if (isSelected) {
			onChange(id, undefined, custom_type ?? '');
		} else {
			onChange(id, optionVal ?? undefined, custom_type ?? '');
		}
	};

	return (
		<View style={{ ...styles.container }}>
			<View style={{ ...styles.optionsRow }}>
				{options.map(option => {
					const isSelected = option.val === null ? currentValue === null : currentValue === option.val;
					return (
						<TouchableOpacity key={option.key} style={{ ...styles.optionContainer, backgroundColor: isSelected ? primaryColor : theme.screen.iconBg }} onPress={() => !isDisabled && handlePress(option.val)} disabled={isDisabled}>
							<View style={styles.optionBox}>
								<MaterialIcons name={isSelected ? 'check-box' : 'check-box-outline-blank'} size={22} color={isSelected ? theme.activeText : theme.screen.icon} />
							</View>
							<Text style={{ ...styles.optionLabel, color: isSelected ? theme.activeText : theme.screen.text }}>{option.label}</Text>
						</TouchableOpacity>
					);
				})}
			</View>
		</View>
	);
};

export default TriStateCheckbox;
