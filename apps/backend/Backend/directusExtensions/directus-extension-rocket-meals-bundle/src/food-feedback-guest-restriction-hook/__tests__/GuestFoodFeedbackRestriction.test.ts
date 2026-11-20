import { describe, expect, it } from '@jest/globals';
import { FoodFeedbackPermissionHelper } from 'repo-depkit-common';

import { findGuestFoodFeedbackViolation } from '../GuestFoodFeedbackRestriction';
import { BackendTranslationKeys } from '../../helpers/translations';

const nothingAllowed = FoodFeedbackPermissionHelper.getPermissions({ foods_ratings_type_for_unverified: 'disabled', foods_feedbacks_comments_type_for_unverified: 'read' }, true);
const everythingAllowed = FoodFeedbackPermissionHelper.getPermissions({ foods_ratings_type_for_unverified: 'inherit', foods_feedbacks_comments_type_for_unverified: 'readAndWrite' }, true);

describe('findGuestFoodFeedbackViolation', () => {
  it('allows everything the settings allow', () => {
    expect(findGuestFoodFeedbackViolation({ rating: 5, comment: 'Lecker' }, [], everythingAllowed)).toBeNull();
  });

  it('blocks a new rating when unverified profiles may not rate', () => {
    expect(findGuestFoodFeedbackViolation({ rating: 5 }, [], nothingAllowed)).toBe(BackendTranslationKeys.food_feedback_guest_rating_forbidden);
  });

  it('blocks a new comment when unverified profiles may not write comments', () => {
    expect(findGuestFoodFeedbackViolation({ comment: 'Lecker' }, [], nothingAllowed)).toBe(BackendTranslationKeys.food_feedback_guest_comment_forbidden);
  });

  it('allows removing a rating or comment', () => {
    expect(findGuestFoodFeedbackViolation({ rating: null, comment: null }, [{ rating: 5, comment: 'Lecker' }], nothingAllowed)).toBeNull();
    expect(findGuestFoodFeedbackViolation({ comment: '   ' }, [], nothingAllowed)).toBeNull();
  });

  it('allows saving values the feedback already had', () => {
    expect(findGuestFoodFeedbackViolation({ rating: 5, comment: 'Lecker' }, [{ rating: 5, comment: 'Lecker' }], nothingAllowed)).toBeNull();
  });

  it('blocks changing an existing rating', () => {
    expect(findGuestFoodFeedbackViolation({ rating: 4 }, [{ rating: 5 }], nothingAllowed)).toBe(BackendTranslationKeys.food_feedback_guest_rating_forbidden);
  });

  it('blocks adding or rewording an entry of the comment history', () => {
    const existing = { comment: 'Lecker', comment_history: [{ comment: 'Lecker', date_created: '2026-11-16T10:00:00.000Z' }] };
    const added = { comment: 'Neu', comment_history: [{ comment: 'Neu', date_created: '2026-11-17T10:00:00.000Z' }, ...existing.comment_history] };
    const reworded = { comment: 'Anders', comment_history: [{ comment: 'Anders', date_created: '2026-11-16T10:00:00.000Z' }] };
    expect(findGuestFoodFeedbackViolation(added, [existing], nothingAllowed)).toBe(BackendTranslationKeys.food_feedback_guest_comment_forbidden);
    expect(findGuestFoodFeedbackViolation(reworded, [existing], nothingAllowed)).toBe(BackendTranslationKeys.food_feedback_guest_comment_forbidden);
  });

  it('allows deleting entries of the comment history', () => {
    const existing = {
      comment: 'B',
      comment_history: [
        { comment: 'B', date_created: '2026-11-17T10:00:00.000Z' },
        { comment: 'A', date_created: '2026-11-16T10:00:00.000Z' },
      ],
    };
    expect(findGuestFoodFeedbackViolation({ comment: 'A', comment_history: [existing.comment_history[1]!] }, [existing], nothingAllowed)).toBeNull();
  });

  it('ignores feedbacks that neither rate nor comment', () => {
    expect(findGuestFoodFeedbackViolation({}, [], nothingAllowed)).toBeNull();
  });
});
