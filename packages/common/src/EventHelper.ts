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

const VERSION_CONSTRAINT_REGEX = /^(<=|>=|<|>|=)?\s*(\d+(?:\.\d+)*)$/;

export const compareAppVersions = (a: string, b: string): number => {
  const partsA = a.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const partsB = b.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(partsA.length, partsB.length);

  for (let i = 0; i < length; i++) {
    const numA = partsA[i] ?? 0;
    const numB = partsB[i] ?? 0;
    if (numA !== numB) {
      return numA < numB ? -1 : 1;
    }
  }
  return 0;
};

/**
 * show_on_app_version holds an optional constraint like "<20.195.4", ">=21.0.0" or "21.0.0" (exact match).
 * A missing/blank constraint means the event is shown on every version. A constraint that can't be
 * parsed, or a missing currentAppVersion to compare against, fails open (event stays visible) since
 * that matches the previous behaviour of not filtering at all.
 */
export const doesAppVersionMatchConstraint = (
  constraint: string | null | undefined,
  currentAppVersion?: string | null
): boolean => {
  const trimmedConstraint = constraint?.trim();
  if (!trimmedConstraint) {
    return true;
  }
  if (!currentAppVersion) {
    return true;
  }

  const match = trimmedConstraint.match(VERSION_CONSTRAINT_REGEX);
  if (!match) {
    console.warn(`PopupEvents: could not parse show_on_app_version constraint "${constraint}"`);
    return true;
  }

  const [, operator = '=', targetVersion] = match;
  if (!targetVersion) {
    console.warn(`PopupEvents: could not parse show_on_app_version constraint "${constraint}"`);
    return true;
  }
  const comparison = compareAppVersions(currentAppVersion, targetVersion);

  switch (operator) {
    case '<':
      return comparison < 0;
    case '<=':
      return comparison <= 0;
    case '>':
      return comparison > 0;
    case '>=':
      return comparison >= 0;
    case '=':
    default:
      return comparison === 0;
  }
};

export const filterPopupEvents = (
  events: DatabaseTypes.PopupEvents[],
  platformKey: PopupEventPlatformKey,
  referenceDate: Date = new Date(),
  currentAppVersion?: string | null
): DatabaseTypes.PopupEvents[] => {
  return events.filter(
    (event) =>
      isPopupEventActive(event, referenceDate) &&
      Boolean((event as any)[platformKey]) &&
      doesAppVersionMatchConstraint(event.show_on_app_version, currentAppVersion)
  );
};
