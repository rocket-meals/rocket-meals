import { MyDefineHook } from '../helpers/MyDefineHook';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { CronHelper, DatabaseTypes } from 'repo-depkit-common';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';

const SCHEDULE_NAME = 'workflows_runs_cleanup';

const DAYS_TO_KEEP = 31;

class WorkflowsRunsCleanupWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return 'workflows-runs-cleanup';
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting workflows_runs cleanup');

    try {
      const workflowsRunsHelper = context.myDatabaseHelper.getWorkflowsRunsHelper();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
      const cutoffDateISO = cutoffDate.toISOString();

      await context.logger.appendLog('Deleting workflow_runs older than ' + cutoffDateISO);

      const oldRuns: DatabaseTypes.WorkflowsRuns[] = await workflowsRunsHelper.readByQuery({
        filter: {
          date_created: {
            _lte: cutoffDateISO,
          },
        },
        fields: ['id'],
        limit: -1,
      });

      await context.logger.appendLog('Found ' + oldRuns.length + ' workflow_runs to delete');

      if (oldRuns.length > 0) {
        const idsToDelete = oldRuns.map(r => r.id);
        await workflowsRunsHelper.deleteMany(idsToDelete);
        await context.logger.appendLog('Deleted ' + idsToDelete.length + ' workflow_runs');
      }

      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
    } catch (e) {
      await context.logger.appendLog('Error during workflow_runs cleanup: ' + (e instanceof Error ? e.message : String(e)));
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.FAILED });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ schedule }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new WorkflowsRunsCleanupWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_DAY_AT_4AM,
  });
});
