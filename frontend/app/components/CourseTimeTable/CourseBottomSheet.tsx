import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import {
  AntDesign,
  FontAwesome5,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { days } from '../../constants/SettingData';
import FirstDayOfWeek from '../../components/FirstDay/FirstDayOfWeek';
import { BaseCourseTimetableEvent, CourseBottomSheetProps } from './types';
import styles from './styles';
import { isWeb } from '@/constants/Constants';
import { useTheme } from '@/hooks/useTheme';
import { ProfileHelper } from '@/redux/actions/Profile/Profile';
import { UPDATE_PROFILE } from '@/redux/Types/types';
import { colorData } from './constant';
import TimeTableData from '@/constants/TimeTable';
import useToast from '@/hooks/useToast';
import { isBefore, isEqual, parse } from 'date-fns';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/colorHelper';
import { TranslationKeys } from '@/locales/keys';
import { Profiles } from '@/constants/types';
import { RootState } from '@/redux/reducer';

const CourseBottomSheet: React.FC<CourseBottomSheetProps> = ({
  timeTableData,
  closeSheet,
  isUpdate,
  selectedEventId,
}) => {
  const { theme } = useTheme();
  const toast = useToast();
  const dispatch = useDispatch();
  const { translate } = useLanguage();
  const profileHelper = new ProfileHelper();
  const { profile } = useSelector((state: RootState) => state.authReducer);
  const [loading, setLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const {
    primaryColor,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);

  const [selectedFirstDay, setSelectedFirstDay] = useState({
    id: 'Monday',
    name: 'Mon',
  });
  const [windowWidth, setWindowWidth] = useState<number>(
    Dimensions.get('window').width
  );
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [data, setData] = useState<any[]>(timeTableData);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');

  useEffect(() => {
    if (isUpdate && timeTableData) {
      setData(timeTableData);
    }
  }, [timeTableData, isUpdate]);

  useEffect(() => {
    const onChange = ({ window }: { window: any }) => {
      setWindowWidth(window.width);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => {
      subscription.remove();
    };
  }, []);

  const course_timetable_area_color = appSettings?.course_timetable_area_color
    ? appSettings?.course_timetable_area_color
    : primaryColor;
  const contrastColor = myContrastColor(
    course_timetable_area_color,
    theme,
    mode === 'dark'
  );
  const SheetClose = () => {
    closeSheet();
    setSelectedItem(null);
  };

  const cancleSheet = () => {
    setSelectedItem(null);
  };

  const handleSavePress = () => {
    // Function to validate HH:MM format
    const validateTime = (time: string) => {
      const regex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/; // Regex for HH:MM format
      return regex.test(time);
    };

    if (selectedItem) {
      if (
        selectedItem?.label !== 'title' &&
        selectedItem?.label !== 'location'
      ) {
        if (!validateTime(inputValue)) {
          // Show a toast for invalid time
          toast('Please enter time in HH:MM format (e.g., 08:30)', 'error');

          return; // Prevent saving if time is invalid
        }
      }

      // Update the data if time is valid
      setData((prevData) =>
        prevData.map((item) =>
          item.id === selectedItem.id ? { ...item, value: inputValue } : item
        )
      );
      setSelectedItem(null);
      setInputValue('');
    }
  };

  const handleItemPress = (item: any) => {
    setSelectedItem(item);
    setInputValue(item.value || '');
  };

  const handleDaySelect = (selectedDayId: string, selectedDayName: string) => {
    setSelectedFirstDay({ id: selectedDayId, name: selectedDayName });

    setData((prevData) =>
      prevData.map((item) =>
        item.label === 'weekday'
          ? { ...item, value: { id: selectedDayId, name: selectedDayName } }
          : item
      )
    );
    setSelectedItem(null);
  };

  const handleColorPress = (selectedColor: string) => {
    setSelectedColor(selectedColor);

    setData((prevData) =>
      prevData.map((item) =>
        item.label === 'color' ? { ...item, value: selectedColor } : item
      )
    );
    setSelectedItem(null);
  };

  const handleSaveTimeTable = async () => {
    setLoading(true);

    // Fetch start and end time
    const startTime =
      data?.find((item) => item.label === 'startTime')?.value || '';
    const endTime = data?.find((item) => item.label === 'endTime')?.value || '';

    // Function to validate and parse time
    const parseTime = (time: string) => {
      return parse(time, 'HH:mm', new Date());
    };

    const startTimeParsed = parseTime(startTime);
    const endTimeParsed = parseTime(endTime);

    // Check if start time is greater than or equal to end time
    if (
      !isBefore(startTimeParsed, endTimeParsed) ||
      isEqual(startTimeParsed, endTimeParsed)
    ) {
      toast('Start time must be earlier than End time.', 'error');

      setLoading(false);
      return; // Prevent saving if times are invalid
    }

    let courseTimetable = profile?.course_timetable
      ? profile?.course_timetable
      : {};
    const id =
      Object.keys(courseTimetable)?.length > 0
        ? (Object.keys(courseTimetable).length + 1).toString()
        : '1';
    const newTimetable: BaseCourseTimetableEvent = {
      id: id,
      title: data?.find((item) => item.label === 'title')?.value,
      location: data?.find((item) => item.label === 'location')?.value,
      color: data?.find((item) => item.label === 'color')?.value,
      start: startTime,
      end: endTime,
      weekday: data?.find((item) => item.label === 'weekday')?.value || '',
    };

    courseTimetable[id] = newTimetable;
    const updatedTimetableString = courseTimetable;

    if (profile?.id) {
      const result = (await profileHelper.updateProfile({
        ...profile,
        course_timetable: updatedTimetableString,
      })) as Profiles;
      if (result) {
        dispatch({
          type: UPDATE_PROFILE,
          payload: result,
        });
      }
    } else {
      dispatch({
        type: UPDATE_PROFILE,
        payload: { ...profile, course_timetable: updatedTimetableString },
      });
    }

    setData(() => TimeTableData(theme).map((item) => ({ ...item })));
    setLoading(false);
    closeSheet();
  };

  const handleDeleteTimeTable = async () => {
    setIsDeleting(true);
    let courseTimetable = profile?.course_timetable || {};
    if (courseTimetable) {
      delete courseTimetable[Number(selectedEventId)];
      if (profile?.id) {
        const result = (await profileHelper.updateProfile({
          ...profile,
          course_timetable: courseTimetable,
        })) as Profiles;
        if (result) {
          dispatch({
            type: UPDATE_PROFILE,
            payload: result,
          });
        }
      } else {
        dispatch({
          type: UPDATE_PROFILE,
          payload: {
            ...profile,
            course_timetable: courseTimetable,
          },
        });
      }

      setData(() => TimeTableData(theme).map((item) => ({ ...item })));
      setIsDeleting(false);
      closeSheet();
    }
  };

  const handleUpdateTimeTable = async () => {
    setLoading(true);

    // Fetch start and end time
    const startTime =
      data?.find((item) => item.label === 'startTime')?.value || '';
    const endTime = data?.find((item) => item.label === 'endTime')?.value || '';

    // Function to validate and parse time
    const parseTime = (time: string) => {
      return parse(time, 'HH:mm', new Date());
    };

    const startTimeParsed = parseTime(startTime);
    const endTimeParsed = parseTime(endTime);

    // Check if start time is greater than or equal to end time
    if (
      !isBefore(startTimeParsed, endTimeParsed) ||
      isEqual(startTimeParsed, endTimeParsed)
    ) {
      toast('Start time must be earlier than End time.', 'error');

      setLoading(false);
      return; // Prevent saving if times are invalid
    }
    let courseTimetable = profile?.course_timetable || {};
    if (courseTimetable) {
      const prevEvent = courseTimetable[Number(selectedEventId)];
      if (prevEvent) {
        const newEvent: BaseCourseTimetableEvent = {
          id: prevEvent?.id,
          title: data?.find((item) => item.label === 'title')?.value,
          location: data?.find((item) => item.label === 'location')?.value,
          color: data?.find((item) => item.label === 'color')?.value,
          start: startTime,
          end: endTime,
          weekday: data?.find((item) => item.label === 'weekday')?.value || '',
        };
        courseTimetable[Number(selectedEventId)] = newEvent;
        if (profile?.id) {
          const result = (await profileHelper.updateProfile({
            ...profile,
            course_timetable: courseTimetable,
          })) as Profiles;
          if (result) {
            dispatch({
              type: UPDATE_PROFILE,
              payload: result,
            });
          }
        } else {
          dispatch({
            type: UPDATE_PROFILE,
            payload: {
              ...profile,
              course_timetable: courseTimetable,
            },
          });
        }

        setData(() => TimeTableData(theme).map((item) => ({ ...item })));
        setLoading(false);
        closeSheet();
      }
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          ...styles.sheetHeader,
        }}
      >
        <View />
        <Text
          style={{
            ...styles.sheetHeading,
            maxWidth: '70%',
            textAlign: 'center',
            fontSize: windowWidth > 800 ? 40 : 20,
            color: theme.sheet.text,
          }}
        >
          {selectedItem
            ? selectedItem.label
            : isUpdate
            ? `${translate(TranslationKeys.event)}: ${translate(
                TranslationKeys.edit
              )}`
            : `${translate(TranslationKeys.event)}: ${translate(
                TranslationKeys.create
              )}`}
        </Text>
      </View>

      <BottomSheetScrollView
        style={{ ...styles.sheetView, backgroundColor: theme.sheet.sheetBg }}
        contentContainerStyle={styles.contentContainer}
      >
        {selectedItem ? (
          selectedItem.label === 'color' ? (
            <View
              style={{
                width: '90%',
                display: 'flex',
                justifyContent: 'center',
                alignSelf: 'center',
              }}
            >
              <View style={styles.weekdayView}>
                {colorData.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleColorPress(color)}
                    style={[
                      styles.box,
                      {
                        width: isWeb ? 200 : '30%',
                        backgroundColor: color,
                      },
                    ]}
                  ></TouchableOpacity>
                ))}
              </View>
            </View>
          ) : selectedItem.label === 'weekday' ? (
            <View style={styles.languageContainer}>
              {days.map((firstDay) => (
                <FirstDayOfWeek
                  key={firstDay.id}
                  position={firstDay}
                  isSelected={selectedFirstDay.name === firstDay.name}
                  onPress={() => handleDaySelect(firstDay.id, firstDay.name)}
                />
              ))}
            </View>
          ) : (
            <View style={styles.titleBt}>
              <TextInput
                style={styles.input}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder={'Enter a value'}
                autoFocus
              />

              <View style={[styles.buttonContainer]}>
                <TouchableOpacity
                  onPress={cancleSheet}
                  style={{
                    ...styles.cancelButton,
                    borderColor: course_timetable_area_color,
                  }}
                >
                  <Text
                    style={[styles.buttonText, { color: theme.screen.text }]}
                  >
                    {translate(TranslationKeys.cancel)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSavePress}
                  style={{
                    ...styles.saveButton,
                    backgroundColor: course_timetable_area_color,
                  }}
                >
                  <Text style={[styles.buttonText, { color: contrastColor }]}>
                    {translate(TranslationKeys.save)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          <View>
            {data.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={{
                  ...styles.list,
                  paddingHorizontal: isWeb ? 20 : 10,
                }}
                onPress={() => handleItemPress(item)}
              >
                <View style={{ ...styles.col, gap: isWeb ? 10 : 5 }}>
                  {React.cloneElement(item.leftIcon, {
                    color: theme.screen.text,
                  })}
                  <Text
                    style={{
                      ...styles.label,
                      color: theme.screen.text,
                      fontSize: windowWidth > 500 ? 16 : 13,
                      marginTop: isWeb ? 0 : 2,
                    }}
                  >
                    {translate(item.label)}
                  </Text>
                </View>
                <View
                  style={{
                    ...styles.col,
                    gap: isWeb ? 10 : 5,
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {item.value && (
                    <Text
                      style={{
                        ...styles.value,
                        color: theme.screen.text,
                        fontSize: windowWidth > 500 ? 16 : 13,
                        marginTop: isWeb ? 0 : 2,
                      }}
                    >
                      {item.label === 'weekday'
                        ? translate(item?.value?.name)
                        : item.value}
                    </Text>
                  )}
                  {React.cloneElement(item.rightIcon, {
                    color: theme.screen.text,
                  })}
                </View>
              </TouchableOpacity>
            ))}
            <View style={styles.saveButtons}>
              {isUpdate && (
                <TouchableOpacity
                  style={{
                    ...styles.createButton,
                    backgroundColor: 'red',
                  }}
                  onPress={handleDeleteTimeTable}
                >
                  {isDeleting ? (
                    <ActivityIndicator size='small' color={theme.screen.text} />
                  ) : (
                    <>
                      <MaterialCommunityIcons
                        name='delete'
                        size={20}
                        color={theme.activeText}
                      />
                      <View>
                        <Text
                          style={{
                            ...styles.createButtonText,
                            color: theme.activeText,
                          }}
                        >
                          {translate(TranslationKeys.delete)}
                        </Text>
                      </View>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{
                  ...styles.createButton,
                  backgroundColor: course_timetable_area_color,
                }}
                onPress={isUpdate ? handleUpdateTimeTable : handleSaveTimeTable}
              >
                {loading ? (
                  <ActivityIndicator size='small' color={theme.screen.text} />
                ) : (
                  <>
                    <FontAwesome5 name='save' size={20} color={contrastColor} />
                    <View>
                      <Text
                        style={{
                          ...styles.createButtonText,
                          color: contrastColor,
                        }}
                      >
                        {translate(TranslationKeys.save)}
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </BottomSheetScrollView>
    </View>
  );
};

export default CourseBottomSheet;
