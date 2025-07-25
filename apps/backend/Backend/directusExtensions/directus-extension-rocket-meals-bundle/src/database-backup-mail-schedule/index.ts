import { defineHook } from '@directus/extensions-sdk';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun, WorkflowRunLogger } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import { FilesServiceHelper, MyFileTypes } from '../helpers/FilesServiceHelper';
import { EnvVariableHelper } from '../helpers/EnvVariableHelper';
import { DatabaseTypes } from 'repo-depkit-common';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';

const execAsync = promisify(exec);

function parseCronString(cron?: string): WorkflowScheduleHelper.CronObject {
    if (!cron) {
        return WorkflowScheduleHelper.EVERY_DAY_AT_4AM;
    }
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 6) {
        return WorkflowScheduleHelper.EVERY_DAY_AT_4AM;
    }
    const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] = parts;
    return { seconds, minutes, hours, dayOfMonth, month, dayOfWeek };
}

class DatabaseBackupWorkflow extends SingleWorkflowRun {
    getWorkflowId(): string {
        return 'database-backup-mail';
    }

    async runJob(workflowRun: DatabaseTypes.WorkflowsRuns, myDatabaseHelper: MyDatabaseHelper, logger: WorkflowRunLogger): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
        try {
            await logger.appendLog('Creating database dump');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const dumpPath = `/tmp/db-backup-${timestamp}.sql`;
            const gzipPath = `${dumpPath}.gz`;

            const PGHOST = process.env.PGHOST || 'localhost';
            const PGPORT = process.env.PGPORT || '5432';
            const PGUSER = process.env.PGUSER || 'directus';
            const PGDB = process.env.PGDB || 'directus';
            const env = { ...process.env };
            const pgPassword = process.env.PGPASSWORD;
            if (pgPassword) env.PGPASSWORD = pgPassword;

            const cmd = `pg_dump -h ${PGHOST} -p ${PGPORT} -U ${PGUSER} -d ${PGDB} -F p -f ${dumpPath}`;
            await execAsync(cmd, { env });
            await execAsync(`gzip ${dumpPath}`);

            const buffer = await fs.readFile(gzipPath);
            const fileHelper = myDatabaseHelper.getFilesHelper();
            const fileId = await fileHelper.uploadOneFromBuffer(buffer, `db-backup-${timestamp}.sql.gz`, MyFileTypes.GZIP, myDatabaseHelper);
            const link = await fileHelper.createDirectusFilesShareLink({ directus_files_id: String(fileId) });
            await fs.unlink(gzipPath);

            const recipient = EnvVariableHelper.getEnvVariable('DATABASE_BACKUP_MAIL_RECIPIENT');
            if (recipient && link) {
                await myDatabaseHelper.sendMail({
                    recipient,
                    subject: 'Directus Database Backup',
                    markdown_content: `Das neueste Backup kann unter folgendem Link heruntergeladen werden: [Download](${link})`,
                });
            } else {
                await logger.appendLog('No recipient or link available to send mail');
            }

            return logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.SUCCESS });
        } catch (err: any) {
            await logger.appendLog('Error: ' + err.toString());
            return logger.getFinalLogWithStateAndParams({ state: WORKFLOW_RUN_STATE.FAILED });
        }
    }
}

export default defineHook(async ({ schedule }, apiContext) => {
    const myDatabaseHelper = new MyDatabaseHelper(apiContext);
    const cronString = EnvVariableHelper.getEnvVariable('DATABASE_BACKUP_MAIL_CRON');
    const cronObject = parseCronString(cronString || undefined);

    WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
        workflowRunInterface: new DatabaseBackupWorkflow(),
        myDatabaseHelper,
        schedule,
        cronOject: cronObject,
    });
});
