import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useSelector } from 'react-redux';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { isWeb } from '@/constants/Constants';
import { useLanguage } from '@/hooks/useLanguage';
import { BuildingsHelper } from '@/redux/actions/Buildings/Buildings';
import { Buildings } from '@/constants/types';
import { BusinessHoursHelper } from '@/redux/actions/BusinessHours/BusinessHours';
import { BusinessHour, HourSheetProps } from './types';
import { getTextFromTranslation } from '@/helper/resourceHelper';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const getSortedBusinessHoursGroups = (
    groups: { id: string; sort?: number | null }[]
) => {
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


const HourSheet: React.FC<HourSheetProps> = ({ closeSheet }) => {
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
  const { language, firstDayOfTheWeek } = useSelector(
    (state: RootState) => state.settings
  );
  const { selectedCanteen, businessHoursGroups } = useSelector(
    (state: RootState) => state.canteenReducer
  );
  const ScreenWidth = Dimensions.get('window').width;
  const buildingsHelper = new BuildingsHelper();
  const businessHoursHelper = new BusinessHoursHelper();

  const getSortedWeekdayKeys = () => {
    let dayKeys = [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ];
    // rotate the day keys based on the first day of the week
    let firstDayOfTheWeekKey = firstDayOfTheWeek?.id || 'monday';
    const firstDayIndex = dayKeys.indexOf(firstDayOfTheWeekKey);
    dayKeys = [
      ...dayKeys.slice(firstDayIndex),
      ...dayKeys.slice(0, firstDayIndex),
    ];
    return dayKeys;
  };

  const fetchSelectedBuilding = async () => {
    if (!selectedCanteen?.building) return;

    try {
      setLoading(true);
      const buildingData = (await buildingsHelper.fetchBuildingById(
        selectedCanteen.building as string
      )) as Buildings;

      if (!buildingData?.businesshours?.length) {
        setHours(null);
        setLoading(false);
        return;
      }

      const hoursPromises = buildingData.businesshours.map(async (bh) => {
        try {
          return (await businessHoursHelper.fetchBusinessHoursById(
            bh.businesshours_id
          )) as BusinessHour;
        } catch (error) {
          console.error(
            `Error fetching business hour ID ${bh.businesshours_id}`,
            error
          );
          setLoading(false);
          return null;
        }
      });

      const hoursResults = await Promise.all(hoursPromises);
      const matchedHours = hoursResults.filter(
        (hour) => hour && Object.values(hour).some((val) => val !== null)
      );

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
        const groupName = group.translations
          ? getTextFromTranslation(group.translations, language)
          : '';

        // First filter for the group
        const groupHours = matchedHours.filter(
          (hour: any) => hour.group === group.id
        );
        if (!groupHours.length) return;

        // check if the hours have a filter for active
        const groupHoursWithDateFilter = groupHours.filter((hour: any) => {
          if (hour.date_valid_from && hour.date_valid_till) {
            return (
              currentDate >= hour.date_valid_from &&
              currentDate <= hour.date_valid_till
            );
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
        const dayStartAndEndTimeDict: Record<
          string,
          { day: string; time_start: number | null; time_end: number | null }[]
        > = {};

        hoursList.forEach((entry: any) => {
          sortedDayKeys.forEach((day) => {
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
                let time_start_as_seconds =
                  parseInt(time_start_as_string.split(':')[0]) * 3600 +
                  parseInt(time_start_as_string.split(':')[1]) * 60;
                let time_end_as_seconds =
                  parseInt(time_end_as_string.split(':')[0]) * 3600 +
                  parseInt(time_end_as_string.split(':')[1]) * 60;

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

        // Step 2: Group by same time_start and time_end
        // e.g. Monday: 08:00-12:00, 11:00-14:00, 14:00-20:00 ==> 08:00-20:00
        const dayConsecutiveRanges: Record<
          string,
          { time_start: number | null; time_end: number | null }[]
        > = {};
        // Iterate over each day and its corresponding time ranges
        sortedDayKeys.forEach((day) => {
          const timeRanges = dayStartAndEndTimeDict[day];
          if (!timeRanges || timeRanges.length === 0) {
          } else {
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
            timeRanges.forEach((timeRange) => {
              const { time_start, time_end } = timeRange;
              if (
                !currentRange ||
                currentRange.time_start === null ||
                currentRange.time_end === null
              ) {
                currentRange = { time_start, time_end };
              } else {
                let isSame = false;
                let isBetween = false;
                let isExtending = false;
                let isOutside = false;
                if (
                  time_start === currentRange.time_start &&
                  time_end === currentRange.time_end
                ) {
                  isSame = true;
                  // do nothing
                } else if (time_start === null || time_end === null) {
                  // do nothing
                } else if (
                  time_start >= currentRange.time_start &&
                  time_end <= currentRange.time_end
                ) {
                  isBetween = true;
                  // do nothing
                } else if (
                  time_start < currentRange.time_end &&
                  time_end > currentRange.time_end
                ) {
                  isExtending = true;
                  currentRange.time_end = time_end;
                } else if (time_start > currentRange.time_end) {
                  isOutside = true;
                  consecutiveRanges.push(currentRange); // push the current range to the consecutive ranges
                  currentRange = { time_start, time_end }; // start a new range
                }
              }
            });
            if (currentRange) {
              consecutiveRanges.push(currentRange); // push the last range to the consecutive ranges
            }

            dayConsecutiveRanges[day] = consecutiveRanges;
          }
        });
        const groupedTimes: {
          day: string[];
          time_start: string | null;
          time_end: string | null;
        }[] = [];

        let previousSavedTimeRanges: {
          time_start: number | null;
          time_end: number | null;
        }[] = [];
        let previousDaysForTimeRange: string[] = [];
        for (let i = 0; i < sortedDayKeys.length; i++) {
          let currentDay = sortedDayKeys[i];
          let currentTimeRanges = dayConsecutiveRanges[currentDay];
          if (!currentTimeRanges || currentTimeRanges.length === 0) {
            // if we have no time ranges for this day, we can skip it
            // but we need to check if we have a previous day with time ranges and if so, we need to add it to the groupedTimes
            if (
              previousDaysForTimeRange.length > 0 &&
              previousSavedTimeRanges.length > 0
            ) {
              // we have a previous day with time ranges
              previousSavedTimeRanges.forEach((timeRange) => {
                groupedTimes.push({
                  day: previousDaysForTimeRange,
                  time_start:
                    timeRange.time_start === null
                      ? null
                      : timeRange.time_start.toString(),
                  time_end:
                    timeRange.time_end === null
                      ? null
                      : timeRange.time_end.toString(),
                });
              });
              previousSavedTimeRanges = [];
              previousDaysForTimeRange = [];
            } else {
              // Do nothing as previous day has handled the time ranges
            }
          } else {
            // So we have previous time ranges and now we want to check if the current time ranges are the same as the previous time ranges
            let isLastDay = i === sortedDayKeys.length - 1;

            let isSameTimeRange = false;

            if (currentTimeRanges.length === previousSavedTimeRanges.length) {
              currentTimeRanges.forEach((timeRange) => {
                previousSavedTimeRanges.forEach((previousTimeRange) => {
                  if (
                    timeRange.time_start === previousTimeRange.time_start &&
                    timeRange.time_end === previousTimeRange.time_end
                  ) {
                    isSameTimeRange = true;
                  }
                });
              });
            }

            if (isSameTimeRange) {
              // we have a same time range, so we can add the current day to the previous days
              previousDaysForTimeRange.push(currentDay);
            } else {
              // we have a different time range, so we need to save the previous time ranges and add the current day to the grouped times
              previousSavedTimeRanges.forEach((timeRange) => {
                groupedTimes.push({
                  day: previousDaysForTimeRange,
                  time_start:
                    timeRange.time_start === null
                      ? null
                      : timeRange.time_start.toString(),
                  time_end:
                    timeRange.time_end === null
                      ? null
                      : timeRange.time_end.toString(),
                });
              });
              previousDaysForTimeRange = [currentDay];
              previousSavedTimeRanges = currentTimeRanges;
            }

            // if we are at the last day, we need to add the previous time ranges to the grouped times
            if (isLastDay) {
              previousSavedTimeRanges.forEach((timeRange) => {
                groupedTimes.push({
                  day: previousDaysForTimeRange,
                  time_start:
                    timeRange.time_start === null
                      ? null
                      : timeRange.time_start.toString(),
                  time_end:
                    timeRange.time_end === null
                      ? null
                      : timeRange.time_end.toString(),
                });
              });
            }
          }
        }

        // Step 4: Format time_start and time_end from seconds back to HH:mm:ss
        groupedTimes.forEach((timeRange) => {
          if (timeRange.time_start === null || timeRange.time_end === null) {
            // do nothing if value is null
            return;
          }

          let time_start_in_seconds = parseInt(timeRange.time_start);
          let time_end_in_seconds = parseInt(timeRange.time_end);
          let time_start_hours = Math.floor(time_start_in_seconds / 3600);
          let time_start_minutes = Math.floor(
            (time_start_in_seconds % 3600) / 60
          );
          let time_start_seconds = time_start_in_seconds % 60;
          let time_end_hours = Math.floor(time_end_in_seconds / 3600);
          let time_end_minutes = Math.floor((time_end_in_seconds % 3600) / 60);
          let time_end_seconds = time_end_in_seconds % 60;
          timeRange.time_start = `${String(time_start_hours).padStart(
            2,
            '0'
          )}:${String(time_start_minutes).padStart(2, '0')}:${String(
            time_start_seconds
          ).padStart(2, '0')}`;
          timeRange.time_end = `${String(time_end_hours).padStart(
            2,
            '0'
          )}:${String(time_end_minutes).padStart(2, '0')}:${String(
            time_end_seconds
          ).padStart(2, '0')}`;

          timeRange.time_start = `${String(time_start_hours).padStart(
            2,
            '0'
          )}:${String(time_start_minutes).padStart(2, '0')}:${String(
            time_start_seconds
          ).padStart(2, '0')}`;
          timeRange.time_end = `${String(time_end_hours).padStart(
            2,
            '0'
          )}:${String(time_end_minutes).padStart(2, '0')}:${String(
            time_end_seconds
          ).padStart(2, '0')}`;
        });

        // Step 3: Convert grouped object back to array
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
      fetchSelectedBuilding();
    }
  }, [selectedCanteen]);

  const formatTime = (time: string | null): string =>
    time?.slice(0, 5) || 'N/A';

  const renderHours = (
    groupId: string,
    hoursData: { day: string[]; time_start: string | null; time_end: string | null }[]
  ) => {
    if (!hoursData.length) {
      return (
        <Text style={{ ...styles.body, color: theme.screen.text }}>
          {translate(TranslationKeys.no_business_hours_available)}
        </Text>
      );
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

    let renderedOuput: React.ReactNode[] = [];
    hoursData.forEach((range) => {
      let firstDayKey = range.day[0];
      let lastDayKey = range.day[range.day.length - 1];
      let firstDay = daysOfWeek.find((d) => d.key === firstDayKey);
      let lastDay = daysOfWeek.find((d) => d.key === lastDayKey);
      let label = `${firstDay?.name}`;
      if (firstDayKey !== lastDayKey) {
        label += ` - ${lastDay?.name}`;
      }
      let hoursDataKey =
        groupId + range.day.join('-') + range.time_start + range.time_end;

      let timeText = translate(TranslationKeys.closed_hours);
      if (range.time_start && range.time_end) {
        timeText = `${formatTime(range.time_start)} - ${formatTime(
          range.time_end
        )}`;
        if (range.time_start === range.time_end) {
          timeText = `${formatTime(range.time_start)}`;
        }
      }

      renderedOuput.push(
        <View key={hoursDataKey} style={styles.row}>
          <Text style={{ ...styles.body, color: theme.screen.text }}>
            {label}
          </Text>
          <Text style={{ ...styles.body, color: theme.screen.text }}>
            {timeText}
          </Text>
        </View>
      );
    });

    return renderedOuput;
  };

  return (
    <BottomSheetScrollView
      style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
      contentContainerStyle={styles.contentContainer}
    >
      <View
        style={{
          ...styles.sheetHeader,
          paddingRight: isWeb ? 10 : 0,
          paddingTop: isWeb ? 10 : 0,
        }}
      >
        <View />
        <Text
          style={{
            ...styles.sheetHeading,
            fontSize: isWeb ? (ScreenWidth <= 500 ? 16 : 24) : 24,
            color: theme.sheet.text,
          }}
        >
          {translate(TranslationKeys.businesshours)}
        </Text>
      </View>
      {loading ? (
        <View
          style={{
            height: 200,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <ActivityIndicator size={30} color={theme.screen.text} />
        </View>
      ) : (
        <>
          {hours && Object.keys(hours).length > 0 ? (
            <View
              style={{
                ...styles.hoursContainer,
                width: isWeb ? '90%' : '100%',
              }}
            >
              {getSortedBusinessHoursGroups(businessHoursGroups)
                  .filter((group) => hours[group.id])
                  .map((group) => {
                    const { name, entries } = hours[group.id];
                    return (
                        <View key={group.id} style={{ marginBottom: 20 }}>
                          <Text
                              style={{
                                ...styles.hoursHeading,
                                color: theme.sheet.text,
                                fontSize: isWeb ? (ScreenWidth <= 500 ? 18 : 24) : 24,
                              }}
                          >
                            {name}
                          </Text>
                          {renderHours(group.id, entries)}
                        </View>
                    );
                  })}
            </View>
          ) : (
            <View
              style={{
                height: 200,
                width: '100%',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Text style={{ ...styles.empty, color: theme.screen.text }}>
                {translate(TranslationKeys.no_business_hours_available)}
              </Text>
            </View>
          )}
        </>
      )}
    </BottomSheetScrollView>
  );
};

export default HourSheet;
