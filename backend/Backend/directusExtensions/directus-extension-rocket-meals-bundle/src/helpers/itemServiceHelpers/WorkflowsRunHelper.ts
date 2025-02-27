import {WorkflowsRuns} from "../../databaseTypes/types";
import {ItemsServiceHelper} from "../ItemsServiceHelper";
import {WorkflowRunLogger} from "../../workflows-runs-hook/WorkflowRunJobInterface";
import {WORKFLOW_RUN_STATE} from "./WorkflowsRunEnum";

export class WorkflowResultHash {
    private result_hash: string | null | undefined;

    constructor(result_hash: string | null | undefined) {
        this.result_hash = result_hash;
    }

    public isSame(otherResultHash: WorkflowResultHash){
        return this.result_hash === otherResultHash.result_hash;
    }

    public getHash(){
        return this.result_hash;
    }

    public static isError(resultHash: WorkflowResultHash | Error): resultHash is Error {
        return resultHash instanceof Error;
    }
}

export class WorkflowsRunHelper extends ItemsServiceHelper<WorkflowsRuns> {

    /**
     * @throws {Error}
     */
    async getPreviousResultHash(workflowRun: WorkflowsRuns, logger: WorkflowRunLogger): Promise<WorkflowResultHash | Error> {
        console.log("getPreviousResultHash");
        // we need to search in workflowruns for the last successful run of this schedule and get the result_hash
        // if there is no successful run, we return null
        let workflowId: string | undefined;
        if(!!workflowRun){
            if(typeof workflowRun.workflow === "string"){
                workflowId = workflowRun.workflow;
            } else {
                workflowId = workflowRun.workflow.id;
            }
        }

        if(!workflowId){
            return new WorkflowResultHash(null);
        }

        return await this.readByQuery({
            filter: {
                workflow: {
                    _eq: workflowId
                },
                //date_finished: { //   invalid input syntax for type timestamp with time zone: ""
                //    _null: false // not null
                //},
                state: {
                    _eq: WORKFLOW_RUN_STATE.SUCCESS // only successful runs
                },
                result_hash: {
                    _nempty: true // not empty
                },
            },
            fields: ['*'],
            sort: ['-date_finished'], // sort by date_finished descending order - so we get the latest run first
            limit: 1
        }).then((workflowRuns) => {
            let workflowRun = workflowRuns[0];
            return new WorkflowResultHash(workflowRun?.result_hash);
        }).catch(async (exception: unknown) => {
            await logger.appendLog("Error while getting previous result hash: " + exception?.toString());
            throw new Error("Error while getting previous result hash: " + exception?.toString());
        });
    }

}
