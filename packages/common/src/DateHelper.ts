import { StringHelper } from './StringHelper';
import moment from 'moment-timezone';

export enum Weekday {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export type FoodofferDateType = {
  year: number;
  month: number;
  day: number;
};

export type MySimpleDate = {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
  seconds: number;
  milliseconds: number;
};

export enum DateHelperTimezone {
  GERMANY = 'Europe/Berlin',
}

export class DateHelper {
  static Weekday = Weekday;

  static isWeekend(date: Date) {
    const weekday = date.getDay();
    return weekday === 0 || weekday === 6; // 0 is sunday, 6 is saturday
  }

  static isValidDateString(dateString: string | undefined | null) {
    if (!dateString) {
      return false;
    }
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date.getTime());
  }

  static parseTime(time: string, date?: Date): Date {
    const parts = time.split(':');

    const hours = parseInt(parts[0] || '0');
    const minutes = parseInt(parts[1] || '0');
    const seconds = parseInt(parts[2] || '0');
    if (!date) {
      date = new Date(); // create a new date object
    } else {
      date = new Date(date); // clone
    }
    date.setHours(hours);
    date.setMinutes(minutes);
    date.setSeconds(seconds);
    return date;
  }

  static getWeekdayEnumsValues(firstDayOfWeek?: Weekday): Weekday[] {
    const useFirstDayOfWeek = firstDayOfWeek || Weekday.MONDAY;

    const weekOrder = [Weekday.SUNDAY, Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY];
    let index = DateHelper.getWeekdayIndex(useFirstDayOfWeek);
    const output: Weekday[] = [];
    for (let i = 0; i < 7; i++) {
      let weekdayEnum = weekOrder[index];
      if (!!weekdayEnum) {
        output.push(weekdayEnum);
      }
      index++;
      if (index >= weekOrder.length) {
        index = 0;
      }
    }
    return output;
  }

  /**
   * Returns the weekday of the given date as a number. It starts with 0 for sunday and ends with 6 for saturday.
   * Calculates modulo 7 to ensure that the number is between 0 and 6.
   * @param weekdayNumber
   */
  static getWeekdayByIndex(weekdayNumber: number): Weekday {
    const modulo = weekdayNumber % 7;
    const enumValues = DateHelper.getWeekdayEnumsValues();
    for (let i = 0; i < enumValues.length; i++) {
      const weekdayEnum = enumValues[i];
      if (!!weekdayEnum) {
        const weekdayIndex = DateHelper.getWeekdayIndex(weekdayEnum);
        if (weekdayIndex === modulo) {
          return weekdayEnum;
        }
      }
    }
    return Weekday.MONDAY;
  }

  static getWeekdayNames(locale?: string, firstDayOfWeek?: Weekday, short?: boolean) {
    const currentWeekDates = DateHelper.getCurrentWeekDates(undefined, firstDayOfWeek);
    const output = [];
    for (const date of currentWeekDates) {
      output.push(DateHelper.getWeekdayNameByDate(date, locale, short));
    }
    return output;
  }

  static getPreviousMonday(date: Date) {
    let tempDate = new Date(date);
    while (tempDate.getDay() != DateHelper.getWeekdayIndex(Weekday.MONDAY)) {
      tempDate.setDate(tempDate.getDate() - 1);
    }
    return tempDate;
  }

  static getFirstMondayOfYear(): Date {
    let tempDate = new Date();
    const JANUARY = 0;
    tempDate.setMonth(JANUARY);
    tempDate.setDate(1); // first day of month
    while (tempDate.getDay() != DateHelper.getWeekdayIndex(Weekday.MONDAY)) {
      tempDate.setDate(tempDate.getDate() + 1);
    }
    return tempDate;
  }

  static getWeekdayIndex(weekday: Weekday) {
    switch (weekday) {
      case Weekday.SUNDAY:
        return 0;
      case Weekday.MONDAY:
        return 1;
      case Weekday.TUESDAY:
        return 2;
      case Weekday.WEDNESDAY:
        return 3;
      case Weekday.THURSDAY:
        return 4;
      case Weekday.FRIDAY:
        return 5;
      case Weekday.SATURDAY:
        return 6;
    }
  }

  static getWeekdayDifference(from: Weekday, to: Weekday) {
    const fromIndex = DateHelper.getWeekdayIndex(from);
    const toIndex = DateHelper.getWeekdayIndex(to);
    const difference = toIndex - fromIndex;
    return difference;
  }

  static getWeekdayByDayNumber(dayNumber: number) {
    const enumValues = DateHelper.getWeekdayEnumsValues();
    return enumValues[dayNumber % enumValues.length];
  }

