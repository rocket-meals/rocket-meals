import { DatabaseTypes, FoodFeedbackCommentHistoryHelper, FoodFeedbackPermissions } from 'repo-depkit-common';
import { BackendTranslationKeys } from '../helpers/translations';

type FoodFeedbackValues = Pick<Partial<DatabaseTypes.FoodsFeedbacks>, 'rating' | 'comment' | 'comment_history' | 'date_created' | 'date_updated'>;

function hasRating(value: FoodFeedbackValues['rating']): boolean {
  return value !== null && value !== undefined;
}

/**
 * Which rule a guest's `foods_feedbacks` write breaks, or `null` if it may be saved.
 *
 * Only *setting* a rating or comment is blocked. Removing one, or saving a value the feedback
 * already had, stays allowed. For comments that covers the whole history (`comment_history`):
 * a guest may delete entries but neither add nor reword one. the app sends the whole feedback on every save (e.g. when only
 * `notify` changes), and a rating given before the admin switched guests off must not make the
 * feedback impossible to edit.
 *
 * @param payload the fields the guest wants to write
 * @param existingFeedbacks the stored feedbacks on update, an empty list on create
 */
export function findGuestFoodFeedbackViolation(
  payload: FoodFeedbackValues,
  existingFeedbacks: FoodFeedbackValues[],
  permissions: FoodFeedbackPermissions
): BackendTranslationKeys | null {
  const isNewValue = (field: keyof FoodFeedbackValues) => existingFeedbacks.length === 0 || existingFeedbacks.some(existing => existing[field] !== payload[field]);

  if (!permissions.canRate && 'rating' in payload && hasRating(payload.rating) && isNewValue('rating')) {
    return BackendTranslationKeys.food_feedback_guest_rating_forbidden;
  }
  const writesComments = 'comment' in payload || 'comment_history' in payload;
  const addsNewCommentText = existingFeedbacks.length === 0 ? FoodFeedbackCommentHistoryHelper.addsNewText(payload, null) : existingFeedbacks.some(existing => FoodFeedbackCommentHistoryHelper.addsNewText(payload, existing));
  if (!permissions.canWriteComments && writesComments && addsNewCommentText) {
    return BackendTranslationKeys.food_feedback_guest_comment_forbidden;
  }
  return null;
}
