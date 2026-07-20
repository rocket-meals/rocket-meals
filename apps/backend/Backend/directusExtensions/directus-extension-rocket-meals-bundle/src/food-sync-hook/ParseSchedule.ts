import {
  CanteensTypeForParser,
  FoodComponentForParser,
  FoodofferDateType,
  FoodoffersTypeForParser,
  FoodParseFoodAttributesType,
  FoodParserHelper,
  FoodParserInterface,
  FoodsInformationTypeForParser,
  FoodWithBasicData
} from './FoodParserInterface';
import {TranslationHelper} from '../helpers/TranslationHelper';
import {CollectionNames, DatabaseTypes, DateHelper, DirectusItemStatus} from 'repo-depkit-common';
import {MarkingParserInterface, MarkingsTypeForParser} from './MarkingParserInterface';
import {ListHelper} from '../helpers/ListHelper';
import {DictMarkingsExclusions, MarkingFilterHelper} from '../helpers/MarkingFilterHelper';
import {MyTimer, MyTimers} from '../helpers/MyTimer';
import {HashHelper} from '../helpers/HashHelper';
import {WORKFLOW_RUN_STATE} from '../helpers/itemServiceHelpers/WorkflowsRunEnum';
import {WorkflowResultHash} from '../helpers/itemServiceHelpers/WorkflowsRunHelper';
import {WorkflowRunContext} from '../helpers/WorkflowRunContext';

const SCHEDULE_NAME = 'FoodParseSchedule';

export type DictFoodsCategoryExternalIdentifierToFoodsCategory = Record<string, DatabaseTypes.FoodsCategories>;
export type DictFoodsAttributesExternalIdentifiersToFoodsAttributes = Record<string, DatabaseTypes.FoodsAttributes>;
export type DictFoodofferCategoriesExternalIdentifiersToFoodofferCategories = Record<string, DatabaseTypes.FoodoffersCategories>;

export type FoodCreationHelperObject = {
  dictMarkingsExclusions: DictMarkingsExclusions;
  foodCategoryExternalIdentifiersToFoodCategoriesDict: DictFoodsCategoryExternalIdentifierToFoodsCategory;
  dictExternalIdentifierToFoodAttributes: DictFoodsAttributesExternalIdentifiersToFoodsAttributes;
  foodofferCategoryExternalIdentifiersToFoodofferCategoriesDict: DictFoodofferCategoriesExternalIdentifiersToFoodofferCategories;
};

export class ParseSchedule {
  private readonly context: WorkflowRunContext;
  private readonly foodParser: FoodParserInterface | null;
  private readonly markingParser: MarkingParserInterface | null;
  //private previousMealOffersHash: string | null; // in multi instance environment this should be a field in the database
  //private finished: boolean; // in multi instance environment this should be a field in the database

  constructor(context: WorkflowRunContext, foodParser: FoodParserInterface | null, markingParser: MarkingParserInterface | null) {
    this.context = context;
    this.foodParser = foodParser;
    this.markingParser = markingParser;
  }

  async getPreviousMealOffersHash() {
    return await this.context.myDatabaseHelper.getWorkflowsRunsHelper().getPreviousResultHash(this.context.workflowRun, this.context.logger);
  }

