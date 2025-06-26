import { Text, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { CalendarSheetProps, Direction } from './types';
import { BottomSheetView } from '@gorhom/bottom-sheet';
import { isWeb } from '@/constants/Constants';
import { AntDesign } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/colorHelper';
import { SET_SELECTED_DATE } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';

const CalendarSheet: React.FC<CalendarSheetProps> = ({ closeSheet }) => {
  const { theme } = useTheme();
  const { translate } = useLanguage();
  const dispatch = useDispatch();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const {
    primaryColor,
    appSettings,
    selectedTheme: mode,
  } = useSelector((state: RootState) => state.settings);
  const { selectedDate } = useSelector((state: RootState) => state.food);
  const foods_area_color = appSettings?.foods_area_color
    ? appSettings?.foods_area_color
    : primaryColor;
  const contrastColor = myContrastColor(
    foods_area_color,
    theme,
    mode === 'dark'
  );

  const navigateMonth = (direction: 'next' | 'prev') => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(
      currentMonth.getMonth() + (direction === 'next' ? 1 : -1)
    );
    setCurrentMonth(newMonth);
  };

  LocaleConfig.locales['custom'] = {
    monthNames: [
      translate(TranslationKeys.January),
      translate(TranslationKeys.February),
      translate(TranslationKeys.March),
      translate(TranslationKeys.April),
      translate(TranslationKeys.May),
      translate(TranslationKeys.June),
      translate(TranslationKeys.July),
      translate(TranslationKeys.August),
      translate(TranslationKeys.September),
      translate(TranslationKeys.October),
      translate(TranslationKeys.November),
      translate(TranslationKeys.December),
    ],
    monthNamesShort: [
      translate(TranslationKeys.Jan),
      translate(TranslationKeys.Feb),
      translate(TranslationKeys.Mar),
      translate(TranslationKeys.Apr),
      translate(TranslationKeys.MayShort),
      translate(TranslationKeys.Jun),
      translate(TranslationKeys.Jul),
      translate(TranslationKeys.Aug),
      translate(TranslationKeys.Sep),
      translate(TranslationKeys.Oct),
      translate(TranslationKeys.Nov),
      translate(TranslationKeys.Dec),
    ],
    dayNames: [
      translate(TranslationKeys.Sun),
      translate(TranslationKeys.Mon),
      translate(TranslationKeys.Tue),
      translate(TranslationKeys.Wed),
      translate(TranslationKeys.Thu),
      translate(TranslationKeys.Fri),
      translate(TranslationKeys.Sat),
    ],
    dayNamesShort: [
      translate(TranslationKeys.Sun_S),
      translate(TranslationKeys.Mon_S),
      translate(TranslationKeys.Tue_S),
      translate(TranslationKeys.Wed_S),
      translate(TranslationKeys.Thu_S),
      translate(TranslationKeys.Fri_S),
      translate(TranslationKeys.Sat_S),
    ],
    today: translate(TranslationKeys.today),
  };

  LocaleConfig.defaultLocale = 'custom';

  return (
    <BottomSheetView
      style={{ ...styles.container, backgroundColor: theme.sheet.sheetBg }}
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
            fontSize: isWeb ? 40 : 28,
            color: theme.sheet.text,
          }}
        >
          {translate(TranslationKeys.select)} :{' '}
          {translate(TranslationKeys.date)}
        </Text>
      </View>

      <View
        style={{
          ...styles.calendarView,
          width: isWeb ? '90%' : '100%',
          marginTop: isWeb ? 40 : 20,
        }}
      >
        <Calendar
          key={currentMonth.toISOString()}
          style={styles.calendar}
          current={currentMonth.toISOString().split('T')[0]}
          onDayPress={(day: any) => {
            dispatch({
              type: SET_SELECTED_DATE,
              payload: day.dateString,
            });
            closeSheet();
          }}
          markedDates={{
            [selectedDate]: {
              selected: true,
              disableTouchEvent: true,
              selectedDotColor: foods_area_color,
            },
          }}
          renderArrow={(direction: Direction) => (
            <TouchableOpacity
              style={{
                ...styles.calendarAction,
                backgroundColor: theme.screen.iconBg,
              }}
              onPress={() =>
                navigateMonth(direction === 'left' ? 'prev' : 'next')
              }
            >
              <AntDesign
                name={direction === 'left' ? 'arrowleft' : 'arrowright'}
                size={20}
                color={foods_area_color}
              />
            </TouchableOpacity>
          )}
          onMonthChange={(month: any) => {
            setCurrentMonth(new Date(month.year, month.month - 1));
          }}
          hideExtraDays
          theme={{
            backgroundColor: 'black',
            calendarBackground: theme.sheet.sheetBg,
            textSectionTitleColor: theme.screen.text,
            selectedDayBackgroundColor: foods_area_color,
            selectedDayTextColor: contrastColor,
            todayTextColor: foods_area_color,
            monthTextColor: theme.screen.text,
            dayTextColor: theme.screen.text,
            textDisabledColor: 'gray',
            arrowColor: foods_area_color,
            disabledArrowColor: 'gray',
            textDayFontFamily: 'Poppins_400Regular',
            textMonthFontFamily: 'Poppins_400Regular',
            textDayHeaderFontFamily: 'Poppins_400Regular',
            textDayFontSize: 16,
            textMonthFontSize: 18,
            textDayHeaderFontSize: 14,
          }}
        />
      </View>
    </BottomSheetView>
  );
};

export default CalendarSheet;
