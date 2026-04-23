import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useTheme } from 'repo-depkit-common-ui';

import { SavedActivity } from '../../helpers/ActivityStorage';
import { useTranslation } from '../../hooks/useTranslation';
import { GeonexiaTranslationKeys } from '../../locales/keys';

const PRIMARY_COLOR = '#2563eb';

LocaleConfig.locales['geonexia-en'] = {
	monthNames: ['January','February','March','April','May','June','July','August','September','October','November','December'],
	monthNamesShort: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
	dayNames: ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'],
	dayNamesShort: ['Su','Mo','Tu','We','Th','Fr','Sa'],
	today: 'Today',
};
LocaleConfig.locales['geonexia-de'] = {
	monthNames: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
	monthNamesShort: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
	dayNames: ['Sonntag','Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag'],
	dayNamesShort: ['So','Mo','Di','Mi','Do','Fr','Sa'],
	today: 'Heute',
};

type Props = {
	activities: SavedActivity[];
	selectedDate?: string;
	onSelect: (dateString: string) => void;
};

/** Build a Set of 'YYYY-MM-DD' strings from activity start timestamps. */
function buildActivityDateSet(activities: SavedActivity[]): Set<string> {
	const set = new Set<string>();
	for (const a of activities) {
		const d = new Date(a.startedAt);
		const yyyy = d.getFullYear();
		const mm = String(d.getMonth() + 1).padStart(2, '0');
		const dd = String(d.getDate()).padStart(2, '0');
		set.add(`${yyyy}-${mm}-${dd}`);
	}
	return set;
}

const ActivityCalendarSheet: React.FC<Props> = ({ activities, selectedDate, onSelect }) => {
	const { theme } = useTheme();
	const { language } = useTranslation();
	const [currentMonth, setCurrentMonth] = useState(new Date());

	LocaleConfig.defaultLocale = language === 'de' ? 'geonexia-de' : 'geonexia-en';

	const activityDates = buildActivityDateSet(activities);

	// Build markedDates: activity days get a dot, selected date gets highlight
	const markedDates: Record<string, any> = {};
	for (const dateStr of activityDates) {
		markedDates[dateStr] = {
			marked: true,
			dotColor: PRIMARY_COLOR,
		};
	}
	if (selectedDate) {
		markedDates[selectedDate] = {
			...(markedDates[selectedDate] || {}),
			selected: true,
			selectedColor: PRIMARY_COLOR,
			selectedTextColor: '#ffffff',
		};
	}

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
				firstDay={1}
				current={currentMonth.toISOString().split('T')[0]}
				onDayPress={(day: any) => onSelect(day.dateString)}
				markedDates={markedDates}
				renderArrow={(direction: 'left' | 'right') => (
					<TouchableOpacity
						style={[styles.calendarAction, { backgroundColor: PRIMARY_COLOR }]}
						onPress={() => navigateMonth(direction === 'left' ? 'prev' : 'next')}
					>
						<Entypo name={direction === 'left' ? 'chevron-left' : 'chevron-right'} size={20} color="#ffffff" />
					</TouchableOpacity>
				)}
				onMonthChange={(month: any) => {
					setCurrentMonth(new Date(month.year, month.month - 1));
				}}
				hideExtraDays
				theme={{
					calendarBackground: theme.screen.background,
					textSectionTitleColor: theme.screen.text,
					selectedDayBackgroundColor: PRIMARY_COLOR,
					selectedDayTextColor: '#ffffff',
					todayTextColor: PRIMARY_COLOR,
					monthTextColor: theme.screen.text,
					dayTextColor: theme.screen.text,
					textDisabledColor: theme.screen.icon,
					arrowColor: '#ffffff',
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
		height: 40,
		width: 40,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
	},
});

export default ActivityCalendarSheet;
