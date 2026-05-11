// Hinweis: Wenn neue SettingsList-Komponenten entstehen, bitte auch im Experimental-Screen hinzufügen.
import React, { useCallback, useMemo } from 'react';
import { Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import type { KeyboardTypeOptions, TextInputProps } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

const ResolvedTextInput = Platform.OS === 'web' ? TextInput : BottomSheetTextInput;
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppSelector } from '@/redux/hooks';

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
	const { primaryColor } = useAppSelector((state: RootState) => state.settings);

	return (
		<ResolvedTextInput
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
	const { primaryColor } = useAppSelector((state) => state.settings);

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
			<ResolvedTextInput
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

	return Content;
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
