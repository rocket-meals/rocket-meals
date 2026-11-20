/**
 * The comment history of a food feedback (`foods_feedbacks.comment_history`).
 *
 * A user does not overwrite their comment on a food any more, every new comment is added on top of
 * the earlier ones. That way the user sees how their impression changed, and the canteen operator
 * sees it in the backend, e.g. after a recipe was changed.
 *
 * Storage: `comment_history` is a JSON list of {@link FoodFeedbackCommentEntry}, newest first.
 * `comment` always holds the text of the newest entry, so everything that only knows `comment`
 * (other users' comment lists, reports, notifications, the AI recommendation) keeps working.
 *
 * Feedbacks from before the history existed only have `comment`: {@link FoodFeedbackCommentHistoryHelper.getEntries}
 * turns that into a single entry, so they need no migration.
 */

/** One comment of the history. Dates are ISO strings. */
export type FoodFeedbackCommentEntry = {
  comment: string;
  date_created: string;
  /** Set when the author edited this entry later. */
  date_updated?: string | null;
};

/** What is written to `foods_feedbacks` when the comments change. */
export type FoodFeedbackCommentUpdate = {
  comment: string | null;
  comment_history: FoodFeedbackCommentEntry[] | null;
};

/** The fields of a feedback this helper reads. */
export type FoodFeedbackWithComments = {
  comment?: string | null;
  comment_history?: unknown;
  date_created?: string | null;
  date_updated?: string | null;
};

/** The entries of one calendar day, see {@link FoodFeedbackCommentHistoryHelper.groupByDay}. */
export type FoodFeedbackCommentDayGroup = {
  /** Local calendar day, `YYYY-MM-DD`. */
  day: string;
  /** Date of the newest entry of the day, handy for formatting the day. */
  date: string;
  /** Entries of the day, newest first, with their position in the whole history. */
  entries: { entry: FoodFeedbackCommentEntry; index: number }[];
};

function trimComment(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isValidDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(new Date(value).getTime());
}

