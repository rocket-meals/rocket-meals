/**
 * action-recommendations-hook
 *
 * 1. A food feedback whose comment is new or changed gets an AI recommendation (reply with a draft
 *    for the chat, or mark as done), stored in `action_recommendations`: first as `processing` (the
 *    module shows that the AI is asked), then `draft` or `failed`, with `logs`. The app creates a
 *    feedback without comment and writes the comment with an update, and it sends the whole feedback
 *    on every change (also a new rating), so the hook compares the comment before and after the update
 *    instead of reacting to create only. Only with `app_settings.ai_action_recommendations_enabled`
 *    and a provider under Settings → AI. A failing AI never blocks the feedback.
 * 2. For every collection: when items are deleted, their recommendations are deleted too.
 *    `action_recommendations` points at any collection, so there is no foreign key to cascade.
 */
import { CollectionNames } from 'repo-depkit-common';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { HookKeysHelper } from '../helpers/HookKeysHelper';
import { ActionRecommendationDefinitions } from '../helpers/action-recommendations/ActionRecommendationDefinitions';
import { ActionRecommendationService } from '../helpers/action-recommendations/ActionRecommendationService';
import { BACKEND_DEFAULT_TRANSLATION_LANGUAGE } from '../helpers/translations/BackendTranslator';

const HOOK_NAME = 'action-recommendations-hook';

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function getComment(payload: unknown): string | null {
  const comment = (payload as { comment?: unknown } | null | undefined)?.comment;
  return typeof comment === 'string' && comment.trim() !== '' ? comment.trim() : null;
}

export default MyDefineHook.defineHookWithAllTablesExisting(HOOK_NAME, ({ action, filter }, apiContext) => {
  const foodFeedbackDefinition = ActionRecommendationDefinitions.getDefinition(CollectionNames.FOODS_FEEDBACKS);

  /**
   * Feedback ids whose comment changes in an update that is running right now. Filled by the filter
   * (before the update, where the old comment can still be read), emptied by the action after it.
   * Filter and action of one request run on the same instance.
   */
  const commentChangedIds = new Set<string>();

  async function recommend(ids: string[]) {
    if (!foodFeedbackDefinition || ids.length === 0) {
      return;
    }
    try {
      const service = await ActionRecommendationService.create(apiContext);
      if (!(service instanceof ActionRecommendationService)) {
        return;
      }
      // The support works in German, the draft reply is written in the language of the author.
      await service.recommend(foodFeedbackDefinition, ids, BACKEND_DEFAULT_TRANSLATION_LANGUAGE, null);
    } catch (error) {
      // Already written to `logs` of the recommendation as `failed`.
      apiContext.logger.error(`${HOOK_NAME}: recommendation for food feedbacks ${ids.join(', ')} failed: ${getErrorMessage(error)}`);
    }
  }

  action(CollectionNames.FOODS_FEEDBACKS + '.items.create', async meta => {
    if (getComment(meta.payload)) {
      await recommend(HookKeysHelper.getKeysFromMeta(meta).map(String));
    }
  });

  filter(CollectionNames.FOODS_FEEDBACKS + '.items.update', async (payload, meta) => {
    const newComment = getComment(payload);
    if (!newComment) {
      return payload;
    }
    try {
      const keys = HookKeysHelper.getKeysFromMeta(meta);
      const service = new apiContext.services.ItemsService(CollectionNames.FOODS_FEEDBACKS, { schema: await apiContext.getSchema(), accountability: null });
      const before = (await service.readMany(keys, { fields: ['id', 'comment'] })) as { id: string; comment?: string | null }[];
      for (const feedback of before) {
        if ((feedback.comment ?? '').trim() !== newComment) {
          commentChangedIds.add(String(feedback.id));
        }
      }
    } catch (error) {
      apiContext.logger.error(`${HOOK_NAME}: reading the comments before an update failed: ${getErrorMessage(error)}`);
    }
    return payload;
  });

  action(CollectionNames.FOODS_FEEDBACKS + '.items.update', async meta => {
    const changed = HookKeysHelper.getKeysFromMeta(meta)
      .map(String)
      .filter(id => commentChangedIds.delete(id));
    await recommend(changed);
  });

  action('items.delete', async meta => {
    try {
      await ActionRecommendationService.deleteForItems(apiContext, meta.collection, HookKeysHelper.getKeysFromMeta(meta));
    } catch (error) {
      apiContext.logger.error(`${HOOK_NAME}: deleting the recommendations of deleted items in ${String(meta.collection)} failed: ${getErrorMessage(error)}`);
    }
  });
});
