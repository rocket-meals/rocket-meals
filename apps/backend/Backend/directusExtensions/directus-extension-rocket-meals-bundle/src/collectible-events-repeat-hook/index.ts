import { CronHelper, DatabaseTypes } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';

type CollectibleEventWithTranslations = DatabaseTypes.CollectibleEvents & {
  translations?: DatabaseTypes.CollectibleEventsTranslations[];
};

const HOOK_NAME = 'collectible-events-repeat-hook';
const WORKFLOW_ID = 'collectible-events-repeat';

function sanitizeDateToYear(dateString: string, targetYear: number): string {
  const date = new Date(dateString);
  date.setUTCFullYear(targetYear);
  return date.toISOString();
}

function toISOString(date: Date): string {
  return date.toISOString();
}

function sanitizeTranslations(
  translations?: DatabaseTypes.CollectibleEventsTranslations[]
): Partial<DatabaseTypes.CollectibleEventsTranslations>[] | undefined {
  if (!Array.isArray(translations)) {
    return undefined;
  }

  return translations.map(translation => {
    const { id, collectible_events_id, languages_code, ...rest } = translation || {};
    const normalizedLanguageCode =
      typeof languages_code === 'string'
        ? languages_code
        : typeof languages_code === 'object' && languages_code?.code
          ? languages_code.code
          : undefined;

    return {
      ...rest,
      languages_code: normalizedLanguageCode,
    };
  });
}

function cloneCollectibleEvent(
  event: CollectibleEventWithTranslations,
  dateStart: string,
  dateEnd: string
): Partial<DatabaseTypes.CollectibleEvents> {
  const { id, date_created, date_updated, participants, translations, ...rest } = event;

  const clonedEvent: Partial<DatabaseTypes.CollectibleEvents> = {
    ...rest,
    date_start: dateStart,
    date_end: dateEnd,
  };

  const clonedTranslations = sanitizeTranslations(translations);
  if (clonedTranslations) {
    clonedEvent.translations = clonedTranslations;
  }

  return clonedEvent;
}

class CollectibleEventsRepeatWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return WORKFLOW_ID;
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting collectible events repeat workflow');

    const collectibleEventsHelper = context.myDatabaseHelper.getCollectibleEventsHelper();

    const today = new Date();
    const currentYear = today.getUTCFullYear();
    const lastYear = currentYear - 1;

    const lastYearStart = new Date(Date.UTC(lastYear, 0, 1));
    const lastYearEnd = new Date(Date.UTC(lastYear, 11, 31, 23, 59, 59, 999));
    const currentYearStart = new Date(Date.UTC(currentYear, 0, 1));
    const currentYearEnd = new Date(Date.UTC(currentYear, 11, 31, 23, 59, 59, 999));

    const repeatingEvents = await collectibleEventsHelper.readByQueryWithTranslations({
      filter: {
        _and: [
          { repeat_every_year: { _eq: true } },
          { date_start: { _between: [toISOString(lastYearStart), toISOString(lastYearEnd)] } },
        ],
      },
      limit: -1,
      sort: ['date_start'],
    });

    await context.logger.appendLog(`Found ${repeatingEvents.length} repeating events from ${lastYear}`);

    let createdEvents = 0;

    for (const event of repeatingEvents) {
      if (!event?.date_start || !event?.date_end) {
        await context.logger.appendLog('Skipping event without start or end date');
        continue;
      }

      const newDateStart = sanitizeDateToYear(event.date_start, currentYear);
      const newDateEnd = sanitizeDateToYear(event.date_end, currentYear);

      const overlappingEvents = await collectibleEventsHelper.readByQuery({
        filter: {
          _and: [
            { date_start: { _lte: newDateEnd } },
            { date_end: { _gte: newDateStart } },
            { date_end: { _gte: toISOString(currentYearStart) } },
            { date_start: { _lte: toISOString(currentYearEnd) } },
          ],
        },
        fields: ['id', 'date_start', 'date_end'],
        limit: 1,
      });

      if (overlappingEvents.length > 0) {
        const overlappingEvent = overlappingEvents[0];

        await context.logger.appendLog(
          `Skipping event ${event.id} due to overlap with current year event ${overlappingEvent?.id}`
        );
        continue;
      }

      const newEvent = cloneCollectibleEvent(event as CollectibleEventWithTranslations, newDateStart, newDateEnd);
      await collectibleEventsHelper.createOne(newEvent);
      createdEvents++;

      await context.logger.appendLog(`Created new collectible event for year ${currentYear} based on ${event.id}`);
    }

    await context.logger.appendLog(`Finished collectible events repeat workflow. Created ${createdEvents} new events.`);

    return context.logger.getFinalLogWithStateAndParams({
      state: WORKFLOW_RUN_STATE.SUCCESS,
      output: JSON.stringify({
        createdEvents,
        checkedEvents: repeatingEvents.length,
        targetYear: currentYear,
      }),
    });
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(HOOK_NAME, async ({ schedule }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new CollectibleEventsRepeatWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_DAY_AT_3AM,
  });
});
