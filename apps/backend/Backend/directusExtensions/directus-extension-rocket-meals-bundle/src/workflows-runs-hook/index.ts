import {defineHook} from "@directus/extensions-sdk";
import {CollectionNames} from "repo-depkit-common";
import {DatabaseInitializedCheck} from "../helpers/DatabaseInitializedCheck";
import {MyDatabaseHelper} from "../helpers/MyDatabaseHelper";
import {DatabaseTypes} from "repo-depkit-common"
import {registerInitHook} from "../helpers/InitHookAfterMigrationHelper";
import {PrimaryKey, ScheduleHandler} from "@directus/types";
import {WorkflowRunJobInterface, WorkflowRunLogger} from "./WorkflowRunJobInterface";
import {WORKFLOW_RUN_STATE} from "../helpers/itemServiceHelpers/WorkflowsRunEnum";

const SCHEDULE_NAME = "workflows_hook";

export type CronObject = {
    seconds: string | number,
    minutes: string | number,
    hours: string | number,
    dayOfMonth: string | number,
    month: string | number,
    dayOfWeek: string | number,
}

export type ScheduleFromExtension = (cron: string, handler: ScheduleHandler) => void;

export class WorkflowScheduleHelper {
    static getCronString(cronObject: CronObject): string {
        return cronObject.seconds + " " + cronObject.minutes + " " + cronObject.hours + " " + cronObject.dayOfMonth + " " + cronObject.month + " " + cronObject.dayOfWeek;
    }

    static EVERY_HOUR: CronObject = {
        seconds: 0,
        minutes: 0,
        hours: "*",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*"
    }

    static EVERY_MINUTE: CronObject = {
        seconds: 0,
        minutes: "*",
        hours: "*",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*"
    }

    static EVERY_5_MINUTES: CronObject = {
        seconds: 0,
        minutes: "*/5",
        hours: "*",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*"
    }

    static EVERY_MONTH_AT_1AM: CronObject = {
        seconds: 0,
        minutes: 0,
        hours: 1,
        dayOfMonth: 1,
        month: "*",
        dayOfWeek: "*"
    }

    static EVERY_15_MINUTES: CronObject = {
        seconds: 0,
        minutes: "*/15",
        hours: "*",
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*"
    }

    static EVERY_DAY_AT_17_59: CronObject = {
        seconds: 0,
        minutes: 59,
        hours: 17,
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*"
    }

    static EVERY_DAY_AT_4AM: CronObject = {
        seconds: 0,
        minutes: 0,
        hours: 4,
        dayOfMonth: "*",
        month: "*",
        dayOfWeek: "*"
    }

    static async createWorkflowRunInstance(workflowId: string, myDatabaseHelper: MyDatabaseHelper): Promise<void> {
        await myDatabaseHelper.getWorkflowsRunsHelper().createOne({
            workflow: workflowId,
            state: WORKFLOW_RUN_STATE.RUNNING,
        });
    }

    static async registerScheduleToRunWorkflowRuns(config: {
        workflowRunInterface: WorkflowRunJobInterface,
        cronOject: CronObject,
        myDatabaseHelper: MyDatabaseHelper,
        schedule: ScheduleFromExtension
                                                      }): Promise<void> {
        WorkflowScheduler.registerWorkflow(config.workflowRunInterface)
        await WorkflowScheduleHelper.registerScheduleToCreateWorkflowRuns({
            workflowId: config.workflowRunInterface.getWorkflowId(),
            cronOject: config.cronOject,
            myDatabaseHelper: config.myDatabaseHelper,
            schedule: config.schedule
        });
    }

    static async registerScheduleToCreateWorkflowRuns(config: {
        workflowId: string,
        cronOject: CronObject,
        myDatabaseHelper: MyDatabaseHelper,
        schedule: ScheduleFromExtension
    }): Promise<void> {
        let cronString = WorkflowScheduleHelper.getCronString(config.cronOject);
        config.schedule(cronString, async () => {
            try{
                let workflowId = config.workflowId;
                await createWorkflowIfNotExisting(workflowId, config.myDatabaseHelper);
                let workflow = await config.myDatabaseHelper.getWorkflowsHelper().readOne(workflowId);
                let enabled = workflow?.enabled;
                if(enabled){ // schedule will only create a workflow run if the workflow is enabled
                    await WorkflowScheduleHelper.createWorkflowRunInstance(config.workflowId, config.myDatabaseHelper);
                }
            } catch (e) {
                console.error("Error while creating workflow run for workflowId: "+config.workflowId+" for workflow schedule: "+cronString);
                console.error(e);
            }
        });
    }

}