function getTime(value: string | null | undefined): number {
  return value ? new Date(value).getTime() : 0;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export class FoodFeedbackCommentHistoryHelper {
  /**
   * The stored entries of `comment_history` only, newest first. Broken entries (no text or no
   * date) are left out. Accepts the parsed list as well as its JSON string.
   */
  static getStoredEntries(feedback: FoodFeedbackWithComments | null | undefined): FoodFeedbackCommentEntry[] {
    let raw: unknown = feedback?.comment_history;
    if (typeof raw === 'string') {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = null;
      }
    }
    if (!Array.isArray(raw)) {
      return [];
    }
    const entries: FoodFeedbackCommentEntry[] = [];
    for (const item of raw) {
      const comment = trimComment(item?.comment);
      if (!comment || !isValidDate(item?.date_created)) {
        continue;
      }
      entries.push({
        comment,
        date_created: item.date_created,
        ...(isValidDate(item?.date_updated) ? { date_updated: item.date_updated } : {}),
      });
    }
    return entries.sort((a, b) => getTime(b.date_created) - getTime(a.date_created));
  }

  /**
   * All comments of the feedback, newest first.
   *
   * - No `comment`: no comments, even if an old history is still stored.
   * - `comment` without history (feedbacks from before the history): one entry, dated by the
   *   last change of the feedback.
   * - `comment` differs from the newest stored entry (written by an app version that only knows
   *   `comment`): it is shown as the newest entry on top of the history.
   */
  static getEntries(feedback: FoodFeedbackWithComments | null | undefined): FoodFeedbackCommentEntry[] {
    const comment = trimComment(feedback?.comment);
    if (!comment) {
      return [];
    }
    const stored = FoodFeedbackCommentHistoryHelper.getStoredEntries(feedback);
    if (stored[0]?.comment === comment) {
      return stored;
    }
    const date = [feedback?.date_updated, feedback?.date_created].find(isValidDate) ?? new Date(0).toISOString();
    return [{ comment, date_created: date }, ...stored];
  }

  /** Turns the entries into the fields to write: `comment` mirrors the newest entry. */
  static buildUpdate(entries: readonly FoodFeedbackCommentEntry[]): FoodFeedbackCommentUpdate {
    if (entries.length === 0) {
      return { comment: null, comment_history: null };
    }
    const sorted = [...entries].sort((a, b) => getTime(b.date_created) - getTime(a.date_created));
    return { comment: sorted[0]!.comment, comment_history: sorted };
  }

  /** Adds a new comment on top of the history. An empty text changes nothing. */
  static addComment(feedback: FoodFeedbackWithComments | null | undefined, text: string, now: Date = new Date()): FoodFeedbackCommentUpdate {
    const entries = FoodFeedbackCommentHistoryHelper.getEntries(feedback);
    const comment = trimComment(text);
    if (!comment) {
      return FoodFeedbackCommentHistoryHelper.buildUpdate(entries);
    }
    return FoodFeedbackCommentHistoryHelper.buildUpdate([{ comment, date_created: now.toISOString() }, ...entries]);
  }

  /** Changes the text of the entry at `index` (as in {@link getEntries}). An empty text removes it. */
  static editEntry(feedback: FoodFeedbackWithComments | null | undefined, index: number, text: string, now: Date = new Date()): FoodFeedbackCommentUpdate {
    const entries = FoodFeedbackCommentHistoryHelper.getEntries(feedback);
    const comment = trimComment(text);
    if (!comment) {
      return FoodFeedbackCommentHistoryHelper.removeEntry(feedback, index);
    }
    const updated = entries.map((entry, position) => (position === index && entry.comment !== comment ? { ...entry, comment, date_updated: now.toISOString() } : entry));
    return FoodFeedbackCommentHistoryHelper.buildUpdate(updated);
  }

  /** Removes the entry at `index` (as in {@link getEntries}). */
  static removeEntry(feedback: FoodFeedbackWithComments | null | undefined, index: number): FoodFeedbackCommentUpdate {
    const entries = FoodFeedbackCommentHistoryHelper.getEntries(feedback);
    return FoodFeedbackCommentHistoryHelper.buildUpdate(entries.filter((_, position) => position !== index));
  }

  /** Removes all comments of the feedback. */
  static removeAll(): FoodFeedbackCommentUpdate {
    return FoodFeedbackCommentHistoryHelper.buildUpdate([]);
  }

  /** The local calendar day of a date, `YYYY-MM-DD`. */
  static getDayKey(date: string): string {
    const value = new Date(date);
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }

  /**
   * Groups the entries by the local day they were written, newest day first. The app draws a
   * separator with the date between the days, so the history reads like a timeline.
   */
  static groupByDay(entries: readonly FoodFeedbackCommentEntry[]): FoodFeedbackCommentDayGroup[] {
    const groups: FoodFeedbackCommentDayGroup[] = [];
    entries.forEach((entry, index) => {
      const day = FoodFeedbackCommentHistoryHelper.getDayKey(entry.date_created);
      const last = groups[groups.length - 1];
      if (last?.day === day) {
        last.entries.push({ entry, index });
      } else {
        groups.push({ day, date: entry.date_created, entries: [{ entry, index }] });
      }
    });
    return groups;
  }

  /**
   * Keeps `comment` and `comment_history` consistent on every write, whoever writes: the current
   * app (sends both), older app versions and the Directus data studio (may send only `comment`, or
   * `comment` together with the unchanged history they read before).
   *
   * - The history was changed: it wins, `comment` is set to its newest entry.
   * - Only `comment` was changed: a new text is added on top of the history (older app versions
   *   called this "edit", the history keeps the earlier text). An empty `comment` removes all.
   * - Neither was sent: the payload stays as it is.
   *
   * @param payload the fields that are written
   * @param existing the stored feedback on update, `null` on create
   * @returns the payload with both fields set, or the payload unchanged
   */
  static normalizeForWrite<T extends FoodFeedbackWithComments>(payload: T, existing: FoodFeedbackWithComments | null | undefined, now: Date = new Date()): T {
    const hasComment = 'comment' in payload;
    const hasHistory = 'comment_history' in payload;
    if (!hasComment && !hasHistory) {
      return payload;
    }

    const storedBefore = FoodFeedbackCommentHistoryHelper.getStoredEntries(existing);
    const sentHistory = FoodFeedbackCommentHistoryHelper.getStoredEntries(payload);
    const historyChanged = hasHistory && JSON.stringify(sentHistory) !== JSON.stringify(storedBefore);

    if (historyChanged) {
      return { ...payload, ...FoodFeedbackCommentHistoryHelper.buildUpdate(sentHistory) };
    }
    if (!hasComment) {
      return payload;
    }

    const comment = trimComment(payload.comment);
    if (!comment) {
      return { ...payload, ...FoodFeedbackCommentHistoryHelper.removeAll() };
    }
    const entriesBefore = FoodFeedbackCommentHistoryHelper.getEntries(existing);
    if (entriesBefore[0]?.comment === comment) {
      return { ...payload, ...FoodFeedbackCommentHistoryHelper.buildUpdate(entriesBefore) };
    }
    return { ...payload, ...FoodFeedbackCommentHistoryHelper.buildUpdate([{ comment, date_created: now.toISOString() }, ...entriesBefore]) };
  }

  /**
   * Whether the write adds a comment text the feedback did not have before. Used to keep
   * unverified profiles from writing comments when that is switched off: removing stays allowed.
   */
  static addsNewText(payload: FoodFeedbackWithComments, existing: FoodFeedbackWithComments | null | undefined): boolean {
    const before = new Set(FoodFeedbackCommentHistoryHelper.getEntries(existing).map(entry => entry.comment));
    const sent = [...FoodFeedbackCommentHistoryHelper.getStoredEntries(payload).map(entry => entry.comment), trimComment(payload.comment)].filter(Boolean);
    return sent.some(comment => !before.has(comment));
  }
}
