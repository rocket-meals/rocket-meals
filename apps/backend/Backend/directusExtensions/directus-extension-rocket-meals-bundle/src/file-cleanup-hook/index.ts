import { defineHook } from '@directus/extensions-sdk';
import { RegisterFunctions } from '@directus/extensions';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { WorkflowScheduleHelper } from '../workflows-runs-hook';
import { SingleWorkflowRun, WorkflowEnum } from '../workflows-runs-hook/WorkflowRunJobInterface';
import { CollectionNames, CronHelper, DatabaseTypes } from 'repo-depkit-common';
import { WORKFLOW_RUN_STATE } from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import { WorkflowRunContext } from '../helpers/WorkflowRunContext';
import { Query, SchemaOverview } from '@directus/types';
import { ItemsServiceHelper } from '../helpers/ItemsServiceHelper';
import { ByteSizeHelper } from '../helpers/ByteSizeHelper';

enum FileCleanupWorkflowConfigEnum {
  delete_unreferenced_files_when_older_than_ms = 'delete_unreferenced_files_when_older_than_ms',
}

type FileCleanupWorkflowConfig = {
  [FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms]: number;
};

type FileReferenceDict = { [key: string]: boolean };
type FileDiskSpaceDict = { [key: string]: number };
type SpecificCollection = { [key: string]: string | DatabaseTypes.DirectusFiles };

type CollectionProcessingParams = {
  context: WorkflowRunContext;
  collectionHelper: ItemsServiceHelper<SpecificCollection>;
  fieldForDirectusFileId: string;
  dict: FileReferenceDict;
};

type SchemaRelationScanParams = {
  context: WorkflowRunContext;
  schema: SchemaOverview;
  dict: FileReferenceDict;
};

type FileCleanupContext = {
  context: WorkflowRunContext;
  filesHelper: ReturnType<MyDatabaseHelper['getFilesHelper']>;
};

export class FileCleanupWorkflow extends SingleWorkflowRun {
  private static readonly PARAM_DELETE_UNREFERENCED_FILES_WHEN_OLDER_THAN_MS_DONT_DELETE = -1;
  private static readonly PARAM_DELETE_UNREFERENCED_FILES_WHEN_OLDER_THAN_MS_30_DAYS = 30 * 24 * 60 * 60 * 1000; // 30 days

  private config: FileCleanupWorkflowConfig;

  private readonly statistics = {
    itemsCheckedAmount: 0,
    filesTotalAmount: 0,
    filesTotalDiskSpace: 0,
    filesUnreferencedAmount: 0,
    filesUnreferencedDiskSpace: 0,
    filesDeletedAmount: 0,
    filesDeletedDiskSpace: 0,
    filesDeletedErrorAmount: 0,
  };

  constructor() {
    super();
    this.config = {
      [FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms]: FileCleanupWorkflow.PARAM_DELETE_UNREFERENCED_FILES_WHEN_OLDER_THAN_MS_DONT_DELETE,
    };
  }

  getWorkflowId(): string {
    return WorkflowEnum.fileCleanup;
  }

  private applyInputConfig(input: string | null | undefined): void {
    if (!input) {
      return;
    }
    const parsed = JSON.parse(input) as FileCleanupWorkflowConfig;
    const value = parsed[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms];
    if (value) {
      this.config[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms] = value;
    }
  }

  private markFileAsUsed(dict: FileReferenceDict, fieldRaw: string | DatabaseTypes.DirectusFiles): void {
    if (typeof fieldRaw === 'string') {
      dict[fieldRaw] = true;
    } else {
      dict[fieldRaw.id] = true;
    }
  }

  private async processSingletonCollection(
    params: CollectionProcessingParams
  ): Promise<void> {
    const { context, collectionHelper, fieldForDirectusFileId, dict } = params;
    this.statistics.itemsCheckedAmount++;
    await context.logger.appendLog('- Reading singleton item.');
    const item = await collectionHelper.readSingleton();
    const fieldRaw = item[fieldForDirectusFileId];
    if (fieldRaw) {
      this.markFileAsUsed(dict, fieldRaw);
    }
  }

  private async processNonSingletonCollection(
    params: CollectionProcessingParams,
    collectionName: string
  ): Promise<void> {
    const { context, collectionHelper, fieldForDirectusFileId, dict } = params;
    const query: Query = {
      filter: { _and: [{ [fieldForDirectusFileId]: { _nnull: true } }] },
    };
    const amountItems = await collectionHelper.countItems(query);
    this.statistics.itemsCheckedAmount += amountItems;
    await context.logger.appendLog(`- Found ${amountItems} items in collection ${collectionName}.`);

    const limit = 1000;
    let offset = 0;
    while (offset < amountItems) {
      await context.logger.appendLog(`- Reading items progress: ${offset}/${amountItems}`);
      const items = await collectionHelper.readByQuery({ ...query, limit, fields: [fieldForDirectusFileId], offset });
      for (const item of items) {
        const fieldRaw = item[fieldForDirectusFileId];
        if (fieldRaw) {
          this.markFileAsUsed(dict, fieldRaw);
        }
      }
      offset += limit;
    }
    await context.logger.appendLog('- Finished reading items');
  }

