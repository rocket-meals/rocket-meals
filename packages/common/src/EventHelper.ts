import * as DatabaseTypes from './databaseTypes/types';

export type PopupEventPlatformKey = 'show_on_ios' | 'show_on_android' | 'show_on_web';

export const isPopupEventActive = (
  event: DatabaseTypes.PopupEvents,
  referenceDate: Date = new Date()
): boolean => {
  const start = event.date_start ? new Date(event.date_start) : null;
  const end = event.date_end ? new Date(event.date_end) : null;

  if (start && end) {
    return referenceDate >= start && referenceDate <= end;
  }

  if (start && !end) {
    return referenceDate >= start;
  }

  if (!start && end) {
    return referenceDate <= end;
  }

  return true;
};

export const filterPopupEvents = (
  events: DatabaseTypes.PopupEvents[],
  platformKey: PopupEventPlatformKey,
  referenceDate: Date = new Date()
): DatabaseTypes.PopupEvents[] => {
  return events.filter(
    (event) => isPopupEventActive(event, referenceDate) && Boolean((event as any)[platformKey])
  );
};
