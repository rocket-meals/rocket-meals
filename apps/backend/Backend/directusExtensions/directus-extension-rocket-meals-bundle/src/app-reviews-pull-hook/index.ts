import { CollectionNames, CronHelper, DatabaseTypes } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { AppReviewsPullHelper, PulledAppReview } from './AppReviewsPullHelper';
import { AppStoreReviewsResponseHelper } from './AppStoreReviewsResponseHelper';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import { EnvVariableHelper } from '../helpers/EnvVariableHelper';

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

      const appleAppId = EnvVariableHelper.getAppleAppId();
      const googlePlayPackageName = EnvVariableHelper.getGooglePlayPackageName();
      const privateKey = EnvVariableHelper.getAppStoreConnectPrivateKey();
      const googleServiceAccountKeyJson = EnvVariableHelper.getGooglePlayServiceAccountKeyJson();

      if (!appleAppId && !googlePlayPackageName) {
        await context.logger.appendLog('app-reviews-pull-hook: No app store IDs configured for this customer, skipping');
        return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SKIPPED });
      }

      let appleReviews: PulledAppReview[] = [];
      if (appleAppId && privateKey) {
        appleReviews = await pullHelper.pullAppleReviews(appleAppId, privateKey);
      } else if (appleAppId && !privateKey) {
        await context.logger.appendLog('app-reviews-pull-hook: Skipping Apple reviews — APP_STORE_CONNECT_PRIVATE_KEY not configured');
      } else if (!appleAppId) {
        await context.logger.appendLog('app-reviews-pull-hook: Skipping Apple reviews — no Apple App ID configured for this customer');
      }

      let googleReviews: PulledAppReview[] = [];
      if (googlePlayPackageName && googleServiceAccountKeyJson) {
        googleReviews = await pullHelper.pullGoogleReviews(googlePlayPackageName, googleServiceAccountKeyJson);
      } else if (googlePlayPackageName && !googleServiceAccountKeyJson) {
        await context.logger.appendLog('app-reviews-pull-hook: Skipping Google Play reviews — GOOGLE_PLAY_SERVICE_ACCOUNT_KEY_JSON not configured');
      } else if (!googlePlayPackageName) {
        await context.logger.appendLog('app-reviews-pull-hook: Skipping Google Play reviews — no Google Play package name configured for this customer');
      }
      const allReviews = [...appleReviews, ...googleReviews];
      const appFeedbacksHelper = myDatabaseHelper.getAppFeedbacksHelper();

      let created = 0;
      let skipped = 0;
      let updated = 0;

      for (const review of allReviews) {
        const existing = await appFeedbacksHelper.readByQuery({
          filter: { external_identifier: { _eq: review.external_identifier } },
          limit: 1,
        });

        if (existing && existing.length > 0) {
          // Sync all changed fields (title, content, rating, positive, response)
          const existingFeedback = existing[0]!;
          const titleChanged = review.title !== existingFeedback.title;
          const contentChanged = review.content !== existingFeedback.content;
          const ratingChanged = review.source_rating_raw !== existingFeedback.source_rating_raw;
          const positiveChanged = review.positive !== existingFeedback.positive;
          const storeResponse = review.response ?? null;
          const storedResponse = existingFeedback.response ?? null;
          const responseChanged = storeResponse !== storedResponse;

          if (titleChanged || contentChanged || ratingChanged || positiveChanged || responseChanged) {
            const updateData: Partial<DatabaseTypes.AppFeedbacks> = {
              title: review.title,
              content: review.content,
              source_rating_raw: review.source_rating_raw,
              positive: review.positive,
              response: storeResponse,
            };
            if (storeResponse !== null) {
              updateData.feedback_read_by_support = true;
            }
            await appFeedbacksHelper.updateOne(existingFeedback.id, updateData);
            updated++;
          } else {
            skipped++;
          }
          continue;
        }

        const createData: Partial<DatabaseTypes.AppFeedbacks> = { ...review };
        if (review.response) {
          createData.feedback_read_by_support = true;
        }
        await appFeedbacksHelper.createOne(createData);
        created++;
      }

      await context.logger.appendLog('Created ' + created + ' new reviews, updated ' + updated + ' existing reviews, skipped ' + skipped + ' unchanged');
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
    } catch (e) {
      await context.logger.appendLog('error during reviews pull: ' + (e instanceof Error ? e.message : String(e)));
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.FAILED });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ schedule, filter }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  await WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new AppReviewsPullWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_DAY_AT_20,
  });

  filter(CollectionNames.APP_FEEDBACKS + '.items.update', async (payload, meta) => {
    const payloadTyped = payload as Partial<DatabaseTypes.AppFeedbacks>;

    if (!payloadTyped.response || payloadTyped.response.trim() === '') {
      return payload;
    }

    // When response is set to non-empty text, mark as read by support
    payloadTyped.feedback_read_by_support = true;

    const filterMyDatabaseHelper = new MyDatabaseHelper(apiContext);
    const appFeedbacksHelper = filterMyDatabaseHelper.getAppFeedbacksHelper();

    const metaKeysSingle = meta.keys ? [meta.keys as string] : [];
    const keysArray: string[] = Array.isArray(meta.keys)
      ? (meta.keys as string[]).filter((id): id is string => !!id)
      : metaKeysSingle;

    const logger = {
      info: (msg: string) => apiContext.logger.info(msg),
      error: (msg: string) => apiContext.logger.error(msg),
    };

    for (const feedbackId of keysArray) {
      const feedback = await appFeedbacksHelper.readOne(feedbackId);
      if (!feedback) {
        continue;
      }

      const isConfigured = AppStoreReviewsResponseHelper.isConfiguredForSource(feedback.source_identifier);
      if (!isConfigured) {
        throw new Error(
          `Cannot set response for ${feedback.source_identifier} review: store not configured`
        );
      }

      const responseHelper = new AppStoreReviewsResponseHelper(filterMyDatabaseHelper, logger);
      await responseHelper.respondToReview({ ...feedback, response: payloadTyped.response });
    }

    return payload;
  });
});