export class WorkflowScheduler {
    private static registeredWorkflows: { [p: string]: WorkflowRunJobInterface } = {};

    static registerWorkflow(workflowRunJobInterface: WorkflowRunJobInterface): void {
        let workflowId = workflowRunJobInterface.getWorkflowId();
        if(!!WorkflowScheduler.registeredWorkflows[workflowId]){
            throw new Error("Workflow with id: "+workflowId+" is already registered.");
        }
        WorkflowScheduler.registeredWorkflows[workflowRunJobInterface.getWorkflowId()] = workflowRunJobInterface;
    }

    static getRegisteredWorkflow(workflowId: string): WorkflowRunJobInterface | undefined {
        return WorkflowScheduler.registeredWorkflows[workflowId];
    }

    static getRegisteredWorkflowsIds(): string[] {
        return Object.keys(WorkflowScheduler.registeredWorkflows);
    }
}




function cleanWorkflowRun(input: Partial<DatabaseTypes.WorkflowsRuns>): Partial<DatabaseTypes.WorkflowsRuns> {
    input.log = null;
    input.output = null;
    input.date_finished = null;
    input.date_started = null;
    input.runtime_in_seconds = null;

    return input;
}

export async function createWorkflowIfNotExisting(workflowId: string, myDatabaseHelper: MyDatabaseHelper): Promise<void> {
    let searchAndUpdate: Partial<DatabaseTypes.Workflows> = {
        id: workflowId,
    };
    await myDatabaseHelper.getWorkflowsHelper().upsertOne(searchAndUpdate);
}

async function getAlreadyRunningWorkflowruns(workflowId: string, myDatabaseHelper: MyDatabaseHelper): Promise<DatabaseTypes.WorkflowsRuns[]> {
    let searchWorkflowRuns: Partial<DatabaseTypes.WorkflowsRuns> = {}
    searchWorkflowRuns = {
        workflow: workflowId,
        state: WORKFLOW_RUN_STATE.RUNNING
    };
    return await myDatabaseHelper.getWorkflowsRunsHelper().findItems(searchWorkflowRuns)
}

function getWorkflowIdFromInputWorkflowsRuns(input: Partial<DatabaseTypes.WorkflowsRuns>){
    let workflowId: string | undefined = undefined
    if(!!input.workflow){
        if(typeof input.workflow === "string"){
            workflowId = input.workflow;
        } else if (typeof input.workflow === "object"){
            workflowId = input.workflow.id;
        }
    }
    return workflowId;
}

function getDictWorkflowIdToWorkflowRuns(workflowRuns: Partial<DatabaseTypes.WorkflowsRuns>[]): { [p: string]: Partial<DatabaseTypes.WorkflowsRuns>[] } {
    let dictWorkflowIdToWorkflowRuns: { [p: string]: Partial<DatabaseTypes.WorkflowsRuns>[] } = {};

    for(let workflowRun of workflowRuns){
        let workflowId = getWorkflowIdFromInputWorkflowsRuns(workflowRun);
        if(!!workflowId){
            let workflowRunsForWorkflow = dictWorkflowIdToWorkflowRuns[workflowId] || [];
            workflowRunsForWorkflow.push(workflowRun);
            dictWorkflowIdToWorkflowRuns[workflowId] = workflowRunsForWorkflow;
        }
    }

    return dictWorkflowIdToWorkflowRuns;
}


