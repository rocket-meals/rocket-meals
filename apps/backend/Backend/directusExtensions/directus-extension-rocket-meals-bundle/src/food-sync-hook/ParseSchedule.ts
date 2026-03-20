import {
  CanteensTypeForParser,
  FoodComponentForParser,
  FoodofferDateType,
  FoodoffersTypeForParser,
  FoodParseFoodAttributesType,
  FoodParserInterface,
  FoodsInformationTypeForParser,
  FoodWithBasicData
} from './FoodParserInterface';
import {TranslationHelper, TranslationUpdateContext} from '../helpers/TranslationHelper';
import {CollectionNames, DatabaseTypes, DateHelper} from 'repo-depkit-common';
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
      if (!!this.markingParser) {
        //console.log("Create Needed Data for MarkingParser");
        await this.context.logger.appendLog('Create Needed Data for MarkingParser');
        await this.markingParser.createNeededData();
        await this.context.logger.appendLog('Update Markings');
        //console.log("Get Markings JSON List");
        markingsJSONList = await this.markingParser.getMarkingsJSONList();
        //console.log("Update Markings");
        await this.updateMarkings(markingsJSONList);
      }

      if (!!this.foodParser) {
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

          await this.context.logger.appendLog('Delete specific food offers');
          //await this.deleteAllComponentFoodoffers(); // No need since, a hook will delete the components if the foodoffer is deleted
          await this.deleteRequiredFoodOffersForTheirCanteens(foodofferListForParser);

          await this.context.logger.appendLog('Create food offers');
          await this.createFoodOffers(foodofferListForParser, helperObject);

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
        if (!!externalIdentifier) {
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
      if (!!foodAttribute) {
        externalIdentifiersToFoodAttributesDict[externalIdentifier] = foodAttribute;
      }
    }
    return externalIdentifiersToFoodAttributesDict;
  }

  async updateFoodsCategories(foodsInformationForParserList: FoodsInformationTypeForParser[]) {
    let categoryExternalIdentifiers: string[] = [];
    for (let foodsInformationForParser of foodsInformationForParserList) {
      let categoryExternalIdentifier = foodsInformationForParser.category_external_identifier;
      if (!!categoryExternalIdentifier) {
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
      if (!!externalIdentifier) {
        dict[externalIdentifier] = foodCategory;
      }
    }
    return dict;
  }

  async updateFoodofferCategories(foodofferListForParser: FoodoffersTypeForParser[]) {
    let categoryExternalIdentifiers: string[] = [];
    for (let foodofferForParser of foodofferListForParser) {
      let categoryExternalIdentifier = foodofferForParser.category_external_identifier;
      if (!!categoryExternalIdentifier) {
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
      if (!!externalIdentifier) {
        dict[externalIdentifier] = foodofferCategory;
      }
    }
    return dict;
  }

  async getFoodsService() {
    return await this.context.myDatabaseHelper.getFoodsHelper();
  }

  getFoodofferDatesFromRawFoodofferJSONList(foodoffersForParser: FoodoffersTypeForParser[]): FoodofferDateType[] {
    let isoDatesStringDict: { [key: string]: FoodofferDateType } = {};
    for (let foodofferForParser of foodoffersForParser) {
      const directusDateOnlyFormat = DateHelper.foodofferDateTypeToString(foodofferForParser.date);
      isoDatesStringDict[directusDateOnlyFormat] = foodofferForParser.date;
    }
    let foodofferDates = Object.values(isoDatesStringDict);
    return foodofferDates;
  }

  /**
   * As we recieved a new food offer list, we delete all offers that are in the future and newer than the latest date in the list.
   * @param foodofferDatesToDelete
   */
  async deleteRequiredFoodOffersForTheirCanteens(foodoffersForParser: FoodoffersTypeForParser[]) {
    let foodoffersForParserGroupedByCanteen: Record<string, FoodoffersTypeForParser[]> = {};
    for (let foodofferForParser of foodoffersForParser) {
      let key = foodofferForParser.canteen_external_identifier;
      if (!foodoffersForParserGroupedByCanteen[key]) {
        foodoffersForParserGroupedByCanteen[key] = [];
      }
      foodoffersForParserGroupedByCanteen[key].push(foodofferForParser);
    }

    let canteenExternalIdentifiers = Object.keys(foodoffersForParserGroupedByCanteen);
    for (let canteenExternalIdentifier of canteenExternalIdentifiers) {
      await this.context.logger.appendLog('Delete required foodoffers for canteen: ' + canteenExternalIdentifier);
      let canteen = await this.findOrCreateCanteenByExternalIdentifier(canteenExternalIdentifier);
      if (!!canteen) {
        // first delete all food offers for canteen without dates
        let foodoffers_import_delete_all_without_dates = canteen.foodoffers_import_delete_all_without_dates;
        if (foodoffers_import_delete_all_without_dates) {
          await this.deleteAllFoodoffersForCanteenWithoutDates(canteen);
        }

        // now delete all food offers that are in the future and newer than the latest date in the list
        let foodoffersForParserForCanteen = foodoffersForParserGroupedByCanteen[canteenExternalIdentifier] || [];
        let foodofferDatesToDelete = this.getFoodofferDatesFromRawFoodofferJSONList(foodoffersForParserForCanteen);
        await this.deleteFoodOffersNewerOrEqualThanDate(foodofferDatesToDelete, canteen);
      }
    }
  }

  async deleteAllFoodoffersForCanteenWithoutDates(canteen: DatabaseTypes.Canteens) {
    let itemService = await this.context.myDatabaseHelper.getFoodoffersHelper();
    let itemsToDelete = await itemService.readByQuery({
      filter: {
        canteen: {
          _eq: canteen.id,
        },
        date: {
          _null: true,
        },
      },
      fields: ['id'], // Assuming 'id' is the primary key field
      limit: -1,
    });
    await this.deleteFoodOffers(itemsToDelete, `Delete all food offers for canteen without dates: ${canteen.id} - amount: ${itemsToDelete.length}`);
  }

  async deleteFoodOffersNewerOrEqualThanDate(foodofferDatesToDelete: FoodofferDateType[], canteen: DatabaseTypes.Canteens) {
    let oldestFoodofferDate: FoodofferDateType | null = null;
    for (let foodofferDateToDelete of foodofferDatesToDelete) {
      let foodofferDateToDeleteAsDate = new Date(DateHelper.foodofferDateTypeToString(foodofferDateToDelete));

      if (!!oldestFoodofferDate) {
        let oldestFoodofferDateAsDate = new Date(DateHelper.foodofferDateTypeToString(oldestFoodofferDate));
        if (foodofferDateToDeleteAsDate < oldestFoodofferDateAsDate) {
          oldestFoodofferDate = foodofferDateToDelete;
        }
      } else {
        oldestFoodofferDate = foodofferDateToDelete;
      }
    }
    if (!!oldestFoodofferDate) {
      // add one day to the latest date and format it to iso8601
      //oldestFoodofferDate.setDate(oldestFoodofferDate.getDate() + 1);
      //let latestPlusOneDayIso8601StringDate = DateHelper.formatDateToIso8601WithoutTimezone(oldestFoodofferDate);
      //let nowAsIso8601StringDate = DateHelper.formatDateToIso8601WithoutTimezone(new Date());
      // if the latest date is in the future, we delete all offers that are newer or equal to latestPlusOneDayIso8601StringDate
      // we do only delete offers in the future automatically, as we do not want to delete offers that are in the past
      // - Why not? When we receive a new list of food offers, we want to delete all offers that are in the future and newer than the latest date in the list.
      //if(new Date(latestPlusOneDayIso8601StringDate) > new Date(nowAsIso8601StringDate)){
      //    await this.deleteAllFoodOffersNewerOrEqualThanDate(latestPlusOneDayIso8601StringDate);
      //}

      await this.context.logger.appendLog('Delete food offers newer or equal than date: ' + oldestFoodofferDate);
      await this.deleteAllFoodOffersNewerOrEqualThanDateForCanteen(oldestFoodofferDate, canteen);
    }
  }

  async deleteFoodOffers(foodoffers: DatabaseTypes.Foodoffers[], notice: string) {
    let itemService = await this.context.myDatabaseHelper.getFoodoffersHelper();
    let idsToDelete = foodoffers.map(item => item.id);

    // Step 2: Delete the items using their IDs
    if (idsToDelete.length > 0) {
      await itemService
        .deleteMany(idsToDelete)
        .then(async () => {
          await this.context.logger.appendLog(`Foodoffers deleted: ${idsToDelete.length} - ${notice}`);
        })
        .catch(async error => {
          await this.context.logger.appendLog(`Foodoffers delete error: ${notice}: ${error}`);
        });
    } else {
      await this.context.logger.appendLog(`No foodoffers given to delete - ${notice}`);
    }
  }

  async deleteAllFoodOffersNewerOrEqualThanDateForCanteen(iso8601StringDate: FoodofferDateType, canteen: DatabaseTypes.Canteens) {
    const directusDateOnlyString = DateHelper.foodofferDateTypeToString(iso8601StringDate);
    await this.context.logger.appendLog('Delete food offers newer or equal than date: ' + directusDateOnlyString + ' for canteen: ' + canteen.id);

    let itemService = await this.context.myDatabaseHelper.getFoodoffersHelper();
    //await itemService.deleteByQuery()
    // TODO: Überprüfen ob deleteByQuery funktioniert und ob es dadurch schneller geht bzw. es zu einem Blockieren der Datenbank kommt

    let itemsToDelete = await itemService.readByQuery({
      filter: {
        _and: [
          {
            date: {
              _gte: directusDateOnlyString,
            },
          },
          {
            canteen: {
              _eq: canteen.id,
            },
          },
        ],
      },
      fields: ['id'], // Assuming 'id' is the primary key field
      limit: -1,
    });

    await this.deleteFoodOffers(itemsToDelete, `Delete all food offers newer or equal than date: ${directusDateOnlyString} for canteen: ${canteen.id}`);
  }

  async findOrCreateMarkingByExternalIdentifier(marking_external_identifier: string) {
    let searchJSON = {
      external_identifier: marking_external_identifier,
    };
    let createJSON = {
      alias: marking_external_identifier,
      external_identifier: marking_external_identifier,
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
      if (!!canteenFoundOrCreated) {
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
    if (!!delteAttributeValuesRaw) {
      for (let attribute of delteAttributeValuesRaw) {
        if (!!attribute.id) {
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
      if (!!foodAttribute) {
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
    const context: TranslationUpdateContext<DatabaseTypes.FoodsTranslations> = {
      translationsFromParsing: foodsInformationForParser.translations,
      items_primary_field_in_translation_table: 'foods_id',
      itemsTablename: CollectionNames.FOODS,
      myDatabaseHelper: this.context.myDatabaseHelper,
    };
    await TranslationHelper.updateItemTranslationsForItemWithTranslationsFetched<DatabaseTypes.Foods, DatabaseTypes.FoodsTranslations>(foundFoodWithTranslations, context);
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
      if (!!foodWithTranslations) {
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

    let shouldCreateNewMarkings = false;
    if (!!this.foodParser) {
      // if the food parser should create new markings instead of the marking parser
      shouldCreateNewMarkings = this.foodParser.shouldCreateNewMarkingsWhenTheyDoNotExistYet();
    }

    // create markings
    let markingExternalIdentifiers = Object.keys(dictMarkingExternalIdentifierToMarking);
    for (let markingExternalIdentifier of markingExternalIdentifiers) {
      let marking: DatabaseTypes.Markings | undefined | null = null;
      if (shouldCreateNewMarkings) {
        marking = await this.findOrCreateMarkingByExternalIdentifier(markingExternalIdentifier);
      } else {
        marking = await this.findMarkingByExternalIdentifier(markingExternalIdentifier);
      }

      if (!!marking) {
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
          if (!!marking) {
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
    if (!!foodCategoryExternalIdentifier) {
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
          status: 'published',
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

  getFoodofferToCreate(foodofferForParser: FoodoffersTypeForParser, canteen: DatabaseTypes.Canteens, markings: DatabaseTypes.Markings[], food: DatabaseTypes.Foods, foodofferCategory: DatabaseTypes.FoodoffersCategories | undefined, helperObject: FoodCreationHelperObject, dictMarkingExternalIdentifierToMarking: Record<string, DatabaseTypes.Markings | null>) {
    let food_id = foodofferForParser.food_id;
    const basicFoodofferData = foodofferForParser.basicFoodofferData;

    if (!basicFoodofferData.alias) {
      // If alias is not set, try to get it from meal
      basicFoodofferData.alias = food.alias; // Add alias to meal offer from meal
    }
    const foodoffers_import_without_date = !!canteen.foodoffers_import_without_date;
    const date = foodoffers_import_without_date ? null : DateHelper.foodofferDateTypeToString(foodofferForParser.date);

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
    await this.context.logger.appendLog('Create Food Offers');

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
      if (!!canteen) {
        dictCanteenExternalIdentifierToCanteen[canteenExternalIdentifier] = canteen;
      }
    }

    // create markings
    let markingExternalIdentifiers = Object.keys(dictMarkingExternalIdentifierToMarking);
    let shouldCreateNewMarkings = false;
    if (!!this.foodParser) {
      // if the food parser should create new markings instead of the marking parser
      shouldCreateNewMarkings = this.foodParser.shouldCreateNewMarkingsWhenTheyDoNotExistYet();
    }
    for (let markingExternalIdentifier of markingExternalIdentifiers) {
      let marking: DatabaseTypes.Markings | undefined | null = null;
      if (shouldCreateNewMarkings) {
        marking = await this.findOrCreateMarkingByExternalIdentifier(markingExternalIdentifier);
      } else {
        marking = await this.findMarkingByExternalIdentifier(markingExternalIdentifier);
      }
      if (!!marking) {
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
      if (!!food) {
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

      const foodofferCategoryExternalIdentifier = foodofferForParser.category_external_identifier;
      let foodofferCategory: DatabaseTypes.FoodoffersCategories | undefined = undefined;
      if (!!foodofferCategoryExternalIdentifier) {
        foodofferCategory = helperObject.foodofferCategoryExternalIdentifiersToFoodofferCategoriesDict[foodofferCategoryExternalIdentifier];
      }

      const food_id = foodofferForParser.food_id;
      const food = dictFoodsFound[food_id];
      const foodFound = !!food;

      if (canteenFound && markingsAllFound && foodFound) {
        const filteredMarkings = MarkingFilterHelper.filterMarkingByRestrictionRules(markings, helperObject.dictMarkingsExclusions);
        let foodOfferToCreate = this.getFoodofferToCreate(foodofferForParser, canteen, filteredMarkings, food, foodofferCategory, helperObject, dictMarkingExternalIdentifierToMarking);
        foodoffersToCreate.push(foodOfferToCreate);
      } else {
        await this.context.logger.appendLog('Error Foodoffer ' + (index + 1) + ' / ' + amountOfRawMealOffers + ' - canteenFound: ' + canteenFound + ' - markingsAllFound: ' + markingsAllFound + ' - foodFound: ' + foodFound);
      }
    }

    const batchSize = 10;

    const myFoodOffersService = await this.context.myDatabaseHelper.getFoodoffersHelper();

    const myTimer = new MyTimer(SCHEDULE_NAME + ' - Create Food Offers');
    const myTimersEmitEvents = new MyTimers('disableEventEmit_TRUE', 'disableEventEmit_FALSE');

    let batchIndex = 1;
    const amountOfBatches = Math.ceil(foodoffersToCreate.length / batchSize);
    for (let i = 0; i < foodoffersToCreate.length; i += batchSize) {
      const batch = foodoffersToCreate.slice(i, i + batchSize);
      await this.context.logger.appendLog('Create Food Offers Batch ' + batchIndex + ' / ' + amountOfBatches);

      let disableEventEmit = true;
      await myFoodOffersService.createManyItems(batch, {
        disableEventEmit: disableEventEmit,
      });
      myTimer.printElapsedTimeAndEstimatedTimeRemaining({
        progress: batchIndex,
        total: amountOfBatches,
        prefix: null,
        suffix: 'Total amount of food offers: ' + foodoffersToCreate.length,
      });
      batchIndex++;
    }
  }

  async updateMarkings(markingsJSONList: MarkingsTypeForParser[]) {
    let itemService = await this.context.myDatabaseHelper.getMarkingsHelper();

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
        };

        let marking_id = await itemService.createOne(adaptedMarkingJSON);
        marking = await itemService.readOne(marking_id);
      } else {
        // If marking exists, don't update it, as it could be changed by the user
        // We already set all fields in the createOne method
        //await itemService.updateOne(marking.id, markingJSONCopy);
      }

      if (marking && marking.id) {
        await this.updateMarkingTranslations(marking, markingJSON);
      }
    }
  }

  async updateMarkingTranslations(marking: DatabaseTypes.Markings, markingJSON: MarkingsTypeForParser) {
    const context: TranslationUpdateContext<DatabaseTypes.MarkingsTranslations> = {
      translationsFromParsing: markingJSON.translations,
      items_primary_field_in_translation_table: 'markings_id',
      itemsTablename: CollectionNames.MARKINGS,
      myDatabaseHelper: this.context.myDatabaseHelper,
    };
    await TranslationHelper.updateItemTranslations<DatabaseTypes.Markings, DatabaseTypes.MarkingsTranslations>(marking, context);
  }
}
