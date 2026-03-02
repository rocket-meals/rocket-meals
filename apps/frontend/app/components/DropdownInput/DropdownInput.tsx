import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { TranslationKeys } from '@/locales/keys';
import SingleLineInput from '@/components/SingleLineInput/SingleLineInput';
import { useMyScrollViewModal } from '@/components/GlobalModal/useMyScrollViewModal';
import DropdownSheet from './DropdownSheet';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/reducer';

const ensureStringArray = (options: string[]): string[] => {
	const uniqueValues = new Set<string>();
	options.forEach(option => {
		if (option && option.trim().length > 0) {
			uniqueValues.add(option.trim());
		}
	});
	return Array.from(uniqueValues);
};

type DropdownInputProps = {
        id: string;
        value: string | null | undefined;
        onChange: (id: string, value: string, custom_type: string) => void;
        error?: string;
        isDisabled: boolean;
        custom_type: string;
        options?: string[];
        prefix?: string | null;
        suffix?: string | null;
        allowCustomValues?: boolean;
        onOpenSheet?: () => void;
        onCloseSheet?: () => void;
};

const DropdownInput = ({ id, value, onChange, error, isDisabled, custom_type, options = [], prefix, suffix, allowCustomValues = true, onOpenSheet, onCloseSheet }: DropdownInputProps) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const { primaryColor } = useSelector((state: RootState) => state.settings);

	const normalizedOptions = useMemo(() => ensureStringArray(options), [options]);

	const currentValue = typeof value === 'string' ? value : '';
	const [showCustomInput, setShowCustomInput] = useState(() => {
		if (currentValue.trim().length === 0) return false;
		return allowCustomValues ? !normalizedOptions.includes(currentValue) : false;
	});

	useEffect(() => {
		if (currentValue.trim().length > 0) {
			setShowCustomInput(allowCustomValues ? !normalizedOptions.includes(currentValue) : false);
		} else if (normalizedOptions.includes(currentValue)) {
			setShowCustomInput(false);
		}
	}, [currentValue, normalizedOptions, allowCustomValues]);

	const valueMatchesOption = normalizedOptions.includes(currentValue);

        const { show, close } = useMyScrollViewModal();

	const openSheet = useCallback(() => {
                console.log('[DropdownInput] openSheet invoked, disabled=', isDisabled);
                if (isDisabled) return;
                console.log('[DropdownInput] showing DropdownSheet with value=', currentValue, ' options=', normalizedOptions);
                onOpenSheet?.();
                show(
                        {
                                title: translate(TranslationKeys.select),
                                onClose: onCloseSheet,
                                children: (
                                        <DropdownSheet
                                                closeSheet={close}
                                                options={normalizedOptions}
                                                allowCustomValues={allowCustomValues}
                                                value={currentValue}
                                                onSelectOption={(val: string) => onChange(id, val, custom_type)}
                                                onSelectCustom={(val: string) => onChange(id, val, custom_type)}
                                                onDeselect={() => onChange(id, '', custom_type)}
                                                isDisabled={isDisabled}
                                                prefix={prefix}
                                                suffix={suffix}
                                                error={error}
                                        />
                                ),
                        },
                        {}
                );
        }, [
                isDisabled,
                normalizedOptions,
                allowCustomValues,
                currentValue,
                show,
                close,
                onChange,
                id,
                custom_type,
                prefix,
                suffix,
                error,
                translate,
        ]);

        const placeholderLabel = translate(TranslationKeys.select);
	const customLabel = translate(TranslationKeys.enter_custom_value);

	const trimmedValue = currentValue.trim();
	const displayValue = showCustomInput ? trimmedValue : valueMatchesOption ? currentValue : trimmedValue;
	console.log('[DropdownInput] render with currentValue=', currentValue, ' displayValue=', displayValue, ' showCustomInput=', showCustomInput, ' valueMatchesOption=', valueMatchesOption);
	const labelToShow = displayValue.length > 0 ? displayValue : showCustomInput ? customLabel : placeholderLabel;
	const isPlaceholderDisplay = displayValue.length === 0;

	return (
		<View style={styles.container}>
			<View style={styles.inputContainer}>
				{prefix && (
					<View style={[styles.prefixSuffix, styles.prefixSuffixLeft, { backgroundColor: theme.screen.iconBg, borderColor: theme.screen.iconBg }]}>
						<Text style={[styles.prefixSuffixLabel, { color: theme.screen.text }]}>{prefix}</Text>
					</View>
				)}
				<TouchableOpacity
					style={[
						styles.selectorButton,
						{
							backgroundColor: theme.sheet.inputBg,
							borderColor: theme.screen.iconBg,
							opacity: isDisabled ? 0.6 : 1,
						},
						prefix && styles.selectorButtonWithPrefix,
						suffix && styles.selectorButtonWithSuffix,
					]}
					activeOpacity={0.7}
					onPress={openSheet}
					disabled={isDisabled}
				>
					<Text
						style={[
							styles.selectorText,
							{
								color: isPlaceholderDisplay ? theme.screen.placeholder : theme.screen.text,
							},
							isPlaceholderDisplay && styles.placeholderText,
						]}
						numberOfLines={1}
						ellipsizeMode="tail"
					>
						{labelToShow}
					</Text>
					<MaterialCommunityIcons name="chevron-down" size={22} color={theme.screen.icon} style={styles.chevronIcon} />
				</TouchableOpacity>
				{suffix && (
					<View style={[styles.prefixSuffix, styles.prefixSuffixRight, { backgroundColor: theme.screen.iconBg, borderColor: theme.screen.iconBg }]}>
						<Text style={[styles.prefixSuffixLabel, { color: theme.screen.text }]}>{suffix}</Text>
					</View>
				)}
			</View>
			{Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

export default DropdownInput;
