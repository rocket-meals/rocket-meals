/**
 * food-feedback-comment-history-hook – hält `foods_feedbacks.comment` und `foods_feedbacks.comment_history`
 * bei jedem Schreiben konsistent.
 *
 * Die App fügt jeden neuen Kommentar oben in die Historie ein und schickt beide Felder. Ältere
 * App-Versionen und das Directus Data Studio kennen eventuell nur `comment`: dann wird ein neuer
 * Text hier oben in die Historie eingefügt, statt den alten Kommentar zu überschreiben. So sieht das
 * Studierendenwerk die Kommentarfolge eines Gastes immer vollständig, z. B. nach einer
 * Rezepturanpassung. Die Regeln stehen in `FoodFeedbackCommentHistoryHelper.normalizeForWrite`.
 */

import { defineHook } from '@directus/extensions-sdk';
import { PrimaryKey } from '@directus/types';
import { CollectionNames, DatabaseTypes, FoodFeedbackCommentHistoryHelper } from 'repo-depkit-common';
import { MyDatabaseHelper, MyEventContext } from '../helpers/MyDatabaseHelper';

type Payload = Partial<DatabaseTypes.FoodsFeedbacks>;

function writesComments(input: unknown): input is Payload {
  return !!input && typeof input === 'object' && ('comment' in input || 'comment_history' in input);
}

export default defineHook(({ filter }, apiContext) => {
  filter(CollectionNames.FOODS_FEEDBACKS + '.items.create', async input => {
    if (!writesComments(input)) {
      return input;
    }
    return FoodFeedbackCommentHistoryHelper.normalizeForWrite(input, null);
  });

  filter(CollectionNames.FOODS_FEEDBACKS + '.items.update', async (input, meta, eventContext: MyEventContext) => {
    if (!writesComments(input)) {
      return input;
    }
    const keys = Array.isArray(meta?.keys) ? (meta.keys as PrimaryKey[]) : [];
    if (keys.length !== 1) {
      // One payload for several feedbacks: only an explicitly sent history can be applied to all.
      return 'comment_history' in input ? FoodFeedbackCommentHistoryHelper.normalizeForWrite(input, { comment_history: [] }) : input;
    }
    const myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);
    const existing = await myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.FoodsFeedbacks>(CollectionNames.FOODS_FEEDBACKS).readOne(keys[0]!, {
      fields: ['id', 'comment', 'comment_history', 'date_created', 'date_updated'],
    });
    return FoodFeedbackCommentHistoryHelper.normalizeForWrite(input, existing);
  });
});
