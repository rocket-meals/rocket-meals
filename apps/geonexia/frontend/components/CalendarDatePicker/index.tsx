import React, { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import { Entypo } from '@expo/vector-icons';
import { useTheme } from 'repo-depkit-common-ui';
import { Calendar } from 'react-native-calendars';

const PRIMARY_COLOR = '#2563eb';
const CONTRAST_COLOR = '#ffffff';

type CalendarDatePickerContentProps = {
	selectedDate?: string; // YYYY-MM-DD
	onSelect: (dateString: string) => void;
};

const CalendarDatePickerContent: React.FC<CalendarDatePickerContentProps> = ({ selectedDate, onSelect }) => {
	const { theme } = useTheme();
	const [currentMonth, setCurrentMonth] = useState(() => {
		if (selectedDate) {
			const [year, month] = selectedDate.split('-').map(Number);
			return new Date(year, month - 1);
		}
		return new Date();
	});

	return (
		<Calendar
			key={currentMonth.toISOString()}
			current={currentMonth.toISOString().split('T')[0]}
			onDayPress={(day: { dateString: string }) => {
				onSelect(day.dateString);
			}}
			markedDates={
				selectedDate
					? {
						[selectedDate]: {
							selected: true,
							disableTouchEvent: true,
							selectedColor: PRIMARY_COLOR,
						},
					}
					: {}
			}
			renderArrow={(direction: 'left' | 'right') => (
				<TouchableOpacity
					style={{
						backgroundColor: PRIMARY_COLOR,
						borderRadius: 6,
						padding: 4,
					}}
					onPress={() => {
						const newMonth = new Date(currentMonth);
						newMonth.setMonth(currentMonth.getMonth() + (direction === 'right' ? 1 : -1));
						setCurrentMonth(newMonth);
					}}
				>
					<Entypo
						name={direction === 'left' ? 'chevron-left' : 'chevron-right'}
						size={20}
						color={CONTRAST_COLOR}
					/>
				</TouchableOpacity>
			)}
			onMonthChange={(month: { year: number; month: number }) => {
				setCurrentMonth(new Date(month.year, month.month - 1));
			}}
			hideExtraDays
			theme={{
				calendarBackground: theme.sheet.sheetBg,
				textSectionTitleColor: theme.screen.text,
				selectedDayBackgroundColor: PRIMARY_COLOR,
				selectedDayTextColor: CONTRAST_COLOR,
				todayTextColor: PRIMARY_COLOR,
				monthTextColor: theme.screen.text,
				dayTextColor: theme.screen.text,
				textDisabledColor: 'gray',
				arrowColor: CONTRAST_COLOR,
				disabledArrowColor: 'gray',
				textDayFontSize: 16,
				textMonthFontSize: 18,
				textDayHeaderFontSize: 14,
			}}
		/>
	);
};

export default CalendarDatePickerContent;