  static getWeekdayToday() {
    return DateHelper.getWeekdayByDate(new Date());
  }

  static getWeekdayByDate(date: Date) {
    const weekdayIndex = date.getDay();
    const weekdayEnums = DateHelper.getWeekdayEnumsValues();
    const indexToWeekdayEnum: { [index: number]: Weekday } = {};
    for (let i = 0; i < weekdayEnums.length; i++) {
      const weekdayEnum = weekdayEnums[i];
      if (!!weekdayEnum) {
        const weekdayEnumIndex = DateHelper.getWeekdayIndex(weekdayEnum);
        indexToWeekdayEnum[weekdayEnumIndex] = weekdayEnum;
      }
    }

    return indexToWeekdayEnum[weekdayIndex];
  }

  static getWeekdayNamesFirstLetters(locale?: string, firstDayOfWeek?: Weekday) {
    const weekdayNames = DateHelper.getWeekdayNames(locale, firstDayOfWeek, true);
    const output = [];
    for (const weekdayName of weekdayNames) {
      output.push(weekdayName[0]);
    }
    return output;
  }

  static getCurrentWeekDates(date?: Date, firstDayOfWeek?: Weekday) {
    const firstDateOfWeek = DateHelper.getFirstDateOfWeek(undefined, firstDayOfWeek);
    const output = [];
    for (let i = 0; i < 7; i++) {
      output.push(new Date(firstDateOfWeek));
      firstDateOfWeek.setDate(firstDateOfWeek.getDate() + 1);
    }
    return output;
  }

  static getDefaultWeekdayDate(weekdayName: Weekday): Date {
    if (!weekdayName) {
      weekdayName = Weekday.MONDAY;
    }

    const date_monday = new Date().setFullYear(1995, 11, 25);
    const date_tuesday = new Date().setFullYear(1995, 11, 26);
    const date_wednesday = new Date().setFullYear(1995, 11, 27);
    const date_thursday = new Date().setFullYear(1995, 11, 28);
    const date_friday = new Date().setFullYear(1995, 11, 29);
    const date_saturday = new Date().setFullYear(1995, 11, 30);
    const date_sunday = new Date().setFullYear(1995, 11, 31);

    switch (weekdayName) {
      case Weekday.MONDAY:
        return new Date(date_monday);
      case Weekday.TUESDAY:
        return new Date(date_tuesday);
      case Weekday.WEDNESDAY:
        return new Date(date_wednesday);
      case Weekday.THURSDAY:
        return new Date(date_thursday);
      case Weekday.FRIDAY:
        return new Date(date_friday);
      case Weekday.SATURDAY:
        return new Date(date_saturday);
      case Weekday.SUNDAY:
        return new Date(date_sunday);
      default:
        return DateHelper.getDefaultWeekdayDate(Weekday.MONDAY);
    }
  }

  static getWeekdayTranslationByWeekday(weekdayName: Weekday, locale?: string): string {
    const date = DateHelper.getDefaultWeekdayDate(weekdayName);
    return DateHelper.getWeekdayNameByDate(date, locale);
  }

  static getWeekdayNameByDate(date: Date, locale?: string, short?: boolean) {
    if (!locale) {
      locale = 'en';
    }
    let weekdayOption: 'long' | 'short' | 'narrow' | undefined = 'long';
    if (short) {
      weekdayOption = 'short';
    }
    const weekdayName = date.toLocaleString(locale, { weekday: weekdayOption });
    return StringHelper.capitalizeFirstLetter(weekdayName);
  }

  static getMonthName(date: Date, locale?: string) {
    if (!locale) {
      locale = 'en';
    }
    return date.toLocaleString(locale, { month: 'long' });
  }

  static getAmountDaysFromLastMonthForWeekstart(date: Date, firstDayOfWeek: Weekday) {
    const firstDayOfMonth = DateHelper.getFirstDayOfMonth(date);
    const weekDateOfFirstDayOfMonth = firstDayOfMonth.getDay(); // e. G. 6 for thursday
    const firstDayOfWeekIndex = DateHelper.getWeekdayIndex(firstDayOfWeek);
    // firstDayOfWeek e. G. 1 for monday
    // firstDay of month e. G. saturday 01.10.2022
    // weekDateOfFirstDayOfMonth e. G. 6
    // 7+ (6 - 1) = 5
    const diffToStartWithFirstDayOfWeek = (7 + (weekDateOfFirstDayOfMonth - firstDayOfWeekIndex)) % 7;
    return diffToStartWithFirstDayOfWeek;
  }

