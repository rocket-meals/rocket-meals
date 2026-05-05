import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
	Keyboard,
	Platform,
	StyleSheet,
	TextInput,
	TouchableOpacity,
	Text,
	View,
} from 'react-native';
import type { KeyboardTypeOptions } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

const ResolvedTextInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { useSettingsContext } from '../../context/SettingsContext';
import { useMyScrollViewModal } from '../GlobalModal/useMyScrollViewModal';
import SettingsList from '../SettingsList';
import type { SettingsListProps } from '../SettingsList/types';
import { borderRadiusContainer } from '../../constants/ui';
import SettingsListSelectOption from '../SettingsListSelectOption';

export type CheckTextInputResult = {
	isValid: boolean;
	value: string;
};

export type SettingsListTextInputSuggestion = {
	key: string;
	value: string;
	label?: string;
};

export type CheckTextInput = (value: string) => CheckTextInputResult;

const defaultCheckTextInput: CheckTextInput = (value) => ({ isValid: true, value });

export interface SettingsListTextInputProps extends Omit<SettingsListProps, 'onPress' | 'handleFunction'> {
	modalTitle?: string;
	placeholder: string;
	saveLabel?: string;
	onSave: (value: string) => void | Promise<void>;
	initialValue?: string;
	multiline?: boolean;
	keyboardType?: KeyboardTypeOptions;
	numberOfLines?: number;
	textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
	inputStyle?: object;
	autoFocus?: boolean;
	checkTextInput?: CheckTextInput;
	allowSubmitWhenDisabled?: boolean;
	/** Optional list of suggestions rendered as selectable options below the Save button.
	 *  Clicking a suggestion is equivalent to typing its value and pressing Save. */
	suggestions?: SettingsListTextInputSuggestion[];
	/** Optional render function for extra content rendered below the Save button.
	 *  Receives a callback to programmatically set the text input value. */
	renderModalChildren?: (onSuggest: (value: string) => void) => React.ReactNode;
}

type ModalSheetProps = {
	initialValue: string;
	placeholder: string;
	saveLabel: string;
	onSave: (value: string) => void;
	multiline?: boolean;
	keyboardType?: KeyboardTypeOptions;
	numberOfLines?: number;
	textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
	inputStyle?: object;
	autoFocus?: boolean;
	checkTextInput?: CheckTextInput;
	allowSubmitWhenDisabled?: boolean;
	primaryColor: string;
	suggestions?: SettingsListTextInputSuggestion[];
	renderModalChildren?: (onSuggest: (value: string) => void) => React.ReactNode;
};

const ModalSheet: React.FC<ModalSheetProps> = ({
	initialValue,
	placeholder,
	saveLabel,
	onSave,
	multiline = false,
	keyboardType,
	numberOfLines,
	textAlignVertical,
	inputStyle,
	autoFocus = true,
	checkTextInput,
	allowSubmitWhenDisabled = true,
	primaryColor,
	suggestions,
	renderModalChildren,
}) => {
	const { theme } = useTheme();
	const [value, setValue] = useState(initialValue);

	useEffect(() => {
		setValue(initialValue);
	}, [initialValue]);

	const normalizedInitialValue = useMemo(
		() => (checkTextInput ?? defaultCheckTextInput)(initialValue).value,
		[checkTextInput, initialValue]
	);

	const validationResult = useMemo(
		() => (checkTextInput ?? defaultCheckTextInput)(value),
		[checkTextInput, value]
	);

	const hasChanges = validationResult.value !== normalizedInitialValue;
	const disableSave = !validationResult.isValid || !hasChanges;

	const handleSave = useCallback(() => {
		if (!validationResult.isValid) return;
		if (disableSave && !allowSubmitWhenDisabled) return;
		Keyboard.dismiss();
		onSave(validationResult.value);
	}, [allowSubmitWhenDisabled, disableSave, onSave, validationResult]);

	const handleSelectSuggestion = useCallback(
		(suggestion: SettingsListTextInputSuggestion) => {
			const result = (checkTextInput ?? defaultCheckTextInput)(suggestion.value);
			if (result.isValid) {
				Keyboard.dismiss();
				onSave(result.value);
			}
		},
		[checkTextInput, onSave]
	);

	const handleSubmitEditing = useCallback(() => {
		if (multiline) return;
		handleSave();
	}, [handleSave, multiline]);

	const content = (
		<View style={styles.sheetView}>
			<ResolvedTextInput
				style={[
					styles.sheetInput,
					{
						color: theme.sheet.text,
						backgroundColor: theme.sheet.inputBg,
						borderColor: theme.sheet.inputBorder,
						borderRadius: borderRadiusContainer,
					},
					inputStyle,
				]}
				autoFocus={autoFocus}
				placeholder={placeholder}
				placeholderTextColor={theme.sheet.placeholder}
				selectionColor={primaryColor}
				value={value}
				onChangeText={setValue}
				keyboardType={keyboardType}
				multiline={multiline}
				numberOfLines={numberOfLines}
				textAlignVertical={textAlignVertical}
				blurOnSubmit={!multiline}
				returnKeyType={multiline ? 'default' : 'done'}
				onSubmitEditing={handleSubmitEditing}
			/>
			<TouchableOpacity
				style={[styles.saveButton, { backgroundColor: primaryColor }]}
				onPress={handleSave}
				activeOpacity={0.8}
			>
				<Text style={[styles.saveButtonText, { color: theme.button.text }]}>{saveLabel}</Text>
			</TouchableOpacity>
			{suggestions && suggestions.length > 0 && (
				<View style={styles.suggestionsContainer}>
					<SettingsListSelectOption
						options={suggestions.map((s) => ({ id: s.key, label: s.label ?? s.value }))}
						selectedOption={suggestions.find((s) => s.value === value)?.key ?? null}
						onSelect={(option) => {
							const suggestion = suggestions.find((s) => s.key === option.id);
							if (suggestion) {
								handleSelectSuggestion(suggestion);
							}
						}}
						selectionColor={primaryColor}
					/>
				</View>
			)}
			{renderModalChildren?.(setValue)}
		</View>
	);

	return content;
};

