/**
 * FoodFeedbackChatActions.ts – the writes of the page "Speise-Feedbacks": create the chat of a
 * feedback and set its state. Shared by the list (mark as done, also for several at once) and the
 * chat page, so both create chats the same way.
 *
 * Takes the Directus app's API client (`useApi()`) as parameter, so it has no Vue imports.
 */

import { ChatHelper } from 'repo-depkit-common/src/ChatHelper';
import { FoodFeedbackChatStatusHelper } from 'repo-depkit-common/src/FoodFeedbackChatStatusHelper';
import { RelationHelper } from 'repo-depkit-common/src/RelationHelper';
import { AppExtensionLanguageHelper } from '../app-extensions/AppExtensionLanguageHelper';
import { BackendTranslationKeys } from '../translations/BackendTranslationKeys';
import { ChatQueryHelper } from './ChatQueryHelper';
import { FoodFeedbackChatHelper, type FoodFeedbackListItem } from './FoodFeedbackChatHelper';
import { SupportChatActions, type MarkResolvedResult, type SupportChatApiClient } from './SupportChatActions';

/** The part of the Directus app's axios instance used here. */
export type FoodFeedbackApiClient = SupportChatApiClient;

export type { MarkResolvedResult };

export class FoodFeedbackChatActions {
  /**
   * The chat of a feedback; on first use it is created, the author added as participant and the
   * chat linked to the feedback, so the author finds it in the app.
   */
  static async ensureChat(api: FoodFeedbackApiClient, feedback: FoodFeedbackListItem): Promise<string> {
    const existingChatId = RelationHelper.getId(feedback.chat);
    if (existingChatId) {
      return String(existingChatId);
    }
    const profileId = RelationHelper.getId(feedback.profile);
    if (!profileId) {
      throw new Error('feedback has no profile');
    }
    // The author sees the chat title in the app, so it is written in the author's language.
    const authorLanguage = FoodFeedbackChatStatusHelper.getAuthorLanguage(feedback);
    const food = FoodFeedbackChatHelper.getFoodName(feedback) || AppExtensionLanguageHelper.translate(BackendTranslationKeys.rocket_meals_module_unknown_food, authorLanguage);
    const alias = AppExtensionLanguageHelper.translate(BackendTranslationKeys.rocket_meals_module_food_feedback_chat_alias, authorLanguage, { food });

    const chatResponse = await api.post(ChatQueryHelper.CHATS_ENDPOINT, FoodFeedbackChatStatusHelper.buildChatForFeedback(feedback, alias));
    const createdChatId = String(chatResponse.data?.data?.id);
    await api.post(ChatQueryHelper.CHATS_PARTICIPANTS_ENDPOINT, ChatHelper.buildParticipant(createdChatId, profileId));
    await api.patch(`${FoodFeedbackChatHelper.FOOD_FEEDBACKS_ENDPOINT}/${feedback.id}`, { chat: createdChatId });
    return createdChatId;
  }

  /** Opens done feedbacks again ("Wartet auf Antwort"), see {@link SupportChatActions.reopen}. */
  static async reopen(api: FoodFeedbackApiClient, feedbacks: readonly FoodFeedbackListItem[]): Promise<MarkResolvedResult> {
    return SupportChatActions.reopen(api, feedbacks);
  }

  /** Marks feedbacks as done, see {@link SupportChatActions.markResolved}. */
  static async markResolved(api: FoodFeedbackApiClient, feedbacks: readonly FoodFeedbackListItem[]): Promise<MarkResolvedResult> {
    return SupportChatActions.markResolved(api, feedbacks, {
      canStartChat: FoodFeedbackChatStatusHelper.canStartChat,
      ensureChat: FoodFeedbackChatActions.ensureChat,
    });
  }
}
