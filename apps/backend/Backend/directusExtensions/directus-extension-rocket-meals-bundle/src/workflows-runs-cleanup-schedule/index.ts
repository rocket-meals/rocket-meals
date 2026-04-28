import { MyDefineHook } from '../helpers/MyDefineHook';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { DatabaseTypes } from 'repo-depkit-common';

const SCHEDULE_NAME = 'workflows_runs_cleanup';

const DAYS_TO_KEEP = 31;

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ schedule }, apiContext) => {
  const cronFrequency = '0 4 * * *'; // every day at 4 AM

  schedule(cronFrequency, async () => {
    apiContext.logger.info(SCHEDULE_NAME + ': start schedule run: ' + new Date().toISOString());

    try {
      const myDatabaseHelper = new MyDatabaseHelper(apiContext);
      const workflowsRunsHelper = myDatabaseHelper.getWorkflowsRunsHelper();

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
      const cutoffDateISO = cutoffDate.toISOString();

      apiContext.logger.info(SCHEDULE_NAME + ': deleting workflow_runs older than ' + cutoffDateISO);

      const oldRuns: DatabaseTypes.WorkflowsRuns[] = await workflowsRunsHelper.readByQuery({
        filter: {
          date_created: {
            _lte: cutoffDateISO,
          },
        },
        fields: ['id'],
        limit: -1,
      });

      apiContext.logger.info(SCHEDULE_NAME + ': found ' + oldRuns.length + ' workflow_runs to delete');

      if (oldRuns.length > 0) {
        const idsToDelete = oldRuns.map(r => r.id);
        await workflowsRunsHelper.deleteMany(idsToDelete);
        apiContext.logger.info(SCHEDULE_NAME + ': deleted ' + idsToDelete.length + ' workflow_runs');
      }
    } catch (e) {
      apiContext.logger.error(SCHEDULE_NAME + ': error during workflow_runs cleanup: ' + (e instanceof Error ? e.message : String(e)));
      apiContext.logger.error(e);
    }
  });
});
