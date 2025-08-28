import { defineHook } from '@directus/extensions-sdk';
import { DatabaseInitializedCheck } from '../helpers/DatabaseInitializedCheck';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { ItemsServiceHelper } from '../helpers/ItemsServiceHelper';
import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';

const HOOK_NAME = 'chat_message_notify';

export default defineHook(async ({ action }, apiContext) => {
  const allTablesExist = await DatabaseInitializedCheck.checkAllTablesExistWithApiContext(
    HOOK_NAME,
    apiContext,
  );
  if (!allTablesExist) {
    return;
  }

  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  action(CollectionNames.CHAT_MESSAGES + '.items.create', async meta => {
    const chatMessageId = meta.key as string;

    const chatMessageService = new ItemsServiceHelper<DatabaseTypes.ChatMessages>(
      myDatabaseHelper,
      CollectionNames.CHAT_MESSAGES,
    );
    const chatsParticipantsService = new ItemsServiceHelper<DatabaseTypes.ChatsParticipants>(
      myDatabaseHelper,
      CollectionNames.CHATS_PARTICIPANTS,
    );
    const profilesService = myDatabaseHelper.getProfilesHelper();
    const pushNotificationService = myDatabaseHelper.getPushNotificationsHelper();

    const chatMessage = await chatMessageService.readOne(chatMessageId, { fields: ['*'] });
    const chatId = chatMessage.chat as string | undefined;
    if (!chatId) {
      return;
    }

    const participants = await chatsParticipantsService.findItems(
      { chats_id: chatId },
      { fields: ['profiles_id'] },
    );

    const expoTokensSet = new Set<string>();

    for (const participant of participants) {
      const profileId = participant.profiles_id as string | undefined;
      if (!profileId) continue;
      const profile = await profilesService.readOne(profileId, { fields: ['devices.*'] });
      const devices = profile.devices as DatabaseTypes.Devices[] | undefined;
      if (!devices) continue;
      for (const device of devices) {
        const token = getExpoPushTokenFromDevice(device);
        if (token) {
          expoTokensSet.add(token);
        }
      }
    }

    const expoTokens = Array.from(expoTokensSet);
    if (expoTokens.length === 0) {
      return;
    }

    const pushNotificationObj: Partial<DatabaseTypes.PushNotifications> = {
      expo_push_tokens: expoTokens,
      message_title: 'Neue Chat Nachricht',
      message_body: chatMessage.message || '',
      message_data: { chat_id: chatId, chat_message_id: chatMessageId },
    };

    await pushNotificationService.createOne(pushNotificationObj);
  });

  function getExpoPushTokenFromDevice(device: DatabaseTypes.Devices): string | undefined {
    const pushTokenObj: any = device.pushTokenObj;
    return pushTokenObj?.pushtokenObj?.data;
  }
});
