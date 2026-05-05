import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { myContrastColor } from '../../helpers/ColorHelper';
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
	onPress?: () => void;
	/** Optional element rendered between the value text and the right arrow. */
	extraRightElement?: React.ReactNode;
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
	onPress,
	extraRightElement,
}: SettingsListLeftRightProps<T>) => {
	const { theme, isDark } = useTheme();
	const settingsCtx = useSettingsContext();

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

	const resolvedIconBg = iconBgColor ?? settingsCtx?.primaryColor ?? lightTheme.primary;
	const iconColor = myContrastColor(resolvedIconBg, theme, isDark);

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
				color={theme.screen.text}
			/>
		</TouchableOpacity>
	);

	const rightArrow = (
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
				color={theme.screen.text}
			/>
		</TouchableOpacity>
	);

	// When a leftIcon is provided render [←][Icon] together so the row layout
	// becomes: ArrowLeft | Icon | Name | Value | ArrowRight
	const leftIconComponent = leftIcon ? (
		<View style={styles.leftGroup}>
			{leftArrow}
			<View style={[styles.iconWrapper, { backgroundColor: resolvedIconBg }]}>
				{React.isValidElement(leftIcon)
					? React.cloneElement(leftIcon as React.ReactElement<any>, { color: iconColor })
					: leftIcon}
			</View>
		</View>
	) : leftArrow;

	return (
		<SettingsList
			label={label}
			value={displayValue}
			leftIconComponent={leftIconComponent}
			iconBgColor={iconBgColor}
			groupPosition={groupPosition}
			showSeparator={showSeparator}
			noIconIndent={noIconIndent}
			onPress={onPress}
			rightElement={
				extraRightElement ? (
					<View style={styles.rightContainer}>
						{extraRightElement}
						{rightArrow}
					</View>
				) : (
					rightArrow
				)
			}
		/>
	);
};

export default SettingsListLeftRight;

const styles = StyleSheet.create({
	arrowButton: {
		padding: 2,
	},
	leftGroup: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginRight: 10,
	},
	iconWrapper: {
		width: 34,
		height: 34,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center',
	},
	rightContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
	},
});
