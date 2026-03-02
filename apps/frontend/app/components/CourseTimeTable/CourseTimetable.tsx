import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { days, timeSlots } from './constant';
import { CourseTimetableProps, EventTypes } from './types';
import { Feather, FontAwesome5, MaterialCommunityIcons, MaterialIcons, Octicons } from '@expo/vector-icons';
import { useSelector } from 'react-redux';
import { daysData } from '@/constants/SettingData';
import { useLanguage } from '@/hooks/useLanguage';
import { Tooltip, TooltipContent, TooltipText } from '@gluestack-ui/themed';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const CourseTimetable: React.FC<CourseTimetableProps> = ({ events, openSheet, setIsUpdate, setTimeTableData, setSelectedEventId }) => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
	const [currentTimeOffset, setCurrentTimeOffset] = useState(0);
	const [showCurrentTimeOffset, setShowCurrentTimeOffset] = useState(false);
	const { firstDayOfTheWeek } = useSelector((state: RootState) => state.settings);
	useEffect(() => {
		const handleResize = () => {
			setScreenWidth(Dimensions.get('window').width);
		};

		const subscription = Dimensions.addEventListener('change', handleResize);

		return () => subscription?.remove();
	}, []);

	useEffect(() => {
		const updateTimeOffset = () => {
			setShowCurrentTimeOffset(true);
			const now = new Date();
			const startHour = 8; // Starting time is 08:00
			const slotHeight = 60; // Each time slot is 60px high

			const currentHour = now.getHours();
			const currentMinute = now.getMinutes();
			const totalMinutesSinceStart = (currentHour - startHour) * 60 + currentMinute;

			const offset = (totalMinutesSinceStart / 60) * slotHeight;
			if (currentHour === 20) {
				setShowCurrentTimeOffset(false);
			} else {
				setCurrentTimeOffset(offset > 0 ? offset : 0);
			}
		};

		updateTimeOffset(); // Initial update
		const interval = setInterval(updateTimeOffset, 60000); // Update every minute

		return () => clearInterval(interval); // Cleanup interval
	}, []);

	const getColumnWidth = () => {
		const windowWidth = Dimensions.get('window').width;
		if (screenWidth < 500) {
			return windowWidth / 2;
		} else if (screenWidth < 800) {
			return windowWidth / 3;
		} else {
			return windowWidth / 5;
		}
	};

	const calculateHeight = (startTime: string, endTime: string) => {
		const [startHour, startMinute] = startTime.split(':').map(Number);
		const [endHour, endMinute] = endTime.split(':').map(Number);
		const totalMinutes = (endHour - startHour) * 60 + (endMinute - startMinute);
		const slotHeight = 60; // Height for one hour
		return (totalMinutes / 60) * slotHeight - 4;
	};

	const calculateTopPosition = (startTime: string) => {
		const [startHour, startMinute] = startTime.split(':').map(Number);
		const startOffsetMinutes = (startHour - 8) * 60 + startMinute; // 8:00 is the start of the timetable
		const slotHeight = 60; // Height for one hour
		return (startOffsetMinutes / 60) * slotHeight + 2;
	};

	const handleUpdateEvent = (event: EventTypes) => {
		const filteredDay = daysData?.filter((day: any) => day.id === event?.day?.toLocaleLowerCase());
		// Function to transform the event into TimeTableData format
		const formattedData = [
			{
				id: 1,
				leftIcon: <MaterialCommunityIcons name="tag-text-outline" size={24} color={theme.screen.icon} />,
				label: 'title',
				value: event.title,
				rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
				handleFunction: () => {
					console.log('Title Information clicked');
				},
			},
			{
				id: 2,
				leftIcon: <MaterialCommunityIcons name="map-marker-outline" size={24} color={theme.screen.icon} />,
				label: 'location',
				value: event.location,
				rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
				handleFunction: () => {
					console.log('Location clicked');
				},
			},
			{
				id: 3,
				leftIcon: <MaterialIcons name="color-lens" size={24} color={theme.screen.icon} />,
				label: 'color',
				value: event.color,
				rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
				handleFunction: () => {
					console.log('Color clicked');
				},
			},
			{
				id: 4,
				leftIcon: <MaterialCommunityIcons name="clock-start" size={24} color={theme.screen.icon} />,
				label: 'startTime',
				value: event.startTime,
				rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
				handleFunction: () => {
					console.log('Start Time clicked');
				},
			},
			{
				id: 5,
				leftIcon: <MaterialCommunityIcons name="clock-end" size={24} color={theme.screen.icon} />,
				label: 'endTime',
				value: event.endTime,
				rightIcon: <FontAwesome5 name="pen" size={16} color={theme.screen.icon} />,
				handleFunction: () => {
					console.log('End Time clicked');
				},
			},
			{
				id: 6,
				leftIcon: <Feather name="calendar" size={24} color={theme.screen.icon} />,
				label: 'weekday',
				value: filteredDay[0],
				rightIcon: <Octicons name="chevron-right" size={24} color={theme.screen.icon} />,
				handleFunction: () => {
					console.log('Weekday clicked');
				},
			},
		];
		setTimeTableData(formattedData);
		setSelectedEventId(event.id || '');
		setIsUpdate(true);
		openSheet();
	};

	const reorderedDays = useMemo(() => {
		if (!days) return [];
		const firstDayIndex = days.findIndex(day => day.id.toLocaleLowerCase() === firstDayOfTheWeek.id);
		console.log('firstDayIndex', firstDayOfTheWeek);
		if (firstDayIndex === -1) return days; // Fallback if the firstDayOfTheWeek is invalid
		return [...days.slice(firstDayIndex), ...days.slice(0, firstDayIndex)];
	}, [days, firstDayOfTheWeek]);

	console.log('Events', events);
	console.log('reorderedDays', reorderedDays);

	return (
		<View style={{ ...styles.container, backgroundColor: theme.screen.background }}>
			<ScrollView contentContainerStyle={{ flexDirection: 'row' }}>
				{showCurrentTimeOffset && (
					<View
						style={[
							styles.currentTimeIndicator,
							{
								width: reorderedDays?.length * getColumnWidth(),
								top: currentTimeOffset,
							},
						]}
					>
						<Text style={styles.currentTimeText}>Now</Text>
					</View>
				)}
				<View
					style={{
						...styles.timeColumnContainer,
						backgroundColor: theme.header.background,
					}}
				>
					<View
						style={{
							...styles.timeColumn,
							borderRightWidth: 1,
							borderColor: '#ddd',
						}}
					/>
					{timeSlots.map(time => (
						<View key={time} style={styles.timeColumn}>
							<Text style={{ ...styles.timeText, color: theme.screen.text }}>{time}</Text>
						</View>
					))}
				</View>
				<ScrollView horizontal style={{}} contentContainerStyle={{ flexDirection: 'column' }}>
					<View style={styles.headerRow}>
						{/* Empty space for time column */}
						{reorderedDays &&
							reorderedDays?.map((day, index) => (
								<View
									key={index}
									style={{
										...styles.dayHeader,
										backgroundColor: theme.header.background,
										width: getColumnWidth(),
									}}
								>
									<Text
										style={{
											...styles.dayHeaderText,
											color: theme.screen.text,
										}}
									>
										{translate(day.name)}
									</Text>
								</View>
							))}
					</View>

					<View style={styles.tableContent}>
						{reorderedDays?.map((day, dayIndex) => (
							<View
								key={dayIndex}
								style={{
									position: 'relative',
									width: getColumnWidth(),
									borderRightWidth: 1,
									borderColor: '#ddd',
								}}
							>
								{/* Render the grid layout */}
								{timeSlots.map((time, index) => (
									<View key={index} style={styles.slot} />
								))}

								{/* Render the events for the current day */}
								{events &&
									events
										?.filter(event => event?.day?.toLocaleLowerCase() === day.id) // Filter events for the current day
										.sort((a, b) => new Date(`1970-01-01T${a.startTime}:00Z`).getTime() - new Date(`1970-01-01T${b.startTime}:00Z`).getTime()) // Sort events by start time
										.map((event, eventIndex, dayEvents) => {
											// Find overlapping events
											const overlappingEvents = dayEvents.filter((e, i) => i !== eventIndex && new Date(`1970-01-01T${e.startTime}:00Z`).getTime() < new Date(`1970-01-01T${event.endTime}:00Z`).getTime() && new Date(`1970-01-01T${e.endTime}:00Z`).getTime() > new Date(`1970-01-01T${event.startTime}:00Z`).getTime());

											// Calculate horizontal position and width
											const overlapCount = overlappingEvents.length + 1; // Include the current event
											const eventWidth = getColumnWidth() / overlapCount; // Divide width equally
											const horizontalPosition = (eventIndex % overlapCount) * eventWidth; // Position side by side

											return (
												<Tooltip
													placement="top"
													trigger={triggerProps => (
														<TouchableOpacity
															{...triggerProps}
															key={event.id}
															style={{
																...styles.slotEvent,
																backgroundColor: event.color,
																borderColor: event.color,
																height: calculateHeight(event.startTime, event.endTime),
																top: calculateTopPosition(event.startTime),
																width: eventWidth - 4, // Add some spacing
																left: horizontalPosition,
															}}
															onPress={() => handleUpdateEvent(event)}
														>
															<Text style={styles.eventText}>{event.title}</Text>
														</TouchableOpacity>
													)}
												>
													<TooltipContent bg={theme.tooltip.background} py="$1" px="$2">
														<TooltipText fontSize="$sm" color={theme.tooltip.text}>
															{`${translate(TranslationKeys.event)}: ${translate(TranslationKeys.edit)}`}
														</TooltipText>
													</TooltipContent>
												</Tooltip>
											);
										})}
							</View>
						))}
					</View>
				</ScrollView>
			</ScrollView>
		</View>
	);
};

export default CourseTimetable;