  private async processCollectionRelation(
    scanParams: SchemaRelationScanParams,
    collectionName: string,
    fieldForDirectusFileId: string
  ): Promise<void> {
    const { context, schema, dict } = scanParams;
    const collectionObj = schema.collections[collectionName];
    if (!collectionObj) {
      return;
    }
    const isSingleton = collectionObj.singleton;
    await context.logger.appendLog('- Found relation to directus_files in collection: ' + collectionName + ' (singleton: ' + isSingleton + ', field: ' + fieldForDirectusFileId + ')');
    const collectionHelper = context.myDatabaseHelper.getItemsServiceHelper<SpecificCollection>(collectionName as CollectionNames);
    const params: CollectionProcessingParams = { context, collectionHelper, fieldForDirectusFileId, dict };
    if (isSingleton) {
      await this.processSingletonCollection(params);
    } else {
      await this.processNonSingletonCollection(params, collectionName);
    }
  }

  private async scanSchemaRelations(
    scanParams: SchemaRelationScanParams
  ): Promise<void> {
    const { context, schema } = scanParams;
    await context.logger.appendLog('Searching for items that are using files and marking them as used.');
    const schemaRelations = schema.relations;
    const amountRelations = Object.keys(schemaRelations).length;
    for (const relation in schemaRelations) {
      const relationObj = schemaRelations[relation];
      if (!relationObj) {
        continue;
      }
      const { collection: collectionName, field: fieldForDirectusFileId } = relationObj;
      await context.logger.appendLog(`Checking relation progress: ${relation}/${amountRelations} - ${collectionName} - field ${fieldForDirectusFileId}`);
      if (relationObj.related_collection === 'directus_files') {
        await this.processCollectionRelation(scanParams, collectionName, fieldForDirectusFileId);
      }
    }
  }

  private checkHasUnreferencedField(schema: SchemaOverview, fieldName: string): boolean {
    const directusFilesCollection = schema.collections?.['directus_files'];
    if (!directusFilesCollection?.fields) {
      return false;
    }
    return Boolean(directusFilesCollection.fields[fieldName]);
  }

  private async syncNoLongerUnreferencedFiles(
    cleanup: FileCleanupContext,
    dict: FileReferenceDict,
    fieldName: string
  ): Promise<void> {
    const filesPreviouslyUnreferenced = await cleanup.filesHelper.readByQuery({
      filter: { _and: [{ [fieldName]: { _eq: true } }] },
      limit: -1,
      fields: ['id'],
    });
    const fileIdsNoLongerUnreferenced: string[] = [];
    for (const file of filesPreviouslyUnreferenced) {
      if (dict[file.id]) {
        fileIdsNoLongerUnreferenced.push(file.id);
        await cleanup.filesHelper.updateOne(file.id, { [fieldName]: false });
      }
    }
    if (fileIdsNoLongerUnreferenced.length > 0) {
      await cleanup.context.logger.appendLog(`Found ${fileIdsNoLongerUnreferenced.length} files that are no longer unereferenced.`);
    }
  }

  private async collectFileSizeStats(
    cleanup: FileCleanupContext,
    dict: FileReferenceDict,
    diskSpaceDict: FileDiskSpaceDict
  ): Promise<string[]> {
    const unreferencedFiles: string[] = [];
    for (const fileId in dict) {
      const file = await cleanup.filesHelper.readOne(fileId);
      const fileSize = file.filesize;
      const fileSizeAsNumber = typeof fileSize === 'number' && !Number.isNaN(fileSize) ? fileSize : 0;
      this.statistics.filesTotalDiskSpace += fileSizeAsNumber;
      diskSpaceDict[fileId] = fileSizeAsNumber;
      if (!dict[fileId]) {
        unreferencedFiles.push(fileId);
      }
    }
    return unreferencedFiles;
  }

  private async tryDeleteOldUnreferencedFile(
    cleanup: FileCleanupContext,
    fileId: string,
    fileSizeAsNumber: number
  ): Promise<void> {
    const file = await cleanup.filesHelper.readOne(fileId);
    if (!file) {
      return;
    }
    const fileAge = Date.now() - new Date(file.created_on).getTime();
    if (fileAge < this.config[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms]) {
      return;
    }
    await cleanup.context.logger.appendLog('Deleting file: ' + fileId);
    try {
      await cleanup.filesHelper.deleteOne(fileId);
      this.statistics.filesDeletedAmount++;
      this.statistics.filesDeletedDiskSpace += fileSizeAsNumber;
    } catch (deleteError) {
      this.statistics.filesDeletedErrorAmount++;
      await cleanup.context.logger.appendLog(`Error deleting file: ${fileId} - ${deleteError instanceof Error ? deleteError.message : String(deleteError)}`);
    }
  }

