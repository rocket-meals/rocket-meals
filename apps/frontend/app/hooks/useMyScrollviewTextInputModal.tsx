import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Keyboard, KeyboardTypeOptions } from 'react-native';

import { SettingsListTextInputSheet } from '@/components/SettingsListTextInput';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import type { CheckTextInput } from '@/components/SettingsListTextInput';
import { borderRadiusContainer } from '@/constants/Constants';

type TextInputModalConfig = {
	initialValue?: string;
	placeholder: string;
	saveLabel: string;
	multiline?: boolean;
	keyboardType?: KeyboardTypeOptions;
	numberOfLines?: number;
	textAlignVertical?: 'auto' | 'top' | 'bottom' | 'center';
	inputStyle?: object;
	autoFocus?: boolean;
	checkTextInput?: CheckTextInput;
	allowSubmitWhenDisabled?: boolean;
};

type ModalTextInputSheetProps = TextInputModalConfig & {
	onSave: (value: string) => void;
};

const defaultCheckTextInput: CheckTextInput = value => ({
	isValid: true,
	value,
});

const ModalTextInputSheet: React.FC<ModalTextInputSheetProps> = ({
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
	allowSubmitWhenDisabled,
}) => {
	const [value, setValue] = useState(initialValue ?? '');

	useEffect(() => {
		setValue(initialValue ?? '');
	}, [initialValue]);

	const normalizedInitialValue = useMemo(
		() => (checkTextInput ?? defaultCheckTextInput)(initialValue ?? '').value,
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
		onSave(validationResult.value);
	}, [onSave, validationResult.isValid, validationResult.value]);

	return (
		<SettingsListTextInputSheet
			placeholder={placeholder}
			value={value}
			onChangeText={setValue}
			onSave={handleSave}
			saveLabel={saveLabel}
			disableSave={disableSave}
			multiline={multiline}
			numberOfLines={numberOfLines}
			textAlignVertical={textAlignVertical}
			keyboardType={keyboardType}
			inputStyle={inputStyle}
			autoFocus={autoFocus}
			allowSubmitWhenDisabled={allowSubmitWhenDisabled}
		/>
	);
};

type OpenTextInputOptions = TextInputModalConfig & {
	title: string;
	onSave: (value: string) => void | Promise<void>;
};

const useMyScrollviewTextInputModal = () => {
	const { show, close } = useMyScrollViewModal();

	const closeModal = useCallback(() => {
		Keyboard.dismiss();
		close();
	}, [close]);

	const openTextInputModal = useCallback(
		({
			title,
			initialValue,
			placeholder,
			saveLabel,
			onSave,
			multiline,
			keyboardType,
			numberOfLines,
			textAlignVertical,
			inputStyle,
			autoFocus,
			checkTextInput,
			allowSubmitWhenDisabled,
		}: OpenTextInputOptions) => {
			show({
				title,
				onClose: closeModal,
				children: (
					<ModalTextInputSheet
						initialValue={initialValue}
						placeholder={placeholder}
						saveLabel={saveLabel}
						onSave={async value => {
							await onSave(value);
							closeModal();
						}}
						multiline={multiline}
						keyboardType={keyboardType}
						numberOfLines={numberOfLines}
						textAlignVertical={textAlignVertical}
						inputStyle={{ ...(inputStyle ?? {}), borderRadius: borderRadiusContainer }}
						autoFocus={autoFocus}
						checkTextInput={checkTextInput}
						allowSubmitWhenDisabled={allowSubmitWhenDisabled ?? true}
					/>
				),
			});
		},
		[closeModal, show]
	);

	return { openTextInputModal, closeTextInputModal: closeModal };
};

export default useMyScrollviewTextInputModal;