const SettingsListTextInput: React.FC<SettingsListTextInputProps> = ({
	modalTitle,
	placeholder,
	saveLabel = 'Save',
	onSave,
	initialValue,
	multiline,
	keyboardType,
	numberOfLines,
	textAlignVertical,
	inputStyle,
	autoFocus = true,
	checkTextInput,
	allowSubmitWhenDisabled,
	rightElement,
	rightIcon,
	value,
	label,
	title,
	primaryColor,
	suggestions,
	renderModalChildren,
	...props
}) => {
	const { theme } = useTheme();
	const { show, close } = useMyScrollViewModal();
	const settingsCtx = useSettingsContext();
	const resolvedTitle = useMemo(() => modalTitle ?? title ?? label ?? '', [label, modalTitle, title]);
	const resolvedInitialValue = initialValue ?? value ?? '';
	const resolvedPrimaryColor = primaryColor ?? settingsCtx?.primaryColor ?? theme.primary;

	const resolvedRightIcon = useMemo(
		() =>
			rightElement || rightIcon ? (
				rightIcon
			) : (
				<MaterialCommunityIcons name="pencil" size={20} color={theme.screen.icon} />
			),
		[rightElement, rightIcon, theme.screen.icon]
	);

	const handleOpen = useCallback(() => {
		show({
			title: resolvedTitle,
			onClose: close,
			children: (
				<ModalSheet
					initialValue={resolvedInitialValue}
					placeholder={placeholder}
					saveLabel={saveLabel}
					onSave={async (val) => {
						await onSave(val);
						close();
					}}
					multiline={multiline}
					keyboardType={keyboardType}
					numberOfLines={numberOfLines}
					textAlignVertical={textAlignVertical}
					inputStyle={inputStyle}
					autoFocus={autoFocus}
					checkTextInput={checkTextInput}
					allowSubmitWhenDisabled={allowSubmitWhenDisabled ?? true}
					primaryColor={resolvedPrimaryColor}
					suggestions={suggestions}
					renderModalChildren={renderModalChildren}
				/>
			),
		});
	}, [
		allowSubmitWhenDisabled,
		autoFocus,
		checkTextInput,
		close,
		inputStyle,
		keyboardType,
		multiline,
		numberOfLines,
		onSave,
		placeholder,
		renderModalChildren,
		resolvedInitialValue,
		resolvedPrimaryColor,
		resolvedTitle,
		saveLabel,
		show,
		suggestions,
		textAlignVertical,
	]);

	return (
		<SettingsList
			{...props}
			primaryColor={resolvedPrimaryColor}
			label={label}
			title={title}
			value={value}
			rightElement={rightElement}
			rightIcon={resolvedRightIcon}
			onPress={handleOpen}
		/>
	);
};

export default SettingsListTextInput;

const styles = StyleSheet.create({
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
	suggestionsContainer: {
		marginTop: 16,
	},
});
