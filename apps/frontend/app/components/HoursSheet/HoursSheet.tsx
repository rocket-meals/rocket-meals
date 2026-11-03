import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import LoadingIndicator from '@/components/LoadingIndicator/LoadingIndicator';
import useSelectedCanteen from '@/hooks/useSelectedCanteen';
import MyScrollViewModal from '@/components/MyScrollViewModal';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { useLanguage } from '@/hooks/useLanguage';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { DatabaseTypes } from 'repo-depkit-common';
import { BusinessHoursHelper } from '@/redux/actions/BusinessHours/BusinessHours';
import { BusinessHour, HourSheetProps } from './types';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { TranslationKeys } from '@/locales/keys';
import SettingsList from '@/components/SettingsList/SettingsList';
import SettingsGroupTitle from '@/components/SettingsGroupTitle';
import { useAppSelector } from '@/redux/hooks';

const getSortedBusinessHoursGroups = (groups: { id: string; sort?: number | null }[]) => {
	return [...groups].sort((a, b) => {
		const sortA = a.sort;
		const sortB = b.sort;

		const isValidA = typeof sortA === 'number';
		const isValidB = typeof sortB === 'number';

		if (isValidA && isValidB) {
			return sortA - sortB;
		} else if (isValidA) {
			return -1; // a has valid sort, b doesn't -> a first
		} else if (isValidB) {
			return 1; // b has valid sort, a doesn't -> b first
		} else {
			return 0; // neither has valid sort -> keep relative order
		}
	});
};

const buildDayStartAndEndTimeDict = (
	hoursList: any[],
	sortedDayKeys: string[]
): Record<string, { day: string; time_start: number | null; time_end: number | null }[]> => {
	const dayStartAndEndTimeDict: Record<string, { day: string; time_start: number | null; time_end: number | null }[]> = {};

	hoursList.forEach((entry: any) => {
		sortedDayKeys.forEach(day => {
			if (entry[day]) {
				let timesForDay = dayStartAndEndTimeDict[day] || [];

				let time_start_as_string = entry.time_start; // "08:00:00"
				let time_end_as_string = entry.time_end; // "20:00:00"
				if (!time_start_as_string || !time_end_as_string) {
					timesForDay.push({
						day,
						time_start: null,
						time_end: null,
					});
				} else {
					let time_start_as_seconds = Number.parseInt(time_start_as_string.split(':')[0]) * 3600 + Number.parseInt(time_start_as_string.split(':')[1]) * 60;
					let time_end_as_seconds = Number.parseInt(time_end_as_string.split(':')[0]) * 3600 + Number.parseInt(time_end_as_string.split(':')[1]) * 60;

					timesForDay.push({
						day,
						time_start: time_start_as_seconds,
						time_end: time_end_as_seconds,
					});
				}
				dayStartAndEndTimeDict[day] = timesForDay;
			}
		});
	});

	return dayStartAndEndTimeDict;
};

