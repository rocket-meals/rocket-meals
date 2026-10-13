import {ChatHelper, CollectionNames, DatabaseTypes} from 'repo-depkit-common';
import {ItemsServiceHelper} from '../helpers/ItemsServiceHelper';
import {MyDatabaseHelper} from '../helpers/MyDatabaseHelper';
import {PushNotificationHelper} from '../helpers/PushNotificationHelper';
import {AccountabilityHelper} from "../helpers/AccountabilityHelper";
import {PrimaryKey} from "@directus/types";
import {MyDefineHook} from "../helpers/MyDefineHook";
import {BackendLanguageResolver} from '../helpers/translations/BackendLanguageResolver';
import {BackendTranslationKeys} from '../helpers/translations/BackendTranslationKeys';
import {AppFeedbackStateSyncHelper} from '../helpers/AppFeedbackStateSyncHelper';
import {HookKeysHelper} from '../helpers/HookKeysHelper';
import {ChatMailDigestHelper} from '../helpers/ChatMailDigestHelper';
import {ChatMessageMailHelper} from '../helpers/ChatMessageMailHelper';
import {ApiContext} from '../helpers/ApiContext';

const HOOK_NAME = 'chat_conversation_state';

export default MyDefineHook.defineHookWithAllTablesExisting(HOOK_NAME, ({ action }, apiContext) => {
  // The state of a chat – set below on every message, or by hand in the module – is also the state
  // of its app feedbacks, so an export of `app_feedbacks` shows it.
  action(CollectionNames.CHATS + '.items.update', async (meta, eventContext) => {
    const payload = meta?.payload as Partial<DatabaseTypes.Chats> | undefined;
    if (!payload?.conversation_state) {
      return;
    }
    try {
      await AppFeedbackStateSyncHelper.syncFeedbacksFromChats(new MyDatabaseHelper(apiContext, eventContext), HookKeysHelper.getKeysFromMeta(meta), payload.conversation_state);
    } catch (error) {
      console.error(`${HOOK_NAME}: Failed to sync the state of app feedbacks with their chat`, error);
    }
  });

  action(CollectionNames.CHAT_MESSAGES + '.items.create', async (meta, eventContext) => {
    const messageId = meta?.key as string | undefined;
    if (!messageId) {
      return;
    }

    console.log(`${HOOK_NAME}: Processing new chat message with ID ${messageId}`);

    const myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);
    const chatMessagesHelper = new ItemsServiceHelper<DatabaseTypes.ChatMessages>(
      myDatabaseHelper,
      CollectionNames.CHAT_MESSAGES
    );
    const chatsHelper = new ItemsServiceHelper<DatabaseTypes.Chats>(
      myDatabaseHelper,
      CollectionNames.CHATS
    );

    const message = await chatMessagesHelper.readOne(messageId);

    console.log(`${HOOK_NAME}: Retrieved chat message:`, message);

    const chatId = message?.chat as string | undefined;
    console.log(`${HOOK_NAME}: Associated chat ID:`, chatId);
    if (!chatId) {
      return;
    }

    // Support answers from the Directus app (e.g. the module "Rocket Meals" → "Speise-Feedbacks"),
    // which is not only used by admins but also by staff roles with app access.
    let messageFromAdmin = AccountabilityHelper.isAppAccessAccountability(eventContext?.accountability || null);
    console.log(`${HOOK_NAME}: Message from admin or backend user (accountability check):`, messageFromAdmin);

    if (!messageFromAdmin) {
      const creatorId = message?.user_created as string | undefined;
      if (creatorId) {
        messageFromAdmin = await myDatabaseHelper.getUsersHelper().isAdminUser(creatorId);
      }
    }

    const conversationState = ChatHelper.getConversationStateAfterMessage(messageFromAdmin);

    console.log(`${HOOK_NAME}: Conversation state:`, conversationState);

    const messageDate = message?.date_created || new Date().toISOString();
    // `date_last_message` tells the apps a chat has something new; `date_updated` is no help there,
    // the mail digest below changes it minutes later without a new message.
    await chatsHelper.updateOne(chatId, { conversation_state: conversationState, date_last_message: messageDate });

    // Whoever writes has read the chat up to the own message, so it does not show as unread to them.
    await markReadBySender(chatId, message, messageDate, myDatabaseHelper);

    // Mails are not sent here but once the chat was quiet for a few minutes, so an active
    // conversation does not send a mail per message (see ChatMailDigestHelper). The timer runs on
    // this instance only, the check for a newer message goes through the shared database.
    try {
      const chat = await chatsHelper.readOne(chatId, { fields: ['id', 'mail_pending_since'] });
      if (!chat?.mail_pending_since) {
        await chatsHelper.updateOne(chatId, { mail_pending_since: messageDate });
      }
      scheduleMails(apiContext, chatId, messageId, messageDate);
    } catch (error) {
      console.error(`${HOOK_NAME}: Failed to note the pending mails of chat ${chatId}`, error);
    }

    // Pushes go out right away, but only for answers of support.
    if (!messageFromAdmin) {
      return;
    }

    const relatedAppFeedbacks = await findRelatedItems(() => myDatabaseHelper.getAppFeedbacksHelper().findItems({ chat: chatId }), chatId, 'app feedbacks');
    const relatedFoodFeedbacks = await findRelatedItems(() => myDatabaseHelper.getFoodFeedbacksHelper().findItems({ chat: chatId }), chatId, 'food feedbacks');

    try {
      const profilesToNotify = await collectProfilesToNotify(chatId, message, relatedAppFeedbacks, relatedFoodFeedbacks, myDatabaseHelper);
      console.log(`${HOOK_NAME}: Profiles to notify for chat ${chatId}:`, Array.from(profilesToNotify));
      await pushAnswerToProfiles(profilesToNotify, message, myDatabaseHelper);
    } catch (error) {
      console.error(`${HOOK_NAME}: Failed to send push notifications for chat message ${messageId}`, error);
    }
  });
});