async function modifyInputForCreateOrUpdateWorkflowRunToRunning(input: Partial<DatabaseTypes.WorkflowsRuns>, dictWorkflowIdToWorkflowRuns: {[p: string]: Partial<DatabaseTypes.WorkflowsRuns>[]}, myDatabaseHelper: MyDatabaseHelper): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    if(input.state===WORKFLOW_RUN_STATE.RUNNING){
        console.log("modifyInputForCreateOrUpdateWorkflowRunToRunning");

        input = cleanWorkflowRun(input);

        let workflowIds = Object.keys(dictWorkflowIdToWorkflowRuns);

        if(workflowIds.length===0){
            throw new Error("Please set a workflow for the workflow_run/s");
        }

        // check if all workflows exist
        for(let workflowId of workflowIds){
            try{
                await createWorkflowIfNotExisting(workflowId, myDatabaseHelper);
            } catch (err: any){
                console.error(err);
                throw new Error("modifyInputForCreateOrUpdateWorkflowRunToRunning: Error while create/update of workflowRuns. Cannot find or create workflow with id: "+workflowId);
            }
        }

        // check if all workflows are enabled
        for(let workflowId of workflowIds){
            console.log("Checking if workflow with id: "+workflowId+" is enabled");
            let workflow: DatabaseTypes.Workflows | undefined = undefined;
            try{
                workflow = await myDatabaseHelper.getWorkflowsHelper().readOne(workflowId);
            } catch (err: any){
                console.error(err);
                throw new Error("modifyInputForCreateOrUpdateWorkflowRunToRunning: Error while create/update of workflowRuns. Cannot read workflow with id: "+workflowId);
            }
            if(!workflow){
                throw new Error("Workflow with id: "+workflowId+" not found");
            }
            let enabled = workflow?.enabled;
            if(enabled===false){
                throw new Error("Workflow with id: "+workflowId+" is not enabled");
            }
        }


        let notRegisteredWorkflowIds = workflowIds.filter(workflowId => !WorkflowScheduler.getRegisteredWorkflow(workflowId));
        if(notRegisteredWorkflowIds.length>0){
            throw new Error("-- No WorkflowRunJobInterface found for workflowIds: "+notRegisteredWorkflowIds.join(", "));
        }

        for(let workflowId of Object.keys(dictWorkflowIdToWorkflowRuns)){
            console.log("Running workflowId: "+workflowId);
            const workflowRuns = dictWorkflowIdToWorkflowRuns[workflowId];
            if(workflowRuns){
                let alreadyRunningWorkflowRuns = await getAlreadyRunningWorkflowruns(workflowId, myDatabaseHelper);
                let workflowRunJobInterface = WorkflowScheduler.getRegisteredWorkflow(workflowId);
                if(!workflowRunJobInterface){
                    // never the case, because we checked before, but just to be sure
                    throw new Error("-- No WorkflowRunJobInterface found for workflowId: "+workflowId);
                } else {
                    console.log("Handling workflow_runs for workflowId: "+workflowId);
                    let result = await workflowRunJobInterface.handleWorkflowRunsWantToRun(input, workflowRuns, alreadyRunningWorkflowRuns);
                    if(result.errorMessage){
                        console.error("Error while setting workflow_runs to running: "+result.errorMessage);
                        throw new Error("Error while setting workflow_runs to running: "+result.errorMessage);
                    }
                }
            }
        }
        input.log = input.log || WorkflowRunLogger.createLogRow("Workflow Run started");
    }

    return input;
}

async function handleActionWorkflowRunUpdatedOrCreated(payload: Partial<DatabaseTypes.WorkflowsRuns>, myDatabaseHelper: MyDatabaseHelper, keys: PrimaryKey[], apiContext: any, eventContext: any): Promise<void> {
    await handleActionRunningCreatedOrUpdatedWorkflow(payload, myDatabaseHelper, keys, apiContext, eventContext);
    await handleActionOnUpdateOrCreateIfWorkflowRunShouldBeDeleted(payload, myDatabaseHelper, keys, apiContext, eventContext);
}

