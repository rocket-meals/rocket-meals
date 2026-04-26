import { ALL_CUSTOMER_APP_STORE_IDS, CollectionNames, CronHelper, DatabaseTypes } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { AppReviewsPullHelper } from './AppReviewsPullHelper';
import { AppStoreReviewsResponseHelper } from './AppStoreReviewsResponseHelper';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';

const SCHEDULE_NAME = 'app_reviews_pull';

class AppReviewsPullWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return 'app-reviews-pull';
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    const myDatabaseHelper = context.myDatabaseHelper;
    const logger = {
      info: async (msg: string) => { await context.logger.appendLog(msg); },
      error: async (msg: string) => { await context.logger.appendLog('ERROR: ' + msg); },
    };

    try {
      const pullHelper = new AppReviewsPullHelper(logger);

      const reviewsByCustomer = await Promise.allSettled(
        ALL_CUSTOMER_APP_STORE_IDS.map(async (customerIds) => {
          const appleReviews = customerIds.appleAppId
            ? await pullHelper.pullAppleReviews(customerIds.appleAppId)
            : [];
          const googleReviews = customerIds.googlePlayPackageName
            ? await pullHelper.pullGoogleReviews(customerIds.googlePlayPackageName)
            : [];
          return [...appleReviews, ...googleReviews];
        })
      );

      const allReviews = reviewsByCustomer.flatMap((result) => {
        if (result.status === 'fulfilled') {
          return result.value;
        }
        void context.logger.appendLog('ERROR: Failed to pull reviews for a customer: ' + (result.reason instanceof Error ? result.reason.message : String(result.reason)));
        return [];
      });
      const appFeedbacksHelper = myDatabaseHelper.getAppFeedbacksHelper();

      let created = 0;
      let skipped = 0;

      for (const review of allReviews) {
        const { external_identifier: _externalId, ...reviewData } = review;
        const existing = await appFeedbacksHelper.readByQuery({
          filter: {
            source_identifier: { _eq: review.source_identifier },
            title: { _eq: review.title ?? null },
            content: { _eq: review.content ?? null },
          },
          limit: 1,
        });

        if (existing && existing.length > 0) {
          skipped++;
          continue;
        }

        await appFeedbacksHelper.createOne(reviewData);
        created++;
      }

      await context.logger.appendLog('Created ' + created + ' new reviews, skipped ' + skipped + ' duplicates');
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
    } catch (e) {
      await context.logger.appendLog('error during reviews pull: ' + (e instanceof Error ? e.message : String(e)));
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.FAILED });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ action, schedule }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  await WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new AppReviewsPullWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_DAY_AT_20,
  });

  action(CollectionNames.APP_FEEDBACKS + '.items.update', async meta => {
    const updatedFields: string[] = meta.payload ? Object.keys(meta.payload) : [];
    if (!updatedFields.includes('response')) {
      return;
    }

    try {
      const myDatabaseHelper = new MyDatabaseHelper(apiContext);
      const appFeedbacksHelper = myDatabaseHelper.getAppFeedbacksHelper();
      const feedbackId = meta.key as string;
      const feedback = await appFeedbacksHelper.readOne(feedbackId);

      if (!feedback) {
        return;
      }

      const logger = {
        info: (msg: string) => apiContext.logger.info(msg),
        error: (msg: string) => apiContext.logger.error(msg),
      };

      const responseHelper = new AppStoreReviewsResponseHelper(myDatabaseHelper, logger);
      await responseHelper.respondToReview(feedback);
    } catch (e) {
      apiContext.logger.error(SCHEDULE_NAME + ': error responding to store review: ' + (e instanceof Error ? e.message : String(e)));
      apiContext.logger.error(e);
    }
  });
});
