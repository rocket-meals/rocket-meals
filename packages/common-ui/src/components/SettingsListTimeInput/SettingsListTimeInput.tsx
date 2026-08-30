import React, { useCallback, useMemo, useState } from 'react';
import { Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import SettingsList from '../SettingsList';
import type { SettingsListProps } from '../SettingsList/types';
import { CommonUiComponentIds } from '../../constants/ComponentIds';
import TimeInputFields from './TimeInputFields';
import { TimeUnitsEnabled, formatSecondsWithUnits } from './timeInputHelpers';
import PrintHidden from '../PrintHidden';

export interface SettingsListTimeInputProps extends Omit<SettingsListProps, 'onPress' | 'handleFunction'>, TimeUnitsEnabled {
	modalTitle?: string;
	saveLabel?: string;
	/** Current duration in seconds - also the modal's starting value. */
	initialValue?: number;
	onSave: (totalSeconds: number) => void | Promise<void>;
}

type ModalSheetProps = TimeUnitsEnabled & {
	initialValue: number;
	saveLabel: string;
	primaryColor: string;
	onSave: (totalSeconds: number) => void;
};

const ModalSheet: React.FC<ModalSheetProps> = ({
	initialValue,
	saveLabel,
	primaryColor,
	onSave,
	hoursEnabled,
	minutesEnabled,
	secondsEnabled,
}) => {
	const [totalSeconds, setTotalSeconds] = useState(initialValue);

	const handleSave = useCallback(() => {
		Keyboard.dismiss();
		onSave(totalSeconds);
	}, [onSave, totalSeconds]);

	return (
		<View style={styles.sheetView}>
			<TimeInputFields
				hoursEnabled={hoursEnabled}
				minutesEnabled={minutesEnabled}
				secondsEnabled={secondsEnabled}
				initialSeconds={initialValue}
				onChange={setTotalSeconds}
				autoFocus
				primaryColor={primaryColor}
				nativeIDPrefix={CommonUiComponentIds.TIME_INPUT_FIELD_PREFIX}
				onSubmit={handleSave}
			/>
			<TouchableOpacity
				id={CommonUiComponentIds.TIME_INPUT_SAVE_BUTTON}
				style={[styles.saveButton, { backgroundColor: primaryColor }]}
				onPress={handleSave}
				activeOpacity={0.8}
			>
				<Text style={styles.saveButtonText}>{saveLabel}</Text>
			</TouchableOpacity>
		</View>
	);
};

/**
 * Settings row opening a segmented duration input modal (see TimeInputFields).
 * Which segments are shown is controlled via `hoursEnabled` / `minutesEnabled`
 * / `secondsEnabled` (all default true); the value is always a plain
 * total-seconds number.
 */
const SettingsListTimeInput: React.FC<SettingsListTimeInputProps> = ({
	modalTitle,
	saveLabel = 'Save',
	initialValue = 0,
	onSave,
	hoursEnabled,
	minutesEnabled,
	secondsEnabled,
	rightElement,
	rightIcon,
	value,
	label,
	title,
	primaryColor,
	...props
}) => {
	const { theme } = useTheme();
	const { show, close } = useMyScrollViewModal();
	const settingsCtx = useSettingsContext();
	const resolvedTitle = useMemo(() => modalTitle ?? title ?? label ?? '', [label, modalTitle, title]);
	const resolvedPrimaryColor = primaryColor ?? settingsCtx?.primaryColor ?? theme.primary;
	const unitsEnabled = useMemo(
		() => ({ hoursEnabled, minutesEnabled, secondsEnabled }),
		[hoursEnabled, minutesEnabled, secondsEnabled],
	);

	const resolvedValue = value ?? formatSecondsWithUnits(initialValue, unitsEnabled);

	const resolvedRightIcon = useMemo(() => {
		if (rightIcon) {
			return rightIcon;
		}
		if (rightElement) {
			return undefined;
		}
		return (
			<PrintHidden>
				<MaterialCommunityIcons name="clock-edit-outline" size={20} color={theme.screen.icon} />
			</PrintHidden>
		);
	}, [rightElement, rightIcon, theme.screen.icon]);

	const handleOpen = useCallback(() => {
		show({
			title: resolvedTitle,
			onClose: close,
			children: (
				<ModalSheet
					initialValue={initialValue}
					saveLabel={saveLabel}
					primaryColor={resolvedPrimaryColor}
					hoursEnabled={hoursEnabled}
					minutesEnabled={minutesEnabled}
					secondsEnabled={secondsEnabled}
					onSave={async (totalSeconds) => {
						await onSave(totalSeconds);
						close();
					}}
				/>
			),
		});
	}, [
		close,
		hoursEnabled,
		initialValue,
		minutesEnabled,
		onSave,
		resolvedPrimaryColor,
		resolvedTitle,
		saveLabel,
		secondsEnabled,
		show,
	]);

	return (
		<SettingsList
			{...props}
			primaryColor={resolvedPrimaryColor}
			label={label}
			title={title}
			value={resolvedValue}
			rightElement={rightElement}
			rightIcon={resolvedRightIcon}
			onPress={handleOpen}
		/>
	);
};

export default SettingsListTimeInput;

const styles = StyleSheet.create({
	sheetView: {
		width: '100%',
		padding: 10,
		alignItems: 'stretch',
	},
	saveButton: {
		width: '100%',
		height: 48,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 16,
	},
	saveButtonText: {
		color: '#ffffff',
		fontSize: 16,
		fontWeight: '600',
	},
});
