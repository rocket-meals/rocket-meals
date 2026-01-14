import { WashingmachineParseSchedule } from './WashingmachineParseSchedule';
import { defineHook } from '@directus/extensions-sdk';
import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import { DemoWashingmachineParser } from './testParser/DemoWashingmachineParser';
import { WashingmachineParserInterface } from './WashingmachineParserInterface';
import { EnvVariableHelper, SyncForCustomerEnum } from '../helpers/EnvVariableHelper';
import { StudentenwerkOsnabrueckWashingmachineParser } from './osnabrueck/StudentenwerkOsnabrueckWashingmachineParser';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { RegisterFunctions } from '@directus/extensions';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import {CronHelper, CronObject} from "repo-depkit-common";
import {MyDefineHook} from "../helpers/MyDefineHook";
const HOOK_NAME = 'washingmachines-sync-hook';
function registerWashingmachinesFilterUpdate(apiContext: any, registerFunctions: RegisterFunctions) {
  const { filter } = registerFunctions;
  // Washingmachines Jobs Creation
  filter<DatabaseTypes.Washingmachines>(CollectionNames.WASHINGMACHINES + '.items.update', async (input: DatabaseTypes.Washingmachines, { keys, collection }, eventContext) => {
    // Fetch the current item from the database
    if (!keys || keys.length === 0) {
      throw new Error('No keys provided for update');
    }
    let washingmachines_ids = keys;
    let washingmachine_new: Partial<DatabaseTypes.Washingmachines> = input;
    let new_date_finished = washingmachine_new.date_finished;

    const hasWashingmachineNewPropertyDateFinished = Object.prototype.hasOwnProperty.call(washingmachine_new, 'date_finished');

    if (hasWashingmachineNewPropertyDateFinished && new_date_finished === null) {
      let myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);
      if (!!washingmachines_ids) {
        for (let washingmachine_id of washingmachines_ids) {
          let washingmachine_curent = await myDatabaseHelper.getWashingmachinesHelper().readOne(washingmachine_id);

          let current_date_stated = washingmachine_curent.date_stated;
          let current_date_finished = washingmachine_curent.date_finished;

          if (!!current_date_stated && !!current_date_finished) {
            // currently washing
            // then save it as a finished washing job
            let time_diff = new Date(current_date_finished).getTime() - new Date(current_date_stated).getTime();
            if (time_diff > 0) {
              const durationInMilliseconds = time_diff;
              const millisecondsInDay = 24 * 60 * 60 * 1000;
              // Postgres time fields do not accept 24:xx:xx, so we cap durations at 23:59:59.
              const maxPostgresTimeValueMilliseconds = millisecondsInDay - 1000; // 23:59:59
              const cappedDurationInMilliseconds = Math.min(
                durationInMilliseconds,
                maxPostgresTimeValueMilliseconds
              );

              if (durationInMilliseconds > maxPostgresTimeValueMilliseconds) {
                console.log(
                  `Capping washingmachine job duration to 23:59:59. date_start=${current_date_stated}, date_end=${current_date_finished}, washingmachine=${washingmachine_curent.id}`
                );
              }

              const time_hours = Math.floor(cappedDurationInMilliseconds / 1000 / 60 / 60);
              const time_minutes = Math.floor((cappedDurationInMilliseconds / 1000 / 60) % 60);
              const time_seconds = Math.floor((cappedDurationInMilliseconds / 1000) % 60);
              const hh_mm_ss = time_hours + ':' + time_minutes + ':' + time_seconds;

              const duration_in_minutes = parseInt(cappedDurationInMilliseconds / 1000 / 60 + ''); // Total duration in minutes

              // Round duration to the nearest 10-minute interval
              const duration_rounded_10min_calculated = Math.ceil(duration_in_minutes / 10) * 10;

              let partialWashingmachineJob: Partial<DatabaseTypes.WashingmachinesJobs> = {
                date_start: current_date_stated,
                date_end: current_date_finished,
                duration_calculated: hh_mm_ss,
                duration_in_minutes_calculated: duration_in_minutes,
                duration_in_minutes_rounded_10min_calculated: duration_rounded_10min_calculated,
                washingmachine: washingmachine_curent.id,
                apartment: washingmachine_curent.apartment,
              };

              await myDatabaseHelper.getWashingmachinesJobsHelper().createOne(partialWashingmachineJob);
            }
          }
        }
      }
    }

    return input;
  });
}

class WashingmachinesWorkflow extends SingleWorkflowRun {
  private readonly usedParser: WashingmachineParserInterface;

  constructor(usedParser: WashingmachineParserInterface) {
    super();
    this.usedParser = usedParser;
  }

  getWorkflowId(): string {
    return 'washingmachines-parse';
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting washingmachine parsing');

    const parseSchedule = new WashingmachineParseSchedule(context, this.usedParser);
    try {
      return await parseSchedule.parse();
    } catch (err: any) {
      await context.logger.appendLog('Error: ' + err.toString());
      return context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.FAILED,
      });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(HOOK_NAME,async (registerFunctions: RegisterFunctions, apiContext) => {
  const { action, filter, schedule } = registerFunctions;

  registerWashingmachinesFilterUpdate(apiContext, registerFunctions);

  let usedParser: WashingmachineParserInterface | null = null;
  switch (EnvVariableHelper.getSyncForCustomer()) {
    case SyncForCustomerEnum.TEST:
      usedParser = new DemoWashingmachineParser();
      break;
    case SyncForCustomerEnum.HANNOVER:
      usedParser = null;
      break;
    case SyncForCustomerEnum.OSNABRUECK:
      usedParser = new StudentenwerkOsnabrueckWashingmachineParser();
      break;
  }

  if (!usedParser) {
    console.log('No Parser set for Washingmachine Sync');
    return;
  }

  let myDatabaseHelper = new MyDatabaseHelper(apiContext);

  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new WashingmachinesWorkflow(usedParser),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_DAY_AT_17_59,
  });
});
