import {
  AppFeedbackChatStatusHelper,
  ChatHelper,
  CollectionNames,
  DatabaseTypes,
  DateHelper,
  MailAdresses,
} from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { HtmlTemplatesEnum } from '../helpers/html/HtmlGenerator';
import { ItemsServiceHelper } from '../helpers/ItemsServiceHelper';
import {MyDefineHook} from "../helpers/MyDefineHook";
import { HookKeysHelper } from '../helpers/HookKeysHelper';
import { AppFeedbackAnswerMail } from '../helpers/rocket-meals-module/AppFeedbackAnswerMail';
import { AppFeedbackAnswerChannel, AppFeedbackChatHelper } from '../helpers/rocket-meals-module/AppFeedbackChatHelper';
import { BackendTranslator } from '../helpers/translations/BackendTranslator';
import { AppFeedbackStateSyncHelper } from '../helpers/AppFeedbackStateSyncHelper';
import { RocketMealsModulePages } from '../helpers/rocket-meals-module/RocketMealsModulePages';

const SCHEDULE_NAME = 'activity_auto_cleanup';

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

  const chatId = await chatsHelper.createOne(
    AppFeedbackChatStatusHelper.buildChatForFeedback(app_feedback)
  );

  await chatsParticipantsHelper.createOne(ChatHelper.buildParticipant(String(chatId), String(profileId)));

  await appFeedbacksHelper.updateOne(app_feedback.id, { chat: String(chatId) });

  return String(chatId);
}

/**
 * Mail the answer of support to a feedback without profile but with a contact email. Support
 * writes it to `app_feedbacks.response` on the page "App-Feedbacks" – there is no chat nobody would
 * see. Nobody knows the language of such an author, so the mail is in the default language.
 */
async function mailResponseToContactEmail(myDatabaseHelper: MyDatabaseHelper, app_feedback: DatabaseTypes.AppFeedbacks): Promise<void> {
  if (AppFeedbackChatHelper.getAnswerChannel(app_feedback) !== AppFeedbackAnswerChannel.MAIL) {
    return;
  }
  const server_info = await myDatabaseHelper.getServerInfo();
  const mail = AppFeedbackAnswerMail.buildMailAnswer({
    feedback: app_feedback,
    answer: app_feedback.response,
    projectName: server_info?.project?.project_name || 'Rocket Meals',
    translate: BackendTranslator.getTranslator(undefined),
  });
  if (!mail) {
    return;
  }
  await myDatabaseHelper.sendMail(mail);
  console.log(`app-feedbacks-hook: Mailed the response of app feedback ${app_feedback.id} to its contact email`);
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, ({ schedule, action }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);
  const appFeedbacksHelper = myDatabaseHelper.getAppFeedbacksHelper();

  const publicUrl = myDatabaseHelper.getServerUrl();

  const toMail = MailAdresses.SupportMail;

  // The state set on a feedback (e.g. in the module "Rocket Meals") is also the state of its chat,
  // so the author sees it in the app. The other direction is in `chat-conversation-state-hook`.
  action(CollectionNames.APP_FEEDBACKS + '.items.update', async (meta, eventContext) => {
    const payload = meta.payload as Partial<DatabaseTypes.AppFeedbacks> | undefined;
    if (!payload?.state) {
      return;
    }
    try {
      await AppFeedbackStateSyncHelper.syncChatsFromFeedbacks(new MyDatabaseHelper(apiContext, eventContext), HookKeysHelper.getKeysFromMeta(meta), payload.state);
    } catch (error) {
      console.error('app-feedbacks-hook: Failed to sync the state of chats with their app feedback', error);
    }
  });

  // Only an answer in `response` to a feedback without profile but with contact email is mailed –
  // any other change of a feedback sends nothing.
  action(CollectionNames.APP_FEEDBACKS + '.items.update', async meta => {
    const payload = meta.payload as Partial<DatabaseTypes.AppFeedbacks> | undefined;
    if (!payload?.response || payload.response.trim() === '') {
      return;
    }
    for (const app_feedback_id of HookKeysHelper.getKeysFromMeta(meta)) {
      try {
        const app_feedback = await appFeedbacksHelper.readOne(app_feedback_id); // NOSONAR S9382 - sequential on purpose: one DB read and one mail per feedback key in the action hook, bounded load on Directus and the mail server
        if (app_feedback) {
          await mailResponseToContactEmail(myDatabaseHelper, app_feedback); // NOSONAR S9382 - sequential on purpose: one DB read and one mail per feedback key in the action hook, bounded load on Directus and the mail server
        }
      } catch (error) {
        console.error(`app-feedbacks-hook: Failed to mail the response of app feedback ${app_feedback_id}`, error);
      }
    }
  });

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

    // answer in the Rocket Meals module: <PUBLIC_URL>/admin/rocket-meals/app-feedbacks/f2042715-69f2-44fe-87e7-4b329b0cfab6
    const answer_to_feedback_url = RocketMealsModulePages.getAdminUrl(publicUrl, RocketMealsModulePages.APP_FEEDBACKS, String(app_feedback_id));

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
