import React, { useCallback, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import SettingsListEditable from '../SettingsListEditable/SettingsListEditable';
import type { SettingsListProps } from '../SettingsList/types';
import type { PropsWithChildren } from 'react';
import { borderRadiusContainer } from '../../constants/ui';

type SettingsListDatePropsOwn = {
	id: string;
	value: string;
	onChange: (id: string, value: string, custom_type?: string) => void;
	onError: (id: string, error: string) => void;
	error?: string;
	custom_type?: string;
	isDisabled?: boolean;
	label?: string;
	placeholder?: string;
	editable?: boolean;
	prefix?: string;
	suffix?: string;
	saveLabel?: string;
};

export type SettingsListDateProps = PropsWithChildren<
	Omit<
		SettingsListProps,
		'label' | 'title' | 'value' | 'handleFunction' | 'onPress' | 'rightIcon' | 'rightElement'
	> &
		SettingsListDatePropsOwn
>;

const DATE_REGEX = /^\d{2}\.\d{2}\.\d{4}$/;

function parseDateParts(dateStr: string): { day: string; month: string; year: string } | null {
	if (!DATE_REGEX.test(dateStr)) return null;
	const [day, month, year] = dateStr.split('.');
	return { day, month, year };
}

function formatDateParts(day: string, month: string, year: string): string {
	return `${day}.${month}.${year}`;
}

type DatePickerSheetProps = {
	initialValue: string;
	onConfirm: (value: string) => void;
	primaryColor: string;
	saveLabel: string;
};

const DatePickerSheet: React.FC<DatePickerSheetProps> = ({
	initialValue,
	onConfirm,
	primaryColor,
	saveLabel,
}) => {
	const { theme } = useTheme();
	const [text, setText] = useState(initialValue);
	const isValid = DATE_REGEX.test(text);

	const handleConfirm = useCallback(() => {
		if (!isValid) return;
		onConfirm(text);
	}, [isValid, onConfirm, text]);

	return (
		<View style={styles.sheetView}>
			<BottomSheetTextInput
				style={[
					styles.sheetInput,
					{
						color: theme.sheet.text,
						backgroundColor: theme.sheet.inputBg,
						borderColor: isValid ? theme.sheet.inputBorderValid : theme.sheet.inputBorder,
						borderRadius: borderRadiusContainer,
					},
				]}
				autoFocus
				placeholder="DD.MM.YYYY"
				placeholderTextColor={theme.sheet.placeholder}
				selectionColor={primaryColor}
				value={text}
				onChangeText={setText}
				keyboardType="numeric"
				maxLength={10}
			/>
			<TouchableOpacity
				style={[styles.saveButton, { backgroundColor: primaryColor, opacity: isValid ? 1 : 0.5 }]}
				onPress={handleConfirm}
				activeOpacity={0.8}
				disabled={!isValid}
			>
				<Text style={[styles.saveButtonText, { color: theme.button.text }]}>{saveLabel}</Text>
			</TouchableOpacity>
		</View>
	);
};

const SettingsListDate: React.FC<SettingsListDateProps> = ({
	id,
	value,
	onChange,
	onError,
	error,
	custom_type,
	isDisabled = false,
	label,
	placeholder = 'DD.MM.YYYY',
	editable = true,
	prefix,
	suffix,
	saveLabel = 'Save',
	primaryColor,
	...settingsListProps
}) => {
	const { theme } = useTheme();
	const { show, close } = useMyScrollViewModal();
	const settingsCtx = useSettingsContext();
	const isEditable = editable && !isDisabled;
	const resolvedPrimaryColor = primaryColor ?? settingsCtx?.primaryColor ?? theme.primary;

	const openCalendar = useCallback(() => {
		if (!isEditable) return;

		let initialValue = '';
		if (value && DATE_REGEX.test(value)) {
			initialValue = value;
		}

		show({
			title: label ?? placeholder,
			onClose: close,
			children: (
				<DatePickerSheet
					initialValue={initialValue}
					primaryColor={resolvedPrimaryColor}
					saveLabel={saveLabel}
					onConfirm={(formatted) => {
						const parts = parseDateParts(formatted);
						if (!parts) return;
						const result = formatDateParts(parts.day, parts.month, parts.year);
						onChange(id, result, custom_type);
						onError(id, '');
						close();
					}}
				/>
			),
		});
	}, [close, custom_type, id, isEditable, label, onChange, onError, placeholder, resolvedPrimaryColor, saveLabel, show, value]);

	const decoratedValue = value ? `${prefix ?? ''}${value}${suffix ?? ''}` : '';

	return (
		<View style={styles.container}>
			<SettingsListEditable
				{...settingsListProps}
				primaryColor={resolvedPrimaryColor}
				label={label ?? placeholder}
				value={decoratedValue || undefined}
				editable={isEditable}
				handleFunction={openCalendar}
			/>
			{Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

export default SettingsListDate;

const styles = StyleSheet.create({
	container: {
		width: '100%',
	},
	errorText: {
		color: 'red',
		fontSize: 10,
		marginTop: 5,
		marginLeft: 5,
	},
	sheetView: {
		width: '100%',
		padding: 10,
		alignItems: 'stretch',
	},
	sheetInput: {
		width: '100%',
		height: 56,
		paddingHorizontal: 20,
		borderWidth: 1,
		marginTop: 12,
		fontSize: 14,
	},
	saveButton: {
		width: '100%',
		height: 48,
		borderRadius: borderRadiusContainer,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12,
	},
	saveButtonText: {
		fontSize: 16,
		fontWeight: '600',
	},
});
