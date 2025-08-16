import {defineHook} from '@directus/extensions-sdk';
import {CollectionNames} from "repo-depkit-common";
import {DatabaseInitializedCheck} from "../helpers/DatabaseInitializedCheck";
import {MyDatabaseHelper} from "../helpers/MyDatabaseHelper";
import {registerInitHook} from "../helpers/InitHookAfterMigrationHelper";

const SCHEDULE_NAME = "collections_dates_last_update";

export default defineHook(async ({action, init}, apiContext) => {
	let allTablesExist = await DatabaseInitializedCheck.checkAllTablesExistWithApiContext(SCHEDULE_NAME,apiContext);
	if (!allTablesExist) {
		return;
	}

	const myDatabaseHelper = new MyDatabaseHelper(apiContext);

	const excludeCollections = [CollectionNames.COLLECTIONS_DATES_LAST_UPDATE];
	// create a function which will be called after any update, create or delete of a collection, except the collection "collections_dates_last_update"
	// this function will update the collection "collections_dates_last_update" with the current date for the collection which was updated, created or deleted


	let collectionsDatesLastUpdateService = myDatabaseHelper.getCollectionDatesLastUpdateHelper();

	//console.log("collection-last-update-hook: register hook")

	/**
	 * As not all collections are created after import or setup or during changes to the schema.
	 * Therefore we need to check if all collections are in the "collections_dates_last_update" collection synchronized.
	 * If a collection is missing in the "collections_dates_last_update" collection, we need to create it.
	 * If a collection is not existing anymore, we need to delete it from the "collections_dates_last_update" collection.
	 */
	async function cleanupNonExistingCollectionsAndCreateMissingCollections() {
		let allTableNamesInDatabase = await DatabaseInitializedCheck.getTableNamesFromApiContext(apiContext);
		let allTableNamesWithoutExcludeCollections = allTableNamesInDatabase.filter((tableName) => !excludeCollections.includes(tableName));

		let allItemsInLastUpdatesTables = await collectionsDatesLastUpdateService.readAllItems();

		let tableNamesInLastUpdatesTable = allItemsInLastUpdatesTables.map((item: any) => item.id);

		let missingTableNames = allTableNamesWithoutExcludeCollections.filter((tableName) => !tableNamesInLastUpdatesTable.includes(tableName));
		let tableNamesToDelete = tableNamesInLastUpdatesTable.filter((tableName) => !allTableNamesWithoutExcludeCollections.includes(tableName));

		for (let tableNameToDelete of tableNamesToDelete) {
			await collectionsDatesLastUpdateService.deleteOne(tableNameToDelete);
		}

		for (let missingTableName of missingTableNames) {
			await collectionsDatesLastUpdateService.createOne({
				id: missingTableName,
				date_updated: new Date().toISOString()
			});
		}
	}

	async function updateLastUpdateDate(collection: CollectionNames) {
		//console.log("collection-last-update-hook: updateLastUpdateDate")
		// check if the collection is not in the excludeCollections list
		if (!excludeCollections.includes(collection)) {
			// get the current date
			let currentDate = new Date().toISOString();

			// find if the item with the id: collection exists in the collection "collections_dates_last_update"
			let items = await collectionsDatesLastUpdateService.readByQuery({
				filter: {
					id: {
						_eq: collection
					}
				}
			});

			try{
				// if the item with the id: collection exists in the collection "collections_dates_last_update"
				if (items.length > 0) {
					// update the item with the id: collection in the collection "collections_dates_last_update" with the current date
					await collectionsDatesLastUpdateService.updateOne(collection, {
						date_updated: currentDate
					});
				} else {
					// create a new item in the collection "collections_dates_last_update" with the id: collection and the current date
					await collectionsDatesLastUpdateService.createOne({
						id: collection,
						date_updated: currentDate
					});
				}
			} catch (e) {
				// TODO Check if the error was this
				//WARN: An error was thrown while executing action "foods_translations.items.create"
				//WARN: Value for field "id" in collection "collections_dates_last_update" has to be unique.
				//console.error("Error while updating the collection 'collections_dates_last_update' for the collection: " + collection + " with the current date: " + currentDate);
				//console.error(e);
			}
			await cleanupNonExistingCollectionsAndCreateMissingCollections();
		}
	}

	// https://docs.directus.io/extensions/hooks.html#available-events
        registerInitHook(async () => {
                await cleanupNonExistingCollectionsAndCreateMissingCollections();
        });

	action(
		"*" + ".items.update",
		async (meta) => {
			// get the collection which was updated
			let collection = meta.collection;
			//console.log("collection-last-update-hook: update: " + collection)

			// update the collection "collections_dates_last_update" with the current date for the collection which was updated
			await updateLastUpdateDate(collection);
		}
	);

	action(
		"*" + ".items.create",
		async (meta) => {
			// get the collection which was created
			let collection = meta.collection;
			//console.log("collection-last-update-hook: create: " + collection)

			// update the collection "collections_dates_last_update" with the current date for the collection which was created
			await updateLastUpdateDate(collection);
		}
	);

	action(
		"*" + ".items.delete",
		async (meta) => {
			// get the collection which was deleted
			let collection = meta.collection;
			//console.log("collection-last-update-hook: delete: " + collection)

			// update the collection "collections_dates_last_update" with the current date for the collection which was deleted
			await updateLastUpdateDate(collection);
		}
	);
});