  private async processUnreferencedFiles(
    cleanup: FileCleanupContext,
    unreferencedFiles: string[],
    diskSpaceDict: FileDiskSpaceDict,
    fieldName: string
  ): Promise<void> {
    for (const fileId of unreferencedFiles) {
      const fileSizeAsNumber = diskSpaceDict[fileId] || 0;
      this.statistics.filesUnreferencedDiskSpace += fileSizeAsNumber;
      await cleanup.filesHelper.updateOne(fileId, { [fieldName]: true });
      if (this.config[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms] >= 0) {
        await this.tryDeleteOldUnreferencedFile(cleanup, fileId, fileSizeAsNumber);
      }
    }
  }

  private async logSummary(context: WorkflowRunContext): Promise<void> {
    await context.logger.appendLog(JSON.stringify(this.statistics, null, 2));
    await context.logger.appendLog('Summary:');
    await context.logger.appendLog(`- Items checked: ${this.statistics.itemsCheckedAmount}`);
    await context.logger.appendLog(`- Files total: ${this.statistics.filesTotalAmount}`);
    await context.logger.appendLog(`- Files total disk space: ${ByteSizeHelper.convertBytesToReadableFormat(this.statistics.filesTotalDiskSpace)}`);
    await context.logger.appendLog(`- Files unreferenced: ${this.statistics.filesUnreferencedAmount}`);
    await context.logger.appendLog(`- Files unreferenced disk space: ${ByteSizeHelper.convertBytesToReadableFormat(this.statistics.filesUnreferencedDiskSpace)}`);
    await context.logger.appendLog(`- Files deleted: ${this.statistics.filesDeletedAmount}`);
    await context.logger.appendLog(`- Files deleted disk space: ${ByteSizeHelper.convertBytesToReadableFormat(this.statistics.filesDeletedDiskSpace)}`);
    await context.logger.appendLog(`- Files deleted errors: ${this.statistics.filesDeletedErrorAmount}`);
    await context.logger.appendLog('- Finished file cleanup job.');
  }

  private async runCleanupWithSchema(
    context: WorkflowRunContext,
    schema: SchemaOverview,
    directusFiles_fieldname_is_unreferenced: string
  ): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Schema is defined.');
    await context.logger.appendLog('Searching for files that are used in the database.');

    const dictFileIdsUsedInDatabase: FileReferenceDict = {};
    const dictFileIdsDiskSpace: FileDiskSpaceDict = {};

    const filesHelper = context.myDatabaseHelper.getFilesHelper();
    const cleanup: FileCleanupContext = { context, filesHelper };
    const allFiles = await filesHelper.readByQuery({ limit: -1, fields: ['id'] });
    this.statistics.filesTotalAmount = allFiles.length;
    await context.logger.appendLog(`Found ${allFiles.length} files in the database.`);
    for (const file of allFiles) {
      dictFileIdsUsedInDatabase[file.id] = false;
    }

    await this.scanSchemaRelations({ context, schema, dict: dictFileIdsUsedInDatabase });

    const hasDirectusFilesFieldIsUnreferenced = this.checkHasUnreferencedField(schema, directusFiles_fieldname_is_unreferenced);
    if (hasDirectusFilesFieldIsUnreferenced) {
      await this.syncNoLongerUnreferencedFiles(cleanup, dictFileIdsUsedInDatabase, directusFiles_fieldname_is_unreferenced);
    } else {
      await context.logger.appendLog(`The directus_files collection does not have the field "${directusFiles_fieldname_is_unreferenced}". Otherwise, we would have updated the field, to mark the files that are no longer orphaned.`);
    }

    const unreferencedFiles = await this.collectFileSizeStats(cleanup, dictFileIdsUsedInDatabase, dictFileIdsDiskSpace);
    this.statistics.filesUnreferencedAmount = unreferencedFiles.length;

    await this.processUnreferencedFiles(cleanup, unreferencedFiles, dictFileIdsDiskSpace, directusFiles_fieldname_is_unreferenced);
    await this.logSummary(context);

    return context.logger.getFinalLogWithStateAndParams({
      state: WORKFLOW_RUN_STATE.SUCCESS,
      log: context.logger.getCurrentLog(),
    });
  }

  async runJob(context: WorkflowRunContext): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    await context.logger.appendLog('Starting file cleanup job.');

    this.applyInputConfig(context.workflowRun.input);

    await context.logger.appendLog('Current configuration:');
    await context.logger.appendLog(JSON.stringify(this.config, null, 2));
    await context.logger.appendLog('- ' + FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms + ': time in ms to delete unreferenced files. -1 to disable.');

    const directusFiles_fieldname_is_unreferenced = 'is_unreferenced';
    const schema = await context.myDatabaseHelper.getSchema();

    if (!schema) {
      await context.logger.appendLog('Schema is undefined.');
      return context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.FAILED,
      });
    }

    return this.runCleanupWithSchema(context, schema, directusFiles_fieldname_is_unreferenced);
  }
}

export default defineHook(async (registerFunctions: RegisterFunctions, apiContext) => {
  const myDatabaseHelper = new MyDatabaseHelper(apiContext);

  // Schedule to create new form_submissions based on the provided CSV file
  WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
    workflowRunInterface: new FileCleanupWorkflow(),
    myDatabaseHelper: myDatabaseHelper,
    schedule: registerFunctions.schedule,
    cronOject: CronHelper.EVERY_MONTH_AT_1AM,
  });
});