  static getAmountDaysInMonth(date: Date) {
    const lastDayOfMonth = DateHelper.getLastDayOfMonth(date);
    return lastDayOfMonth.getDate();
  }

  static getLastDayOfMonth(date: Date) {
    const lastDayInMonth = DateHelper.getFirstDayOfNextMonth(date);
    lastDayInMonth.setDate(lastDayInMonth.getDate() - 1);
    return lastDayInMonth;
  }

  static getFirstDateOfWeek(date?: Date, firstDayOfWeek?: Weekday) {
    const temp = date ? new Date(date) : new Date();
    const useFirstDayOfWeek = firstDayOfWeek || Weekday.MONDAY;
    let firstDayOfWeekIndex = DateHelper.getWeekdayIndex(useFirstDayOfWeek);
    if (firstDayOfWeek === undefined || firstDayOfWeek === null) {
      firstDayOfWeekIndex = 0;
    }
    const diff = (7 + temp.getDay() - firstDayOfWeekIndex) % 7;
    temp.setDate(temp.getDate() - diff);
    return temp;
  }

  static getFirstDayOfMonth(date: Date) {
    const firstDayOfMonth = new Date(date);
    firstDayOfMonth.setDate(1); // e. G. 01.12.2022
    return firstDayOfMonth;
  }

  static getFirstDayOfNextMonth(date: Date) {
    const firstDayOfNextMonth = DateHelper.getFirstDayOfMonth(date);
    firstDayOfNextMonth.setMonth(firstDayOfNextMonth.getMonth() + 1);
    return firstDayOfNextMonth;
  }

  static getAmountDaysDifference(biggerDate: Date, smallerDate: Date) {
    const diff = biggerDate.getTime() - smallerDate.getTime();
    return diff / (1000 * 60 * 60 * 24);
  }

  static isDateOlderThan(date: Date, days: number) {
    if (!date) {
      return false;
    }
    const now = new Date();
    const daysInMilliseconds = days * 24 * 60 * 60 * 1000; // convert days to milliseconds
    const dateToCompare = new Date(now.getTime() - daysInMilliseconds);
    return date < dateToCompare;
  }

  /**
   * Returns the amount of days from the first day of the month to the given date.
   * @param startDate
   * @param amountAdditionalDays
   */
  static getDatesOfAmountNextDaysIncludingToday(startDate: Date, amountAdditionalDays: number): [Date, Date] {
    let startOfTheDay = new Date(startDate); // copy the date
    let endOfTheDay = new Date(startDate); // copy the date

    endOfTheDay.setDate(endOfTheDay.getDate() + amountAdditionalDays);

    const dates: [Date, Date] = [startOfTheDay, endOfTheDay];
    if (startOfTheDay.getTime() > endOfTheDay.getTime()) {
      dates.reverse();
    }

    return dates;
  }

  static sortDates(dates: (Date | string)[]) {
    const datesAsDates = [];
    for (const date of dates) {
      if (typeof date === 'string') {
        datesAsDates.push(new Date(date));
      } else {
        datesAsDates.push(date);
      }
    }
    datesAsDates.sort((date1, date2) => date1.getTime() - date2.getTime());
    return datesAsDates;
  }

  /**
   * Adds days to a date and returns a new date. Keeps the original date unchanged.
   * @param date
   * @param days
   */
  static addDaysAndReturnNewDate(date: Date, days: number) {
    const tempDate = new Date(date);
    tempDate.setDate(tempDate.getDate() + days);
    return tempDate;
  }

  static addMinutes(date: Date, minutes: number) {
    const tempDate = new Date(date);
    tempDate.setMinutes(tempDate.getMinutes() + minutes);
    return tempDate;
  }

  static addDays(date: Date, days: number) {
    // use addMinutes
    const totalMinutesToAdd = days * 24 * 60;
    return DateHelper.addMinutes(date, totalMinutesToAdd);
  }

