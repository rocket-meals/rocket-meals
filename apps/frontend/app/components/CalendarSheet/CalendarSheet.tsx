import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import React, { useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { CalendarSheetProps, Direction } from './types';
import MyScrollViewModal from '@/components/MyScrollViewModal';
import { isWeb } from '@/constants/Constants';
import { Entypo } from '@expo/vector-icons';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { useDispatch, useSelector } from 'react-redux';
import { useLanguage } from '@/hooks/useLanguage';
import { myContrastColor } from '@/helper/ColorHelper';
import { SET_HAS_USER_SELECTED_DATE, SET_SELECTED_DATE } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { RootState } from '@/redux/reducer';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';
import { format, isValid, parse } from 'date-fns';

const CalendarSheet: React.FC<CalendarSheetProps> = ({ closeSheet, onSelect, selectedDateProp, updateGlobal }) => {
    const { theme } = useTheme();
    const { translate } = useLanguage();
    const dispatch = useDispatch();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [manualDate, setManualDate] = useState('');
    const [manualError, setManualError] = useState('');
    const { primaryColor, appSettings, selectedTheme: mode, firstDayOfTheWeek } = useSelector((state: RootState) => state.settings);
    const { selectedDate } = useSelector((state: RootState) => state.food);
    const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;
    const contrastColor = myContrastColor(foods_area_color, theme, mode === 'dark');

    const weekStartMap: Record<string, number> = {
        monday: 1,
        tuesday: 2,
        wednesday: 3,
        thursday: 4,
        friday: 5,
        saturday: 6,
        sunday: 0,
    };
    const firstDay = weekStartMap[firstDayOfTheWeek?.id] ?? 1;

    const navigateMonth = (direction: 'next' | 'prev') => {
        const newMonth = new Date(currentMonth);
        newMonth.setMonth(currentMonth.getMonth() + (direction === 'next' ? 1 : -1));
        setCurrentMonth(newMonth);
    };

    const formatManualInput = (value: string) => {
        const digitsOnly = value.replace(/\D/g, '').slice(0, 8);
        const day = digitsOnly.slice(0, 2);
        const month = digitsOnly.slice(2, 4);
        const year = digitsOnly.slice(4, 8);
        let formatted = day;
        if (month.length > 0) {
            formatted = `${formatted}.${month}`;
        }
        if (year.length > 0) {
            formatted = `${formatted}.${year}`;
        }
        return formatted;
    };

    const parseManualDate = (value: string) => {
        const trimmed = value.trim();
        if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) {
            const parsed = parse(trimmed, 'dd.MM.yyyy', new Date());
            return isValid(parsed) ? parsed : null;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const parsed = parse(trimmed, 'yyyy-MM-dd', new Date());
            return isValid(parsed) ? parsed : null;
        }
        return null;
    };

    const handleManualSubmit = () => {
        const parsed = parseManualDate(manualDate);
        if (!parsed) {
            setManualError('Invalid date format (e.g., DD.MM.YYYY)');
            return;
        }
        const formatted = format(parsed, 'yyyy-MM-dd');
        if (onSelect) {
            onSelect(formatted);
        } else if (updateGlobal) {
            dispatch({ type: SET_HAS_USER_SELECTED_DATE, payload: true });
            dispatch({
                type: SET_SELECTED_DATE,
                payload: formatted,
            });
        }
        setManualError('');
        closeSheet();
    };

    LocaleConfig.locales['custom'] = {
        monthNames: [translate(TranslationKeys.January), translate(TranslationKeys.February), translate(TranslationKeys.March), translate(TranslationKeys.April), translate(TranslationKeys.May), translate(TranslationKeys.June), translate(TranslationKeys.July), translate(TranslationKeys.August), translate(TranslationKeys.September), translate(TranslationKeys.October), translate(TranslationKeys.November), translate(TranslationKeys.December)],
        monthNamesShort: [translate(TranslationKeys.Jan), translate(TranslationKeys.Feb), translate(TranslationKeys.Mar), translate(TranslationKeys.Apr), translate(TranslationKeys.MayShort), translate(TranslationKeys.Jun), translate(TranslationKeys.Jul), translate(TranslationKeys.Aug), translate(TranslationKeys.Sep), translate(TranslationKeys.Oct), translate(TranslationKeys.Nov), translate(TranslationKeys.Dec)],
        dayNames: [translate(TranslationKeys.Sun), translate(TranslationKeys.Mon), translate(TranslationKeys.Tue), translate(TranslationKeys.Wed), translate(TranslationKeys.Thu), translate(TranslationKeys.Fri), translate(TranslationKeys.Sat)],
        dayNamesShort: [translate(TranslationKeys.Sun_S), translate(TranslationKeys.Mon_S), translate(TranslationKeys.Tue_S), translate(TranslationKeys.Wed_S), translate(TranslationKeys.Thu_S), translate(TranslationKeys.Fri_S), translate(TranslationKeys.Sat_S)],
        today: translate(TranslationKeys.today),
    };

    LocaleConfig.defaultLocale = 'custom';

    return (
        <MyScrollViewModal
            title={`${translate(TranslationKeys.select)} : ${translate(TranslationKeys.date)}`}
            closeSheet={closeSheet}
        >
            <View style={styles.manualInputWrapper}>
                <TextInput
                    style={[
                        styles.manualInput,
                        {
                            color: theme.screen.text,
                            backgroundColor: theme.sheet.inputBg,
                            borderColor: manualError ? theme.sheet.inputBorderInvalid : theme.sheet.inputBg,
                        },
                    ]}
                    cursorColor={theme.screen.text}
                    placeholderTextColor={theme.sheet.placeholder}
                    placeholder="DD.MM.YYYY"
                    value={manualDate}
                    onChangeText={text => {
                        setManualDate(formatManualInput(text));
                        if (manualError) setManualError('');
                    }}
                    onSubmitEditing={handleManualSubmit}
                    returnKeyType="done"
                    returnKeyLabel={translate(TranslationKeys.done)}
                    keyboardType="number-pad"
                    inputMode="numeric"
                />
                {manualError ? <Text style={[styles.manualErrorText, { color: theme.sheet.inputBorderInvalid }]}>{manualError}</Text> : null}
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
                    firstDay={firstDay}
                    current={currentMonth.toISOString().split('T')[0]}
                    onDayPress={(day: any) => {
                        if (onSelect) {
                            console.log('[CalendarSheet] onDayPress -> using onSelect callback', day.dateString);
                            onSelect(day.dateString);
                        } else if (updateGlobal) {
                            console.log('[CalendarSheet] onDayPress -> updating global selectedDate', day.dateString);
                            dispatch({ type: SET_HAS_USER_SELECTED_DATE, payload: true });
                            dispatch({
                                type: SET_SELECTED_DATE,
                                payload: day.dateString,
                            });
                        } else {
                            console.log('[CalendarSheet] onDayPress -> neither onSelect nor updateGlobal provided, doing nothing for', day.dateString);
                        }
                        closeSheet();
                    }}
                    markedDates={{
                        [selectedDateProp ? selectedDateProp : selectedDate]: {
                            selected: true,
                            disableTouchEvent: true,
                            selectedColor: foods_area_color,
                        },
                    }}
                    renderArrow={(direction: Direction) => (
                        <TouchableOpacity
                            style={{
                                ...styles.calendarAction,
                                backgroundColor: foods_area_color,
                            }}
                            onPress={() => navigateMonth(direction === 'left' ? 'prev' : 'next')}
                        >
                            <Entypo name={direction === 'left' ? 'chevron-left' : 'chevron-right'} size={20} color={contrastColor} />
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
                        arrowColor: contrastColor,
                        disabledArrowColor: 'gray',
                        textDayFontFamily: 'Poppins_400Regular',
                        textMonthFontFamily: 'Poppins_400Regular',
                        textDayHeaderFontFamily: 'Poppins_400Regular',
                        textDayFontSize: 16,
                        textMonthFontSize: 18,
                        textDayHeaderFontSize: 14,
                    }}
                />
                <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers_select_date} />
            </View>
        </MyScrollViewModal>
    );
};

export default CalendarSheet;
