import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import type { TextInputKeyPressEvent } from 'react-native';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useTheme } from '../../context/ThemeContext';
import { borderRadiusContainer } from '../../constants/ui';
import {
	TIME_UNIT_ABBREVIATIONS,
	TimeUnit,
	TimeUnitsEnabled,
	enabledTimeUnits,
	padTimeSegment,
	sanitizeTimeSegmentText,
	segmentsToSeconds,
	splitSecondsToSegments,
} from './timeInputHelpers';

// Same platform split as the other sheet inputs: BottomSheetTextInput's blur
// handler breaks on react-native-web.
type TextInputInstance = React.ComponentRef<typeof TextInput>;

// BottomSheetTextInput forwards everything to a TextInput, its own typings
// just lag behind the react-native ones - so it is typed as one here.
const ResolvedTextInput = (Platform.OS === 'web' ? TextInput : BottomSheetTextInput) as typeof TextInput;

export interface TimeInputFieldsProps extends TimeUnitsEnabled {
	/** Starting value in seconds, split into the enabled segments. */
	initialSeconds?: number;
	/** Fired with the new total (seconds) on every keystroke. */
	onChange?: (totalSeconds: number) => void;
	/** Focus the first segment when mounted (e.g. inside a just-opened modal). */
	autoFocus?: boolean;
	/** Accent color for the focused segment border. Defaults to the theme primary. */
	primaryColor?: string;
	/** `nativeID` prefix per segment field, suffixed with the unit name. */
	nativeIDPrefix?: string;
	/** Submit handler forwarded to the last segment's keyboard "done" key. */
	onSubmit?: () => void;
}

/**
 * Segmented time entry in the style of the Material time picker: one 2-digit
 * box per enabled unit (hours/minutes/seconds), separated by colons, with the
 * unit abbreviation (h/m/s) rendered inside each box. Typing the second digit
 * automatically advances to the next segment; pressing backspace in an empty
 * segment jumps back to the previous one. Focusing a segment selects its
 * content so typing simply overwrites it.
 */