// Group by same time_start and time_end
// e.g. Monday: 08:00-12:00, 11:00-14:00, 14:00-20:00 ==> 08:00-20:00
const computeConsecutiveRangesByDay = (
	sortedDayKeys: string[],
	dayStartAndEndTimeDict: Record<string, { day: string; time_start: number | null; time_end: number | null }[]>
): Record<string, { time_start: number | null; time_end: number | null }[]> => {
	const dayConsecutiveRanges: Record<string, { time_start: number | null; time_end: number | null }[]> = {};
	// Iterate over each day and its corresponding time ranges
	sortedDayKeys.forEach(day => {
		const timeRanges = dayStartAndEndTimeDict[day];
		if (timeRanges && timeRanges.length > 0) {
			// sorting the time ranges by time_start
			timeRanges.sort((a, b) => {
				if (a.time_start === null || b.time_start === null) {
					// null will be at the end
					return a.time_start === null ? 1 : -1;
				}
				return a.time_start - b.time_start;
			});
			let consecutiveRanges: {
				time_start: number | null;
				time_end: number | null;
			}[] = [];
			// we now want to find overlapping time ranges for each day
			let currentRange: {
				time_start: number | null;
				time_end: number | null;
			} | null = null;
			timeRanges.forEach(timeRange => {
				const { time_start, time_end } = timeRange;
				if (currentRange?.time_start == null || currentRange.time_end == null) {
					currentRange = { time_start, time_end };
				} else if (time_start === currentRange.time_start && time_end === currentRange.time_end) {
					// do nothing
				} else if (time_start === null || time_end === null) {
					// do nothing
				} else if (time_start >= currentRange.time_start && time_end <= currentRange.time_end) {
					// do nothing
				} else if (time_start < currentRange.time_end && time_end > currentRange.time_end) {
					currentRange.time_end = time_end;
				} else if (time_start > currentRange.time_end) {
					consecutiveRanges.push(currentRange); // push the current range to the consecutive ranges
					currentRange = { time_start, time_end }; // start a new range
				}
			});
			if (currentRange) {
				consecutiveRanges.push(currentRange); // push the last range to the consecutive ranges
			}

			dayConsecutiveRanges[day] = consecutiveRanges;
		}
	});
	return dayConsecutiveRanges;
};

// Pushes one entry per time range in `timeRanges` into `groupedTimes`, all attributed to `days`.
const flushGroupedTimeRanges = (
	timeRanges: { time_start: number | null; time_end: number | null }[],
	days: string[],
	groupedTimes: { day: string[]; time_start: string | null; time_end: string | null }[]
): void => {
	timeRanges.forEach(timeRange => {
		groupedTimes.push({
			day: days,
			time_start: timeRange.time_start === null ? null : timeRange.time_start.toString(),
			time_end: timeRange.time_end === null ? null : timeRange.time_end.toString(),
		});
	});
};

// Checks whether two lists of time ranges contain the same set of (time_start, time_end) pairs.
const haveSameTimeRanges = (
	currentTimeRanges: { time_start: number | null; time_end: number | null }[],
	previousSavedTimeRanges: { time_start: number | null; time_end: number | null }[]
): boolean => {
	let isSameTimeRange = false;
	if (currentTimeRanges.length === previousSavedTimeRanges.length) {
		currentTimeRanges.forEach(timeRange => {
			previousSavedTimeRanges.forEach(previousTimeRange => {
				if (timeRange.time_start === previousTimeRange.time_start && timeRange.time_end === previousTimeRange.time_end) {
					isSameTimeRange = true;
				}
			});
		});
	}
	return isSameTimeRange;
};

type TimeRange = { time_start: number | null; time_end: number | null };
type GroupedTime = { day: string[]; time_start: string | null; time_end: string | null };
type DayMergeState = { previousSavedTimeRanges: TimeRange[]; previousDaysForTimeRange: string[] };

// Merges one day's consecutive ranges into `groupedTimes`, carrying the running
// "same time range so far" state forward to the next day via the returned state.
const mergeDayIntoGroupedTimes = (
	currentDay: string,
	currentTimeRanges: TimeRange[] | undefined,
	isLastDay: boolean,
	state: DayMergeState,
	groupedTimes: GroupedTime[]
): DayMergeState => {
	let { previousSavedTimeRanges, previousDaysForTimeRange } = state;

	if (!currentTimeRanges || currentTimeRanges.length === 0) {
		// if we have no time ranges for this day, we can skip it
		// but we need to check if we have a previous day with time ranges and if so, we need to add it to the groupedTimes
		if (previousDaysForTimeRange.length > 0 && previousSavedTimeRanges.length > 0) {
			// we have a previous day with time ranges
			flushGroupedTimeRanges(previousSavedTimeRanges, previousDaysForTimeRange, groupedTimes);
			previousSavedTimeRanges = [];
			previousDaysForTimeRange = [];
		}
		return { previousSavedTimeRanges, previousDaysForTimeRange };
	}

	// So we have previous time ranges and now we want to check if the current time ranges are the same as the previous time ranges
	let isSameTimeRange = haveSameTimeRanges(currentTimeRanges, previousSavedTimeRanges);

	if (isSameTimeRange) {
		// we have a same time range, so we can add the current day to the previous days
		previousDaysForTimeRange = [...previousDaysForTimeRange, currentDay];
	} else {
		// we have a different time range, so we need to save the previous time ranges and add the current day to the grouped times
		flushGroupedTimeRanges(previousSavedTimeRanges, previousDaysForTimeRange, groupedTimes);
		previousDaysForTimeRange = [currentDay];
		previousSavedTimeRanges = currentTimeRanges;
	}

	// if we are at the last day, we need to add the previous time ranges to the grouped times
	if (isLastDay) {
		flushGroupedTimeRanges(previousSavedTimeRanges, previousDaysForTimeRange, groupedTimes);
	}

	return { previousSavedTimeRanges, previousDaysForTimeRange };
};

