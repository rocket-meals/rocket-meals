import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SettingsList from '../SettingsList';
import { useTheme } from '../../context/ThemeContext';
import { SettingsListSelectOptionItem } from '../SettingsListSelectOption/SettingsListSelectOption';

export type SettingsListSelectLeftRightProps<T extends string | number> = {
	options: SettingsListSelectOptionItem<T>[];
	selectedOption: T | null;
	onSelect: (option: SettingsListSelectOptionItem<T>) => void;
	leftIcon?: React.ReactNode;
	iconBgColor?: string;
	title?: string;
	label?: string;
	groupPosition?: 'top' | 'middle' | 'bottom' | 'single';
	showSeparator?: boolean;
	noIconIndent?: boolean;
	primaryColor?: string;
};

const ARROW_SIZE = 24;

const SettingsListSelectLeftRight = <T extends string | number>({
	options,
	selectedOption,
	onSelect,
	leftIcon,
	iconBgColor,
	title,
	label,
	groupPosition,
	showSeparator,
	noIconIndent,
	primaryColor,
}: SettingsListSelectLeftRightProps<T>) => {
	const { theme } = useTheme();

	const currentIndex = options.findIndex((o) => o.id === selectedOption);
	const resolvedIndex = currentIndex >= 0 ? currentIndex : 0;
	const currentOption = options[resolvedIndex];

	const handlePrevious = () => {
		const prevIndex = (resolvedIndex - 1 + options.length) % options.length;
		onSelect(options[prevIndex]);
	};

	const handleNext = () => {
		const nextIndex = (resolvedIndex + 1) % options.length;
		onSelect(options[nextIndex]);
	};

	const arrowColor = theme.screen.text;

	const rightElement = (
		<>
			<TouchableOpacity onPress={handlePrevious} style={styles.arrowButton} hitSlop={8} accessibilityLabel="Previous option" accessibilityRole="button">
				<MaterialCommunityIcons name="chevron-left" size={ARROW_SIZE} color={arrowColor} />
			</TouchableOpacity>
			<TouchableOpacity onPress={handleNext} style={styles.arrowButton} hitSlop={8} accessibilityLabel="Next option" accessibilityRole="button">
				<MaterialCommunityIcons name="chevron-right" size={ARROW_SIZE} color={arrowColor} />
			</TouchableOpacity>
		</>
	);

	return (
		<SettingsList
			leftIcon={leftIcon}
			iconBgColor={iconBgColor}
			title={title}
			label={label}
			value={currentOption?.label}
			rightElement={rightElement}
			groupPosition={groupPosition}
			showSeparator={showSeparator}
			noIconIndent={noIconIndent}
			primaryColor={primaryColor}
		/>
	);
};

export default SettingsListSelectLeftRight;

const styles = StyleSheet.create({
	arrowButton: {
		padding: 4,
	},
});
