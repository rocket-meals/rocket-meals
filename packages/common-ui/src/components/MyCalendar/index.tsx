import React, { useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useTheme } from '../../context/ThemeContext';
import { myContrastColor } from '../../helpers/ColorHelper';

export type MyCalendarLocaleConfig = {
	monthNames: string[];
	monthNamesShort: string[];
	dayNames: string[];
	dayNamesShort: string[];
	today: string;
};

export type MyCalendarProps = {
	/** Currently selected date in 'YYYY-MM-DD' format. */
	selectedDate?: string;
	/** Called when the user taps a day. Receives 'YYYY-MM-DD'. */
	onSelect: (dateString: string) => void;
	/** Accent colour used for the selected day and navigation arrows. */
	accentColor?: string;
	/**
	 * Additional marked-date entries (e.g. dots for activity days).
	 * Keys are 'YYYY-MM-DD', values follow the react-native-calendars marking API.
	 */
	markedDates?: Record<string, any>;
	/** First day of the week (0 = Sunday, 1 = Monday, …). Defaults to 1 (Monday). */
	firstDay?: number;
	/** Locale configuration for month/day names. */
	localeConfig?: MyCalendarLocaleConfig;
	/** Unique locale key to avoid collisions. Defaults to 'common-ui'. */
	localeKey?: string;
};

const MyCalendar: React.FC<MyCalendarProps> = ({
	selectedDate,
	onSelect,
	accentColor = '#2563eb',
	markedDates: extraMarkedDates,
	firstDay = 1,
	localeConfig,
	localeKey = 'common-ui',
}) => {
	const { theme } = useTheme();
	const [currentMonth, setCurrentMonth] = useState(new Date());
	const contrastColor = myContrastColor(accentColor, theme, false);

	useMemo(() => {
		if (localeConfig) {
			LocaleConfig.locales[localeKey] = localeConfig;
			LocaleConfig.defaultLocale = localeKey;
		}
	}, [localeConfig, localeKey]);

	// Merge extra marked dates with the selected-date highlight
	const mergedMarkedDates = useMemo(() => {
		const result: Record<string, any> = { ...(extraMarkedDates ?? {}) };
		if (selectedDate) {
			result[selectedDate] = {
				...(result[selectedDate] ?? {}),
				selected: true,
				selectedColor: accentColor,
				selectedTextColor: contrastColor,
			};
		}
		return result;
	}, [extraMarkedDates, selectedDate, accentColor, contrastColor]);

	const navigateMonth = (direction: 'next' | 'prev') => {
		const newMonth = new Date(currentMonth);
		newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
		setCurrentMonth(newMonth);
	};

	return (
		<View style={styles.calendarView}>
			<Calendar
				key={currentMonth.toISOString()}
				style={styles.calendar}
				firstDay={firstDay}
				current={currentMonth.toISOString().split('T')[0]}
				onDayPress={(day: any) => onSelect(day.dateString)}
				markedDates={mergedMarkedDates}
				renderArrow={(direction: 'left' | 'right') => (
					<TouchableOpacity
						style={[styles.calendarAction, { backgroundColor: accentColor }]}
						onPress={() => navigateMonth(direction === 'left' ? 'prev' : 'next')}
					>
						<Entypo
							name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
							size={20}
							color={contrastColor}
						/>
					</TouchableOpacity>
				)}
				onMonthChange={(month: any) => {
					setCurrentMonth(new Date(month.year, month.month - 1));
				}}
				hideExtraDays
				theme={{
					calendarBackground: theme.sheet.sheetBg,
					textSectionTitleColor: theme.screen.text,
					selectedDayBackgroundColor: accentColor,
					selectedDayTextColor: contrastColor,
					todayTextColor: accentColor,
					monthTextColor: theme.screen.text,
					dayTextColor: theme.screen.text,
					textDisabledColor: theme.screen.icon,
					arrowColor: contrastColor,
					disabledArrowColor: theme.screen.icon,
					textDayFontSize: 16,
					textMonthFontSize: 18,
					textDayHeaderFontSize: 14,
				}}
			/>
		</View>
	);
};

const styles = StyleSheet.create({
	calendarView: {
		justifyContent: 'center',
		borderRadius: 12,
		width: '100%',
		marginTop: 8,
	},
	calendar: {
		width: '100%',
		borderRadius: 12,
	},
	calendarAction: {
		height: 45,
		width: 45,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default MyCalendar;
