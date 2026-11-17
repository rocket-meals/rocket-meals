import { Accountability } from '@directus/types';
import { CollectionNames } from 'repo-depkit-common';
import { AccountabilityHelper } from './AccountabilityHelper';

/** The few database reads the check needs, so it can be tested without a database. */
export type ChatMessageAccessLookup = {
  getProfileIdOfUser: (userId: string) => Promise<string | null>;
  isParticipant: (chatId: string, profileId: string) => Promise<boolean>;
  isAuthorOfFeedbackWithChat: (chatId: string, profileId: string) => Promise<boolean>;
};

/**
 * Who may write a message into a chat.
 *
 * The policy `User` can only check the message itself (own profile, a chat is set), Directus cannot
 * look into the relations of the chat while creating. Without this check every account, also a
 * guest account, could write into any chat whose id it knows, and the ids of the feedback chats are
 * readable through `foods_feedbacks.chat`. The other side then sees a message that looks like an
 * answer of the support.
 *
 * Allowed are the server itself (no accountability), people with access to the Directus app
 * (support, admins) and app users who belong to the chat: as participant or as author of a
 * feedback the chat belongs to. That is the same group that may read the messages.
 */
export class ChatMessageAccessHelper {
  static getChatId(chat: unknown): string | null {
    if (typeof chat === 'string' && chat) {
      return chat;
    }
    const id = (chat as { id?: unknown } | null | undefined)?.id;
    return typeof id === 'string' && id ? id : null;
  }

  static async mayCreateMessage(accountability: Accountability | null | undefined, chat: unknown, lookup: ChatMessageAccessLookup): Promise<boolean> {
    if (!accountability) {
      return true; // the server itself, e.g. a hook or a schedule
    }
    if (AccountabilityHelper.isAppAccessAccountability(accountability)) {
      return true;
    }
    const chatId = ChatMessageAccessHelper.getChatId(chat);
    if (!accountability.user || !chatId) {
      return false;
    }
    const profileId = await lookup.getProfileIdOfUser(accountability.user);
    if (!profileId) {
      return false;
    }
    return (await lookup.isParticipant(chatId, profileId)) || (await lookup.isAuthorOfFeedbackWithChat(chatId, profileId));
  }

  /** The lookup against the database, `database` is the knex instance of the request. */
  static createDatabaseLookup(database: any): ChatMessageAccessLookup {
    const exists = async (table: string, where: Record<string, string>): Promise<boolean> => {
      const row = await database(table).select('id').where(where).first();
      return !!row;
    };
    return {
      getProfileIdOfUser: async userId => {
        const user = await database(CollectionNames.USERS).select('profile').where({ id: userId }).first();
        return typeof user?.profile === 'string' && user.profile ? user.profile : null;
      },
      isParticipant: (chatId, profileId) => exists(CollectionNames.CHATS_PARTICIPANTS, { chats_id: chatId, profiles_id: profileId }),
      isAuthorOfFeedbackWithChat: async (chatId, profileId) =>
        (await exists(CollectionNames.FOODS_FEEDBACKS, { chat: chatId, profile: profileId })) || (await exists(CollectionNames.APP_FEEDBACKS, { chat: chatId, profile: profileId })),
    };
  }
}