const TimeInputFields: React.FC<TimeInputFieldsProps> = ({
	hoursEnabled,
	minutesEnabled,
	secondsEnabled,
	initialSeconds = 0,
	onChange,
	autoFocus = false,
	primaryColor,
	nativeIDPrefix,
	onSubmit,
}) => {
	const { theme } = useTheme();
	const accentColor = primaryColor ?? theme.primary;
	const units = useMemo(
		() => enabledTimeUnits({ hoursEnabled, minutesEnabled, secondsEnabled }),
		[hoursEnabled, minutesEnabled, secondsEnabled],
	);

	// Fields start empty (the "00" is only a placeholder) unless an existing
	// non-zero value is being edited - then its segments are pre-filled.
	const [segmentTexts, setSegmentTexts] = useState<Partial<Record<TimeUnit, string>>>(() => {
		if (initialSeconds <= 0) return {};
		const segments = splitSecondsToSegments(initialSeconds, { hoursEnabled, minutesEnabled, secondsEnabled });
		const texts: Partial<Record<TimeUnit, string>> = {};
		for (const unit of enabledTimeUnits({ hoursEnabled, minutesEnabled, secondsEnabled })) {
			texts[unit] = padTimeSegment(segments[unit] ?? 0);
		}
		return texts;
	});
	const [focusedUnit, setFocusedUnit] = useState<TimeUnit | null>(null);

	const inputRefs = useRef<Partial<Record<TimeUnit, TextInputInstance | null>>>({});

	const focusUnit = useCallback((unit: TimeUnit | undefined) => {
		if (!unit) return;
		inputRefs.current[unit]?.focus();
	}, []);

	const handleChangeText = useCallback(
		(unit: TimeUnit, rawText: string) => {
			const text = sanitizeTimeSegmentText(rawText);
			const next = { ...segmentTexts, [unit]: text };
			setSegmentTexts(next);
			onChange?.(segmentsToSeconds(next));
			// Second digit typed -> jump to the next segment.
			if (text.length === 2) {
				const index = units.indexOf(unit);
				focusUnit(units[index + 1]);
			}
		},
		[segmentTexts, units, focusUnit, onChange],
	);

	const handleKeyPress = useCallback(
		(unit: TimeUnit, event: TextInputKeyPressEvent) => {
			// Backspace in an already-empty segment -> jump back to the previous one.
			if (event.nativeEvent.key === 'Backspace' && (segmentTexts[unit] ?? '') === '') {
				const index = units.indexOf(unit);
				focusUnit(units[index - 1]);
			}
		},
		[segmentTexts, units, focusUnit],
	);

	const handleBlur = useCallback((unit: TimeUnit) => {
		setFocusedUnit((prev) => (prev === unit ? null : prev));
		// Normalize typed values to the 2-digit display form ("5" -> "05");
		// untouched fields stay empty so the "00" placeholder keeps showing.
		setSegmentTexts((prev) => {
			const text = prev[unit] ?? '';
			return text === '' ? prev : { ...prev, [unit]: padTimeSegment(text) };
		});
	}, []);

	return (
		<View style={styles.row}>
			{units.map((unit, index) => {
				const isFocused = focusedUnit === unit;
				return (
					<React.Fragment key={unit}>
						{index > 0 && <Text style={[styles.separator, { color: theme.sheet.text }]}>:</Text>}
						<View
							style={[
								styles.segmentBox,
								{
									backgroundColor: theme.sheet.inputBg,
									borderColor: isFocused ? accentColor : theme.sheet.inputBorder,
									borderWidth: isFocused ? 2 : 1,
									borderRadius: borderRadiusContainer,
								},
							]}
						>
							<ResolvedTextInput
								ref={(ref: TextInputInstance | null | undefined) => {
									inputRefs.current[unit] = ref ?? null;
								}}
								nativeID={nativeIDPrefix ? `${nativeIDPrefix}${unit}` : undefined}
								style={[styles.segmentInput, { color: theme.sheet.text }]}
								value={segmentTexts[unit] ?? ''}
								placeholder="00"
								placeholderTextColor={theme.sheet.placeholder}
								onChangeText={(text: string) => handleChangeText(unit, text)}
								onKeyPress={(event: TextInputKeyPressEvent) => handleKeyPress(unit, event)}
								onFocus={() => setFocusedUnit(unit)}
								onBlur={() => handleBlur(unit)}
								// "Next" on the keyboard advances to the following segment (the
								// last one submits); blurOnSubmit={false} keeps the keyboard
								// open while the focus moves.
								onSubmitEditing={index === units.length - 1 ? onSubmit : () => focusUnit(units[index + 1])}
								blurOnSubmit={index === units.length - 1}
								keyboardType="number-pad"
								returnKeyType={index === units.length - 1 ? 'done' : 'next'}
								maxLength={2}
								autoFocus={autoFocus && index === 0}
								selectTextOnFocus
								selectionColor={accentColor}
							/>
							<Text style={[styles.unitText, { color: isFocused ? accentColor : theme.sheet.placeholder }]}>
								{TIME_UNIT_ABBREVIATIONS[unit]}
							</Text>
						</View>
					</React.Fragment>
				);
			})}
		</View>
	);
};

export default TimeInputFields;

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8,
	},
	separator: {
		fontSize: 34,
		fontWeight: '600',
		marginBottom: 6,
	},
	segmentBox: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: 86,
		height: 72,
		paddingHorizontal: 8,
	},
	segmentInput: {
		fontSize: 32,
		fontWeight: '600',
		fontVariant: ['tabular-nums'],
		textAlign: 'center',
		minWidth: 44,
		padding: 0,
	},
	unitText: {
		fontSize: 14,
		fontWeight: '600',
		alignSelf: 'flex-end',
		marginBottom: 14,
	},
});
