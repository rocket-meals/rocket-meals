import {ParseSchedule} from './ParseSchedule';
import {FoodParserInterface} from './FoodParserInterface';
import {FoodTL1Parser_RawReportFtpReader} from './FoodTL1Parser_RawReportFtpReader';
import {FoodTL1Parser_RawReportUrlReader} from './FoodTL1Parser_RawReportUrlReader';
import {MarkingTL1Parser} from './MarkingTL1Parser';
import {MarkingParserInterface} from './MarkingParserInterface';
import {MyDatabaseHelper} from '../helpers/MyDatabaseHelper';
import {FoodParserWithCustomerAdaptions} from './FoodParserWithCustomerAdaptions';
import {EnvVariableHelper, SyncForCustomerEnum} from '../helpers/EnvVariableHelper';
import {WorkflowScheduleHelper} from '../workflows-runs-hook';
import {SingleWorkflowRun} from '../workflows-runs-hook/WorkflowRunJobInterface';
import {WorkflowRunContext} from '../helpers/WorkflowRunContext';
import {CronHelper, DatabaseTypes} from 'repo-depkit-common';
import {WORKFLOW_RUN_STATE} from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import {FoodAndMarkingWebParserAachen} from './aachen/FoodAndMarkingWebParserAachen';
import {MyDefineHook} from "../helpers/MyDefineHook";
import {FoodAndMarkingWebParserMuenster} from "./muenster/FoodAndMarkingWebParserMuenster";

const SCHEDULE_NAME = 'food-sync-hook';

const DIRECTUS_TL1_FOOD_PATH = '/directus/tl1/foodPlan.csv'; // This is defined in docker-compose.yaml statically
const DIRECTUS_TL1_MARKING_PATH = '/directus/tl1/markings.csv'; // This is defined in docker-compose.yaml statically

function getFoodParser(): FoodParserInterface | null {
  switch (EnvVariableHelper.getSyncForCustomer()) {
    case SyncForCustomerEnum.AACHEN:
      return new FoodAndMarkingWebParserAachen();
    case SyncForCustomerEnum.MUENSTER:
      return new FoodAndMarkingWebParserMuenster();
  }

  const FOOD_SYNC_MODE = EnvVariableHelper.getFoodSyncMode();

  switch (FOOD_SYNC_MODE) {
    case 'TL1CSV':
      /* TL1 CSV FILE */
      const FOOD_SYNC_TL1FILE_EXPORT_CSV_FILE_PATH = EnvVariableHelper.getFoodSyncTL1FileExportCsvFilePath();
      const FOOD_SYNC_TL1FILE_EXPORT_CSV_FILE_ENCODING = EnvVariableHelper.getFoodSyncTL1FileExportCsvFileEncoding();

      console.log(SCHEDULE_NAME + ': Using TL1 CSV file from host file path: ' + FOOD_SYNC_TL1FILE_EXPORT_CSV_FILE_PATH);
      const ftpFileReader = new FoodTL1Parser_RawReportFtpReader(DIRECTUS_TL1_FOOD_PATH, FOOD_SYNC_TL1FILE_EXPORT_CSV_FILE_ENCODING);

      return FoodParserWithCustomerAdaptions.getFoodParser(ftpFileReader);
    case 'TL1WEB':
      /* TL1 URL */
      const FOOD_SYNC_TL1WEB_EXPORT_URL = EnvVariableHelper.getFoodSyncTL1WebExportUrl();
      if (!FOOD_SYNC_TL1WEB_EXPORT_URL) {
        console.log(SCHEDULE_NAME + ': no URL configured for TL1WEB');
        return null;
      }

      console.log(SCHEDULE_NAME + ': Using TL1 CSV file from URL: ' + FOOD_SYNC_TL1WEB_EXPORT_URL);
      const urlReader = new FoodTL1Parser_RawReportUrlReader(FOOD_SYNC_TL1WEB_EXPORT_URL);
      return FoodParserWithCustomerAdaptions.getFoodParser(urlReader);
  }

  return null;
}

function getMarkingParser(): MarkingParserInterface | null {
  switch (EnvVariableHelper.getSyncForCustomer()) {
    case SyncForCustomerEnum.AACHEN:
      return new FoodAndMarkingWebParserAachen();
    case SyncForCustomerEnum.MUENSTER:
      return new FoodAndMarkingWebParserMuenster();
  }

  const MARKING_SYNC_MODE = EnvVariableHelper.getMarkingSyncMode();

  switch (MARKING_SYNC_MODE) {
    case 'TL1CSV':
      /* TL1 CSV FILE */
      const MARKING_SYNC_TL1FILE_EXPORT_CSV_FILE_ENCODING = EnvVariableHelper.getMarkingSyncTL1FileExportCsvFileEncoding();
      return new MarkingTL1Parser(DIRECTUS_TL1_MARKING_PATH, MARKING_SYNC_TL1FILE_EXPORT_CSV_FILE_ENCODING);
  }

  return null;
}

class FoodParseWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return 'food-sync';
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting food parsing');

    try {
      let usedFoodParser = getFoodParser();

      if (!usedFoodParser) {
        await context.logger.appendLog('no food parser configured');
      }

      let usedMarkingParser = getMarkingParser();
      if (!usedMarkingParser) {
        await context.logger.appendLog('no marking parser configured');
      }

      console.log('Parse schedule now creating');
      const parseSchedule = new ParseSchedule(context, usedFoodParser, usedMarkingParser);
      console.log('await parseSchedule.parse();');
      return await parseSchedule.parse();
    } catch (err: any) {
      console.log('Parse schedule now creating error');
      console.log('Error: ' + err.toString());
      await context.logger.appendLog('Error: ' + err.toString());
      return context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.FAILED,
      });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(SCHEDULE_NAME,async ({ action, init, filter, schedule }, apiContext) => {
  let myDatabaseHelper = new MyDatabaseHelper(apiContext);

  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new FoodParseWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_5_MINUTES,
  });
});
