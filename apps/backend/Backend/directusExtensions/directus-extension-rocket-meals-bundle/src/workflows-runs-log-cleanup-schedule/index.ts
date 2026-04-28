import { MyDefineHook } from '../helpers/MyDefineHook';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { CronHelper, DatabaseTypes } from 'repo-depkit-common';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';

const SCHEDULE_NAME = 'workflows_runs_log_cleanup';

const DAYS_TO_KEEP_LOGS = 60;

class WorkflowsRunsLogCleanupWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return 'workflows-runs-log-cleanup';
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting workflow_runs log cleanup');

    try {
      const workflowsRunsHelper = context.myDatabaseHelper.getWorkflowsRunsHelper();

      const now = new Date();
      const cutoffDate = new Date();
      cutoffDate.setDate(now.getDate() - DAYS_TO_KEEP_LOGS);
      const cutoffDateISO = cutoffDate.toISOString();

      await context.logger.appendLog('Clearing logs for workflow_runs older than ' + cutoffDateISO);

      const oldRunsWithLog: DatabaseTypes.WorkflowsRuns[] = await workflowsRunsHelper.readByQuery({
        filter: {
          _and: [
            {
              date_created: {
                _lte: cutoffDateISO,
              },
            },
            {
              log: {
                _null: false,
              },
            },
          ],
        },
        fields: ['id'],
        limit: -1,
      });

      await context.logger.appendLog('Found ' + oldRunsWithLog.length + ' workflow_runs with logs to clear');

      if (oldRunsWithLog.length > 0) {
        const update: Partial<DatabaseTypes.WorkflowsRuns> = {
          log: null,
        };
        await workflowsRunsHelper.updateManyByItems(oldRunsWithLog, update);
        await context.logger.appendLog('Cleared logs for ' + oldRunsWithLog.length + ' workflow_runs');
      }

      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
    } catch (e) {
      await context.logger.appendLog('Error during log cleanup: ' + (e instanceof Error ? e.message : String(e)));
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.FAILED });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ schedule }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new WorkflowsRunsLogCleanupWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_DAY_AT_3AM,
  });
});
