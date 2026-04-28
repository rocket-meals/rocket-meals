import { CronHelper, DatabaseTypes, MailAdresses } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { MyDefineHook } from '../helpers/MyDefineHook';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';

const HOOK_NAME = 'files-without-folder-report-schedule';

class FilesWithoutFolderReportWorkflow extends SingleWorkflowRun {
  getWorkflowId(): string {
    return 'files-without-folder-report';
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting files without folder report');

    try {
      const filesHelper = context.myDatabaseHelper.getFilesHelper();

      const filesWithoutFolder = await filesHelper.readByQuery({
        filter: {
          folder: {
            _null: true,
          },
        },
        fields: ['id', 'filename_download', 'title'],
        limit: -1,
      });

      if (!filesWithoutFolder || filesWithoutFolder.length === 0) {
        await context.logger.appendLog('No files without folder found.');
        return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
      }

      await context.logger.appendLog('Found ' + filesWithoutFolder.length + ' file(s) without folder.');

      const fileList = filesWithoutFolder
        .map((file: DatabaseTypes.DirectusFiles) => `- ${file.title || file.filename_download} (ID: ${file.id})`)
        .join('\n');

      const subject = 'Dateien ohne Ordner gefunden (' + filesWithoutFolder.length + ')';
      const markdown_content =
        `Es wurden **${filesWithoutFolder.length}** Datei(en) gefunden, die in keinem Ordner liegen:\n\n` + fileList;

      await context.myDatabaseHelper.sendMail({
        recipient: MailAdresses.SupportMail,
        subject: subject,
        markdown_content: markdown_content,
      });

      await context.logger.appendLog('Mail created for files without folder.');
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
    } catch (e) {
      await context.logger.appendLog('Error during files without folder report: ' + (e instanceof Error ? e.message : String(e)));
      return context.logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.FAILED });
    }
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(HOOK_NAME, async ({ schedule }, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new FilesWithoutFolderReportWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: schedule,
    cronOject: CronHelper.EVERY_FRIDAY_AT_8AM,
  });
});