const mergeDaysWithSameTimeRanges = (
	sortedDayKeys: string[],
	dayConsecutiveRanges: Record<string, TimeRange[]>
): GroupedTime[] => {
	const groupedTimes: GroupedTime[] = [];

	let state: DayMergeState = { previousSavedTimeRanges: [], previousDaysForTimeRange: [] };
	for (let i = 0; i < sortedDayKeys.length; i++) {
		let currentDay = sortedDayKeys[i];
		let currentTimeRanges = dayConsecutiveRanges[currentDay];
		let isLastDay = i === sortedDayKeys.length - 1;
		state = mergeDayIntoGroupedTimes(currentDay, currentTimeRanges, isLastDay, state, groupedTimes);
	}

	return groupedTimes;
};

// Format time_start and time_end from seconds back to HH:mm:ss
const formatGroupedTimesInPlace = (groupedTimes: { time_start: string | null; time_end: string | null }[]) => {
	groupedTimes.forEach(timeRange => {
		if (timeRange.time_start === null || timeRange.time_end === null) {
			// do nothing if value is null
			return;
		}

		let time_start_in_seconds = Number.parseInt(timeRange.time_start);
		let time_end_in_seconds = Number.parseInt(timeRange.time_end);
		let time_start_hours = Math.floor(time_start_in_seconds / 3600);
		let time_start_minutes = Math.floor((time_start_in_seconds % 3600) / 60);
		let time_start_seconds = time_start_in_seconds % 60;
		let time_end_hours = Math.floor(time_end_in_seconds / 3600);
		let time_end_minutes = Math.floor((time_end_in_seconds % 3600) / 60);
		let time_end_seconds = time_end_in_seconds % 60;
		timeRange.time_start = `${String(time_start_hours).padStart(2, '0')}:${String(time_start_minutes).padStart(2, '0')}:${String(time_start_seconds).padStart(2, '0')}`;
		timeRange.time_end = `${String(time_end_hours).padStart(2, '0')}:${String(time_end_minutes).padStart(2, '0')}:${String(time_end_seconds).padStart(2, '0')}`;

		timeRange.time_start = `${String(time_start_hours).padStart(2, '0')}:${String(time_start_minutes).padStart(2, '0')}:${String(time_start_seconds).padStart(2, '0')}`;
		timeRange.time_end = `${String(time_end_hours).padStart(2, '0')}:${String(time_end_minutes).padStart(2, '0')}:${String(time_end_seconds).padStart(2, '0')}`;
	});
};

