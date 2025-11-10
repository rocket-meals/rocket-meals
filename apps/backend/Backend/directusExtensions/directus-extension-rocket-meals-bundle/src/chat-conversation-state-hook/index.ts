import { defineHook } from '@directus/extensions-sdk';
import { Accountability } from '@directus/types';
import {
  ChatConversationState,
  CollectionNames,
  DatabaseTypes,
} from 'repo-depkit-common';
import { DatabaseInitializedCheck } from '../helpers/DatabaseInitializedCheck';
import { ItemsServiceHelper } from '../helpers/ItemsServiceHelper';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';

const HOOK_NAME = 'chat_conversation_state';
const REQUIRED_COLLECTIONS: CollectionNames[] = [
  CollectionNames.CHAT_MESSAGES,
  CollectionNames.CHATS,
  CollectionNames.USERS,
];

function isAdminAccountability(accountability?: Accountability | null): boolean {
  if (!accountability) {
    return false;
  }

  if (accountability.admin === true) {
    return true;
  }

  return (accountability as { adminAccess?: boolean }).adminAccess === true;
}

async function isAdminUser(userId: string, myDatabaseHelper: MyDatabaseHelper): Promise<boolean> {
  try {
    const usersHelper = myDatabaseHelper.getUsersHelper();
    const user = await usersHelper.readOne(userId, {
      fields: [
        'id',
        'policies.policy.admin_access',
        'policies.directus_policies_id.admin_access',
      ],
    });

    const policies = (user?.policies || []) as unknown[];

    return policies.some(policyEntry => {
      if (typeof policyEntry !== 'object' || policyEntry === null) {
        return false;
      }

      const access = policyEntry as {
        policy?: DatabaseTypes.DirectusPolicies | { admin_access?: boolean };
        directus_policies_id?: DatabaseTypes.DirectusPolicies | { admin_access?: boolean };
      };

      const policy = access.policy || access.directus_policies_id;
      return policy?.admin_access === true;
    });
  } catch (error) {
    console.error(`${HOOK_NAME}: Failed to resolve admin access for user ${userId}`, error);
    return false;
  }
}

export default defineHook(async ({ action }, apiContext) => {
  const tablesExist = await DatabaseInitializedCheck.checkTablesExist(
    HOOK_NAME,
    apiContext,
    REQUIRED_COLLECTIONS
  );

  if (!tablesExist) {
    return;
  }

  action(CollectionNames.CHAT_MESSAGES + '.items.create', async (meta, eventContext) => {
    const messageId = meta?.key as string | undefined;
    if (!messageId) {
      return;
    }

    const myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);
    const chatMessagesHelper = new ItemsServiceHelper<DatabaseTypes.ChatMessages>(
      myDatabaseHelper,
      CollectionNames.CHAT_MESSAGES
    );
    const chatsHelper = new ItemsServiceHelper<DatabaseTypes.Chats>(
      myDatabaseHelper,
      CollectionNames.CHATS
    );

    const message = await chatMessagesHelper.readOne(messageId, {
      fields: ['id', 'chat', 'user_created'],
    });

    const chatId = message?.chat as string | undefined;
    if (!chatId) {
      return;
    }

    let messageFromAdmin = isAdminAccountability(eventContext?.accountability || null);

    if (!messageFromAdmin) {
      const creatorId = message?.user_created as string | undefined;
      if (creatorId) {
        messageFromAdmin = await isAdminUser(creatorId, myDatabaseHelper);
      }
    }

    const conversationState = messageFromAdmin
      ? ChatConversationState.WAITING_FOR_USER
      : ChatConversationState.WAITING_FOR_SUPPORT;

    await chatsHelper.updateOne(chatId, { conversation_state: conversationState });
  });
});
