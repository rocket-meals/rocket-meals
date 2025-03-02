import {defineHook} from '@directus/extensions-sdk';
import {RegisterFunctions} from "@directus/extensions";
import {MyDatabaseHelper} from "../helpers/MyDatabaseHelper";
import {WorkflowScheduleHelper} from "../workflows-runs-hook";
import {SingleWorkflowRun, WorkflowEnum, WorkflowRunLogger} from "../workflows-runs-hook/WorkflowRunJobInterface";
import {DirectusFiles, WorkflowsRuns} from "../databaseTypes/types";
import {WORKFLOW_RUN_STATE} from "../helpers/itemServiceHelpers/WorkflowsRunEnum";
import {CollectionNames} from "../helpers/CollectionNames";
import {Query} from "@directus/types";
import {ByteSizeHelper} from "../helpers/ByteSizeHelper";

enum FileCleanupWorkflowConfigEnum {
    delete_unreferenced_files_when_older_than_ms = "delete_unreferenced_files_when_older_than_ms",
}

type FileCleanupWorkflowConfig = {
    [FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms]: number
}

export class FileCleanupWorkflow extends SingleWorkflowRun {

    private static PARAM_DELETE_UNREFERENCED_FILES_WHEN_OLDER_THAN_MS_DONT_DELETE = -1;
    private static PARAM_DELETE_UNREFERENCED_FILES_WHEN_OLDER_THAN_MS_30_DAYS = 30 * 24 * 60 * 60 * 1000; // 30 days

    private config: FileCleanupWorkflowConfig;

    private statistics = {
        itemsCheckedAmount: 0,
        filesTotalAmount: 0,
        filesTotalDiskSpace: 0,
        filesUnreferencedAmount: 0,
        filesUnreferencedDiskSpace: 0,
        filesDeletedAmount: 0,
        filesDeletedDiskSpace: 0,
    }

    constructor() {
        super();
        this.config = {
            [FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms]: FileCleanupWorkflow.PARAM_DELETE_UNREFERENCED_FILES_WHEN_OLDER_THAN_MS_DONT_DELETE,
        }
    }

    getWorkflowId(): string {
        return WorkflowEnum.fileCleanup;
    }

