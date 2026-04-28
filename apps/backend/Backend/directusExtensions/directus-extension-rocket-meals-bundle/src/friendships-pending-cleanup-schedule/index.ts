import { CollectionNames, CronHelper, DatabaseTypes, FriendshipStatus } from 'repo-depkit-common';
import { ItemsServiceHelper } from '../helpers/ItemsServiceHelper';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';

const SCHEDULE_NAME = 'friendships_pending_cleanup';

const PENDING_DAYS_THRESHOLD = 31;

class FriendshipsPendingCleanupWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return 'friendships-pending-cleanup';
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting pending friendships cleanup');

    try {
      const friendshipsHelper = new ItemsServiceHelper<DatabaseTypes.Friendships>(
        context.myDatabaseHelper,
        CollectionNames.FRIENDSHIPS
      );

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - PENDING_DAYS_THRESHOLD);
      const cutoffDateISO = cutoffDate.toISOString();

      await context.logger.appendLog('Searching for pending friendships older than ' + cutoffDateISO);

      const pendingFriendships: DatabaseTypes.Friendships[] = await friendshipsHelper.readByQuery({
        filter: {
          _and: [
            { friendship_status: { _eq: FriendshipStatus.PENDING } },
            { date_created: { _lte: cutoffDateISO } },
          ],
        } as any,
        fields: ['id'],
        limit: -1,
      });

      await context.logger.appendLog('Found ' + pendingFriendships.length + ' pending friendships to delete');

      if (pendingFriendships.length > 0) {
        const idsToDelete = pendingFriendships.map(f => f.id);
        await friendshipsHelper.deleteMany(idsToDelete);
        await context.logger.appendLog('Deleted ' + idsToDelete.length + ' pending friendships');
      }

      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
    } catch (e) {
      await context.logger.appendLog('Error during pending friendship cleanup: ' + (e instanceof Error ? e.message : String(e)));
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.FAILED });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ schedule }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new FriendshipsPendingCleanupWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_WEDNESDAY_AT_20,
  });
});
