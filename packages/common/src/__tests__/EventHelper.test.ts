import { DatabaseTypes, filterPopupEvents, isPopupEventActive } from 'repo-depkit-common';

describe('Popup event helper', () => {
  const baseEvent: DatabaseTypes.PopupEvents = {
    id: '1',
    show_on_android: true,
    show_on_ios: true,
    show_on_web: true,
  } as DatabaseTypes.PopupEvents;

  const referenceDate = new Date('2024-06-15T12:00:00Z');

  it('treats events without date limits as active', () => {
    expect(isPopupEventActive(baseEvent, referenceDate)).toBe(true);
  });

  it('checks both start and end dates when provided', () => {
    const activeEvent = {
      ...baseEvent,
      date_start: '2024-06-10T00:00:00Z',
      date_end: '2024-06-20T23:59:59Z',
    } as DatabaseTypes.PopupEvents;

    const expiredEvent = {
      ...baseEvent,
      date_start: '2024-06-01T00:00:00Z',
      date_end: '2024-06-10T00:00:00Z',
    } as DatabaseTypes.PopupEvents;

    expect(isPopupEventActive(activeEvent, referenceDate)).toBe(true);
    expect(isPopupEventActive(expiredEvent, referenceDate)).toBe(false);
  });

  it('considers end date when no start date is provided', () => {
    const eventEndingInFuture = {
      ...baseEvent,
      date_end: '2024-06-20T00:00:00Z',
    } as DatabaseTypes.PopupEvents;

    const eventAlreadyEnded = {
      ...baseEvent,
      date_end: '2024-06-10T00:00:00Z',
    } as DatabaseTypes.PopupEvents;

    expect(isPopupEventActive(eventEndingInFuture, referenceDate)).toBe(true);
    expect(isPopupEventActive(eventAlreadyEnded, referenceDate)).toBe(false);
  });

  it('filters events by platform visibility and active dates', () => {
    const events: DatabaseTypes.PopupEvents[] = [
      {
        ...baseEvent,
        id: '1',
        date_start: '2024-06-10T00:00:00Z',
        date_end: '2024-06-20T23:59:59Z',
        show_on_android: true,
      },
      {
        ...baseEvent,
        id: '2',
        date_start: '2024-06-10T00:00:00Z',
        date_end: '2024-06-20T23:59:59Z',
        show_on_android: false,
      },
      {
        ...baseEvent,
        id: '3',
        date_end: '2024-06-10T00:00:00Z',
        show_on_android: true,
      },
    ];

    const filtered = filterPopupEvents(events, 'show_on_android', referenceDate);

    expect(filtered.map((event) => event.id)).toEqual(['1']);
  });
});