  static formatDateToIso8601WithoutTimezone(date: Date, clearSeconds: boolean = true): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    let seconds = String(date.getSeconds()).padStart(2, '0');
    if (clearSeconds) {
      seconds = '00';
    }

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  }

  static getDirectusDateOnlyString(dateObj: Date) {
    const date = {
      year: dateObj.getFullYear(),
      month: dateObj.getMonth() + 1,
      day: dateObj.getDate(),
    };

    // 2024-08-14
    const year = date.year;
    const month = String(date.month).padStart(2, '0');
    const day = String(date.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static isSameDay(date1: Date, date2: Date) {
    return date1.toDateString() === date2.toDateString();
  }

  // returns "Yesterday", "Today", "Tomorrow", or "Tuesday", "Wednesday" or the date in the format "DD.MM.YYYY"
  static useSmartReadableDate(date: Date, locale?: string) {
    const dateCopy = new Date(date); // since the original date may be changed during the process of other functions we need to copy it in order have a reliable date
    //console.log("useSmartReadableDate", dateCopy, locale)
    const today = new Date();
    const tomorrow = DateHelper.addDaysAndReturnNewDate(today, 1);
    const yesterday = DateHelper.addDaysAndReturnNewDate(today, -1);

    // const translationToday = useTranslation(TranslationKeys.today);
    // const translationTomorrow = useTranslation(TranslationKeys.tomorrow);
    // const translationYesterday = useTranslation(TranslationKeys.yesterday);

    //console.log("check if date is today, then return 'today'", today, dateCopy)
    // check if date is today, then return "today"
    if (DateHelper.isSameDay(today, dateCopy)) {
      // return translationToday;
      return today;
    }

    // check if date is tomorrow, then return "tomorrow"
    if (DateHelper.isSameDay(tomorrow, dateCopy)) {
      // return translationTomorrow;
      return tomorrow;
    }
    // check if date is yesterday, then return "yesterday"

    if (DateHelper.isSameDay(yesterday, dateCopy)) {
      // return translationYesterday;
      return yesterday;
    }

    const oneWeekLater = DateHelper.addDaysAndReturnNewDate(today, 6);
    if (dateCopy >= yesterday && dateCopy <= oneWeekLater) {
      return DateHelper.getWeekdayNameByDate(dateCopy, locale);
    }
    // else return "01.01.2021"
    return DateHelper.formatOfferDateToReadable(dateCopy, false, false);
  }

  static formatDateToTime(date: Date, withHours?: boolean, withMinutes?: boolean, withSeconds?: boolean) {
    let hours: string = date.getHours().toString();
    hours = hours.length === 1 ? '0' + hours : hours;
    let minutes = date.getMinutes().toString();
    minutes = minutes.length === 1 ? '0' + minutes : minutes;
    let seconds = date.getSeconds().toString();
    seconds = seconds.length === 1 ? '0' + seconds : seconds;
    let output = '';
    if (withHours) {
      output += hours;
    }
    if (withMinutes) {
      if (output.length > 0) {
        output += ':';
      }
      output += minutes;
    }
    if (withSeconds) {
      if (output.length > 0) {
        output += ':';
      }
      output += seconds;
    }
    return output;
  }

  static formatOfferDateToReadable(offerDate: Date, withYear?: boolean, withTime?: boolean, withSeconds?: boolean) {
    let date = offerDate;
    if (!offerDate) {
      date = new Date();
    }
    if (typeof offerDate === 'string') {
      date = new Date(offerDate);
    }
    const iso = date.toISOString();
    const trimmed = iso.slice(0, 'YYYY-MM-DD'.length);
    const splits = trimmed.split('-');
    const years = splits[0];
    const month = splits[1];
    const days = splits[2];

    let firstPart = '';

    firstPart += days + '.' + month + '.';
    if (withYear) {
      firstPart = firstPart + years;
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (withTime) {
      const hoursWithPad = hours < 10 ? '0' + hours : hours;
      const minutesWithPad = minutes < 10 ? '0' + minutes : minutes;
      firstPart = firstPart + ' ' + hoursWithPad + ':' + minutesWithPad;
    }
    const seconds = date.getSeconds();
    if (withSeconds) {
      const secondsWithPad = seconds < 10 ? '0' + seconds : seconds;
      firstPart = firstPart + ':' + secondsWithPad;
    }

    return firstPart;
  }

  static formatMinutesToReadable(minutes: number) {
    const hours = Math.floor(minutes / 60);
    const minutesLeft = minutes % 60;
    const readable = DateHelper.formatHoursAndMinutesToHH_MM(hours, minutesLeft);
    return readable + ' h';
  }

  static getDateInMinutes(date: Date, minutes: number) {
    const tempDate = new Date(date);
    tempDate.setMinutes(tempDate.getMinutes() + minutes);
    return tempDate;
  }

  static getCurrentDateInMinutes(minutes: number) {
    return DateHelper.getDateInMinutes(new Date(), minutes);
  }

  static getSecondsDifference(date1: Date, date2: Date) {
    return (date1.getTime() - date2.getTime()) / 1000;
  }

  static getSecondsToDate(date: Date) {
    return DateHelper.getSecondsDifference(date, new Date());
  }

  static formatDateToHHMM(date: Date) {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    return DateHelper.formatHoursAndMinutesToHH_MM(hours, minutes);
  }

  private static formatHoursAndMinutesToHH_MM(hours: number, minutes: number) {
    let hoursString = hours + '';
    let minutesString = minutes + '';
    if (hours < 10) {
      hoursString = '0' + hoursString;
    }
    if (minutes < 10) {
      minutesString = '0' + minutesString;
    }
    return hoursString + ':' + minutesString;
  }

  static isDateInFuture(date: Date) {
    if (!date) {
      return undefined;
    }
    const now = new Date();
    return date > now;
  }

  static isDateBetween(start: Date, check: Date, end: Date) {
    return start <= check && check <= end;
  }

  // ---- extracted from backend helpers ----

  static getWeekdayList(): Weekday[] {
    return [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY, Weekday.SATURDAY, Weekday.SUNDAY];
  }

  static getWeekdayListFromDate(date: Date): Weekday[] {
    const weekdayList = DateHelper.getWeekdayList();
    const weekday = DateHelper.getWeekdayFromDate(date);
    const index = weekdayList.indexOf(weekday);
    const firstPart = weekdayList.slice(index);
    const secondPart = weekdayList.slice(0, index);
    return firstPart.concat(secondPart);
  }

  static getWeekdayFromDate(date: Date): Weekday {
    const weekday = date.getDay();
    switch (weekday) {
      case 0:
        return Weekday.SUNDAY;
      case 1:
        return Weekday.MONDAY;
      case 2:
        return Weekday.TUESDAY;
      case 3:
        return Weekday.WEDNESDAY;
      case 4:
        return Weekday.THURSDAY;
      case 5:
        return Weekday.FRIDAY;
      case 6:
        return Weekday.SATURDAY;
      default:
        throw new Error(`Invalid weekday: ${weekday}`);
    }
  }

  static getHumanReadableDate(date: Date, includeWeekdayName: boolean): string {
    const numericString = date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const weekdayName = date.toLocaleDateString('de-DE', { weekday: 'long' });
    let finalString = numericString;
    if (includeWeekdayName) {
      finalString += ` (${weekdayName})`;
    }
    return finalString;
  }

  static getHumanReadableDateReverseYYYYMMDD(date: Date): string {
    let numericString = date.toLocaleDateString('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = numericString.split('.');
    if (parts.length !== 3) {
      return numericString; // fallback
    }
    const day = parts[0];
    const month = parts[1];
    const year = parts[2];
    numericString = `${year}-${month}-${day}`;
    return numericString;
  }

  static getHumanReadableTime(date: Date): string {
    return date.toLocaleTimeString('de-DE', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  static getHumanReadableDateAndTime(date: Date): string {
    return `${DateHelper.getHumanReadableDate(date, false)} ${DateHelper.getHumanReadableTime(date)}`;
  }

  static getFoodofferDateTypeFromDate(date: Date): FoodofferDateType {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    };
  }

  static foodofferDateTypeToString(date: Date | FoodofferDateType) {
    if (date instanceof Date) {
      return DateHelper.getDirectusDateOnlyString(date);
    }
    const year = date.year;
    const month = String(date.month).padStart(2, '0');
    const day = String(date.day).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  static parseDD_MM_YYYY(dateString: string): Date {
    const parts = dateString.split('.');
    if (parts.length !== 3) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    if (parts[0] == undefined || parts[1] == undefined || parts[2] == undefined) {
      throw new Error(`Invalid date string: ${dateString}`);
    }
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    const year = parseInt(parts[2]);
    return new Date(year, month - 1, day);
  }

  static MOMENT_FORMAT = {
    DATE_ONLY: 'DD.MM.YYYY',
    DATE_AND_HH_MM: 'DD.MM.YYYY HH:mm',
    DATE_HH_MM: 'HH:mm',
    DATE_TIMESTAMP: 'YYYY-MM-DDTHH:mm:ssZ',
  }

  static formatDDMMYYYYToDateWithTimeZone(value_raw: string, timezone: DateHelperTimezone) {
    let date_with_timezone = moment.tz(value_raw, 'DD.MM.YYYY', timezone);
    return date_with_timezone.toDate();
  }

  static formatDateToTimeZoneReadable(date: Date, timezone: DateHelperTimezone, momentFormat?: string): string {
    const dateWithTimezone = moment.tz(date, timezone);
    return dateWithTimezone.format(momentFormat || 'DD.MM.YYYY HH:mm:ss');
  }

  static getDate(mySimpleDate: MySimpleDate): Date {
    return new Date(mySimpleDate.year, mySimpleDate.month - 1, mySimpleDate.day, mySimpleDate.hours, mySimpleDate.minutes, mySimpleDate.seconds, mySimpleDate.milliseconds);
  }
}