async function handleActionRunningCreatedOrUpdatedWorkflow(payload: Partial<DatabaseTypes.WorkflowsRuns>, myDatabaseHelper: MyDatabaseHelper, keys: PrimaryKey[], apiContext: any, eventContext: any): Promise<void> {
    myDatabaseHelper = new MyDatabaseHelper(apiContext, eventContext);
    if(payload.state===WORKFLOW_RUN_STATE.RUNNING){
        //console.log("Action: WorkflowRun update to running");
        let item_ids = keys as PrimaryKey[];
        //console.log("item_ids: "+item_ids);
        let existingWorkflowRuns = await myDatabaseHelper.getWorkflowsRunsHelper().readMany(item_ids);
        let dictWorkflowIdToWorkflowRuns = getDictWorkflowIdToWorkflowRuns(existingWorkflowRuns) as {[p: string]: DatabaseTypes.WorkflowsRuns[]};
        //console.log("dictWorkflowIdToWorkflowRuns: ");
        //console.log(JSON.stringify(dictWorkflowIdToWorkflowRuns, null, 2));
        for(let workflowId of Object.keys(dictWorkflowIdToWorkflowRuns)){
            const workflowRuns = dictWorkflowIdToWorkflowRuns[workflowId];
            if(workflowRuns){
                let workflowRunJobInterface = WorkflowScheduler.getRegisteredWorkflow(workflowId);
                if(!workflowRunJobInterface){
                    throw new Error("No WorkflowRunJobInterface found for workflowId: "+workflowId);
                } else {
                    for(let workflowRun of workflowRuns){
                        //console.log("-- Running workflowRun: "+workflowRun.id);
                        let date_started = new Date().toISOString()
                        await myDatabaseHelper.getWorkflowsRunsHelper().updateOneWithoutHookTrigger(workflowRun.id, {
                            date_started: date_started,
                        });


                        let result: Partial<DatabaseTypes.WorkflowsRuns> = workflowRun
                        let logger = new WorkflowRunLogger(workflowRun, myDatabaseHelper);
                        try{
                            //console.log("About to run job for workflowRun: "+workflowRun.id);
                            result = await workflowRunJobInterface.runJob(workflowRun, myDatabaseHelper, logger);
                        } catch (e: any){
                            console.log("Error while running workflow: "+e.message);
                            result = logger.getFinalLogWithStateAndParams({
                                state: WORKFLOW_RUN_STATE.FAILED
                            });
                        }
                        //console.log("WorkflowRun finished: "+workflowRun.id);
                        let legalStates = Object.values(WORKFLOW_RUN_STATE) as string[];
                        let hasResultLegalState = false;
                        if(!!result.state &&
                            legalStates.includes(result.state) && // check if state is a legal state
                            result.state!==WORKFLOW_RUN_STATE.RUNNING // and not still running
                        ){
                            hasResultLegalState = true;
                        }
                        if(!hasResultLegalState){
                            result.state = WORKFLOW_RUN_STATE.FAILED;
                        }
                        //console.log("Had result legal state: "+hasResultLegalState);

                        result.date_started = date_started; // make sure that date_started is not overwritten
                        result.date_finished = new Date().toISOString();
                        result.runtime_in_seconds = parseInt(""+(new Date(result.date_finished).getTime() - new Date(date_started).getTime())/1000);

                        await myDatabaseHelper.getWorkflowsRunsHelper().updateOneWithoutHookTrigger(workflowRun.id, result);

                    }
                }
            }
        }
    }
}

async function handleActionOnUpdateOrCreateIfWorkflowRunShouldBeDeleted(payload: Partial<DatabaseTypes.WorkflowsRuns>, myDatabaseHelper: MyDatabaseHelper, keys: PrimaryKey[], apiContext: any, eventContext: any): Promise<void> {
    if(payload.state===WORKFLOW_RUN_STATE.DELETE){
        let item_ids = keys as PrimaryKey[];
        let existingWorkflowRuns = await myDatabaseHelper.getWorkflowsRunsHelper().readMany(item_ids);
        for(let workflowRun of existingWorkflowRuns){
            await myDatabaseHelper.getWorkflowsRunsHelper().deleteOne(workflowRun.id);
        }
    }
}