/**
 * Looks into the chat {@link ChatMailDigestHelper.QUIET_MS} after a message. A restart of the
 * instance in between drops the timer; the mails then go out after the next message in the chat,
 * which still finds `mail_pending_since` set.
 */
function scheduleMails(apiContext: ApiContext, chatId: string, messageId: string, messageDate: string): void {
  const timer = setTimeout(() => {
    new ChatMessageMailHelper(new MyDatabaseHelper(apiContext)).sendMailsIfQuiet(chatId, messageId, messageDate).catch(error => {
      console.error(`${HOOK_NAME}: Failed to send the mails of chat ${chatId}`, error);
    });
  }, ChatMailDigestHelper.QUIET_MS);
  // A pending timer must not keep the process alive on shutdown.
  (timer as unknown as { unref?: () => void }).unref?.();
}

/** Sets `read_until` of the sender in `chats_participants`; support messages have no sender profile. */
async function markReadBySender(chatId: string, message: DatabaseTypes.ChatMessages, messageDate: string, myDatabaseHelper: MyDatabaseHelper): Promise<void> {
  const senderProfileId = ItemsServiceHelper.getPrimaryKeyFromItemOrString(message?.profile);
  if (!senderProfileId) {
    return;
  }
  try {
    const chatParticipantsHelper = new ItemsServiceHelper<DatabaseTypes.ChatsParticipants>(myDatabaseHelper, CollectionNames.CHATS_PARTICIPANTS);
    const participantLinks = await chatParticipantsHelper.findItems({ chats_id: chatId, profiles_id: String(senderProfileId) });
    for (const participantLink of participantLinks) {
      await chatParticipantsHelper.updateOne(participantLink.id, { read_until: messageDate }); // NOSONAR S9382 - sequential on purpose: normally exactly one row per profile and chat
    }
  } catch (error) {
    console.error(`${HOOK_NAME}: Failed to mark chat ${chatId} as read for the sender ${senderProfileId}`, error);
  }
}

/** The feedbacks a chat belongs to; empty when they cannot be read – notifications are best effort. */
async function findRelatedItems<T>(load: () => Promise<T[]>, chatId: string, label: string): Promise<T[]> {
  try {
    return await load();
  } catch (error) {
    console.error(`${HOOK_NAME}: Failed to load related ${label} for chat ${chatId}`, error);
    return [];
  }
}

/** Long answers are cut in the push – the whole text is in the chat. */
const PUSH_BODY_MAX_LENGTH = 180;

function getPushBody(text: string | null | undefined): string | undefined {
  const trimmed = (text || '').trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return trimmed.length > PUSH_BODY_MAX_LENGTH ? `${trimmed.substring(0, PUSH_BODY_MAX_LENGTH - 1)}…` : trimmed;
}

