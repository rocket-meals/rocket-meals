/**
 * workflows-schedules-endpoint – which workflows this server runs and when they fire next.
 *
 * `GET /rocket-meals-workflows/schedules` answers with one entry per registered workflow:
 * `{ workflow_id, cron, next_runs, input_template, blocked_reason }` (`WorkflowScheduleInfo`). The page "Workflows"
 * of the Rocket Meals module needs it, because the schedules live in the code of the hooks
 * (`WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns`), not in the database.
 *
 * The next runs are computed here and not in the browser: Directus fires the schedules in the time
 * zone of the server (`TZ` of the container), which need not be the one of the person looking.
 *
 * `blocked_reason` tells the page that a workflow cannot do its job here, e.g. it needs the AI
 * (`requiresAi`) and no OpenAI-compatible provider is configured under Settings → AI.
 *
 * Only for logged-in users with access to the Directus app; reveals nothing but workflow ids, their schedules and whether an AI
 * provider is configured (never which one).
 */

import { defineEndpoint } from '@directus/extensions-sdk';
import { Accountability } from '@directus/types';
import { WorkflowScheduler } from '../workflows-runs-hook';
import { CronScheduleHelper } from '../helpers/CronScheduleHelper';
import { WorkflowBlockedReason, WorkflowScheduleInfo, WorkflowsPageHelper, WorkflowsSchedulesResponse } from '../helpers/rocket-meals-module/WorkflowsPageHelper';
import { DirectusOpenAiCompatibleClient } from '../helpers/ai/DirectusOpenAiCompatibleClient';
import { ApiContext } from '../helpers/ApiContext';
import { AccountabilityHelper } from '../helpers/AccountabilityHelper';

const ENDPOINT_ID = 'rocket-meals-workflows';

function getNextRuns(cron: string | undefined, now: Date): string[] {
  if (!cron) {
    return [];
  }
  try {
    return CronScheduleHelper.getNextRuns(cron, now, WorkflowsPageHelper.UPCOMING_RUNS).map(date => date.toISOString());
  } catch (error) {
    console.error(ENDPOINT_ID + ': cannot read cron string ' + cron, error);
    return [];
  }
}

/** Whether an AI provider is configured; a settings read that fails counts as not configured. */
async function isAiConfigured(apiContext: ApiContext): Promise<boolean> {
  try {
    return (await DirectusOpenAiCompatibleClient.fromDirectusSettings(apiContext)) !== null;
  } catch (error) {
    console.error(ENDPOINT_ID + ': cannot read the AI settings', error);
    return false;
  }
}

export default defineEndpoint({
  id: ENDPOINT_ID,
  handler: (router, apiContext: ApiContext) => {
    router.get('/schedules', async (req: any, res: any) => {
      const accountability = req?.accountability as Accountability | undefined;
      if (!accountability?.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      // The page lives in the Directus app. App users and guests have no business with the workflows.
      if (!AccountabilityHelper.isAppAccessAccountability(accountability)) {
        return res.status(403).json({ error: 'Only for users of the Directus app.' });
      }

      const now = new Date();
      const workflowIds = WorkflowScheduler.getRegisteredWorkflowsIds();
      const needsAi = workflowIds.some(workflowId => WorkflowScheduler.getRegisteredWorkflow(workflowId)?.requiresAi?.() === true);
      const aiConfigured = needsAi ? await isAiConfigured(apiContext) : true;
      const data: WorkflowScheduleInfo[] = workflowIds.map(workflowId => {
        const cron = WorkflowScheduler.getRegisteredSchedule(workflowId);
        const workflow = WorkflowScheduler.getRegisteredWorkflow(workflowId);
        return {
          workflow_id: workflowId,
          cron: cron ?? null,
          next_runs: getNextRuns(cron, now),
          input_template: workflow?.getInputTemplate?.() ?? null,
          blocked_reason: workflow?.requiresAi?.() === true && !aiConfigured ? WorkflowBlockedReason.AI_NOT_CONFIGURED : null,
        };
      });
      const response: WorkflowsSchedulesResponse = { data };
      res.set('Cache-Control', 'no-store');
      return res.json(response);
    });
  },
});
