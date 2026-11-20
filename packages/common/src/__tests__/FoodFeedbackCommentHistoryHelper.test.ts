import { describe, expect, it } from '@jest/globals';
import { FoodFeedbackCommentHistoryHelper as Helper } from '../FoodFeedbackCommentHistoryHelper';

const MONDAY = '2026-11-16T10:00:00.000Z';
const MONDAY_LATER = '2026-11-16T11:00:00.000Z';
const TUESDAY = '2026-11-17T10:00:00.000Z';
const NOW = new Date('2026-11-20T09:00:00.000Z');

const withHistory = {
  comment: 'Jetzt lecker',
  comment_history: [
    { comment: 'War doof', date_created: MONDAY },
    { comment: 'Jetzt lecker', date_created: TUESDAY },
  ],
};

describe('FoodFeedbackCommentHistoryHelper', () => {
  describe('getEntries', () => {
    it('returns nothing without a comment', () => {
      expect(Helper.getEntries(null)).toEqual([]);
      expect(Helper.getEntries({ comment: '  ', comment_history: withHistory.comment_history })).toEqual([]);
    });

    it('turns a comment from before the history into one entry', () => {
      expect(Helper.getEntries({ comment: 'Alt', date_created: MONDAY, date_updated: TUESDAY })).toEqual([{ comment: 'Alt', date_created: TUESDAY }]);
      expect(Helper.getEntries({ comment: 'Alt', date_created: MONDAY })).toEqual([{ comment: 'Alt', date_created: MONDAY }]);
    });

    it('sorts the stored history newest first', () => {
      expect(Helper.getEntries(withHistory).map(entry => entry.comment)).toEqual(['Jetzt lecker', 'War doof']);
    });

    it('reads the history as JSON string too and skips broken entries', () => {
      const feedback = { comment: 'B', comment_history: JSON.stringify([{ comment: 'B', date_created: TUESDAY }, { comment: '', date_created: MONDAY }, { comment: 'X' }]) };
      expect(Helper.getEntries(feedback)).toEqual([{ comment: 'B', date_created: TUESDAY }]);
    });

    it('puts a comment written by an older app version on top', () => {
      const feedback = { ...withHistory, comment: 'Neu aus alter App', date_updated: MONDAY_LATER };
      expect(Helper.getEntries(feedback)[0]).toEqual({ comment: 'Neu aus alter App', date_created: MONDAY_LATER });
      expect(Helper.getEntries(feedback)).toHaveLength(3);
    });
  });

  describe('changes', () => {
    it('adds a new comment on top and mirrors it in comment', () => {
      const update = Helper.addComment(withHistory, ' Wieder doof ', NOW);
      expect(update.comment).toBe('Wieder doof');
      expect(update.comment_history?.map(entry => entry.comment)).toEqual(['Wieder doof', 'Jetzt lecker', 'War doof']);
      expect(update.comment_history?.[0]?.date_created).toBe(NOW.toISOString());
    });

    it('keeps a comment from before the history when adding', () => {
      const update = Helper.addComment({ comment: 'Alt', date_created: MONDAY }, 'Neu', NOW);
      expect(update.comment_history).toEqual([
        { comment: 'Neu', date_created: NOW.toISOString() },
        { comment: 'Alt', date_created: MONDAY },
      ]);
    });

    it('edits an older entry and keeps its date', () => {
      const update = Helper.editEntry(withHistory, 1, 'Eigentlich ok', NOW);
      expect(update.comment).toBe('Jetzt lecker');
      expect(update.comment_history?.[1]).toEqual({ comment: 'Eigentlich ok', date_created: MONDAY, date_updated: NOW.toISOString() });
    });

    it('removes an entry, the next one becomes the comment', () => {
      expect(Helper.removeEntry(withHistory, 0)).toEqual({ comment: 'War doof', comment_history: [{ comment: 'War doof', date_created: MONDAY }] });
      expect(Helper.editEntry(withHistory, 0, '', NOW).comment).toBe('War doof');
    });

    it('removes everything', () => {
      expect(Helper.removeEntry({ comment: 'Alt', date_created: MONDAY }, 0)).toEqual({ comment: null, comment_history: null });
      expect(Helper.removeAll()).toEqual({ comment: null, comment_history: null });
    });
  });

  it('groups the entries by day, newest day first', () => {
    const entries = Helper.getEntries({
      comment: 'C',
      comment_history: [
        { comment: 'A', date_created: MONDAY },
        { comment: 'B', date_created: MONDAY_LATER },
        { comment: 'C', date_created: TUESDAY },
      ],
    });
    const groups = Helper.groupByDay(entries);
    expect(groups.map(group => group.entries.map(item => item.entry.comment))).toEqual([['C'], ['B', 'A']]);
    expect(groups[1]?.entries.map(item => item.index)).toEqual([1, 2]);
  });

  describe('normalizeForWrite', () => {
    it('leaves writes without comment fields alone', () => {
      const payload = { rating: 4 };
      expect(Helper.normalizeForWrite(payload, withHistory, NOW)).toBe(payload);
    });

    it('takes a changed history and sets comment to its newest entry', () => {
      const payload = { comment: 'falsch', comment_history: [{ comment: 'Neu', date_created: NOW.toISOString() }, ...withHistory.comment_history] };
      expect(Helper.normalizeForWrite(payload, withHistory, NOW).comment).toBe('Neu');
    });

    it('adds a comment of an older app version to the history', () => {
      // Older versions send the whole feedback they read before, with the unchanged history.
      const payload = { ...withHistory, comment: 'Geändert' };
      const result = Helper.normalizeForWrite(payload, withHistory, NOW);
      expect(result.comment).toBe('Geändert');
      expect(result.comment_history?.map(entry => entry.comment)).toEqual(['Geändert', 'Jetzt lecker', 'War doof']);
    });

    it('starts the history on create', () => {
      expect(Helper.normalizeForWrite({ comment: 'Erster' }, null, NOW)).toEqual({ comment: 'Erster', comment_history: [{ comment: 'Erster', date_created: NOW.toISOString() }] });
    });

    it('does not add the same comment twice', () => {
      const result = Helper.normalizeForWrite({ ...withHistory, notify: true }, withHistory, NOW);
      expect(result.comment_history).toHaveLength(2);
    });

    it('removes all comments when comment is emptied', () => {
      expect(Helper.normalizeForWrite({ ...withHistory, comment: null }, withHistory, NOW)).toMatchObject({ comment: null, comment_history: null });
      expect(Helper.normalizeForWrite({ comment: null, comment_history: null }, withHistory, NOW)).toMatchObject({ comment: null, comment_history: null });
    });
  });

  it('knows whether a write adds a new text', () => {
    expect(Helper.addsNewText({ ...withHistory }, withHistory)).toBe(false);
    expect(Helper.addsNewText(Helper.removeEntry(withHistory, 0), withHistory)).toBe(false);
    expect(Helper.addsNewText(Helper.addComment(withHistory, 'Neu', NOW), withHistory)).toBe(true);
    expect(Helper.addsNewText(Helper.editEntry(withHistory, 1, 'Anders', NOW), withHistory)).toBe(true);
    expect(Helper.addsNewText({ comment: 'Alt' }, { comment: 'Alt', date_created: MONDAY })).toBe(false);
  });
});
