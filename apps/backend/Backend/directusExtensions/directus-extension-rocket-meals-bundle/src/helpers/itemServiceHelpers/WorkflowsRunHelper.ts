import { DatabaseTypes } from 'repo-depkit-common';
import { ItemsServiceHelper } from '../ItemsServiceHelper';
import { WorkflowRunLogger } from '../../workflows-runs-hook/WorkflowRunJobInterface';
import { WORKFLOW_RUN_STATE } from './WorkflowsRunEnum';

export class WorkflowResultHash {
  private readonly result_hash: string | null | undefined;

  constructor(result_hash: string | null | undefined) {
    this.result_hash = result_hash;
  }

  public isSame(otherResultHash: WorkflowResultHash) {
    return this.result_hash === otherResultHash.result_hash;
  }

  public getHash() {
    return this.result_hash;
  }

  public static isError(resultHash: WorkflowResultHash | Error): resultHash is Error {
    return resultHash instanceof Error;
  }
}

export class WorkflowsRunHelper extends ItemsServiceHelper<DatabaseTypes.WorkflowsRuns> {
  /**
   * @throws {Error}
   */
  async getPreviousResultHash(workflowRun: DatabaseTypes.WorkflowsRuns, logger: WorkflowRunLogger): Promise<WorkflowResultHash | Error> {
    //console.log("getPreviousResultHash");
    // we need to search in workflowruns for the last successful run of this schedule and get the result_hash
    // if there is no successful run, we return null
    let workflowId: string | undefined;
    if (!!workflowRun) {
      if (typeof workflowRun.workflow === 'string') {
        workflowId = workflowRun.workflow;
      } else {
        workflowId = workflowRun.workflow.id;
      }
    }

    if (!workflowId) {
      return new WorkflowResultHash(null);
    }

    //console.log("getPreviousResultHash workflowId: ", workflowId);
    //console.log("Now calling readByQuery");
    return await this.readByQuery({
      filter: {
        workflow: {
          _eq: workflowId,
        },
        //date_finished: { //   invalid input syntax for type timestamp with time zone: ""
        //    _null: false // not null
        //},
        state: {
          _eq: WORKFLOW_RUN_STATE.SUCCESS, // only successful runs
        },
        result_hash: {
          _null: false, // not null
        },
      },
      fields: ['*'],
      sort: ['-date_finished'], // sort by date_finished descending order - so we get the latest run first
      limit: 1,
    })
      .then(workflowRuns => {
        //console.log("getPreviousResultHash workflowRuns readByQuery Finished");
        //console.log("workflowRuns: ")
        //console.log(workflowRuns);
        let workflowRun = workflowRuns[0];
        const resultHash = typeof workflowRun?.result_hash === 'string' ? workflowRun.result_hash : null;
        return new WorkflowResultHash(resultHash);
      })
      .catch(async (exception: any) => {
        //console.log("getPreviousResultHash workflowRuns readByQuery Error");
        //console.log(exception.message);
        await logger.appendLog('Error while getting previous result hash: ' + exception?.toString());
        return new Error('Error while getting previous result hash: ' + exception?.toString());
      });
  }
}
