export type CronObject = {
  seconds: string | number;
  minutes: string | number;
  hours: string | number;
  dayOfMonth: string | number;
  month: string | number;
  dayOfWeek: string | number;
};

export class CronHelper {
  static getCronString(cronObject: CronObject): string {
    return cronObject.seconds + ' ' + cronObject.minutes + ' ' + cronObject.hours + ' ' + cronObject.dayOfMonth + ' ' + cronObject.month + ' ' + cronObject.dayOfWeek;
  }

  static EVERY_HOUR: CronObject = {
    seconds: 0,
    minutes: 0,
    hours: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };

  static EVERY_MINUTE: CronObject = {
    seconds: 0,
    minutes: '*',
    hours: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };

  static EVERY_5_MINUTES: CronObject = {
    seconds: 0,
    minutes: '*/5',
    hours: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };

  static EVERY_MONTH_AT_1AM: CronObject = {
    seconds: 0,
    minutes: 0,
    hours: 1,
    dayOfMonth: 1,
    month: '*',
    dayOfWeek: '*',
  };

  static EVERY_15_MINUTES: CronObject = {
    seconds: 0,
    minutes: '*/15',
    hours: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };

  static EVERY_DAY_AT_17_59: CronObject = {
    seconds: 0,
    minutes: 59,
    hours: 17,
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };

  static EVERY_DAY_AT_4AM: CronObject = {
    seconds: 0,
    minutes: 0,
    hours: 4,
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };

  static EVERY_DAY_AT_3AM: CronObject = {
    seconds: 0,
    minutes: 0,
    hours: 3,
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  }

  static EVERY_DAY_AT_2AM: CronObject = {
    seconds: 0,
    minutes: 0,
    hours: 2,
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  }

  static EVERY_FRIDAY_AT_8AM: CronObject = {
    seconds: 0,
    minutes: 0,
    hours: 8,
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: 5,
  };

  static EVERY_DAY_AT_20: CronObject = {
    seconds: 0,
    minutes: 0,
    hours: 20,
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };

  static EVERY_WEDNESDAY_AT_20: CronObject = {
    seconds: 0,
    minutes: 0,
    hours: 20,
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: 3,
  };

  static EVERY_20_SECONDS: CronObject = {
    seconds: '*/20',
    minutes: '*',
    hours: '*',
    dayOfMonth: '*',
    month: '*',
    dayOfWeek: '*',
  };
}