export default defineHook(async ({action, init, filter, schedule}, apiContext) => {
    let allTablesExist = await DatabaseInitializedCheck.checkAllTablesExistWithApiContext(SCHEDULE_NAME,apiContext);
    if (!allTablesExist) {
        return;
    }

    let myDatabaseHelper = new MyDatabaseHelper(apiContext);

    registerInitHook(async () => {
        // App started, resetting workflow parsing
        let workflowsNotFinished: DatabaseTypes.WorkflowsRuns[] = [];

        // Reset all workflow_runs which are in state "running" to "cancelled" because the server was stopped in the middle of the workflow
        let searchWorkflowRuns: Partial<DatabaseTypes.WorkflowsRuns> = {
            state: WORKFLOW_RUN_STATE.RUNNING
        };
        let workflowRunsRunning = await myDatabaseHelper.getWorkflowsRunsHelper().findItems(searchWorkflowRuns);
        workflowsNotFinished = workflowsNotFinished.concat(workflowRunsRunning);

        await myDatabaseHelper.getWorkflowsRunsHelper().updateManyByItems(workflowsNotFinished, {
            state: WORKFLOW_RUN_STATE.FAILED,
            log: "Workflow Run was not finished, as the server was stopped in the middle of the workflow. The workflow was set to failed."
        });

        // try creating registered workflows if they are not already created
        let registeredWorkflowsIds = WorkflowScheduler.getRegisteredWorkflowsIds();
        for(let workflowId of registeredWorkflowsIds){
            let searchAndUpdate: Partial<DatabaseTypes.Workflows> = {
                id: workflowId,
                alias: workflowId,
            };
            let workflow = await myDatabaseHelper.getWorkflowsHelper().upsertOne(searchAndUpdate);
        }
    });




    // Filter: WorkflowRun created - setzt log, output, date_finished, date_started auf null und state auf "pending"
    filter<Partial<DatabaseTypes.WorkflowsRuns>>(CollectionNames.WORKFLOWS_RUNS+'.items.create', async (input, {keys, collection}, eventContext) => {
        console.log("WorkflowRun created");
        if(input.state===undefined){ // default state is "running"
            // TODO: Fetch database schema and look what the default value is
            input.state = WORKFLOW_RUN_STATE.RUNNING;
        }

        if(input.state===WORKFLOW_RUN_STATE.RUNNING){
            let dictWorkflowIdToWorkflowRuns = getDictWorkflowIdToWorkflowRuns([input]);
            console.log("modifyInputForCreateOrUpdateWorkflowRunToRunning");
            input = await modifyInputForCreateOrUpdateWorkflowRunToRunning(input, dictWorkflowIdToWorkflowRuns, myDatabaseHelper);
        }
        return input;
    });


    // Filter: WorkflowRun update when set to "running" - check if another workflow_run is already running
    filter<Partial<DatabaseTypes.WorkflowsRuns>>(CollectionNames.WORKFLOWS_RUNS+'.items.update', async (input, {keys, collection}, eventContext) => {
        if(input.state===WORKFLOW_RUN_STATE.RUNNING){
            let item_ids = keys as PrimaryKey[];
            let existingWorkflowRuns = await myDatabaseHelper.getWorkflowsRunsHelper().readMany(item_ids);
            let dictWorkflowIdToWorkflowRuns = getDictWorkflowIdToWorkflowRuns(existingWorkflowRuns);

            let inputWorkflowId = getWorkflowIdFromInputWorkflowsRuns(input);
            if(inputWorkflowId){ // the update want to set the workflow_run to anonther workflow
                dictWorkflowIdToWorkflowRuns = {}; // existing workflow_runs are not relevant as we want to set the workflow_run to another workflow
                dictWorkflowIdToWorkflowRuns[inputWorkflowId] = existingWorkflowRuns;
            }

            let amountDifferentWorkflows = Object.keys(dictWorkflowIdToWorkflowRuns).length;
            if(amountDifferentWorkflows>1){
                throw new Error("You can only update workflow_runs with the same workflow_id at once.");
            }
            input = await modifyInputForCreateOrUpdateWorkflowRunToRunning(input, dictWorkflowIdToWorkflowRuns, myDatabaseHelper);
        }

        return input;
    });

    action(CollectionNames.WORKFLOWS_RUNS+'.items.create', async (meta, eventContext) => {
        let {payload, key} = meta;
        let keys = [key];
        await handleActionWorkflowRunUpdatedOrCreated(payload, myDatabaseHelper, keys, apiContext, eventContext);
    });

    action(CollectionNames.WORKFLOWS_RUNS+'.items.update', async ({payload, keys}, eventContext) => {
        await handleActionWorkflowRunUpdatedOrCreated(payload, myDatabaseHelper, keys, apiContext, eventContext);
    });

});