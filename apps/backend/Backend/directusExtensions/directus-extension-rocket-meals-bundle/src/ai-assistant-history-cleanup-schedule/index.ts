/**
 * ai-assistant-history-cleanup-schedule – löscht gespeicherte Unterhaltungen des Directus
 * KI-Assistenten (`ai_assistant_conversations`), die seit 90 Tagen nicht mehr fortgesetzt wurden.
 * Die Verläufe enthalten personenbezogene Daten und Datensatz-Inhalte, deshalb eine feste Löschfrist.
 */

import { CollectionNames } from 'repo-depkit-common';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';

const SCHEDULE_NAME = 'ai_assistant_history_cleanup';
const CRON_EVERY_DAY_AT_4_15_AM = '15 4 * * *';
const DAYS_TO_KEEP = 90;

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, ({ schedule }, apiContext) => {
  schedule(CRON_EVERY_DAY_AT_4_15_AM, async () => {
    try {
      const cutoff = new Date(Date.now() - DAYS_TO_KEEP * 24 * 60 * 60 * 1000).toISOString();
      const helper = new MyDatabaseHelper(apiContext).getAiAssistantConversationsHelper();
      const deleted = await helper.deleteByQuery({
        limit: -1,
        filter: {
          _or: [{ date_updated: { _lte: cutoff } }, { _and: [{ date_updated: { _null: true } }, { date_created: { _lte: cutoff } }] }],
        },
      });
      apiContext.logger.info(`${SCHEDULE_NAME}: deleted ${deleted.length} conversations of ${CollectionNames.AI_ASSISTANT_CONVERSATIONS} older than ${cutoff}`);
    } catch (error) {
      apiContext.logger.error(`${SCHEDULE_NAME}: ${error}`);
    }
  });
});
