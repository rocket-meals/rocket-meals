import {
  AppFeedbackContentHelper,
  ChatConversationState,
  CollectionNames,
  DatabaseTypes,
  DateHelper,
  MailAdresses,
} from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { HtmlTemplatesEnum } from '../helpers/html/HtmlGenerator';
import { ItemsServiceHelper } from '../helpers/ItemsServiceHelper';
import {MyDefineHook} from "../helpers/MyDefineHook";

const SCHEDULE_NAME = 'activity_auto_cleanup';

const CHAT_ALIAS_MAX_LENGTH = 255;
const CHAT_ALIAS_PREFIX = 'Feedback: ';

type AppFeedbackMailTemplateVariablesType = {
  subject: string;
  feedbacks: {
    id: string;
    positive: boolean | undefined | null;
    title: string;
    content: string;
    contract_email: string | undefined | null;
    profile_id: string | undefined | null;
    answer_to_feedback_url: string;
    date_created: string;
    device: {
      device_platform: string | undefined | null;
      device_brand: string | undefined | null;
      device_system_version: string | undefined | null;
      display_height: number | undefined | null;
      display_width: number | undefined | null;
      display_fontscale: number | undefined | null;
      display_pixelratio: number | undefined | null;
      display_scale: number | undefined | null;
    };
  }[];
};

/**
 * Build the chat title shown in the chat list of the app. The `Feedback: ` prefix makes it
 * obvious what kind of chat this is; the feedback id is the fallback when there is no title.
 */
function getChatAliasForAppFeedback(app_feedback: DatabaseTypes.AppFeedbacks): string {
  const title = (app_feedback.title || '').trim();
  const alias = CHAT_ALIAS_PREFIX + (title.length > 0 ? title : app_feedback.id);
  return alias.substring(0, CHAT_ALIAS_MAX_LENGTH);
}

/**
 * The first message of the chat repeats the request, so both sides see right away what the
 * conversation is about. The markdown renderer of the app turns the single newline into a
 * line break, so title and content stay on their own lines.
 */
function getChatInitialMessageForAppFeedback(app_feedback: DatabaseTypes.AppFeedbacks): string {
  const title = (app_feedback.title || '').trim();
  // Older feedbacks still carry the app state dump inside the content - never repeat that here.
  const content = AppFeedbackContentHelper.stripAppState(app_feedback.content);
  return `Title: ${title}\nContent: ${content}`;
}

/**
 * Create a support chat for a freshly created app feedback of a user with a profile, so that
 * support can answer the request directly inside the app. Anonymous feedbacks (without a
 * profile) cannot be answered via chat and are therefore skipped - those users have to
 * provide a contact email instead.
 *
 * Returns the id of the created chat or undefined when no chat was created.
 */
async function createChatForAppFeedback(
  myDatabaseHelper: MyDatabaseHelper,
  app_feedback: DatabaseTypes.AppFeedbacks
): Promise<string | undefined> {
  const profileId = ItemsServiceHelper.getPrimaryKeyFromItemOrString(app_feedback.profile);
  if (!profileId) {
    return undefined;
  }

  // Never replace an already linked chat (e.g. when the feedback was created via an import).
  const existingChatId = ItemsServiceHelper.getPrimaryKeyFromItemOrString(app_feedback.chat);
  if (existingChatId) {
    return String(existingChatId);
  }

  const chatsHelper = myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.Chats>(CollectionNames.CHATS);
  const chatsParticipantsHelper = myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.ChatsParticipants>(
    CollectionNames.CHATS_PARTICIPANTS
  );
  const appFeedbacksHelper = myDatabaseHelper.getAppFeedbacksHelper();

  const chatId = await chatsHelper.createOne({
    alias: getChatAliasForAppFeedback(app_feedback),
    initial_message: getChatInitialMessageForAppFeedback(app_feedback),
    conversation_state: ChatConversationState.WAITING_FOR_SUPPORT,
  });

  await chatsParticipantsHelper.createOne({
    chats_id: String(chatId),
    profiles_id: String(profileId),
  });

  await appFeedbacksHelper.updateOne(app_feedback.id, { chat: String(chatId) });

  return String(chatId);
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ schedule, action }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);
  const appFeedbacksHelper = myDatabaseHelper.getAppFeedbacksHelper();

  const publicUrl = myDatabaseHelper.getServerUrl();

  const toMail = MailAdresses.SupportMail;

  action(CollectionNames.APP_FEEDBACKS + '.items.create', async meta => {
    let app_feedback_id = meta.key;

    let app_feedback = await appFeedbacksHelper.readOne(app_feedback_id);
    if (!app_feedback) {
      return;
    }

    try {
      await createChatForAppFeedback(myDatabaseHelper, app_feedback);
    } catch (error) {
      // A failing chat creation must not swallow the notification mail to support.
      console.error(`app-feedbacks-hook: Failed to create chat for app feedback ${app_feedback_id}`, error);
    }

    const server_info = await myDatabaseHelper.getServerInfo();
    const project_name = server_info?.project?.project_name || 'Rocket Meals';

    const now = new Date();
    const humanReadableDate = DateHelper.getHumanReadableDateAndTime(now);
    const subject = project_name + ' - App Feedbacks - ' + humanReadableDate;

    const dateCreated = new Date(app_feedback.date_created || new Date());
    const dateHumanReadable = DateHelper.getHumanReadableDateAndTime(dateCreated);

    // answer to the feedback url: <PUBLIC_URL>/admin/content/app_feedbacks/f2042715-69f2-44fe-87e7-4b329b0cfab6
    const answer_to_feedback_url = publicUrl + '/admin/content/app_feedbacks/' + app_feedback_id;

    const app_feedback_device = {
      device_platform: app_feedback.device_platform,
      device_brand: app_feedback.device_brand,
      device_system_version: app_feedback.device_system_version,
      display_height: app_feedback.display_height,
      display_width: app_feedback.display_width,
      display_fontscale: app_feedback.display_fontscale,
      display_pixelratio: app_feedback.display_pixelratio,
      display_scale: app_feedback.display_scale,
    };

    const data: AppFeedbackMailTemplateVariablesType = {
      subject: subject,
      feedbacks: [
        {
          id: app_feedback.id,
          positive: app_feedback.positive,
          title: app_feedback.title || 'Kein Titel',
          content: app_feedback.content || 'Kein Inhalt',
          contract_email: app_feedback.contact_email,
          profile_id: app_feedback.profile as string | undefined | null,
          answer_to_feedback_url: answer_to_feedback_url,
          date_created: dateHumanReadable,
          device: app_feedback_device,
        },
      ],
    };

    await myDatabaseHelper.sendMail({
      recipient: toMail,
      subject: subject,
      template_name: HtmlTemplatesEnum.APP_FEEDBACKS,
      template_data: data,
    });
  });
});
