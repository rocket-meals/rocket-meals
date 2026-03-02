// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React, { useCallback, useMemo } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, StyleSheet, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';

import ProjectButton from '@/components/ProjectButton';
import SettingsList from '@/components/SettingsList';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useMyScrollviewTextInputModal from '@/hooks/useMyScrollviewTextInputModal';
import { RootState } from '@/redux/reducer';
import type { SettingsListProps } from '@/components/SettingsList/types';
import { TranslationKeys } from '@/locales/keys';
export type CheckTextInputResult = {
	isValid: boolean;
	value: string;
};

export type CheckTextInput = (value: string) => CheckTextInputResult;

export interface SettingsListTextInputSheetProps {
	placeholder: string;
	value: string;
	onChangeText: (text: string) => void;
	onSave: () => void;
	saveLabel: string;
	disableSave?: boolean;
	autoFocus?: boolean;
	keyboardType?: KeyboardTypeOptions;
	multiline?: boolean;
	numberOfLines?: number;
	textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
	inputStyle?: object;
	allowSubmitWhenDisabled?: boolean;
}

export interface SettingsListTextInputFieldProps {
	placeholder: string;
	value: string;
	onChangeText: (text: string) => void;
	keyboardType?: KeyboardTypeOptions;
	secureTextEntry?: boolean;
	autoCapitalize?: TextInputProps['autoCapitalize'];
	autoCorrect?: boolean;
	textContentType?: TextInputProps['textContentType'];
	inputStyle?: object;
	autoFocus?: boolean;
	returnKeyType?: TextInputProps['returnKeyType'];
	onSubmitEditing?: TextInputProps['onSubmitEditing'];
}

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
}

export const SettingsListTextInputField: React.FC<SettingsListTextInputFieldProps> = ({
	placeholder,
	value,
	onChangeText,
	keyboardType,
	secureTextEntry,
	autoCapitalize = 'none',
	autoCorrect = false,
	textContentType,
	inputStyle,
	autoFocus,
	returnKeyType,
	onSubmitEditing,
}) => {
	const { theme } = useTheme();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

	return (
		<TextInput
			style={{
				...styles.sheetInput,
				color: theme.sheet.text,
				backgroundColor: theme.sheet.inputBg,
				borderColor: theme.sheet.inputBorder,
				...(inputStyle ?? {}),
			}}
			autoFocus={autoFocus}
			placeholder={placeholder}
			placeholderTextColor={theme.sheet.placeholder}
			cursorColor={theme.sheet.text}
			selectionColor={primaryColor}
			value={value}
			onChangeText={onChangeText}
			keyboardType={keyboardType}
			secureTextEntry={secureTextEntry}
			autoCapitalize={autoCapitalize}
			autoCorrect={autoCorrect}
			textContentType={textContentType}
			returnKeyType={returnKeyType}
			onSubmitEditing={onSubmitEditing}
		/>
	);
};

export const SettingsListTextInputSheet: React.FC<SettingsListTextInputSheetProps> = ({
	placeholder,
	value,
	onChangeText,
	onSave,
	saveLabel,
	disableSave = false,
	autoFocus = true,
	keyboardType,
	multiline = false,
	numberOfLines,
	textAlignVertical,
	inputStyle,
	allowSubmitWhenDisabled = false,
}) => {
	const { theme } = useTheme();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

	const handleSubmitEditing = useCallback(() => {
		if (multiline) return;
		if (disableSave && !allowSubmitWhenDisabled) return;
		Keyboard.dismiss();
		onSave();
	}, [allowSubmitWhenDisabled, disableSave, multiline, onSave]);

	const handlePressSave = useCallback(() => {
		if (disableSave && !allowSubmitWhenDisabled) return;
		Keyboard.dismiss();
		onSave();
	}, [allowSubmitWhenDisabled, disableSave, onSave]);

	const Content = (
		<View
			style={{
				...styles.sheetView,
			}}
		>
			<TextInput
				style={{
					...styles.sheetInput,
					color: theme.sheet.text,
					backgroundColor: theme.sheet.inputBg,
					borderColor: theme.sheet.inputBorder,
					...(inputStyle ?? {}),
				}}
				autoFocus={autoFocus}
				placeholder={placeholder}
				placeholderTextColor={theme.sheet.placeholder}
				cursorColor={theme.sheet.text}
				selectionColor={primaryColor}
				value={value}
				onChangeText={onChangeText}
				keyboardType={keyboardType}
				multiline={multiline}
				numberOfLines={numberOfLines}
				textAlignVertical={textAlignVertical}
				blurOnSubmit={!multiline}
				returnKeyType={multiline ? 'default' : 'done'}
				onSubmitEditing={handleSubmitEditing}
			/>

			<View style={styles.buttonContainer}>
				<ProjectButton
					text={saveLabel}
					onPress={handlePressSave}
				/>
			</View>
		</View>
	);

	if (Platform.OS === 'web') {
		return Content;
	}

	return (
		<KeyboardAvoidingView
			behavior={Platform.OS === 'ios' ? 'position' : undefined}
			keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 0}
			style={styles.keyboardAvoidingView}
		>
			<View style={styles.keyboardAvoidingContent}>{Content}</View>
		</KeyboardAvoidingView>
	);
};

const SettingsListTextInput: React.FC<SettingsListTextInputProps> = ({
	modalTitle,
	placeholder,
	saveLabel,
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
	...props
}) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { openTextInputModal } = useMyScrollviewTextInputModal();
	const resolvedTitle = useMemo(() => modalTitle ?? title ?? label ?? '', [label, modalTitle, title]);
	const resolvedInitialValue = initialValue ?? value ?? '';
	const resolvedSaveLabel = useMemo(() => saveLabel ?? translate(TranslationKeys.save), [saveLabel, translate]);

	const resolvedRightIcon = useMemo(
		() =>
			rightElement || rightIcon
				? rightIcon
				: <MaterialCommunityIcons name="pencil" size={20} color={theme.screen.icon} />,
		[rightElement, rightIcon, theme.screen.icon]
	);

	const handleOpen = useCallback(() => {
		openTextInputModal({
			title: resolvedTitle,
			placeholder,
			saveLabel,
			onSave,
			initialValue: resolvedInitialValue,
			multiline,
			keyboardType,
			numberOfLines,
			textAlignVertical,
			inputStyle,
			autoFocus,
			checkTextInput,
			allowSubmitWhenDisabled,
			saveLabel: resolvedSaveLabel,
		});
	}, [
		allowSubmitWhenDisabled,
		autoFocus,
		checkTextInput,
		inputStyle,
		keyboardType,
		multiline,
		numberOfLines,
		onSave,
		openTextInputModal,
		placeholder,
		resolvedInitialValue,
		resolvedSaveLabel,
		resolvedTitle,
		textAlignVertical,
	]);

	return (
		<SettingsList
			{...props}
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
	keyboardAvoidingView: {
		flex: 1,
		width: '100%',
	},
	keyboardAvoidingContent: {
		flexGrow: 1,
		alignItems: 'center',
	},
	sheetHeader: {
		width: '100%',
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		borderTopRightRadius: 28,
		borderTopLeftRadius: 28,
	},
	sheetHeading: {
		fontFamily: 'Poppins_700Bold',
		fontSize: 28,
	},
	sheetInput: {
		width: '100%',
		height: 56,
		borderRadius: 20,
		paddingHorizontal: 20,
		borderWidth: 1,
		marginTop: 12,
		fontFamily: 'Poppins_400Regular',
		fontSize: 14,
	},
	buttonContainer: {
		width: '100%',
		marginTop: 4,
		alignItems: 'stretch',
	},
});