export const HoursSheetContent: React.FC = () => {
	const { theme } = useTheme();
	const { translate } = useLanguage();
	type GroupedHours = {
		[groupId: string]: {
			name: string;
			entries: {
				day: string[];
				time_start: string | null;
				time_end: string | null;
			}[];
		};
	};

	const [hours, setHours] = useState<GroupedHours | null>(null);
	const [loading, setLoading] = useState(false);
	const { language, firstDayOfTheWeek } = useAppSelector((state) => state.settings);
	const { businessHoursGroups } = useAppSelector((state) => state.canteenReducer);
	const selectedCanteen = useSelectedCanteen();
	const buildingsHelper = new BuildingsHelper();
	const businessHoursHelper = new BusinessHoursHelper();

	const getSortedWeekdayKeys = () => {
		let dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
		// rotate the day keys based on the first day of the week
		let firstDayOfTheWeekKey = firstDayOfTheWeek?.id || 'monday';
		const firstDayIndex = dayKeys.indexOf(firstDayOfTheWeekKey);
		dayKeys = [...dayKeys.slice(firstDayIndex), ...dayKeys.slice(0, firstDayIndex)];
		return dayKeys;
	};

	const fetchSelectedBuilding = async () => {
		if (!selectedCanteen?.building) return;

		try {
			setLoading(true);
			const buildingData = (await buildingsHelper.fetchBuildingById(selectedCanteen.building as string)) as DatabaseTypes.Buildings;

			if (!buildingData?.businesshours?.length) {
				setHours(null);
				setLoading(false);
				return;
			}

			const hoursPromises = buildingData.businesshours.map(async bh => {
				try {
					return (await businessHoursHelper.fetchBusinessHoursById(bh.businesshours_id)) as BusinessHour;
				} catch (error) {
					console.error(`Error fetching business hour ID ${bh.businesshours_id}`, error);
					setLoading(false);
					return null;
				}
			});

			const hoursResults = await Promise.all(hoursPromises);
			const matchedHours = hoursResults.filter((hour): hour is BusinessHour => hour !== null && Object.values(hour).some(val => val !== null));

			// Filter by valid dates
			const currentDate = new Date().toISOString().split('T')[0];

			const groupedByGroupName: Record<
				string,
				{
					name: string;
					hours: any[];
				}
			> = {};

			getSortedBusinessHoursGroups(businessHoursGroups).forEach((group: any) => {
				const groupName = group.translations ? getTextFromTranslation(group.translations, language) : '';

				// First filter for the group
				const groupHours = matchedHours.filter((hour: any) => hour.group === group.id);
				if (!groupHours.length) return;

				// check if the hours have a filter for active
				const groupHoursWithDateFilter = groupHours.filter((hour: any) => {
					if (hour.date_valid_from && hour.date_valid_till) {
						return currentDate >= hour.date_valid_from && currentDate <= hour.date_valid_till;
					}
					return false;
				});

				const groupHoursWithoutDateFilter = groupHours.filter((hour: any) => {
					return !hour.date_valid_from && !hour.date_valid_till;
				});

				let activeGroupHours = [];
				if (groupHoursWithDateFilter.length) {
					activeGroupHours = groupHoursWithDateFilter;
				} else {
					activeGroupHours = groupHoursWithoutDateFilter;
				}

				groupedByGroupName[group.id] = {
					name: groupName,
					hours: activeGroupHours,
				};
			});
			let sortedDayKeys = getSortedWeekdayKeys();

			const dayWiseGroupedByGroupName: GroupedHours = {};

			Object.entries(groupedByGroupName).forEach(([groupId, groupData]) => {
				const { name: groupName, hours: hoursList } = groupData;
				const dayStartAndEndTimeDict = buildDayStartAndEndTimeDict(hoursList, sortedDayKeys);
				const dayConsecutiveRanges = computeConsecutiveRangesByDay(sortedDayKeys, dayStartAndEndTimeDict);
				const groupedTimes = mergeDaysWithSameTimeRanges(sortedDayKeys, dayConsecutiveRanges);
				formatGroupedTimesInPlace(groupedTimes);

				dayWiseGroupedByGroupName[groupId] = {
					name: groupName,
					entries: groupedTimes,
				};
			});

			setHours(dayWiseGroupedByGroupName);
			setLoading(false);
		} catch (error) {
			console.error('Error fetching building data:', error);
			setLoading(false);
		}
	};

	useEffect(() => {
		if (selectedCanteen) {
			void fetchSelectedBuilding();
		}
	}, [selectedCanteen]);

	const formatTime = (time: string | null): string => time?.slice(0, 5) || 'N/A';

        const renderHours = (
                groupId: string,
                hoursData: {
                        day: string[];
                        time_start: string | null;
                        time_end: string | null;
                }[]
        ) => {
                if (!hoursData.length) {
                        return <Text style={{ ...styles.body, color: theme.screen.text }}>{translate(TranslationKeys.no_business_hours_available)}</Text>;
                }

                const daysOfWeek = [
                        { name: translate(TranslationKeys.Mon), key: 'monday' },
                        { name: translate(TranslationKeys.Tue), key: 'tuesday' },
                        { name: translate(TranslationKeys.Wed), key: 'wednesday' },
                        { name: translate(TranslationKeys.Thu), key: 'thursday' },
                        { name: translate(TranslationKeys.Fri), key: 'friday' },
                        { name: translate(TranslationKeys.Sat), key: 'saturday' },
                        { name: translate(TranslationKeys.Sun), key: 'sunday' },
                ];

                return hoursData.map((range, index) => {
                        let firstDayKey = range.day[0];
                        let lastDayKey = range.day.at(-1);
                        let firstDay = daysOfWeek.find(d => d.key === firstDayKey);
                        let lastDay = daysOfWeek.find(d => d.key === lastDayKey);
                        let label = `${firstDay?.name}`;
                        if (firstDayKey !== lastDayKey) {
                                label += ` - ${lastDay?.name}`;
                        }
                        let hoursDataKey = groupId + range.day.join('-') + range.time_start + range.time_end;

                        let timeText = translate(TranslationKeys.closed_hours);
                        if (range.time_start && range.time_end) {
                                timeText = `${formatTime(range.time_start)} - ${formatTime(range.time_end)}`;
                                if (range.time_start === range.time_end) {
                                        timeText = `${formatTime(range.time_start)}`;
                                }
                        }

                        const isFirst = index === 0;
                        const isLast = index === hoursData.length - 1;
                        const isSingle = hoursData.length === 1;
                        let groupPosition: 'single' | 'top' | 'bottom' | 'middle' = 'middle';
                        if (isSingle) {
                                groupPosition = 'single';
                        } else if (isFirst) {
                                groupPosition = 'top';
                        } else if (isLast) {
                                groupPosition = 'bottom';
                        }

                        return (
                                <SettingsList
                                        key={hoursDataKey}
                                        title={label}
                                        value={timeText}
                                        showSeparator={!isLast}
                                        groupPosition={groupPosition}
                                        noIconIndent
                                />
                        );
                });
        };

	let hoursContent: React.ReactNode;
	if (hours && Object.keys(hours).length > 0) {
		hoursContent = (
			<View
				style={{
					...styles.hoursContainer,
					width: '100%',
				}}
			>
				{getSortedBusinessHoursGroups(businessHoursGroups)
					.filter(group => hours[group.id])
					.map(group => {
						const { name, entries } = hours[group.id];
						return (
							<View key={group.id} style={{ marginBottom: 20 }}>
								<SettingsGroupTitle>{name}</SettingsGroupTitle>
								{renderHours(group.id, entries)}
							</View>
						);
					})}
			</View>
		);
	} else {
		hoursContent = (
			<View
				style={{
					height: 200,
					width: '100%',
					justifyContent: 'center',
					alignItems: 'center',
				}}
			>
				<Text style={{ ...styles.empty, color: theme.screen.text }}>{translate(TranslationKeys.no_business_hours_available)}</Text>
			</View>
		);
	}

	return (
		<>
			{loading ? (
				<View
					style={{
						height: 200,
						width: '100%',
						justifyContent: 'center',
						alignItems: 'center',
					}}
				>
					<LoadingIndicator size={30} color={theme.screen.text} />
				</View>
			) : (
				<View
					style={{
						minHeight: 200,
						width: '100%',
					}}
				>
					{hoursContent}
				</View>
			)}
		</>
	);
};

const HourSheet: React.FC<HourSheetProps> = ({ closeSheet }) => {
	const { translate } = useLanguage();
	return (
		<MyScrollViewModal title={translate(TranslationKeys.businesshours)}>
			<HoursSheetContent />
		</MyScrollViewModal>
	);
};

export default HourSheet;