/** One push per profile with all its devices, titled in the language of the profile. */
async function pushAnswerToProfiles(
  profileIds: Set<PrimaryKey>,
  message: DatabaseTypes.ChatMessages,
  myDatabaseHelper: MyDatabaseHelper
): Promise<void> {
  if (profileIds.size === 0) {
    return;
  }

  const languageResolver = new BackendLanguageResolver(myDatabaseHelper);
  const profilesHelper = myDatabaseHelper.getProfilesHelper();
  const pushNotificationsHelper = myDatabaseHelper.getPushNotificationsHelper();
  const messageBody = getPushBody(message?.message);

  for (const profileId of profileIds) {
    try {
      const expoPushTokens = await collectExpoPushTokensForProfiles(new Set([profileId]), myDatabaseHelper); // NOSONAR S9382 - sequential on purpose: per profile DB reads and one push notification row, bounded DB load in the hook
      if (expoPushTokens.length === 0) {
        continue;
      }
      const profile = await profilesHelper.readOne(profileId).catch(() => undefined); // NOSONAR S9382 - sequential on purpose: per profile DB reads and one push notification row, bounded DB load in the hook
      const language = await languageResolver.resolveForProfile(profile); // NOSONAR S9382 - sequential on purpose: per profile DB reads and one push notification row, bounded DB load in the hook

      await pushNotificationsHelper.createOne({ // NOSONAR S9382 - sequential on purpose: per profile DB reads and one push notification row, bounded DB load in the hook
        expo_push_tokens: expoPushTokens,
        message_title: language.translate(BackendTranslationKeys.notification_support_answer_title),
        message_body: messageBody,
        // Shows the app icon with a badge until the app is opened, which resets it to 0.
        ios_badge_count: 1,
      });
      console.log(`${HOOK_NAME}: Sent a push about the support answer to profile ${profileId}`);
    } catch (error) {
      console.error(`${HOOK_NAME}: Failed to send a push to profile ${profileId}`, error);
    }
  }
}

async function collectProfilesToNotify(
  chatId: string,
  message: DatabaseTypes.ChatMessages,
  relatedAppFeedbacks: DatabaseTypes.AppFeedbacks[],
  relatedFoodFeedbacks: DatabaseTypes.FoodsFeedbacks[],
  myDatabaseHelper: MyDatabaseHelper
): Promise<Set<PrimaryKey>> {
  const profileIds = new Set<PrimaryKey>();

  try {
    const chatParticipantsHelper = new ItemsServiceHelper<DatabaseTypes.ChatsParticipants>(
      myDatabaseHelper,
      CollectionNames.CHATS_PARTICIPANTS
    );
    const participantLinks = await chatParticipantsHelper.findItems({ chats_id: chatId });
    console.log(`${HOOK_NAME}: Found ${participantLinks.length} chat participantLinks for chat ${chatId}`);

    for (const participantLink of participantLinks) {
      const participantProfileId = ItemsServiceHelper.getPrimaryKeyFromItemOrString(participantLink?.profiles_id); // Attention, not participant directly.
      if (participantProfileId) {
        profileIds.add(participantProfileId);
      }
    }
  } catch (error) {
    console.error(`${HOOK_NAME}: Failed to load chat participants for chat ${chatId}`, error);
  }

  // The authors of the feedbacks, in case they are not (yet) a participant of the chat.
  for (const feedback of [...relatedAppFeedbacks, ...relatedFoodFeedbacks]) {
    const feedbackProfileId = ItemsServiceHelper.getPrimaryKeyFromItemOrString(feedback?.profile);
    if (feedbackProfileId) {
      profileIds.add(feedbackProfileId);
    }
  }

  const senderProfileId = ItemsServiceHelper.getPrimaryKeyFromItemOrString(message?.profile);
  if (senderProfileId) {
    profileIds.delete(senderProfileId);
    console.log(`${HOOK_NAME}: Removed sender profile ${senderProfileId} from notification recipients`);
  }

  return profileIds;
}

async function collectExpoPushTokensForProfiles(
  profileIds: Set<PrimaryKey>,
  myDatabaseHelper: MyDatabaseHelper
): Promise<string[]> {
  const expoTokens = new Set<string>();

  if (profileIds.size === 0) {
    return [];
  }

  const deviceHelper = myDatabaseHelper.getDevicesHelper();
  const profileIdArray = Array.from(profileIds);

  try {
    for (const profileId of profileIdArray || []) {
      const devices = await deviceHelper.readManyByProfileId(profileId); // NOSONAR S9382 - sequential on purpose: one device read per profile in the hook, bounded DB load
      console.log(
        `${HOOK_NAME}: Found ${devices.length} devices for profile ${profileId ?? 'unknown'}`
      );

      for (const device of devices) {
        const expoToken = PushNotificationHelper.getExpoPushTokenFromDevice(device);
        if (expoToken) {
          expoTokens.add(expoToken);
        }
      }
    }
  } catch (error) {
    console.error(`${HOOK_NAME}: Failed to load devices for profiles ${profileIdArray.join(', ')}`, error);
  }

  return Array.from(expoTokens);
}