  async parse(): Promise<Partial<DatabaseTypes.WorkflowsRuns>> {
    //console.log("Start ParseSchedule and setting first log");
    await this.context.logger.appendLog('Starting');
    //console.log("Start ParseSchedule and setting first log - done");

    let markingsJSONList: MarkingsTypeForParser[] = [];

    try {
      if (this.markingParser) {
        //console.log("Create Needed Data for MarkingParser");
        await this.context.logger.appendLog('Create Needed Data for MarkingParser');
        await this.markingParser.createNeededData();
        await this.context.logger.appendLog('Update Markings');
        //console.log("Get Markings JSON List");
        markingsJSONList = await this.markingParser.getMarkingsJSONList();
        //console.log("Update Markings");
        await this.updateMarkings(markingsJSONList);
      }

      if (this.foodParser) {
        //console.log("Create Needed Data for FoodParser");
        await this.context.logger.appendLog('Create Needed Data for FoodParser');
        await this.foodParser.createNeededData(markingsJSONList);

        let canteensJSONList = await this.foodParser.getCanteensList();
        let foodsJSONList = await this.foodParser.getFoodsListForParser();
        let foodofferListForParser = await this.foodParser.getFoodoffersForParser();
        let currentMealOffersHash = new WorkflowResultHash(HashHelper.hashFromObject(foodofferListForParser));
        await this.context.logger.appendLog('Current meal offers hash: ' + currentMealOffersHash.getHash());

        //console.log("Get Previous Meal Offers Hash");
        let previousMealOffersHash = await this.getPreviousMealOffersHash();
        //console.log("Previous Meal Offers Hash: " + previousMealOffersHash);
        // check if previousMealOffersHash is Error
        if (WorkflowResultHash.isError(previousMealOffersHash)) {
          console.log('Previous Meal Offers Hash is Error');
          await this.context.logger.appendLog('Error: ' + previousMealOffersHash.toString());
          return this.context.logger.getFinalLogWithStateAndParams({
            state: WORKFLOW_RUN_STATE.FAILED,
          });
        }

        await this.context.logger.appendLog('Previous meal offers hash: ' + previousMealOffersHash.getHash());

        const markingsExclusionsHelper = this.context.myDatabaseHelper.getMarkingsExclusionsHelper();

        let noPreviousMealOffersHash = !previousMealOffersHash;
        let isSameHash = currentMealOffersHash.isSame(previousMealOffersHash);
        if (noPreviousMealOffersHash || !isSameHash) {
          await this.context.logger.appendLog('Meal offers changed, start parsing');
          await this.context.myDatabaseHelper.getWorkflowsRunsHelper().updateOneWithoutHookTrigger({
            primary_key: this.context.workflowRun.id,
            update: {
                result_hash: currentMealOffersHash.getHash(),
            }
          });

          await this.context.logger.appendLog('Meal offers changed, start parsing');
          await this.updateCanteens(canteensJSONList);

          await this.context.logger.appendLog('Update Foodoffer Categories');
          await this.updateFoodofferCategories(foodofferListForParser);
          const foodofferCategoryExternalIdentifiersToFoodofferCategoriesDict = await this.getFoodofferCategoriesExternalIdentifiersToFoodofferCategoriesDict();

          await this.context.logger.appendLog('Update Foods Categories');
          await this.updateFoodsCategories(foodsJSONList);
          const foodCategoryExternalIdentifiersToFoodCategoriesDict = await this.getFoodCategoriesExternalIdentifiersToFoodCategoriesDict();

          await this.context.logger.appendLog('Get all markings exlusions');
          let markingsExclusions = await markingsExclusionsHelper.readAllItems();
          const dictMarkingsExclusions: DictMarkingsExclusions = MarkingFilterHelper.getDictMarkingsExclusions(markingsExclusions);

          await this.context.logger.appendLog('Update Food Attributes');
          const dictExternalIdentifierToFoodAttributes = await this.updateFoodAttributesAndGetExternalIdentifierToFoodAttributes(foodsJSONList);

          let helperObject: FoodCreationHelperObject = {
            dictMarkingsExclusions,
            foodCategoryExternalIdentifiersToFoodCategoriesDict,
            dictExternalIdentifierToFoodAttributes,
            foodofferCategoryExternalIdentifiersToFoodofferCategoriesDict,
          };

          await this.context.logger.appendLog('Update Foods');
          await this.updateFoods(foodsJSONList, helperObject);

          await this.context.logger.appendLog('Sync food offers via result hash');
          await this.syncFoodOffers(foodofferListForParser, helperObject);

          return this.context.logger.getFinalLogWithStateAndParams({
            state: WORKFLOW_RUN_STATE.SUCCESS,
            result_hash: currentMealOffersHash.getHash(),
          });
        } else {
          await this.context.logger.appendLog('Meal offers did not change, skip parsing');
          return this.context.logger.getFinalLogWithStateAndParams({
            state: WORKFLOW_RUN_STATE.SKIPPED,
            result_hash: currentMealOffersHash.getHash(), // for the  skipped run it is the same result hash
          });
        }
      }

      await this.context.logger.appendLog('Finished');
      return this.context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.SUCCESS,
      });
    } catch (err: any) {
      console.log('FoodParseSchedule error');
      console.log(err.toString());
      await this.context.logger.appendLog('Error: ' + err.toString());
      return this.context.logger.getFinalLogWithStateAndParams({
        state: WORKFLOW_RUN_STATE.FAILED,
      });
    }
  }

  async updateFoodAttributesAndGetExternalIdentifierToFoodAttributes(foodsInformationForParserList: FoodsInformationTypeForParser[]) {
    let dictExternalIdentifierOfFoodAttributes: Record<string, string> = {};
    for (let foodsInformationForParser of foodsInformationForParserList) {
      let foodAttributes = foodsInformationForParser.attribute_values;
      for (let foodAttribute of foodAttributes) {
        let externalIdentifier = foodAttribute.external_identifier;
        if (externalIdentifier) {
          dictExternalIdentifierOfFoodAttributes[externalIdentifier] = externalIdentifier;
        }
      }
    }

    return await this.updateFoodAttributes(dictExternalIdentifierOfFoodAttributes);
  }

  async updateFoodAttributes(foodAttributesExternalIdentifiers: Record<string, string>) {
    let externalIdentifiers = Object.keys(foodAttributesExternalIdentifiers);
    let externalIdentifiersToFoodAttributesDict: Record<string, DatabaseTypes.FoodsAttributes> = {};
    for (let externalIdentifier of externalIdentifiers) {
      let searchJSON = {
        external_identifier: externalIdentifier,
      };
      let createJSON = {
        alias: externalIdentifier,
        external_identifier: externalIdentifier,
      };
      let foodAttribute = await this.context.myDatabaseHelper.getFoodsAttributesHelper().findOrCreateItem(searchJSON, createJSON);
      if (foodAttribute) {
        externalIdentifiersToFoodAttributesDict[externalIdentifier] = foodAttribute;
      }
    }
    return externalIdentifiersToFoodAttributesDict;
  }

  async updateFoodsCategories(foodsInformationForParserList: FoodsInformationTypeForParser[]) {
    let categoryExternalIdentifiers: string[] = [];
    for (let foodsInformationForParser of foodsInformationForParserList) {
      let categoryExternalIdentifier = foodsInformationForParser.category_external_identifier;
      if (categoryExternalIdentifier) {
        categoryExternalIdentifiers.push(categoryExternalIdentifier);
      }
    }

    for (let categoryExternalIdentifier of categoryExternalIdentifiers) {
      let searchJSON = {
        external_identifier: categoryExternalIdentifier,
      };

      let createJSON: Partial<DatabaseTypes.FoodsCategories> = {
        alias: categoryExternalIdentifier,
        external_identifier: categoryExternalIdentifier,
      };
      await this.context.myDatabaseHelper.getFoodsCategoriesHelper().findOrCreateItem(searchJSON, createJSON);

      // TODO: Update translations for food categories here, similar to markings
    }
  }

  async getFoodCategoriesExternalIdentifiersToFoodCategoriesDict() {
    let foodCategories = await this.context.myDatabaseHelper.getFoodsCategoriesHelper().readAllItems();
    let dict: DictFoodsCategoryExternalIdentifierToFoodsCategory = {};
    for (let foodCategory of foodCategories) {
      const externalIdentifier = foodCategory.external_identifier;
      if (externalIdentifier) {
        dict[externalIdentifier] = foodCategory;
      }
    }
    return dict;
  }

  async updateFoodofferCategories(foodofferListForParser: FoodoffersTypeForParser[]) {
    let categoryExternalIdentifiers: string[] = [];
    for (let foodofferForParser of foodofferListForParser) {
      let categoryExternalIdentifier = foodofferForParser.category_external_identifier;
      if (categoryExternalIdentifier) {
        categoryExternalIdentifiers.push(categoryExternalIdentifier);
      }
    }

    for (let categoryExternalIdentifier of categoryExternalIdentifiers) {
      let searchJSON = {
        external_identifier: categoryExternalIdentifier,
      };
      let createJSON = {
        alias: categoryExternalIdentifier,
        external_identifier: categoryExternalIdentifier,
      };
      await this.context.myDatabaseHelper.getFoodofferCategoriesHelper().findOrCreateItem(searchJSON, createJSON);

      // TODO: Update translations for foodoffer categories here, similar to markings
    }
  }

  async getFoodofferCategoriesExternalIdentifiersToFoodofferCategoriesDict() {
    let foodofferCategories = await this.context.myDatabaseHelper.getFoodofferCategoriesHelper().readAllItems();
    let dict: DictFoodofferCategoriesExternalIdentifiersToFoodofferCategories = {};
    for (let foodofferCategory of foodofferCategories) {
      const externalIdentifier = foodofferCategory.external_identifier;
      if (externalIdentifier) {
        dict[externalIdentifier] = foodofferCategory;
      }
    }
    return dict;
  }

  async getFoodsService() {
    return this.context.myDatabaseHelper.getFoodsHelper();
  }

  getFoodofferDatesFromRawFoodofferJSONList(foodoffersForParser: FoodoffersTypeForParser[]): FoodofferDateType[] {
    let isoDatesStringDict: { [key: string]: FoodofferDateType } = {};
    for (let foodofferForParser of foodoffersForParser) {
      if (!foodofferForParser.date) continue;
      const directusDateOnlyFormat = DateHelper.foodofferDateTypeToString(foodofferForParser.date);
      isoDatesStringDict[directusDateOnlyFormat] = foodofferForParser.date;
    }
    let foodofferDates = Object.values(isoDatesStringDict);
    return foodofferDates;
  }

  static readonly DELETE_BATCH_SIZE = 250;

  async deleteFoodOffers(foodoffers: DatabaseTypes.Foodoffers[], notice: string) {
    let itemService = this.context.myDatabaseHelper.getFoodoffersHelper();
    let idsToDelete = foodoffers.map(item => item.id);

    if (idsToDelete.length > 0) {
      // Batch deletions to avoid issues with large payloads
      for (let i = 0; i < idsToDelete.length; i += ParseSchedule.DELETE_BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + ParseSchedule.DELETE_BATCH_SIZE);
        await itemService
          .deleteMany(batch)
          .then(async () => {
            await this.context.logger.appendLog(`Foodoffers deleted batch: ${batch.length} (${i + batch.length}/${idsToDelete.length}) - ${notice}`);
          })
          .catch(async error => {
            await this.context.logger.appendLog(`Foodoffers delete error: ${notice}: ${error}`);
          });
      }
    } else {
      await this.context.logger.appendLog(`No foodoffers given to delete - ${notice}`);
    }
  }

  /**
   * Syncs food offers using result_hash-based diffing instead of delete-all + recreate.
   * For each canteen (independently):
   *  - For import-without-date canteens: process all date=null offers as a single group.
   *    Components (canteen=null) are already excluded by the canteen._eq filter.
   *  - For regular canteens: process per date to minimize the deletion window.
   *    Components (canteen=null) are already excluded by the canteen._eq filter.
   *  1. Fetches existing non-component foodoffers for the relevant scope
   *  2. Builds dicts by result_hash for existing DB foodoffers and report foodoffers
   *  3. Determines: toDelete (in DB not in report), toSkip (in both), toCreate (in report not in DB)
   *  4. Per date: deletes outdated, then creates new (with result_hash set)
   *
   * Additionally, canteens NOT present in the report are also handled:
   *  - Regular canteens: future foodoffers (>= oldest report date) are deleted since the
   *    report had no offers for them.
   *  - Import-without-date canteens: skipped, as their offers are long-term and not
   *    expected in every report.
   */
  async syncFoodOffers(foodofferListForParser: FoodoffersTypeForParser[], helperObject: FoodCreationHelperObject) {
    await this.context.logger.appendLog('Sync Food Offers via result_hash');

    // Step 1: Group report foodoffers by canteen
    const foodoffersForParserGroupedByCanteen: Record<string, FoodoffersTypeForParser[]> = {};
    for (const foodofferForParser of foodofferListForParser) {
      const key = foodofferForParser.canteen_external_identifier;
      if (!foodoffersForParserGroupedByCanteen[key]) {
        foodoffersForParserGroupedByCanteen[key] = [];
      }
      foodoffersForParserGroupedByCanteen[key].push(foodofferForParser);
    }

    // Compute the global oldest date from the entire report (across all canteens).
    // This is used later to scope deletion for canteens not present in the report.
    const allReportDates = this.getFoodofferDatesFromRawFoodofferJSONList(foodofferListForParser);
    let globalOldestDate: FoodofferDateType | null = null;
    let globalOldestDateMs: number | null = null;
    for (const foodofferDate of allReportDates) {
      const dateMs = new Date(DateHelper.foodofferDateTypeToString(foodofferDate)).getTime();
      if (globalOldestDateMs === null || dateMs < globalOldestDateMs) {
        globalOldestDate = foodofferDate;
        globalOldestDateMs = dateMs;
      }
    }
    const globalOldestDateString = globalOldestDate ? DateHelper.foodofferDateTypeToString(globalOldestDate) : null;

    // Step 2: Process each canteen that IS in the report
    const canteenExternalIdentifiersInReport = new Set(Object.keys(foodoffersForParserGroupedByCanteen));
    for (const canteenExternalIdentifier of canteenExternalIdentifiersInReport) {
      await this.context.logger.appendLog('Sync: processing canteen: ' + canteenExternalIdentifier);
      const canteen = await this.findOrCreateCanteenByExternalIdentifier(canteenExternalIdentifier);
      if (!canteen) continue;

      const canteenFoodoffers = foodoffersForParserGroupedByCanteen[canteenExternalIdentifier] || [];
      const foodoffersHelper = this.context.myDatabaseHelper.getFoodoffersHelper();

      if (canteen.foodoffers_import_without_date) {
        // Import-without-date canteen: all offers have date=null, process as a single group.
        // Filter by canteen._eq and date._null to avoid fetching the entire historical dataset.
        // Component foodoffers have canteen=null, so canteen._eq already excludes them.
        await this.context.logger.appendLog('Sync: fetching existing date=null non-component foodoffers for canteen (import without date): ' + canteen.id);

        // Normalize date to null so the hash is consistent across parser runs regardless of
        // what date the parser originally assigned to the foodoffer.
        const canteenFoodoffersWithNullDate = canteenFoodoffers.map(f => ({...f, date: null as null}));

        // Build report dict for this canteen
        const reportDictByResultHash = ParseSchedule.buildReportDictByResultHash(canteenFoodoffersWithNullDate);

        // Fetch existing date=null foodoffers for this canteen.
        // canteen._eq excludes component foodoffers (which have canteen=null).
        // date._null scopes to undated records only, avoiding a full table scan.
        const existingFoodoffersForCanteen = await foodoffersHelper.readByQuery({
          filter: {
            _and: [
              {
                canteen: {
                  _eq: canteen.id,
                },
              },
              {
                date: {
                  _null: true,
                },
              },
            ],
          },
          fields: ['id', 'result_hash'],
          limit: -1,
        });

        const { existingDictByResultHash, existingWithoutResultHash } = ParseSchedule.buildExistingDictByResultHash(existingFoodoffersForCanteen);

        // Compute diff, delete, then create
        const diffResult = ParseSchedule.computeFoodofferSyncDiff(reportDictByResultHash, existingDictByResultHash, existingWithoutResultHash);
        await this.context.logger.appendLog(`Sync result for canteen ${canteenExternalIdentifier} (without date): toDelete=${diffResult.toDeleteFoodoffers.length}, toSkip=${diffResult.toSkipResultHashes.length}, toCreate=${diffResult.toCreateResultHashes.length}`);

        await this.deleteFoodOffers(diffResult.toDeleteFoodoffers, `Delete foodoffers not in report for canteen ${canteenExternalIdentifier} (without date)`);

        const foodoffersForParserToCreate = diffResult.toCreateResultHashes
          .map(hash => reportDictByResultHash[hash])
          .filter((f): f is FoodoffersTypeForParser => !!f);
        await this.createFoodOffers(foodoffersForParserToCreate, helperObject);
      } else {
        // Regular canteen: process diffs per date
        // Group report foodoffers for this canteen by date string
        const reportByDate: Record<string, FoodoffersTypeForParser[]> = {};
        for (const foodofferForParser of canteenFoodoffers) {
          if (!foodofferForParser.date) continue;
          const dateKey = DateHelper.foodofferDateTypeToString(foodofferForParser.date);
          if (!reportByDate[dateKey]) {
            reportByDate[dateKey] = [];
          }
          reportByDate[dateKey].push(foodofferForParser);
        }

        // Collect all dates: from report + from existing future foodoffers in DB
        const allDateKeys = new Set<string>(Object.keys(reportByDate));

        // Find the oldest date from the report to scope existing-foodoffer queries
        const foodofferDates = this.getFoodofferDatesFromRawFoodofferJSONList(canteenFoodoffers);
        let oldestFoodofferDate: FoodofferDateType | null = null;
        for (const foodofferDate of foodofferDates) {
          const dateAsDate = new Date(DateHelper.foodofferDateTypeToString(foodofferDate));
          if (!oldestFoodofferDate || dateAsDate < new Date(DateHelper.foodofferDateTypeToString(oldestFoodofferDate))) {
            oldestFoodofferDate = foodofferDate;
          }
        }

        if (!oldestFoodofferDate) {
          await this.context.logger.appendLog('Sync: no dates in report for canteen ' + canteenExternalIdentifier + ', skipping');
          continue;
        }

        const oldestDateString = DateHelper.foodofferDateTypeToString(oldestFoodofferDate);
        await this.context.logger.appendLog('Sync: fetching existing non-component foodoffers >= ' + oldestDateString + ' for canteen: ' + canteen.id);

        // Fetch all existing foodoffers for this canteen >= oldest date.
        // canteen._eq excludes component foodoffers (which have canteen=null).
        // date._gte scopes to future/current dates, avoiding a full table scan.
        const existingFoodoffersForCanteen = await foodoffersHelper.readByQuery({
          filter: {
            _and: [
              {
                date: {
                  _gte: oldestDateString,
                },
              },
              {
                canteen: {
                  _eq: canteen.id,
                },
              },
            ],
          },
          fields: ['id', 'result_hash', 'date'],
          limit: -1,
        });

        // Group existing foodoffers by date
        const existingByDate: Record<string, DatabaseTypes.Foodoffers[]> = {};
        for (const existing of existingFoodoffersForCanteen) {
          const dateKey = existing.date || '__no_date__';
          if (!existingByDate[dateKey]) {
            existingByDate[dateKey] = [];
          }
          existingByDate[dateKey].push(existing);
          allDateKeys.add(dateKey);
        }

        // Process each date independently
        for (const dateKey of allDateKeys) {
          const reportFoodoffersForDate = reportByDate[dateKey] || [];
          const existingFoodoffersForDate = existingByDate[dateKey] || [];

          // Build report dict for this date
          const reportDictByResultHash = ParseSchedule.buildReportDictByResultHash(reportFoodoffersForDate);

          // Build existing dict for this date
          const { existingDictByResultHash, existingWithoutResultHash } = ParseSchedule.buildExistingDictByResultHash(existingFoodoffersForDate);

          // Compute diff per date
          const diffResult = ParseSchedule.computeFoodofferSyncDiff(reportDictByResultHash, existingDictByResultHash, existingWithoutResultHash);
          await this.context.logger.appendLog(`Sync result for canteen ${canteenExternalIdentifier} date ${dateKey}: toDelete=${diffResult.toDeleteFoodoffers.length}, toSkip=${diffResult.toSkipResultHashes.length}, toCreate=${diffResult.toCreateResultHashes.length}`);

          // Delete first, then create for this date
          await this.deleteFoodOffers(diffResult.toDeleteFoodoffers, `Delete foodoffers not in report for canteen ${canteenExternalIdentifier} date ${dateKey}`);

          const foodoffersForParserToCreate = diffResult.toCreateResultHashes
            .map(hash => reportDictByResultHash[hash])
            .filter((f): f is FoodoffersTypeForParser => !!f);
          await this.createFoodOffers(foodoffersForParserToCreate, helperObject);
        }
      }
    }

    // Step 3: Handle canteens NOT in the report.
    // For regular canteens (not import-without-date), delete future foodoffers since
    // the report had no offers for them. Import-without-date canteens are excluded
    // because their offers are long-term and not expected in every report.
    if (globalOldestDateString) {
      await this.context.logger.appendLog('Sync: checking all canteens for missing report data (oldest report date: ' + globalOldestDateString + ')');
      const canteensHelper = this.context.myDatabaseHelper.getCanteensHelper();
      const allCanteens = await canteensHelper.readAllItems();
      const foodoffersHelper = this.context.myDatabaseHelper.getFoodoffersHelper();

      for (const canteen of allCanteens) {
        const externalIdentifier = canteen.external_identifier;
        if (!externalIdentifier) continue;

        // Skip canteens already processed from the report
        if (canteenExternalIdentifiersInReport.has(externalIdentifier)) continue;

        // Skip import-without-date canteens: their offers are long-term and not in every report
        if (canteen.foodoffers_import_without_date) {
          await this.context.logger.appendLog('Sync: skipping canteen not in report (import without date): ' + externalIdentifier);
          continue;
        }

        await this.context.logger.appendLog('Sync: canteen not in report, deleting future foodoffers >= ' + globalOldestDateString + ' for canteen: ' + canteen.id + ' (' + externalIdentifier + ')');

        // Fetch all existing foodoffers for this canteen >= oldest report date.
        // canteen._eq excludes component foodoffers (which have canteen=null).
        const existingFoodoffersForCanteen = await foodoffersHelper.readByQuery({
          filter: {
            _and: [
              {
                date: {
                  _gte: globalOldestDateString,
                },
              },
              {
                canteen: {
                  _eq: canteen.id,
                },
              },
            ],
          },
          fields: ['id'],
          limit: -1,
        });

        if (existingFoodoffersForCanteen.length > 0) {
          await this.deleteFoodOffers(existingFoodoffersForCanteen as DatabaseTypes.Foodoffers[], `Delete future foodoffers for canteen not in report: ${externalIdentifier}`);
        } else {
          await this.context.logger.appendLog('Sync: no future foodoffers to delete for canteen: ' + externalIdentifier);
        }
      }
    } else {
      await this.context.logger.appendLog('Sync: no dates in report at all, skipping canteen-not-in-report cleanup');
    }
  }

  /**
   * Builds a dictionary mapping result_hash to FoodoffersTypeForParser from a list of parsed foodoffers.
   */
  static buildReportDictByResultHash(foodoffers: FoodoffersTypeForParser[]): Record<string, FoodoffersTypeForParser> {
    const dict: Record<string, FoodoffersTypeForParser> = {};
    for (const foodofferForParser of foodoffers) {
      const resultHash = FoodParserHelper.getFoodofferHashFromFoodofferInformationForParser(foodofferForParser);
      dict[resultHash] = foodofferForParser;
    }
    return dict;
  }

  /**
   * Splits existing DB foodoffers into a dict keyed by result_hash and a list of those without a result_hash.
   */
  static buildExistingDictByResultHash(existingFoodoffers: DatabaseTypes.Foodoffers[]): {
    existingDictByResultHash: Record<string, DatabaseTypes.Foodoffers>;
    existingWithoutResultHash: DatabaseTypes.Foodoffers[];
  } {
    const existingDictByResultHash: Record<string, DatabaseTypes.Foodoffers> = {};
    const existingWithoutResultHash: DatabaseTypes.Foodoffers[] = [];
    for (const existing of existingFoodoffers) {
      if (existing.result_hash && typeof existing.result_hash === 'string') {
        existingDictByResultHash[existing.result_hash] = existing;
      } else {
        existingWithoutResultHash.push(existing);
      }
    }
    return { existingDictByResultHash, existingWithoutResultHash };
  }

  /**
   * Pure function that computes the diff between report foodoffers and existing DB foodoffers
   * based on result_hash. Returns lists of foodoffers to delete, skip, and create.
   *
   * @param reportDictByResultHash - Maps result_hash strings to FoodoffersTypeForParser objects from the parsed report
   * @param existingDictByResultHash - Maps result_hash strings to Foodoffers database records currently in the DB
   * @param existingWithoutResultHash - Existing Foodoffers database records that have no result_hash (legacy data, will be deleted)
   */
  static computeFoodofferSyncDiff(
    reportDictByResultHash: Record<string, FoodoffersTypeForParser>,
    existingDictByResultHash: Record<string, DatabaseTypes.Foodoffers>,
    existingWithoutResultHash: DatabaseTypes.Foodoffers[],
  ): {
    toDeleteFoodoffers: DatabaseTypes.Foodoffers[];
    toSkipResultHashes: string[];
    toCreateResultHashes: string[];
  } {
    const toDeleteFoodoffers: DatabaseTypes.Foodoffers[] = [];
    const toSkipResultHashes: string[] = [];
    const toCreateResultHashes: string[] = [];

    // Existing foodoffers without result_hash -> delete (legacy data)
    for (const existing of existingWithoutResultHash) {
      toDeleteFoodoffers.push(existing);
    }

    // Existing foodoffers with result_hash NOT in report -> delete
    for (const [resultHash, existing] of Object.entries(existingDictByResultHash)) {
      if (!reportDictByResultHash[resultHash]) {
        toDeleteFoodoffers.push(existing);
      } else {
        toSkipResultHashes.push(resultHash);
      }
    }

    // Report foodoffers with result_hash NOT in existing -> create
    for (const resultHash of Object.keys(reportDictByResultHash)) {
      if (!existingDictByResultHash[resultHash]) {
        toCreateResultHashes.push(resultHash);
      }
    }

    return { toDeleteFoodoffers, toSkipResultHashes, toCreateResultHashes };
  }

  async findOrCreateMarkingByExternalIdentifier(marking_external_identifier: string) {
    let searchJSON = {
      external_identifier: marking_external_identifier,
    };
    let createJSON = {
      alias: marking_external_identifier,
      external_identifier: marking_external_identifier,
      status: DirectusItemStatus.DRAFT,
    };
    return this.context.myDatabaseHelper.getMarkingsHelper().findOrCreateItem(searchJSON, createJSON);
  }

  async findMarkingByExternalIdentifier(marking_external_identifier: string) {
    let searchJSON = {
      external_identifier: marking_external_identifier,
    };
    return await this.context.myDatabaseHelper.getMarkingsHelper().findFirstItem(searchJSON);
  }

  async updateCanteens(canteenList: CanteensTypeForParser[]): Promise<void> {
    let amountOfCanteens = canteenList.length;
    let currentCanteen = 0;
    for (let canteen of canteenList) {
      currentCanteen++;
      await this.context.logger.appendLog('Update Canteen ' + currentCanteen + ' / ' + amountOfCanteens);
      let canteenFoundOrCreated = await this.findOrCreateCanteen(canteen);
      if (canteenFoundOrCreated) {
        let canteensHelper = this.context.myDatabaseHelper.getCanteensHelper();
        await canteensHelper.updateOne(canteenFoundOrCreated.id, canteen);
      }
    }
  }

  async assignMarkingsToFood(markings: DatabaseTypes.Markings[], food: DatabaseTypes.Foods, dictMarkingsExclusions: DictMarkingsExclusions) {
    let tablename = CollectionNames.FOODS_MARKINGS;

    const filteredMarkings = MarkingFilterHelper.filterMarkingByRestrictionRules(markings, dictMarkingsExclusions);
    for (let marking of filteredMarkings) {
      let food_marking_json = { foods_id: food.id, markings_id: marking.id };
      const searchJSON = food_marking_json;
      const createJSON = food_marking_json;

      const foodMarkingsHelper = this.context.myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.FoodsMarkings>(tablename);
      await foodMarkingsHelper.findOrCreateItem(searchJSON, createJSON);
    }
  }

  async assignMarkingsToFoodoffer(markings: DatabaseTypes.Markings[], foodoffer: DatabaseTypes.Foodoffers, dictMarkingsExclusions: DictMarkingsExclusions) {
    let tablename = CollectionNames.FOODOFFER_MARKINGS;

    const filteredMarkings = MarkingFilterHelper.filterMarkingByRestrictionRules(markings, dictMarkingsExclusions);

    for (let marking of filteredMarkings) {
      let foodoffer_marking_json = {
        foodoffers_id: foodoffer.id,
        markings_id: marking.id,
      };
      const foodMarkingsHelper = this.context.myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.FoodoffersMarkings>(tablename);
      await foodMarkingsHelper.createOne(foodoffer_marking_json);
    }
  }

  async updateFoodBasicFields(food: FoodWithBasicData) {
    return this.context.myDatabaseHelper.getFoodsHelper().updateOne(food.id, food);
  }

  async updateFoodsAttributesValues(food: DatabaseTypes.Foods, new_attribute_values: FoodParseFoodAttributesType, dictExternalIdentifierToFoodAttributes: DictFoodsAttributesExternalIdentifiersToFoodsAttributes) {
    let foodWithOnlySetAttributesFields = this.getFoodsOrFoodoffersWithOnlySetAttributesFields(food, new_attribute_values, dictExternalIdentifierToFoodAttributes, { isFood: true, isFoodoffer: false });
    await this.context.myDatabaseHelper.getFoodsHelper().updateOne(food.id, foodWithOnlySetAttributesFields, {
      disableEventEmit: true,
    });
  }

  getFoodsOrFoodoffersWithOnlySetAttributesFields<T extends Partial<DatabaseTypes.Foods | DatabaseTypes.Foodoffers>>(foodOrFoodoffer: T, new_attribute_values: FoodParseFoodAttributesType, dictExternalIdentifierToFoodAttributes: DictFoodsAttributesExternalIdentifiersToFoodsAttributes, typeHelper: { isFood: boolean; isFoodoffer: boolean }): T {
    let delteAttributeValuesRaw = foodOrFoodoffer.attribute_values;
    let deleteAttributeValuesIds: any[] = [];
    if (delteAttributeValuesRaw) {
      for (let attribute of delteAttributeValuesRaw) {
        if (attribute.id) {
          deleteAttributeValuesIds.push(attribute.id);
        } else {
          deleteAttributeValuesIds.push(attribute);
        }
      }
    }

    let createAttributeValues: any[] = [];
    for (let new_attribute of new_attribute_values) {
      let external_identifier = new_attribute.external_identifier;
      let foodAttribute = dictExternalIdentifierToFoodAttributes[external_identifier];
      if (foodAttribute) {
        let food_id = null;
        let foodoffer_id = null;
        if (typeHelper.isFood) {
          food_id = foodOrFoodoffer.id;
        }
        if (typeHelper.isFoodoffer) {
          foodoffer_id = foodOrFoodoffer.id;
        }

        let createJSON: Omit<DatabaseTypes.FoodsAttributesValues, 'id'> = {
          food_id: food_id,
          foodoffer_id: foodoffer_id,
          food_attribute: foodAttribute.id,
          ...new_attribute.attribute_value,
        };
        createAttributeValues.push(createJSON);
      }
    }
    let foodOrFoodofferCopy: T = {} as T;

    foodOrFoodofferCopy.attribute_values = {
      //@ts-ignore
      create: createAttributeValues,
      delete: deleteAttributeValuesIds,
      update: [],
    };

    return foodOrFoodofferCopy;
  }

  async updateFoodTranslations(foundFoodWithTranslations: DatabaseTypes.Foods, foodsInformationForParser: FoodsInformationTypeForParser) {
    await TranslationHelper.updateItemTranslationsForItemWithTranslationsFetched<DatabaseTypes.Foods, DatabaseTypes.FoodsTranslations>(foundFoodWithTranslations, {
      translationsFromParsing: foodsInformationForParser.translations,
      items_primary_field_in_translation_table: 'foods_id',
      itemsTablename: CollectionNames.FOODS,
      myDatabaseHelper: this.context.myDatabaseHelper,
    });
  }

  async getOrCreateFoodsOnlyWithTranslations(foodsInformationForParserList: FoodsInformationTypeForParser[]) {
    const myTimer = new MyTimer(SCHEDULE_NAME + ' - getOrCreateFoodsOnly');
    const foodsHelper = this.context.myDatabaseHelper.getFoodsHelper();
    const foodsDict: Record<string, DatabaseTypes.Foods> = {};

    let index = 0;
    let amount = foodsInformationForParserList.length;
    for (const foodInfo of foodsInformationForParserList) {
      const foodId = foodInfo.basicFoodData.id;
      const searchJSON = { id: foodId };

      // Use findOrCreateItem to either find or create the food
      const foodWithTranslations = await foodsHelper.findOrCreateItem(searchJSON, searchJSON, { withTranslations: true });
      if (foodWithTranslations) {
        foodsDict[foodId] = foodWithTranslations;
      }
      index++;
      myTimer.printElapsedTimeAndEstimatedTimeRemaining({ progress: index, total: amount });
    }

    myTimer.printElapsedTime();
    await this.context.logger.appendLog(`[Step 1] - Found or created ${Object.keys(foodsDict).length} foods.`);
    return foodsDict;
  }

  async updateFoods(foodsInformationForParserList: FoodsInformationTypeForParser[], helperObject: FoodCreationHelperObject) {
    //let amountOfMeals = foodsInformationForParserList.length;
    let currentFoodIndex = 0;

    foodsInformationForParserList = ListHelper.removeDuplicatesFromJsonListWithSelector(foodsInformationForParserList, (foodsInformationForParser: FoodsInformationTypeForParser) => {
      return foodsInformationForParser.basicFoodData.id;
    }); // Remove duplicates https://github.com/rocket-meals/rocket-meals/issues/151

    // create dict with all marking external identifiers
    const dictMarkingExternalIdentifierToMarking: Record<string, DatabaseTypes.Markings | null> = {};
    for (let foodsInformationForParser of foodsInformationForParserList) {
      let marking_external_identifiers = foodsInformationForParser.marking_external_identifiers;
      for (let marking_external_identifier of marking_external_identifiers) {
        dictMarkingExternalIdentifierToMarking[marking_external_identifier] = null;
      }
    }

    // create markings
    let markingExternalIdentifiers = Object.keys(dictMarkingExternalIdentifierToMarking);
    for (let markingExternalIdentifier of markingExternalIdentifiers) {
      let marking: DatabaseTypes.Markings | undefined | null = null;
      marking = await this.findOrCreateMarkingByExternalIdentifier(markingExternalIdentifier);

      if (marking) {
        dictMarkingExternalIdentifierToMarking[markingExternalIdentifier] = marking;
      }
    }

    let foundFoodsWithTranslationsDict = await this.getOrCreateFoodsOnlyWithTranslations(foodsInformationForParserList);

    const myTimer = new MyTimer(SCHEDULE_NAME + ' - Update foods');

    let amountCompleted = 0;
    for (const foodsInformationForParser of foodsInformationForParserList) {
      let foundFoodWithTranslations = foundFoodsWithTranslationsDict[foodsInformationForParser.basicFoodData.id];
      if (!!foundFoodWithTranslations && foundFoodWithTranslations.id && this.foodParser) {
        const basicFoodData = foodsInformationForParser.basicFoodData;

        let marking_external_identifier_list = foodsInformationForParser.marking_external_identifiers;
        let markings: DatabaseTypes.Markings[] = [];
        for (let marking_external_identifier of marking_external_identifier_list) {
          let marking = dictMarkingExternalIdentifierToMarking[marking_external_identifier];
          if (marking) {
            markings.push(marking);
          }
        }

        await this.assignMarkingsToFood(markings, foundFoodWithTranslations, helperObject.dictMarkingsExclusions);
        await this.assignFoodCategoryToFood(foundFoodWithTranslations, foodsInformationForParser, helperObject.foodCategoryExternalIdentifiersToFoodCategoriesDict);

        await this.updateFoodBasicFields(basicFoodData); // TODO: Remove in the future
        await this.updateFoodsAttributesValues(foundFoodWithTranslations, foodsInformationForParser.attribute_values, helperObject.dictExternalIdentifierToFoodAttributes);

        await this.updateFoodTranslations(foundFoodWithTranslations, foodsInformationForParser);

        amountCompleted++;
        myTimer.printElapsedTimeAndEstimatedTimeRemaining({
          progress: amountCompleted,
          total: foodsInformationForParserList.length,
        });
      }
    }

    await this.context.logger.appendLog('Finished Update Foods');
  }

  async assignFoodCategoryToFood(food: DatabaseTypes.Foods, foodsInformationForParser: FoodsInformationTypeForParser, foodCategoryExternalIdentifiersToFoodCategoriesDict: DictFoodsCategoryExternalIdentifierToFoodsCategory) {
    let foodCategoryExternalIdentifier = foodsInformationForParser.category_external_identifier;
    if (foodCategoryExternalIdentifier) {
      let foodCategory = foodCategoryExternalIdentifiersToFoodCategoriesDict[foodCategoryExternalIdentifier];
      const foodCategory_id = foodCategory?.id;
      const foodsFoodsCategory_id = food.food_category;
      if (foodCategory_id !== foodsFoodsCategory_id) {
        await this.context.myDatabaseHelper.getFoodsHelper().updateOne(food.id, { food_category: foodCategory_id });
      }
    }
  }

  async findOrCreateCanteen(canteen: CanteensTypeForParser) {
    let searchJSON = {
      external_identifier: canteen.external_identifier,
    };
    let createJSON = canteen;
    return await this.context.myDatabaseHelper.getCanteensHelper().findOrCreateItem(searchJSON, createJSON);
  }

  async findOrCreateCanteenByExternalIdentifier(external_identifier: string) {
    let searchJSON: CanteensTypeForParser = {
      external_identifier: external_identifier,
    };
    return await this.findOrCreateCanteen(searchJSON);
  }

  buildComponentFoodoffersCreate(components: FoodComponentForParser[], canteen: DatabaseTypes.Canteens, dictMarkingExternalIdentifierToMarking: Record<string, DatabaseTypes.Markings | null>, dictMarkingsExclusions: DictMarkingsExclusions): any {
    if (!components || components.length === 0) {
      return {
        create: [],
        update: [],
        delete: [],
      };
    }

    const componentCreates = components.map(component => {
      const componentMarkings: DatabaseTypes.Markings[] = [];
      for (const marking_external_identifier of component.marking_external_identifiers) {
        const marking = dictMarkingExternalIdentifierToMarking[marking_external_identifier];
        if (marking) {
          componentMarkings.push(marking);
        }
      }
      const filteredComponentMarkings = MarkingFilterHelper.filterMarkingByRestrictionRules(componentMarkings, dictMarkingsExclusions);
      const componentMarkingsCreate: any[] = filteredComponentMarkings.map(marking => {
        return {
          foodoffers_id: '+',
          markings_id: {
            id: marking.id,
          },
        };
      });

      return {
        component_foodoffers_id: {
          alias: component.alias,
          canteen: null,
          date: null,
          food: null,
          foodoffer_components: [],
          is_component: true,
          status: DirectusItemStatus.PUBLISHED,
          markings: {
            create: componentMarkingsCreate,
            update: [],
            delete: [],
          },
          attribute_values: {
            create: [],
            update: [],
            delete: [],
          },
        },
      };
    });

    return {
      create: componentCreates,
      update: [],
      delete: [],
    };
  }

  getFoodofferToCreate(foodofferForParser: FoodoffersTypeForParser, canteen: DatabaseTypes.Canteens, markings: DatabaseTypes.Markings[], food: DatabaseTypes.Foods, foodofferCategory: DatabaseTypes.FoodoffersCategories | undefined, helperObject: FoodCreationHelperObject, dictMarkingExternalIdentifierToMarking: Record<string, DatabaseTypes.Markings | null>, resultHash: string) {
    let food_id = foodofferForParser.food_id;
    const basicFoodofferData = foodofferForParser.basicFoodofferData;

    if (!basicFoodofferData.alias) {
      // If alias is not set, try to get it from meal
      basicFoodofferData.alias = food.alias; // Add alias to meal offer from meal
    }
    const foodoffers_import_without_date = !!canteen.foodoffers_import_without_date;
    const date = (foodoffers_import_without_date || !foodofferForParser.date) ? null : DateHelper.foodofferDateTypeToString(foodofferForParser.date);

    const markingsCreate: any[] = markings.map(marking => {
      return {
        foodoffers_id: '+',
        markings_id: {
          id: marking.id,
        },
      };
    });

    let foodWithOnlySetAttributesFields = this.getFoodsOrFoodoffersWithOnlySetAttributesFields({} as DatabaseTypes.Foodoffers, foodofferForParser.attribute_values, helperObject.dictExternalIdentifierToFoodAttributes, { isFood: false, isFoodoffer: true });

    let foodOfferToCreate: Partial<DatabaseTypes.Foodoffers> = {
      ...foodofferForParser.basicFoodofferData,
      canteen: canteen.id,
      food: food_id,
      attribute_values: foodWithOnlySetAttributesFields.attribute_values,
      foodoffer_category: foodofferCategory?.id,
      date: date,
      date_created: new Date().toISOString(),
      date_updated: new Date().toISOString(),
      result_hash: resultHash,
      markings: {
        // @ts-ignore
        create: markingsCreate,
        update: [],
        delete: [],
      },
      // @ts-ignore
      foodoffer_components: this.buildComponentFoodoffersCreate(foodofferForParser.components, canteen, dictMarkingExternalIdentifierToMarking, helperObject.dictMarkingsExclusions), // Directus nested create format is not reflected in the static type
    };
    return foodOfferToCreate;
  }

  async createFoodOffers(foodofferListForParser: FoodoffersTypeForParser[], helperObject: FoodCreationHelperObject) {
    const amountOfRawMealOffers = foodofferListForParser.length;
    const firstFoodoffer = foodofferListForParser[0];
    const canteenInfo = firstFoodoffer?.canteen_external_identifier ?? 'unknown';
    const dateInfo = firstFoodoffer?.date
      ? DateHelper.foodofferDateTypeToString(firstFoodoffer.date).split('-').reverse().join('.')
      : 'no date';
    await this.context.logger.appendLog('Create Food Offers (' + canteenInfo + ', ' + dateInfo + ')');

    const dictCanteenExternalIdentifierToCanteen: Record<string, DatabaseTypes.Canteens | null> = {};
    const dictMarkingExternalIdentifierToMarking: Record<string, DatabaseTypes.Markings | null> = {};

    // fill the dicts with null values
    for (let foodofferForParser of foodofferListForParser) {
      let canteen_external_identifier = foodofferForParser.canteen_external_identifier;
      dictCanteenExternalIdentifierToCanteen[canteen_external_identifier] = null;

      let marking_external_identifiers = foodofferForParser.marking_external_identifiers;
      for (let marking_external_identifier of marking_external_identifiers) {
        dictMarkingExternalIdentifierToMarking[marking_external_identifier] = null;
      }

      for (let component of foodofferForParser.components) {
        for (let marking_external_identifier of component.marking_external_identifiers) {
          dictMarkingExternalIdentifierToMarking[marking_external_identifier] = null;
        }
      }
    }

    // create canteens
    let canteenExternalIdentifiers = Object.keys(dictCanteenExternalIdentifierToCanteen);
    for (let canteenExternalIdentifier of canteenExternalIdentifiers) {
      let canteen = await this.findOrCreateCanteenByExternalIdentifier(canteenExternalIdentifier);
      if (canteen) {
        dictCanteenExternalIdentifierToCanteen[canteenExternalIdentifier] = canteen;
      }
    }

    // create markings
    let markingExternalIdentifiers = Object.keys(dictMarkingExternalIdentifierToMarking);
    for (let markingExternalIdentifier of markingExternalIdentifiers) {
      let marking: DatabaseTypes.Markings | undefined | null = null;
      marking = await this.findOrCreateMarkingByExternalIdentifier(markingExternalIdentifier);
      if (marking) {
        dictMarkingExternalIdentifierToMarking[markingExternalIdentifier] = marking;
      }
    }

    // dict foodsFound
    const dictFoodsFound: Record<string, DatabaseTypes.Foods | null> = {};
    for (let foodofferForParser of foodofferListForParser) {
      let food_id = foodofferForParser.food_id;
      dictFoodsFound[food_id] = null;
    }
    // search for foods
    const foodsService = await this.getFoodsService();
    const foodIds = Object.keys(dictFoodsFound);
    for (let foodId of foodIds) {
      let food = await foodsService.readOne(foodId);
      if (food) {
        dictFoodsFound[foodId] = food;
      }
    }

    const foodoffersToCreate: Partial<DatabaseTypes.Foodoffers>[] = [];
    for (const [index, foodofferForParser] of foodofferListForParser.entries()) {
      const canteen = dictCanteenExternalIdentifierToCanteen[foodofferForParser.canteen_external_identifier];
      const canteenFound = !!canteen;

      const marking_external_identifiers = foodofferForParser.marking_external_identifiers;
      const markings: DatabaseTypes.Markings[] = [];

      for (let marking_external_identifier of marking_external_identifiers) {
        const marking = dictMarkingExternalIdentifierToMarking[marking_external_identifier];
        if (marking) {
          markings.push(marking);
        }
      }
      const markingsAllFound = markings.length === marking_external_identifiers.length;

      if (!markingsAllFound) {
        const missingMarkings = marking_external_identifiers.filter(id => !dictMarkingExternalIdentifierToMarking[id]);
        await this.context.logger.appendLog('Warning Foodoffer ' + (index + 1) + ' / ' + amountOfRawMealOffers + ' - some markings not found: [' + missingMarkings.join(', ') + '] - proceeding with available markings');
      }

      const foodofferCategoryExternalIdentifier = foodofferForParser.category_external_identifier;
      let foodofferCategory: DatabaseTypes.FoodoffersCategories | undefined = undefined;
      if (foodofferCategoryExternalIdentifier) {
        foodofferCategory = helperObject.foodofferCategoryExternalIdentifiersToFoodofferCategoriesDict[foodofferCategoryExternalIdentifier];
      }

      const food_id = foodofferForParser.food_id;
      const food = dictFoodsFound[food_id];
      const foodFound = !!food;

      const foodIsArchived = foodFound && food?.status === DirectusItemStatus.ARCHIVED;

      if (canteenFound && foodFound && !foodIsArchived) {
        const filteredMarkings = MarkingFilterHelper.filterMarkingByRestrictionRules(markings, helperObject.dictMarkingsExclusions);
        const resultHash = FoodParserHelper.getFoodofferHashFromFoodofferInformationForParser(foodofferForParser);
        let foodOfferToCreate = this.getFoodofferToCreate(foodofferForParser, canteen, filteredMarkings, food, foodofferCategory, helperObject, dictMarkingExternalIdentifierToMarking, resultHash);
        foodoffersToCreate.push(foodOfferToCreate);
      } else if (foodIsArchived) {
        await this.context.logger.appendLog('Skip Foodoffer ' + (index + 1) + ' / ' + amountOfRawMealOffers + ' - food has status archived - food_id: ' + food_id);
      } else {
        await this.context.logger.appendLog('Error Foodoffer ' + (index + 1) + ' / ' + amountOfRawMealOffers + ' - canteenFound: ' + canteenFound + ' - foodFound: ' + foodFound + ' - food_id: ' + food_id);
      }
    }

    const batchSize = 10;

    const myFoodOffersService = this.context.myDatabaseHelper.getFoodoffersHelper();

    const myTimer = new MyTimer(SCHEDULE_NAME + ' - Create Food Offers (' + canteenInfo + ', ' + dateInfo + ')');
    await this.context.logger.appendLog('Amount of food offers to create: ' + foodoffersToCreate.length)
    const myTimersEmitEvents = new MyTimers('disableEventEmit_TRUE', 'disableEventEmit_FALSE');

    let batchIndex = 1;
    const amountOfBatches = Math.ceil(foodoffersToCreate.length / batchSize);
    for (let i = 0; i < foodoffersToCreate.length; i += batchSize) {
      const batch = foodoffersToCreate.slice(i, i + batchSize);
      await this.context.logger.appendLog('Create Food Offers Batch ' + batchIndex + ' / ' + amountOfBatches);

      let disableEventEmit = true;
      /**
      let result = await myFoodOffersService.createManyItems(batch, {
        disableEventEmit: disableEventEmit,
      });
      */
      for(let foodofferToCreate of batch){
        try{
          await this.context.logger.appendLog('Create Food Offer ' + JSON.stringify(foodofferToCreate, null, 2));
          let result = await myFoodOffersService.createOne(foodofferToCreate, {
            disableEventEmit: disableEventEmit,
          });
          await this.context.logger.appendLog('Created Food Offer ' + JSON.stringify(result, null, 2));
        } catch (error: any){
          await this.context.logger.appendLog('Error creating food offer: ' + JSON.stringify(error, null, 2));
        }
      }

      myTimer.printElapsedTimeAndEstimatedTimeRemaining({
        progress: batchIndex,
        total: amountOfBatches,
        prefix: null,
        suffix: 'Create Foodoffers (' + canteenInfo + ', ' + dateInfo + ', Offers: ' + foodoffersToCreate.length + ')',
      });
      batchIndex++;
    }
  }

  async updateMarkings(markingsJSONList: MarkingsTypeForParser[]) {
    let itemService = this.context.myDatabaseHelper.getMarkingsHelper();

    markingsJSONList = ListHelper.removeDuplicatesFromJsonList(markingsJSONList, 'external_identifier'); // Remove duplicates https://github.com/rocket-meals/rocket-meals/issues/151

    let amountOfMarkings = markingsJSONList.length;
    let currentMarking = 0;
    for (let markingJSON of markingsJSONList) {
      currentMarking++;
      await this.context.logger.appendLog('Update Marking ' + currentMarking + ' / ' + amountOfMarkings);
      await this.context.logger.appendLog(JSON.stringify(markingJSON, null, 2));

      let markingJSONCopy = JSON.parse(JSON.stringify(markingJSON));
      delete markingJSONCopy.translations; // Remove meals translations, add it later

      let markings = await itemService.readByQuery({
        filter: { external_identifier: markingJSONCopy.external_identifier },
        limit: 1,
      });

      let marking = markings.length > 0 ? markings[0] : null;

      if (!marking) {
        // If marking does not exist, create a new one
        let adaptedMarkingJSON: Partial<DatabaseTypes.Markings> = {
          ...markingJSONCopy,
          short_code: markingJSONCopy.external_identifier, // Set short_code to external_identifier
          status: DirectusItemStatus.DRAFT, // New markings start as draft; admin must publish them
        };

        let marking_id = await itemService.createOne(adaptedMarkingJSON);
        marking = await itemService.readOne(marking_id);
      } else {
        // If marking exists, don't update it, as it could be changed by the user
        // We already set all fields in the createOne method
        //await itemService.updateOne(marking.id, markingJSONCopy);
      }

      if (marking?.id) {
        await this.updateMarkingTranslations(marking, markingJSON);
      }
    }
  }

  async updateMarkingTranslations(marking: DatabaseTypes.Markings, markingJSON: MarkingsTypeForParser) {
    await TranslationHelper.updateItemTranslations<DatabaseTypes.Markings, DatabaseTypes.MarkingsTranslations>(marking, {
      translationsFromParsing: markingJSON.translations,
      items_primary_field_in_translation_table: 'markings_id',
      itemsTablename: CollectionNames.MARKINGS,
      myDatabaseHelper: this.context.myDatabaseHelper,
    });
  }
}
