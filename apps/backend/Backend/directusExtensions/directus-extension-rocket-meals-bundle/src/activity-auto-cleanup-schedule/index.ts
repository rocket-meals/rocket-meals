import { ActivityServiceCreator } from '../helpers/ItemsServiceCreator';
import { CronHelper, DatabaseTypes } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';

const SCHEDULE_NAME = 'activity_auto_cleanup';

// https://www.datenschutz-notizen.de/ip-adressen-und-datenschutz-teil-iii-speicherfristen-0634313/
// https://www.datenschutz-notizen.de/speicherdauer-von-logfiles-innerhalb-des-unternehmensnetzwerks-1344161/
const MAX_MINUTES_TO_KEEP: number = 60 * 24 * 30; // 30 days

class ActivityAutoCleanupWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return 'activity-auto-cleanup';
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting activity auto cleanup');

    try {
      const activityServiceCreator = new ActivityServiceCreator(context.myDatabaseHelper.apiContext);
      const activityService = await activityServiceCreator.getActivityService();

      const FIELD_TIMESTAMP = 'timestamp';

      await context.logger.appendLog('Deleting old activity logs');
      let now = new Date();
      let nowMinusMaxDays = new Date();
      nowMinusMaxDays.setMinutes(now.getMinutes() - MAX_MINUTES_TO_KEEP);
      let nowMinusMaxDaysISO = nowMinusMaxDays.toISOString();
      await context.logger.appendLog('Cutoff date: ' + nowMinusMaxDaysISO);

      const query = {
        limit: -1,
        filter: {
          _and: [
            {
              [FIELD_TIMESTAMP]: {
                _lte: nowMinusMaxDaysISO,
              },
            },
          ],
        },
      };

      await activityService.deleteByQuery(query);
      await context.logger.appendLog('Activity cleanup completed');

      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
    } catch (e) {
      await context.logger.appendLog('Error during activity cleanup: ' + (e instanceof Error ? e.message : String(e)));
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.FAILED });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ schedule }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new ActivityAutoCleanupWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_DAY_AT_4AM,
  });
});
