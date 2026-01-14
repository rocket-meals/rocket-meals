import { DatabaseTypes, DateHelper } from 'repo-depkit-common';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';

type Interval = {
  date_start: Date;
  date_end: Date;
};

type UtiliztationContext = {
  canteen: DatabaseTypes.Canteens;
  cashregisters: DatabaseTypes.Cashregisters[];
  utilization_group: DatabaseTypes.UtilizationsGroups;
};

export class ParseSchedule {
  private readonly context: WorkflowRunContext;

  constructor(context: WorkflowRunContext) {
    this.context = context;
  }

  async parse(): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await this.context.logger.appendLog('Starting');
    await this.context.logger.appendLog('this.context.myDatabaseHelper.apiContext exists: ' + !!this.context.myDatabaseHelper.apiContext);

    try {
      // Get all Canteens
      //console.log("UtilizationSchedule: load all canteens");
      await this.context.logger.appendLog('Loading all canteens');
      let canteens = await this.getAllCanteens();
      // For every canteen, get all cashregisters
      for (let canteen of canteens) {
        await this.calcForecastForCanteen(canteen);
      }

      await this.context.logger.appendLog('Finished');
      return this.context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.SUCCESS,
      });
    } catch (err: any) {
      await this.context.logger.appendLog('Error: ' + err.toString());
      return this.context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.FAILED,
      });
    }
  }

  async calcForecastForCanteen(canteen: DatabaseTypes.Canteens) {
    //console.log("UtilizationSchedule: calc for canteen - label: "+canteen?.alias);
    await this.context.logger.appendLog('Calculating forecast for canteen - label: ' + canteen?.alias);
    //console.log(canteen);

    // for every canteen create a utilization group or find it
    await this.context.logger.appendLog('- Finding or creating utilization group for canteen: ' + canteen?.alias);
    let utilization_group_for_canteen = await this.findOrCreateOrUpdateUtilizationGroupForCanteen(canteen);

    await this.context.logger.appendLog('- utilization_group_for_canteen: ' + utilization_group_for_canteen?.id);
    if (utilization_group_for_canteen) {
      // delete all future utilization forecast entries for the canteen group
      //await this.deleteAllFutureUtilizationForecastEntries(utilization_group_for_canteen); Why should we delete all future entries? We should just update the existing ones

      // Have a list of all transactions
      await this.context.logger.appendLog('- Getting all cashregisters for canteen: ' + canteen?.alias);
      let cashregisters = await this.getAllCashregistersForCanteen(canteen);

      // calculate the prediction using as input: the transactions in the last x days, the canteen business hours
      let intervalMinutes = 15;
      let amountDaysForecast = 8;

      let dates = [];
      let today = new Date();

      today.setDate(today.getDate() - 1); // start with yesterday, so happened events can be saved as such
      for (let i = 0; i < amountDaysForecast; i++) {
        dates.push(new Date(today));
        today.setDate(today.getDate() + 1);
      }

      for (let date of dates) {
        await this.context.logger.appendLog('- Calculating forecast for date: ' + date.toISOString());

        let utilizationContext: UtiliztationContext = {
            canteen: canteen,
            cashregisters: cashregisters,
            utilization_group: utilization_group_for_canteen,
        }

        await this.updateUtilizationEntryForCanteenAtDate(utilizationContext, date, intervalMinutes);
      }
    } else {
      console.log('Houston we got a problem at calcForecastForCanteen');
    }
  }

  async createUtilizationEntry(utilization_group: DatabaseTypes.UtilizationsGroups, interval: Interval) {
    let itemService = this.context.myDatabaseHelper.getUtilizationEntriesHelper();
    await itemService.createOne({
      utilization_group: utilization_group?.id,
      date_start: DateHelper.formatDateToIso8601WithoutTimezone(interval.date_start),
      date_end: DateHelper.formatDateToIso8601WithoutTimezone(interval.date_end),
    });
  }

  async getUtilizationEntry(utilization_group: DatabaseTypes.UtilizationsGroups, interval: Interval) {
    //console.log("getUtilizationEntry");
    let itemService = this.context.myDatabaseHelper.getUtilizationEntriesHelper();

    let allFoundEntries = await itemService.readByQuery({
      filter: {
        _and: [
          {
            utilization_group: {
              _eq: utilization_group?.id,
            },
          },
          {
            date_start: {
              _eq: DateHelper.formatDateToIso8601WithoutTimezone(interval.date_start),
            },
          },
          {
            date_end: {
              _eq: DateHelper.formatDateToIso8601WithoutTimezone(interval.date_end),
            },
          },
        ],
      },
      fields: ['*'],
      limit: -1,
    });
    //console.log(allFoundEntries)
    return allFoundEntries[0];

    /**
          {
            id: 1,
            status: 'draft',
            sort: null,
            user_created: 'e2b46b90-5813-4dd7-818b-cb28900defbd',
            date_created: 1704558256553,
            user_updated: 'e2b46b90-5813-4dd7-818b-cb28900defbd',
            date_updated: 1704558879095,
            value_forecast_current: null,
            value_real: 50,
            date_start: 1703934000000,
            date_end: 1703934900000,
            utilization_group: 2
          }
         */
  }

  async countCashRegistersTransactionsForInterval(cashregisters: DatabaseTypes.Cashregisters[], interval: Interval) {
    let transactions = 0;
    //console.log("")
    //console.log("countCashRegistersTransactionsForInterval")
    //console.log("cashregister_ids")
    //console.log("date_start: "+date_start.toString()+" date_end: "+date_end.toString());
    let cashregisterHelper = this.context.myDatabaseHelper.getCashregisterHelper();

    const realisticAverage = 6000;
    const assumedMaxLimit = realisticAverage * 10; // normally during a single day only 6000 transactions are realistic, we set a limit of 10 times that value

    for (let cashregister of cashregisters) {
      //console.log("cashregister_id: "+cashregister.id);

      // Instead we need to use the itemServiceCreator
      let transactions_ids_for_cashregister = await cashregisterHelper.getTransactionIdsForCashregister(
        cashregister.id,
        interval.date_start,
        interval.date_end,
        assumedMaxLimit,
      );

      let amount_transactions_for_cashregister = transactions_ids_for_cashregister.length;
      //console.log("-- in timeslot: "+amount_transactions_for_cashregister)
      transactions += amount_transactions_for_cashregister;
    }
    //console.log("total: "+transactions)

    return transactions;
  }

  async updateUtilizationEntryForCanteenAtDate(
    utilizationContext: UtiliztationContext,
    date: Date,
    intervalMinutes: number,
  ) {
    let now = new Date();
    const { canteen, cashregisters, utilization_group } = utilizationContext;

    let interval = await this.getInterval(intervalMinutes, date);

    for (let interval_entry of interval) {
      let utilizationEntryCurrent = await this.getUtilizationEntry(utilization_group, interval_entry);
      if (!utilizationEntryCurrent) {
        // when we update an existing entry
        await this.createUtilizationEntry(utilization_group, interval_entry);
        utilizationEntryCurrent = await this.getUtilizationEntry(utilization_group, interval_entry);
      }
      //console.log("utilizationEntryCurrent");
      //console.log(utilizationEntryCurrent);

      if (!!utilizationEntryCurrent) {
        //console.log("date_start: "+date_start.toISOString()+" --> "+"date_end: "+date_end.toISOString())
        let isEntryInPast = false;
        if (interval_entry.date_start < now && interval_entry.date_end < now) {
          // if start AND end date is in the past.
          isEntryInPast = true;
        }
        //console.log("isEntryInPast: "+isEntryInPast);

        if (!isEntryInPast) {
          let utilizationContext: UtiliztationContext = {
            canteen: canteen,
            cashregisters: cashregisters,
            utilization_group: utilization_group,
          };

          utilizationEntryCurrent.value_forecast_current = await this.predictUtilizationForInterval(utilizationContext,
            interval_entry,
          );
        }
        if (isEntryInPast) {
          // we need just to count the cash register actions
          let value_real = await this.countCashRegistersTransactionsForInterval(cashregisters, interval_entry);
          //console.log("value_real: "+value_real);
          utilizationEntryCurrent.value_real = value_real;

          if (!utilization_group.all_time_high || (value_real > utilization_group.all_time_high && value_real !== 0)) {
            //console.log("new all_time_high: "+value_real)
            utilization_group.all_time_high = value_real;
            let itemService = this.context.myDatabaseHelper.getUtilizationGroupsHelper();
            await itemService.updateOne(utilization_group.id, {
              all_time_high: value_real,
            });
          }
        }

        let itemService = this.context.myDatabaseHelper.getUtilizationEntriesHelper();
        await itemService.updateOne(utilizationEntryCurrent.id, utilizationEntryCurrent);
      } else {
        console.log('Houston we got a problem');
      }
    }
  }

  /**
   * Simple prediction for the utilization of a canteen, assuming the same utilization as last week
   * TODO: Implement a more sophisticated prediction
   * @param utilization_group
   * @param cashregisters
   * @param canteen
   * @param date_start
   * @param date_end
   */
  async predictUtilizationForInterval(
    utilizationContext: UtiliztationContext,
    interval: Interval,
  ) {
    let utilization_group = utilizationContext.utilization_group;
    // calc forecast - kept very simple
    let date_start_last_week = new Date(interval.date_start);
    date_start_last_week.setDate(interval.date_start.getDate() - 7);

    let date_end_last_week = new Date(interval.date_end);
    date_end_last_week.setDate(interval.date_end.getDate() - 7);

    let utilizationEntryLastWeek = await this.getUtilizationEntry(utilization_group, {
      date_start: date_start_last_week,
      date_end: date_end_last_week,
    });
    let last_week_forecast_value = utilizationEntryLastWeek?.value_forecast_current; // if we want to predict beyond 7 days we need to predict using predicted values, better than displaying 0

    let value_forecast_current = utilizationEntryLastWeek?.value_real || last_week_forecast_value;
    return value_forecast_current;
  }

  async getInterval(intervalMinutes: number, date: Date): Promise<Interval[]> {
    let minutesPerDay = 24 * 60;
    let interval: Interval[] = [];
    let currentDate = new Date(date);

    currentDate.setHours(0, 0, 0, 0); // Set to start of the day (midnight)

    for (let i = 0; i < minutesPerDay; i += intervalMinutes) {
      let date_start = new Date(currentDate);
      date_start.setMinutes(i);

      let date_end = new Date(date_start);
      date_end.setMinutes(date_start.getMinutes() + intervalMinutes);

      /**
            // If the interval extends beyond midnight, correct the end time
            if (date_end.getDate() !== date_start.getDate()) {
                date_end = new Date(currentDate);
                date_end.setHours(23, 59, 59, 999);  // Set to the end of the day
            }
                */

      interval.push({
        date_start: date_start,
        date_end: date_end,
      });
    }

    return interval;
  }

  async getAllCanteens() {
    let itemService = this.context.myDatabaseHelper.getCanteensHelper();
    return await itemService.readByQuery({
      limit: -1,
    });
  }

  async getAllCashregistersForCanteen(canteen: DatabaseTypes.Canteens) {
    return await this.context.myDatabaseHelper.getCashregisterHelper().getCashregistersForCanteen(canteen.id);
  }

  async findOrCreateOrUpdateUtilizationGroupForCanteen(canteen: DatabaseTypes.Canteens) {
    //console.log("findOrCreateOrUpdateUtilizationGroupForCanteen")
    const canteenItemService = this.context.myDatabaseHelper.getCanteensHelper();
    let utilization_group_id = canteen?.utilization_group;
    let itemService = this.context.myDatabaseHelper.getUtilizationGroupsHelper();
    let foundOrCreatedGroup = null;
    if (utilization_group_id && typeof utilization_group_id === 'string') {
      // if group present, we have to update it
      //console.log("if(utilization_group_id){")
      foundOrCreatedGroup = await itemService.readOne(utilization_group_id);
    } else {
      // if no group present, we have to create one
      //console.log("} else {")
      let obj_json = {};
      let obj_id = await itemService.createOne(obj_json);
      foundOrCreatedGroup = await itemService.readOne(obj_id);
      // and link it to our canteen
      canteen.utilization_group = foundOrCreatedGroup?.id;

      await canteenItemService.updateOne(canteen.id, {
        utilization_group: foundOrCreatedGroup?.id,
      }); // update the canteen information
    }

    if (foundOrCreatedGroup) {
      // update the label
      //console.log("foundOrCreatedGroup");
      //console.log(foundOrCreatedGroup);
      await itemService.updateOne(foundOrCreatedGroup.id, {
        alias: canteen?.alias,
      });
      foundOrCreatedGroup = await itemService.readOne(foundOrCreatedGroup.id);
    } else {
      console.log('Error at findOrCreateOrUpdateUtilizationGroupForCanteen');
    }

    return foundOrCreatedGroup;
  }
}
