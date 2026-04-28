import { ReportSchedule } from './ReportSchedule';
import { CollectionNames, CronHelper, DatabaseTypes } from 'repo-depkit-common';
import { MyDefineHook } from '../helpers/MyDefineHook';

const SCHEDULE_NAME = 'food_feedback_report';

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME, async ({ schedule, filter }, apiContext) => {

  const collection = CollectionNames.CANTEEN_FOOD_FEEDBACK_REPORT_SCHEDULES;

  // filter all update actions where from value running to start want to change, since this is not allowed
  filter<Partial<DatabaseTypes.CanteenFoodFeedbackReportSchedules>>(collection + '.items.update', async (modifiable_payload: Partial<DatabaseTypes.CanteenFoodFeedbackReportSchedules>, meta, eventContext) => {
    const keys = meta.keys;
    // Fetch the current item from the database
    if (!keys || keys.length === 0) {
      throw new Error('No keys provided for update');
    }

    const doesModifiablePayloadHasDateNextReportIsDueSet = !!modifiable_payload.date_next_report_is_due;

    if (!doesModifiablePayloadHasDateNextReportIsDueSet) {
      const reportSchedule = new ReportSchedule(apiContext, eventContext);
      let hasAnyTimeSettingsChanged = false;
      for (const key of keys) {
        const currentItem = await reportSchedule.getCanteenFoodFeedbackReportScheduleById(key);
        if (currentItem) {
          const haveTimeSettingsChanged = ReportSchedule.haveTimeSettingsChanged(currentItem, modifiable_payload);
          if (haveTimeSettingsChanged) {
            hasAnyTimeSettingsChanged = true;
            break;
          }
        }
      }
      if (hasAnyTimeSettingsChanged) {
        modifiable_payload.date_next_report_is_due = null; // reset the date_next_report_is_due, so it will be recalculated
      }
    }

    return modifiable_payload;
  });

  const parseSchedule = new ReportSchedule(apiContext);
  const cronString = CronHelper.getCronString(CronHelper.EVERY_20_SECONDS);

  schedule(cronString, async () => {
    await parseSchedule.run();
  });
});