    async runJob(workflowRun: WorkflowsRuns, myDatabaseHelper: MyDatabaseHelper, logger: WorkflowRunLogger): Promise<Partial<WorkflowsRuns>> {
        await logger.appendLog("Starting file cleanup job.");




        if(!!workflowRun.input) {
            let input = JSON.parse(workflowRun.input || "{}") as FileCleanupWorkflowConfig;
            if(!!input[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms]) {
                this.config[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms] = input[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms];
            }
        }

        await logger.appendLog("Current configuration:");
        await logger.appendLog(JSON.stringify(this.config, null, 2));
        await logger.appendLog("- "+FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms+": time in ms to delete unreferenced files. -1 to disable.");


        const directusFiles_fieldname_is_unreferenced = "is_unreferenced";

        let schema = await myDatabaseHelper.getSchema();

        // since we want to clean up unused files, we need to find them first
        
        if(!!schema) {
            await logger.appendLog("Schema is defined.");
            await logger.appendLog("Searching for files that are used in the database.");
            let dictFileIdsUsedInDatabase: {[key: string]: boolean} = {};

            let filesHelper = myDatabaseHelper.getFilesHelper();
            let allFiles = await filesHelper.readByQuery({
                limit: -1,
                fields: ['id'], // only interested in the id
            });
            this.statistics.filesTotalAmount = allFiles.length;

            await logger.appendLog(`Found ${allFiles.length} files in the database.`);
            // set all files to false
            for(let file of allFiles) {
                dictFileIdsUsedInDatabase[file.id] = false;
            }

            await logger.appendLog("Searching for items that are using files and marking them as used.");
            let schemaRelations = schema.relations;
            let amountRelations = Object.keys(schemaRelations).length;
            for(let relation in schemaRelations){
                let relationObj = schemaRelations[relation];
                if(!!relationObj) {
                    let collectionName = relationObj.collection;
                    await logger.appendLog(`Checking relation progress: ${relation}/${amountRelations} - ${collectionName}`);
                    // search for related_collection is directus_files
                    if(relationObj.related_collection === "directus_files") {
                        let collectionObj = schema.collections[collectionName];
                        if(!!collectionObj){
                            let isSingleton = collectionObj.singleton;

                            let fieldForDirectusFileId = relationObj.field;
                            await logger.appendLog("- Found relation to directus_files in collection: " + collectionName + " (singleton: " + isSingleton + ", field: " + fieldForDirectusFileId + ")");
                            // define the SpecificCollection type
                            type SpecificCollection = {
                                // the fieldForDirectusFileId is a string
                                [key: string]: string | DirectusFiles
                            }

                            let collectionHelper = myDatabaseHelper.getItemsServiceHelper<SpecificCollection>(collectionName as CollectionNames);
                            if(isSingleton) {
                                this.statistics.itemsCheckedAmount++;
                                await logger.appendLog("- Reading singleton item.");
                                let item = await collectionHelper.readSingleton();
                                let fieldRaw = item[fieldForDirectusFileId];
                                if(!!fieldRaw) {
                                    if(typeof fieldRaw === 'string') { // normal case
                                        dictFileIdsUsedInDatabase[fieldRaw] = true; // mark the file as used
                                    } else { // when the field is an DirectusFiles object
                                        dictFileIdsUsedInDatabase[fieldRaw.id] = true; // mark the file as used
                                    }
                                }
                            } else {

                                let query: Query = {
                                    filter: {
                                        _and: [
                                            {
                                                [fieldForDirectusFileId]: {
                                                    _nnull: true
                                                }
                                            }
                                        ]
                                    }
                                }
                                let amountItems = await collectionHelper.countItems(query);
                                this.statistics.itemsCheckedAmount += amountItems;
                                await logger.appendLog(`- Found ${amountItems} items in collection ${collectionName}.`);

                                let limit = 1000;
                                let offset = 0;
                                while(offset < amountItems) {
                                    await logger.appendLog(`- Reading items progress: ${offset}/${amountItems}`);

                                    let items = await collectionHelper.readByQuery({
                                        ...query,
                                        limit: limit,
                                        fields: [fieldForDirectusFileId], // only get the field that we are interested in // reduce the amount of data that we need to read
                                        offset: offset,
                                    });
                                    for(let item of items) {
                                        let fieldRaw = item[fieldForDirectusFileId];
                                        if(!!fieldRaw) {
                                            if(typeof fieldRaw === 'string') { // normal case
                                                dictFileIdsUsedInDatabase[fieldRaw] = true; // mark the file as used
                                            } else { // when the field is an DirectusFiles object
                                                dictFileIdsUsedInDatabase[fieldRaw.id] = true; // mark the file as used
                                            }
                                        }
                                    }
                                    offset += limit;
                                }
                                await logger.appendLog(`- Finished reading items`);
                            }
                        }
                    }
                }
            }

            let hasDirectusFilesFieldIsUnreferenced = false;
            if(!!schema.collections) {
                let directusFilesCollection = schema.collections["directus_files"];
                if(!!directusFilesCollection) {
                    let directusFilesFields = directusFilesCollection.fields;
                    if(!!directusFilesFields) {
                        if(directusFilesFields[directusFiles_fieldname_is_unreferenced]) {
                            hasDirectusFilesFieldIsUnreferenced = true;
                        }
                    }
                }
            }

            if(hasDirectusFilesFieldIsUnreferenced) {
                let filesPreviouslyUnreferenced = await filesHelper.readByQuery({
                    filter: {
                        _and: [
                            {
                                [directusFiles_fieldname_is_unreferenced]: {
                                    _eq: true,
                                }
                            }
                        ]
                    },
                    limit: -1,
                    fields: ['id'], // only interested in the id
                });
                // check if the files are still orphaned
                let fileIdsNoLongerUnreferenced = []
                for(let file of filesPreviouslyUnreferenced) {
                    let fileId = file.id;
                    if(dictFileIdsUsedInDatabase[fileId]) {
                        fileIdsNoLongerUnreferenced.push(fileId);
                        await filesHelper.updateOne(fileId, {
                            [directusFiles_fieldname_is_unreferenced]: false,
                        });
                    }
                }
                if(fileIdsNoLongerUnreferenced.length > 0) {
                    await logger.appendLog(`Found ${fileIdsNoLongerUnreferenced.length} files that are no longer unereferenced.`);
                }
            } else {
                await logger.appendLog(`The directus_files collection does not have the field "${directusFiles_fieldname_is_unreferenced}". Otherwise, we would have updated the field, to mark the files that are no longer orphaned.`);
            }

            // now we need to look for all directusFiles that exist and then compare which are not used
            let unreferencedFiles: string[] = [];
            let deletedFiles: string[] = [];
            for(let fileId in dictFileIdsUsedInDatabase) {
                if(!dictFileIdsUsedInDatabase[fileId]) { // if the file is not used
                    await logger.appendLog("File is unreferenced: " + fileId);
                    unreferencedFiles.push(fileId);
                }
            }
            this.statistics.filesUnreferencedAmount = unreferencedFiles.length;

            for(let fileId of unreferencedFiles) {
                let file = await filesHelper.readOne(fileId);
                const fileSizeAsString = file.filesize;
                let fileSizeAsNumber = 0
                if(!!fileSizeAsString && !isNaN(fileSizeAsString)) {
                    fileSizeAsNumber = parseInt(fileSizeAsString+"");
                }
                this.statistics.filesUnreferencedDiskSpace += fileSizeAsNumber;

                await filesHelper.updateOne(fileId, {
                    [directusFiles_fieldname_is_unreferenced]: true,
                });
                if(this.config[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms]>=0) {
                    if(!!file) {
                        let fileCreatedAt = file.created_on;
                        let fileAge = Date.now() - new Date(fileCreatedAt).getTime();
                        if(fileAge >= this.config[FileCleanupWorkflowConfigEnum.delete_unreferenced_files_when_older_than_ms]) {
                            await logger.appendLog("Deleting file: " + fileId);
                            await filesHelper.deleteOne(fileId);
                            this.statistics.filesDeletedAmount++;
                            this.statistics.filesDeletedDiskSpace += fileSizeAsNumber;
                        }
                    }
                }
            }

            await logger.appendLog(JSON.stringify(this.statistics, null, 2));
            await logger.appendLog(`Summary:`)
            await logger.appendLog(`- Files total: ${this.statistics.filesTotalAmount}`)
            await logger.appendLog(`- Files unreferenced: ${this.statistics.filesUnreferencedAmount}`)
            await logger.appendLog(`- Files unreferenced disk space: ${ByteSizeHelper.convertBytesToReadableFormat(this.statistics.filesUnreferencedDiskSpace)}`)
            await logger.appendLog(`- Files deleted: ${this.statistics.filesDeletedAmount}`)
            await logger.appendLog(`- Files deleted disk space: ${ByteSizeHelper.convertBytesToReadableFormat(this.statistics.filesDeletedDiskSpace)}`)


            return logger.getFinalLogWithStateAndParams({
                state: WORKFLOW_RUN_STATE.SUCCESS,
                log: logger.getCurrentLog(),
            });
        } else {
            await logger.appendLog("Schema is undefined.");
            return logger.getFinalLogWithStateAndParams({
                state: WORKFLOW_RUN_STATE.FAILED,
            });
        }
    }



}


export default defineHook(async (registerFunctions: RegisterFunctions, apiContext) => {

    const myDatabaseHelper = new MyDatabaseHelper(apiContext);

    // Schedule to create new form_submissions based on the provided CSV file
    WorkflowScheduleHelper.registerScheduleToRunWorkflowRuns({
        workflowRunInterface: new FileCleanupWorkflow(),
        myDatabaseHelper: myDatabaseHelper,
        schedule: registerFunctions.schedule,
        cronOject: WorkflowScheduleHelper.EVERY_MONTH_AT_1AM,
    });
});
