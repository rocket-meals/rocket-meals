import { Text, TextInput, View } from 'react-native';
import React, { useMemo, useState } from 'react';
import styles from './styles';
import { useTheme } from '@/hooks/useTheme';
import { CalendarSheetProps } from './types';
import MyScrollViewModal from '@/components/MyScrollViewModal';
import { isWeb } from '@/constants/Constants';
import { useDispatch } from 'react-redux';
import { useAppSelector } from '@/redux/hooks';
import { useLanguage } from '@/hooks/useLanguage';
import { SET_SELECTED_DATE } from '@/redux/Types/types';
import { TranslationKeys } from '@/locales/keys';
import { StringHelper } from 'repo-depkit-common';
import CollectibleSpot from '@/components/CollectibleItem/CollectibleSpot';
import { CollectibleAt } from 'repo-depkit-common';
import { format, isValid, parse } from 'date-fns';
import { MyCalendar, MyCalendarLocaleConfig } from 'repo-depkit-common-ui';

export const CalendarSheetContent: React.FC<CalendarSheetProps> = ({ closeSheet, onSelect, selectedDateProp, updateGlobal }) => {
    const { theme } = useTheme();
    const { translate } = useLanguage();
    const dispatch = useDispatch();
    const [manualDate, setManualDate] = useState('');
    const [manualError, setManualError] = useState('');
    const { primaryColor, appSettings, selectedTheme: mode, firstDayOfTheWeek } = useAppSelector((state) => state.settings);
    const { selectedDate } = useAppSelector((state) => state.food);
    const foods_area_color = appSettings?.foods_area_color ? appSettings?.foods_area_color : primaryColor;

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

    const formatManualInput = (value: string) => {
        const digitsOnly = StringHelper.replaceAllWithOptions({ str: value, find: '\\D', replace: '' }).slice(0, 8);
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
            dispatch({
                type: SET_SELECTED_DATE,
                payload: formatted,
            });
        }
        setManualError('');
        closeSheet();
    };

    const handleDaySelect = (dateString: string) => {
        if (onSelect) {
            onSelect(dateString);
        } else if (updateGlobal) {
            dispatch({
                type: SET_SELECTED_DATE,
                payload: dateString,
            });
        }
        closeSheet();
    };

    const localeConfig: MyCalendarLocaleConfig = useMemo(() => ({
        monthNames: [translate(TranslationKeys.January), translate(TranslationKeys.February), translate(TranslationKeys.March), translate(TranslationKeys.April), translate(TranslationKeys.May), translate(TranslationKeys.June), translate(TranslationKeys.July), translate(TranslationKeys.August), translate(TranslationKeys.September), translate(TranslationKeys.October), translate(TranslationKeys.November), translate(TranslationKeys.December)],
        monthNamesShort: [translate(TranslationKeys.Jan), translate(TranslationKeys.Feb), translate(TranslationKeys.Mar), translate(TranslationKeys.Apr), translate(TranslationKeys.MayShort), translate(TranslationKeys.Jun), translate(TranslationKeys.Jul), translate(TranslationKeys.Aug), translate(TranslationKeys.Sep), translate(TranslationKeys.Oct), translate(TranslationKeys.Nov), translate(TranslationKeys.Dec)],
        dayNames: [translate(TranslationKeys.Sun), translate(TranslationKeys.Mon), translate(TranslationKeys.Tue), translate(TranslationKeys.Wed), translate(TranslationKeys.Thu), translate(TranslationKeys.Fri), translate(TranslationKeys.Sat)],
        dayNamesShort: [translate(TranslationKeys.Sun_S), translate(TranslationKeys.Mon_S), translate(TranslationKeys.Tue_S), translate(TranslationKeys.Wed_S), translate(TranslationKeys.Thu_S), translate(TranslationKeys.Fri_S), translate(TranslationKeys.Sat_S)],
        today: translate(TranslationKeys.today),
    }), [translate]);

    const effectiveSelectedDate = selectedDateProp ?? selectedDate;

    return (
        <>
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
                <MyCalendar
                    selectedDate={effectiveSelectedDate}
                    onSelect={handleDaySelect}
                    accentColor={foods_area_color}
                    firstDay={firstDay}
                    localeConfig={localeConfig}
                    localeKey="frontend-custom"
                    markedDates={{
                        [effectiveSelectedDate]: {
                            disableTouchEvent: true,
                        },
                    }}
                />
                <CollectibleSpot collectibleKey={CollectibleAt.collectible_at_foodoffers_select_date} />
            </View>
        </>
    );
};

const CalendarSheet: React.FC<CalendarSheetProps> = (props) => {
    const { translate } = useLanguage();
    return (
        <MyScrollViewModal
            title={`${translate(TranslationKeys.select)} : ${translate(TranslationKeys.date)}`}
            closeSheet={props.closeSheet}
        >
            <CalendarSheetContent {...props} />
        </MyScrollViewModal>
    );
};

export default CalendarSheet;
