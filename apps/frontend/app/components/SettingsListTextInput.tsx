import React, { useCallback, useMemo } from 'react';
import { Keyboard, Platform, StyleSheet, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';

import AppTextInput from '@/components/AppTextInput';
import AppButton from '@/components/AppButton';
import SettingsList from '@/components/SettingsList';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import useMyScrollviewTextInputModal from '@/hooks/useMyScrollviewTextInputModal';
import { RootState } from '@/redux/reducer';
import type { SettingsListProps } from '@/components/SettingsList/types';
import { TranslationKeys } from '@/locales/keys';
import { useAppSelector } from '@/redux/hooks';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import useIsLtrLanguage from '@/hooks/useIsLtrLanguage';
import useLanguageTextAlign from '@/hooks/useLanguageTextAlign';

export type CheckTextInputResult = {
	isValid: boolean;
	value: string;
};

export type CheckTextInput = (value: string) => CheckTextInputResult;

export type TextInputBaseProps = {
	placeholder: string;
	keyboardType?: KeyboardTypeOptions;
	inputStyle?: object;
	autoFocus?: boolean;
};

export interface TextInputSharedProps extends TextInputBaseProps {
	saveLabel: string;
	multiline?: boolean;
	numberOfLines?: number;
	textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
	allowSubmitWhenDisabled?: boolean;
}

export interface SettingsListTextInputSheetProps extends TextInputSharedProps {
	value: string;
	onChangeText: (text: string) => void;
	onSave: () => void;
	disableSave?: boolean;
}

export interface SettingsListTextInputFieldProps extends TextInputBaseProps {
	value: string;
	onChangeText: (text: string) => void;
	secureTextEntry?: boolean;
	autoCapitalize?: TextInputProps['autoCapitalize'];
	autoCorrect?: boolean;
	textContentType?: TextInputProps['textContentType'];
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
	const languageTextAlign = useLanguageTextAlign();

	return (
		<AppTextInput
			containerStyle={{ marginTop: 12 }}
			inputStyle={{
				height: 56,
				borderRadius: 20,
				paddingHorizontal: 20,
				backgroundColor: theme.sheet.inputBg,
			}}
			borderColor={theme.sheet.inputBorder}
			style={{
				color: theme.sheet.text,
				textAlign: languageTextAlign,
				fontSize: 14,
				...(inputStyle ?? {}),
			}}
			placeholderTextColor={theme.sheet.placeholder}
			autoFocus={autoFocus}
			placeholder={placeholder}
			value={value}
			onChangeText={onChangeText}
			keyboardType={keyboardType}
			secureTextEntry={secureTextEntry}
			autoCapitalize={autoCapitalize}
			autoCorrect={autoCorrect}
			textContentType={textContentType}
			returnKeyType={returnKeyType}
			onSubmitEditing={onSubmitEditing}
			isBottomSheet={Platform.OS !== 'web'}
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
	const languageTextAlign = useLanguageTextAlign();

	const handleSubmitEditing = useCallback(() => {
		if (multiline) return;
		if (disableSave && !allowSubmitWhenDisabled) return;
		if (Platform.OS !== 'web') {
			Keyboard.dismiss();
		}
		onSave();
	}, [allowSubmitWhenDisabled, disableSave, multiline, onSave]);

	const handlePressSave = useCallback(() => {
		if (disableSave && !allowSubmitWhenDisabled) return;
		if (Platform.OS !== 'web') {
			Keyboard.dismiss();
		}
		onSave();
	}, [allowSubmitWhenDisabled, disableSave, onSave]);

	return (
		<View style={styles.sheetView}>
			<AppTextInput
				containerStyle={{ marginTop: 12 }}
				inputStyle={{
					height: 56,
					borderRadius: 20,
					paddingHorizontal: 20,
					backgroundColor: theme.sheet.inputBg,
				}}
				borderColor={theme.sheet.inputBorder}
				style={{
					color: theme.sheet.text,
					textAlign: languageTextAlign,
					fontSize: 14,
					...(inputStyle ?? {}),
				}}
				placeholderTextColor={theme.sheet.placeholder}
				autoFocus={autoFocus}
				placeholder={placeholder}
				value={value}
				onChangeText={onChangeText}
				keyboardType={keyboardType}
				multiline={multiline}
				numberOfLines={numberOfLines}
				textAlignVertical={textAlignVertical}
				blurOnSubmit={!multiline}
				returnKeyType={multiline ? 'default' : 'done'}
				onSubmitEditing={handleSubmitEditing}
				isBottomSheet={Platform.OS !== 'web'}
			/>

			<View style={styles.buttonContainer}>
				<AppButton
					text={saveLabel}
					onPress={handlePressSave}
				/>
			</View>
		</View>
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
	const languageTextAlign = useLanguageTextAlign();
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
