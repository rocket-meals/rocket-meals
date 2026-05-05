import { Text, View, TouchableOpacity } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import React, { useRef, useState, useEffect } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { MaterialIcons } from '@expo/vector-icons';
import { parse, format } from 'date-fns';
import useMyScrollviewModalDatePicker from '@/hooks/useMyScrollviewModalDatePicker';
import { StringHelper } from 'repo-depkit-common';

const DateWithTimeInput = ({ id, value, onChange, onError, error, isDisabled, custom_type, prefix, suffix }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; onError: (id: string, error: string) => void; error: string; isDisabled: boolean; custom_type: string; prefix: string | null | undefined; suffix: string | null | undefined }) => {
	const { theme } = useTheme();
	const previousValue = useRef<string>(value);
	const flag = !suffix && !prefix;
	const isThirdDotManual = useRef(false);
	const isFifthDotManual = useRef(false);
	const isLastColonManual = useRef(false);

	const { openDatePickerModal } = useMyScrollviewModalDatePicker();
	const [localValue, setLocalValue] = useState<string>(value || '');

	useEffect(() => {
		setLocalValue(value || '');
	}, [value]);

	const formatDateTimeInput = (text: string) => {
		let cleanedText = StringHelper.replaceAllWithOptions({ str: text, find: '[^0-9]', replace: '' });

		if (cleanedText.length > 2) {
			cleanedText = cleanedText.slice(0, 2) + '.' + cleanedText.slice(2);
		}
		if (cleanedText.length > 5) {
			cleanedText = cleanedText.slice(0, 5) + '.' + cleanedText.slice(5);
		}

		if (cleanedText.length > 10 && cleanedText[10] !== ' ') {
			cleanedText = cleanedText.slice(0, 10) + ' ' + cleanedText.slice(10);
		}

		if (cleanedText.length > 13) {
			cleanedText = cleanedText.slice(0, 13) + ':' + cleanedText.slice(13);
		}

		if (cleanedText.length > 16) {
			cleanedText = cleanedText.slice(0, 16);
		}

		previousValue.current = cleanedText;
		return cleanedText;
	};

	const validateDateTime = (text: string) => {
		let isManualDot = false;
		if (text.length > 0 && text.length <= 16) {
			if (text[2] === '.' && !isThirdDotManual.current) {
				isManualDot = true;
				isThirdDotManual.current = true;
			} else {
				isThirdDotManual.current = false;
			}
			if (text[5] === '.' && !isFifthDotManual.current) {
				isManualDot = true;
				isFifthDotManual.current = true;
			} else {
				isFifthDotManual.current = false;
			}
			// Der Doppelpunkt zwischen Stunde und Minute steht bei Index 13 (0-basiert)
			if (text[13] === ':' && !isLastColonManual.current) {
				isManualDot = true;
				isLastColonManual.current = true;
			} else {
				isLastColonManual.current = false;
			}
		}

		const formattedText = isManualDot ? text : formatDateTimeInput(text);

		onChange(id, formattedText, custom_type);

		const dateTimeRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}$/;
		if (!dateTimeRegex.test(formattedText)) {
			onError(id, 'Invalid date-time format (e.g., DD.MM.YYYY HH:MM)');
		} else {
			onError(id, '');
		}
	};

	const openCalendar = () => {
		if (isDisabled) return;
		// pass current local date as selectedDateProp so calendar highlights it
		let sel = null;
		if (localValue && /^\d{2}\.\d{2}\.\d{4}/.test(localValue)) {
			try {
				const parsed = parse(localValue, 'dd.MM.yyyy', new Date());
				sel = parsed.toISOString().split('T')[0];
			} catch (e) {
				// ignore
			}
		}

		openDatePickerModal({
			selectedDateProp: sel || undefined,
			onSelect: (dateString: string) => {
				try {
					const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
					const formattedDate = format(parsed, 'dd.MM.yyyy');
					// Preserve existing time (HH:MM) from localValue or value, fallback to '00:00'
					const timeMatchLocal = (localValue || '').match(/(\d{2}:\d{2})$/);
					const timeMatchValue = (value || '').match(/(\d{2}:\d{2})$/);
					const timePart = timeMatchLocal?.[1] || timeMatchValue?.[1] || '00:00';
					const formatted = `${formattedDate} ${timePart}`;
					setLocalValue(formatted);
					onChange(id, formatted, custom_type);
					onError(id, '');
				} catch (e) {
					// ignore
				}
			},
		});
	};

	return (
		<View style={styles.container}>
			<View style={[styles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
				{prefix && (
					<View
						style={{
							...styles.prefix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{prefix}</Text>
					</View>
				)}

				{/* Editable TextInput */}
				<BottomSheetTextInput
					style={[
						styles.input,
						flag
							? {
								flex: 1,
								borderRadius: 10,
							}
						: {
							width: isWeb ? '90%' : '80%',
						},
						{ color: theme.screen.text },
					]}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={validateDateTime}
					value={localValue}
					editable={!isDisabled}
					placeholder="DD.MM.YYYY HH:MM"
					autoCapitalize="none"
				/>

				{/* Calendar open button on the right */}
				<TouchableOpacity
					style={{
						marginLeft: 8,
						padding: 8,
						borderRadius: 6,
						backgroundColor: theme.sheet?.sheetBg || theme.screen.iconBg,
					}}
					onPress={openCalendar}
					disabled={isDisabled}
				>
					<MaterialIcons name="calendar-month" size={20} color={theme.screen.text} />
				</TouchableOpacity>

				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{suffix}</Text>
					</View>
				)}
			</View>
			{Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

const DateInput = ({ id, value, onChange, onError, error, isDisabled, custom_type, prefix, suffix }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; onError: (id: string, error: string) => void; error: string; isDisabled: boolean; custom_type: string; prefix: string | null | undefined; suffix: string | null | undefined }) => {
	const { theme } = useTheme();
	const flag = !suffix && !prefix;

	const [localValue, setLocalValue] = useState<string>(value || '');
	useEffect(() => {
		setLocalValue(value || '');
	}, [value]);

	const { openDatePickerModal } = useMyScrollviewModalDatePicker();

	const openCalendar = () => {
		if (isDisabled) return;
		// pass current local date as selectedDateProp so calendar highlights it
		let sel = null;
		if (localValue && /^\d{2}\.\d{2}\.\d{4}$/.test(localValue)) {
			try {
				const parsed = parse(localValue, 'dd.MM.yyyy', new Date());
				sel = parsed.toISOString().split('T')[0];
			} catch (e) {
				// ignore
			}
		}

		openDatePickerModal({
			selectedDateProp: sel || undefined,
			onSelect: (dateString: string) => {
				try {
					const parsed = parse(dateString, 'yyyy-MM-dd', new Date());
					const formatted = format(parsed, 'dd.MM.yyyy');
					setLocalValue(formatted);
					onChange(id, formatted, custom_type);
					onError(id, '');
				} catch (e) {
					// ignore
				}
			},
		});
	};

	// New: allow text editing while keeping the calendar button to the right
	const onLocalTextChange = (text: string) => {
		setLocalValue(text);
		onChange(id, text, custom_type);

		// simple validation for date-only (DD.MM.YYYY)
		const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
		if (!dateRegex.test(text)) {
			onError(id, 'Invalid date format (e.g., DD.MM.YYYY)');
		} else {
			onError(id, '');
		}
	};

	return (
		<View style={styles.container}>
			<View style={[styles.inputContainer, { flexDirection: 'row', alignItems: 'center' }]}>
				{prefix && (
					<View
						style={{
							...styles.prefix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{prefix}</Text>
					</View>
				)}

				{/* Editable TextInput */}
				<BottomSheetTextInput
					style={[
						styles.input,
						flag
							? {
								flex: 1,
								borderRadius: 10,
							}
						: {
							width: isWeb ? '80%' : '70%',
						},
						{ color: theme.screen.text },
					]}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={onLocalTextChange}
					value={localValue}
					editable={!isDisabled}
					placeholder="DD.MM.YYYY"
					autoCapitalize="none"
				/>

				{/* Calendar open button on the right */}
				<TouchableOpacity
					style={{
						marginLeft: 8,
						padding: 8,
						borderRadius: 6,
						backgroundColor: theme.sheet?.sheetBg || theme.screen.iconBg,
					}}
					onPress={openCalendar}
					disabled={isDisabled}
				>
					<MaterialIcons name="calendar-month" size={20} color={theme.screen.text} />
				</TouchableOpacity>

				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{suffix}</Text>
					</View>
				)}
			</View>
			{Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

const TimeInput = ({ id, value, onChange, onError, error, isDisabled, custom_type, prefix, suffix }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; onError: (id: string, error: string) => void; error: string; isDisabled: boolean; custom_type: string; prefix: string | null | undefined; suffix: string | null | undefined }) => {
	const { theme } = useTheme();
	const previousValue = useRef<string>(value);
	const flag = !suffix && !prefix;
	const isThirdColonManual = useRef(false);

	const formatTimeInput = (text: string) => {
		let cleanedText = StringHelper.replaceAllWithOptions({ str: text, find: '[^0-9]', replace: '' });

		if (cleanedText.length > 2) {
			cleanedText = cleanedText.slice(0, 2) + ':' + cleanedText.slice(2);
		}

		if (cleanedText.length > 5) {
			cleanedText = cleanedText.slice(0, 5);
		}

		previousValue.current = cleanedText;

		return cleanedText;
	};

	const validateTime = (text: string) => {
		let isManualDot = false;
		if (text.length > 0 && text.length <= 5) {
			if (text[2] === ':' && !isThirdColonManual.current) {
				isManualDot = true;
				isThirdColonManual.current = true;
			} else {
				isThirdColonManual.current = false;
			}
		}

		const formattedText = isManualDot ? text : formatTimeInput(text);
		onChange(id, formattedText, custom_type);

		const timeRegex = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
		if (!timeRegex.test(formattedText)) {
			onError(id, 'Invalid time format (e.g., HH:MM)');
		} else {
			onError(id, '');
		}
	};

	return (
		<View style={styles.container}>
			<View style={[styles.inputContainer]}>
				{prefix && (
					<View
						style={{
							...styles.prefix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{prefix}</Text>
					</View>
				)}
				<BottomSheetTextInput
					style={[
						styles.input,
						flag
							? {
									width: '100%',
									borderRadius: 10,
								}
							: {
									width: isWeb ? '90%' : '80%',
								},
						{ color: theme.screen.text },
					]}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={text => validateTime(text)}
					value={value}
					editable={!isDisabled}
					placeholder="HH:MM"
					autoCapitalize="none"
				/>
				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{suffix}</Text>
					</View>
				)}
			</View>
			{Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

const PreciseTimestampInput = ({ id, value, onChange, onError, error, isDisabled, custom_type, prefix, suffix }: { id: string; value: string; onChange: (id: string, value: string, custom_type: string) => void; onError: (id: string, error: string) => void; error: string; isDisabled: boolean; custom_type: string; prefix: string | null | undefined; suffix: string | null | undefined }) => {
	const { theme } = useTheme();
	const previousValue = useRef<string>(value);
	const flag = !suffix && !prefix;
	const isThirdDotManual = useRef(false);
	const isFifthDotManual = useRef(false);
	const isSecondLastColonManual = useRef(false);
	const isLastColonManual = useRef(false);

	const formatTimestampInput = (text: string) => {
		let cleanedText = StringHelper.replaceAllWithOptions({ str: text, find: '[^0-9]', replace: '' }); // Remove non-numeric characters

		// Format date (DD.MM.YYYY)
		if (cleanedText.length > 2) {
			cleanedText = cleanedText.slice(0, 2) + '.' + cleanedText.slice(2);
		}
		if (cleanedText.length > 5) {
			cleanedText = cleanedText.slice(0, 5) + '.' + cleanedText.slice(5);
		}

		// Insert space before time (after YYYY)
		if (cleanedText.length > 10 && cleanedText[10] !== ' ') {
			cleanedText = cleanedText.slice(0, 10) + ' ' + cleanedText.slice(10);
		}

		// Format time (HH:MM:SS)
		if (cleanedText.length > 13) {
			cleanedText = cleanedText.slice(0, 13) + ':' + cleanedText.slice(13);
		}
		if (cleanedText.length > 16) {
			cleanedText = cleanedText.slice(0, 16) + ':' + cleanedText.slice(16);
		}

		// Ensure max length (`DD.MM.YYYY HH:MM:SS` = 19 characters)
		if (cleanedText.length > 19) {
		 cleanedText = cleanedText.slice(0, 19);
		}

		previousValue.current = cleanedText;
		return cleanedText;
	};

	const validateTimestamp = (text: string) => {
		let isManualDot = false;
		if (text.length > 0 && text.length <= 19) {
			if (text[2] === '.' && !isThirdDotManual.current) {
				isManualDot = true;
				isThirdDotManual.current = true;
			} else {
				isThirdDotManual.current = false;
			}
			if (text[5] === '.' && !isFifthDotManual.current) {
				isManualDot = true;
				isFifthDotManual.current = true;
			} else {
				isFifthDotManual.current = false;
			}
			// Bei Timestamp (`DD.MM.YYYY HH:MM:SS`) stehen die Doppelpunkte bei Index 13 und 16 (0-basiert)
			if (text[13] === ':' && !isSecondLastColonManual.current) {
				isManualDot = true;
				isSecondLastColonManual.current = true;
			} else {
				isSecondLastColonManual.current = false;
			}
			if (text[16] === ':' && !isLastColonManual.current) {
				isManualDot = true;
				isLastColonManual.current = true;
			} else {
				isLastColonManual.current = false;
			}
		}

		const formattedText = isManualDot ? text : formatTimestampInput(text);

		onChange(id, formattedText, custom_type);

		// Validate format `DD.MM.YYYY HH:MM:SS`
		const timestampRegex = /^\d{2}\.\d{2}\.\d{4} \d{2}:\d{2}:\d{2}$/;
		if (!timestampRegex.test(formattedText)) {
			onError(id, 'Invalid timestamp format (e.g., DD.MM.YYYY HH:MM:SS)');
		} else {
			onError(id, '');
		}
	};

	return (
		<View style={styles.container}>
			<View style={[styles.inputContainer]}>
				{prefix && (
					<View
						style={{
							...styles.prefix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{prefix}</Text>
					</View>
				)}
				<BottomSheetTextInput
					style={[
						styles.input,
						flag
							? {
									width: '100%',
									borderRadius: 10,
								}
							: {
									width: isWeb ? '90%' : '80%',
								},
						{ color: theme.screen.text },
					]}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={validateTimestamp}
					value={value}
					editable={!isDisabled}
					placeholder="DD.MM.YYYY HH:MM:SS"
					autoCapitalize="none"
				/>
				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>{suffix}</Text>
					</View>
				)}
			</View>
			{Boolean(error) && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

export { DateWithTimeInput, DateInput, TimeInput, PreciseTimestampInput };
