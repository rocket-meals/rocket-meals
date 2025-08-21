import { Text, TextInput, View } from 'react-native';
import React, { useRef } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';

const DateWithTimeInput = ({
	id,
	value,
	onChange,
	onError,
	error,
	isDisabled,
	custom_type,
	prefix,
	suffix,
}: {
	id: string;
	value: string;
	onChange: (id: string, value: string, custom_type: string) => void;
	onError: (id: string, error: string) => void;
	error: string;
	isDisabled: boolean;
	custom_type: string;
	prefix: string | null | undefined;
	suffix: string | null | undefined;
}) => {
	const { theme } = useTheme();
	const previousValue = useRef<string>(value);
	const flag = !suffix && !prefix;
	const isThirdDotManual = useRef(false);
	const isFifthDotManual = useRef(false);
	const isLastColonManual = useRef(false);

	const formatDateTimeInput = (text: string) => {
		let cleanedText = text.replace(/[^0-9]/g, '');

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
			if (text[14] === ':' && !isLastColonManual.current) {
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
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{prefix}
						</Text>
					</View>
				)}
				<TextInput
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
					cursorColor={theme.screen.text}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={validateDateTime}
					value={value}
					editable={!isDisabled}
					placeholder="DD.MM.YYYY HH:MM"
					autoCapitalize="none"
					enterKeyHint="next"
				/>
				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{suffix}
						</Text>
					</View>
				)}
			</View>
			{error && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

const DateInput = ({
	id,
	value,
	onChange,
	onError,
	error,
	isDisabled,
	custom_type,
	prefix,
	suffix,
}: {
	id: string;
	value: string;
	onChange: (id: string, value: string, custom_type: string) => void;
	onError: (id: string, error: string) => void;
	error: string;
	isDisabled: boolean;
	custom_type: string;
	prefix: string | null | undefined;
	suffix: string | null | undefined;
}) => {
	const { theme } = useTheme();
	const previousValue = useRef<string>(value);
	const flag = !suffix && !prefix;
	const isThirdDotManual = useRef(false);
	const isFifthDotManual = useRef(false);

	const formatDateInput = (text: string) => {
		let cleanedText = text.replace(/[^0-9]/g, '');

		if (cleanedText.length > 2) {
			cleanedText = cleanedText.slice(0, 2) + '.' + cleanedText.slice(2);
		}
		if (cleanedText.length > 5) {
			cleanedText = cleanedText.slice(0, 5) + '.' + cleanedText.slice(5);
		}

		if (cleanedText.length > 10) {
			cleanedText = cleanedText.slice(0, 10);
		}

		previousValue.current = cleanedText;

		return cleanedText;
	};

	const validateDate = (text: string) => {
		let isManualDot = false;
		if (text.length > 0 && text.length <= 10) {
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
		}

		const formattedText = isManualDot ? text : formatDateInput(text);

		onChange(id, formattedText, custom_type);

		const dateRegex = /^\d{2}\.\d{2}\.\d{4}$/;
		if (!dateRegex.test(formattedText)) {
			onError(id, 'Invalid date format (e.g., DD.MM.YYYY)');
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
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{prefix}
						</Text>
					</View>
				)}
				<TextInput
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
					cursorColor={theme.screen.text}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={validateDate}
					value={value}
					editable={!isDisabled}
					placeholder="DD.MM.YYYY"
					autoCapitalize="none"
					enterKeyHint="next"
				/>
				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{suffix}
						</Text>
					</View>
				)}
			</View>
			{error && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

const TimeInput = ({
	id,
	value,
	onChange,
	onError,
	error,
	isDisabled,
	custom_type,
	prefix,
	suffix,
}: {
	id: string;
	value: string;
	onChange: (id: string, value: string, custom_type: string) => void;
	onError: (id: string, error: string) => void;
	error: string;
	isDisabled: boolean;
	custom_type: string;
	prefix: string | null | undefined;
	suffix: string | null | undefined;
}) => {
	const { theme } = useTheme();
	const previousValue = useRef<string>(value);
	const flag = !suffix && !prefix;
	const isThirdColonManual = useRef(false);

	const formatTimeInput = (text: string) => {
		let cleanedText = text.replace(/[^0-9]/g, '');

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
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{prefix}
						</Text>
					</View>
				)}
				<TextInput
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
					cursorColor={theme.screen.text}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={text => validateTime(text)}
					value={value}
					editable={!isDisabled}
					placeholder="HH:MM"
					autoCapitalize="none"
					enterKeyHint="next"
				/>
				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{suffix}
						</Text>
					</View>
				)}
			</View>
			{error && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

const PreciseTimestampInput = ({
	id,
	value,
	onChange,
	onError,
	error,
	isDisabled,
	custom_type,
	prefix,
	suffix,
}: {
	id: string;
	value: string;
	onChange: (id: string, value: string, custom_type: string) => void;
	onError: (id: string, error: string) => void;
	error: string;
	isDisabled: boolean;
	custom_type: string;
	prefix: string | null | undefined;
	suffix: string | null | undefined;
}) => {
	const { theme } = useTheme();
	const previousValue = useRef<string>(value);
	const flag = !suffix && !prefix;
	const isThirdDotManual = useRef(false);
	const isFifthDotManual = useRef(false);
	const isSecondLastColonManual = useRef(false);
	const isLastColonManual = useRef(false);

	const formatTimestampInput = (text: string) => {
		let cleanedText = text.replace(/[^0-9]/g, ''); // Remove non-numeric characters

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
			if (text[14] === ':' && !isSecondLastColonManual.current) {
				isManualDot = true;
				isSecondLastColonManual.current = true;
			} else {
				isSecondLastColonManual.current = false;
			}
			if (text[17] === ':' && !isLastColonManual.current) {
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
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{prefix}
						</Text>
					</View>
				)}
				<TextInput
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
					cursorColor={theme.screen.text}
					placeholderTextColor={theme.screen.placeholder}
					onChangeText={validateTimestamp}
					value={value}
					editable={!isDisabled}
					placeholder="DD.MM.YYYY HH:MM:SS"
					autoCapitalize="none"
					enterKeyHint="next"
				/>
				{suffix && (
					<View
						style={{
							...styles.suffix,
							width: isWeb ? '5%' : '10%',
							backgroundColor: theme.screen.iconBg,
						}}
					>
						<Text style={{ ...styles.label, color: theme.screen.text }}>
							{suffix}
						</Text>
					</View>
				)}
			</View>
			{error && <Text style={styles.errorText}>{error}</Text>}
		</View>
	);
};

export { DateWithTimeInput, DateInput, TimeInput, PreciseTimestampInput };
