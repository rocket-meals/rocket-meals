import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { lightTheme } from '../../themes';
import SettingsList from '../SettingsList';
import type { SettingsListItemBaseProps, SettingsListProps } from '../SettingsList/types';

export type SettingsListLeftRightItem<T> = {
	id: T;
	label: string;
	icon?: React.ReactNode;
};

export type SettingsListLeftRightProps<T extends string | number> = Pick<
	SettingsListItemBaseProps,
	'leftIcon' | 'iconBgColor' | 'showSeparator' | 'noIconIndent'
> & {
	label?: string;
	options: SettingsListLeftRightItem<T>[];
	selectedOption: T | null;
	onSelect: (option: SettingsListLeftRightItem<T>) => void;
	groupPosition?: SettingsListProps['groupPosition'];
	accentColor?: string;
};

const SettingsListLeftRight = <T extends string | number>({
	label,
	options,
	selectedOption,
	onSelect,
	leftIcon,
	iconBgColor,
	showSeparator,
	noIconIndent = false,
	groupPosition = 'single',
	accentColor,
}: SettingsListLeftRightProps<T>) => {
	const { theme } = useTheme();
	const settingsCtx = useSettingsContext();
	const resolvedAccentColor = accentColor ?? iconBgColor ?? settingsCtx?.primaryColor ?? lightTheme.primary;

	const currentIndex = options.findIndex((o) => o.id === selectedOption);

	const handlePrevious = () => {
		if (options.length === 0) return;
		const prevIndex = currentIndex <= 0 ? options.length - 1 : currentIndex - 1;
		onSelect(options[prevIndex]);
	};

	const handleNext = () => {
		if (options.length === 0) return;
		const nextIndex = currentIndex >= options.length - 1 ? 0 : currentIndex + 1;
		onSelect(options[nextIndex]);
	};

	const currentOption = currentIndex >= 0 ? options[currentIndex] : null;
	const displayValue = currentOption?.label ?? '';

	const leftArrow = (
		<TouchableOpacity
			onPress={handlePrevious}
			style={styles.arrowButton}
			hitSlop={8}
			accessibilityRole="button"
			accessibilityLabel="Previous option"
		>
			<MaterialCommunityIcons
				name="chevron-left"
				size={28}
				color={resolvedAccentColor}
			/>
		</TouchableOpacity>
	);

	return (
		<SettingsList
			label={label}
			value={displayValue}
			leftIcon={leftIcon ?? leftArrow}
			iconBgColor={leftIcon ? iconBgColor : 'transparent'}
			groupPosition={groupPosition}
			showSeparator={showSeparator}
			noIconIndent={noIconIndent}
			rightElement={
				<TouchableOpacity
					onPress={handleNext}
					style={styles.arrowButton}
					hitSlop={8}
					accessibilityRole="button"
					accessibilityLabel="Next option"
				>
					<MaterialCommunityIcons
						name="chevron-right"
						size={28}
						color={resolvedAccentColor}
					/>
				</TouchableOpacity>
			}
		/>
	);
};

export default SettingsListLeftRight;

const styles = StyleSheet.create({
	arrowButton: {
		padding: 2,
	},
});
