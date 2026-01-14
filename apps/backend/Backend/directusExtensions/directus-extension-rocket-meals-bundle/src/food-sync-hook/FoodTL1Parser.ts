import {CSVExportParser} from './CSVExportParser';

import {
  CanteensTypeForParser,
  FoodofferDateType,
  FoodoffersTypeForParser,
  FoodofferTypeWithBasicData,
  FoodParseFoodAttributesType,
  FoodParserInterface,
  FoodsInformationTypeForParser,
  FoodWithBasicData
} from './FoodParserInterface';
import {FoodTL1Parser_GetRawReportInterface} from './FoodTL1Parser_GetRawReportInterface';
import {TranslationsFromParsingType} from '../helpers/TranslationHelper';
import {LanguageCodes} from 'repo-depkit-common';
import {PriceGroupEnum} from './PriceGroupEnum';
import {DictHelper} from '../helpers/DictHelper';
import {MarkingsTypeForParser} from './MarkingParserInterface';

export type FoodofferIdentifierType = string;
export type RawTL1FoodofferType = { [x: string]: string };

export type RawFoodofferInformationType = {
  food_id: string;
  raw_tl1_foodoffer_json: RawTL1FoodofferType;
  date: FoodofferDateType;
  canteen_external_identifier: string;
};

export type RawFoodofferInformationListType = RawFoodofferInformationType[];

export enum TL1AttributeValueType {
  NUMBER = 'number',
  STRING = 'string',
  BOOLEAN = 'boolean',
}
export type Tl1AttributeType = {
  field_name: string;
  external_identifier: string;
  value_type: TL1AttributeValueType;
};

export class FoodTL1Parser implements FoodParserInterface {
  static DEFAULT_CANTEEN_FIELD = 'MENSA';
  static DEFAULT_DATE_FIELD = 'DATUM';
  static DEFAULT_TEXT_FIELD = 'TEXT';
  static DEFAULT_RECIPE_ID_FIELD = 'REZEPTUR_ID';
  static DEFAULT_NUTRITIONS_FIELD = 'NAEHRWERTEJEPORT';
  static DEFAULT_NUTRITION_FIELD_BRENNWERT_EXTERNAL_IDENTIFIER = 'calories_kcal';
  static DEFAULT_NUTRITION_FIELD_FAT_EXTERNAL_IDENTIFIER = 'fat_g';
  static DEFAULT_NUTRITION_FIELD_SATURATED_FAT_EXTERNAL_IDENTIFIER = 'saturated_fat_g';
  static DEFAULT_NUTRITION_FIELD_CARBOHYDRATE_EXTERNAL_IDENTIFIER = 'carbohydrate_g';
  static DEFAULT_NUTRITION_FIELD_SUGAR_EXTERNAL_IDENTIFIER = 'sugar_g';
  static DEFAULT_NUTRITION_FIELD_FIBER_EXTERNAL_IDENTIFIER = 'fiber_g';
  static DEFAULT_NUTRITION_FIELD_PROTEIN_EXTERNAL_IDENTIFIER = 'protein_g';
  static DEFAULT_NUTRITION_FIELD_SALT_EXTERNAL_IDENTIFIER = 'salt_g';

  static DEFAULT_CATEGORY_FIELD = 'SPEISE_BEZEICHNUNG';
  static DEFAULT_FOODOFFER_CATEGORY_FIELD = 'SPEISE';

  static FIELD_PRICE_STUDENT_OSNABRUECK = 'STD_PREIS';
  static FIELD_PRICE_STUDENT_HANNOVER = 'PREIS_STUDENT'; // Hannover TL1 specific

  static FIELD_PRICE_EMPLOYEE_OSNABRUECK = 'BED_PREIS';
  static FIELD_PRICE_EMPLOYEE_HANNOVER = 'PREIS_BEDIENSTETER'; // Hannover TL1 specific

  static FIELD_PRICE_GUEST_OSNABRUECK = 'GÄSTE_PREIS';
  static FIELD_PRICE_GUEST_HANNOVER = 'PREIS_GAST'; // Hannover TL1 specific

  static DEFAULT_MARKING_LABELS_FIELD = 'ZSNUMMERN';
  static DEFAULT_MARKING_NAMES_FIELD = 'ZSNAMEN';

  static DEFAULT_MENU_LINE_FIELD = 'FREI1';

  static DEFAULT_ZSNUMMERN_FIELD = 'ZSNUMMERN';

  private rawFoodoffersJSONList: RawFoodofferInformationListType = [];
  private readonly rawFoodofferReader: FoodTL1Parser_GetRawReportInterface;
  protected markingsJSONListFromMarkingParger: MarkingsTypeForParser[] | undefined = undefined; // passed from MarkingParserInterface

  constructor(rawFoodofferReader: FoodTL1Parser_GetRawReportInterface) {
    this.rawFoodofferReader = rawFoodofferReader;
    this.resetData();
  }

  private resetData() {
    this.rawFoodoffersJSONList = [];
    this.markingsJSONListFromMarkingParger = undefined;
  }

  /**
   * @implements FoodParserInterface
   */
  public async createNeededData(markingsJSONList?: MarkingsTypeForParser[] | undefined) {
    this.resetData();

    this.markingsJSONListFromMarkingParger = markingsJSONList;

    let rawReport = await this.rawFoodofferReader.getRawReport();
    this.rawFoodoffersJSONList = await this.getRawFoodofferJSONListFromRawReport(rawReport);
  }

  /**
   * @implements FoodParserInterface
   */
  public shouldCreateNewMarkingsWhenTheyDoNotExistYet(): boolean {
    return false;
  }

  /**
   * @implements FoodParserInterface
   */
  async getFoodsListForParser() {
    let foodIdToRawFoodofferDict = FoodTL1Parser.getFoodIdToRawFoodofferDict(this.rawFoodoffersJSONList);
    let foodIds = Object.keys(foodIdToRawFoodofferDict);
    let foodsJSONList: FoodsInformationTypeForParser[] = [];
    for (let foodId of foodIds) {
      let rawFoodoffer = foodIdToRawFoodofferDict[foodId];
      if (!!rawFoodoffer) {
        let foodInformationForParser = this.getFoodInformationFromRawFoodoffer(rawFoodoffer);
        if (!!foodInformationForParser) {
          foodsJSONList.push(foodInformationForParser);
        }
      }
    }
    return foodsJSONList;
  }

  getFoodCategoryFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType): string | null {
    let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);
    return parsedReportItem?.[FoodTL1Parser.DEFAULT_CATEGORY_FIELD] || null;
  }

  getFoodInformationFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType): FoodsInformationTypeForParser | null {
    const food_id = FoodTL1Parser.getFoodIdFromRawFoodoffer(rawFoodoffer);
    if (!food_id) {
      return null;
    }

    let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);

    const translations: TranslationsFromParsingType = {
      [LanguageCodes.DE]: {
        name: FoodTL1Parser._getFoodNameDe(parsedReportItem),
      },
      [LanguageCodes.EN]: {
        name: FoodTL1Parser._getFoodNameEn(parsedReportItem),
      },
    };

    let foodAttributes = this.getFoodAttributesFromRawTL1Foodoffer(parsedReportItem);

    const basicFoodData: FoodWithBasicData = {
      id: food_id,
      alias: FoodTL1Parser._getFoodNameDe(parsedReportItem),
    };

    return {
      basicFoodData: basicFoodData,
      attribute_values: foodAttributes,
      translations: translations,
      category_external_identifier: this.getFoodCategoryFromRawFoodoffer(rawFoodoffer),
      marking_external_identifiers: this.getMarkingsExternalIdentifiersFromRawFoodoffer(rawFoodoffer),
    };
  }

  /**
   * @implements FoodParserInterface
   */
  async getCanteensList(): Promise<CanteensTypeForParser[]> {
    let rawFoodoffers = this.rawFoodoffersJSONList;
    let canteenLabelsDict: { [x: string]: CanteensTypeForParser } = {};
    for (let rawFoodoffer of rawFoodoffers) {
      let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);
      let canteenLabel = FoodTL1Parser.getCanteenLabelFunction(parsedReportItem);
      if (!!canteenLabel) {
        canteenLabelsDict[canteenLabel] = {
          external_identifier: canteenLabel,
          alias: canteenLabel,
        };
      }
    }
    return DictHelper.getValueListFromDict(canteenLabelsDict);
  }

  getFoodofferCategoryFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType): string | null {
    let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);
    return parsedReportItem?.[FoodTL1Parser.DEFAULT_FOODOFFER_CATEGORY_FIELD] || null;
  }

  /**
   * @implements FoodParserInterface
   */
  async getFoodoffersForParser(): Promise<FoodoffersTypeForParser[]> {
    const result: FoodoffersTypeForParser[] = [];
    let rawFoodoffers = this.rawFoodoffersJSONList;
    for (let rawFoodoffer of rawFoodoffers) {
      let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);

      let foodAttributes = this.getFoodAttributesFromRawTL1Foodoffer(parsedReportItem);

      const basicFoodofferData: FoodofferTypeWithBasicData = {
        alias: FoodTL1Parser._getFoodNameDe(parsedReportItem),
        price_employee: FoodTL1Parser.getPriceForGroup(parsedReportItem, PriceGroupEnum.PRICE_GROUP_EMPLOYEE),
        price_guest: FoodTL1Parser.getPriceForGroup(parsedReportItem, PriceGroupEnum.PRICE_GROUP_GUEST),
        price_student: FoodTL1Parser.getPriceForGroup(parsedReportItem, PriceGroupEnum.PRICE_GROUP_STUDENT),
        foodoffer_components: [],
      };

      const foodofferForParser: FoodoffersTypeForParser = {
        date: rawFoodoffer.date,
        basicFoodofferData: basicFoodofferData,
        attribute_values: foodAttributes,
        category_external_identifier: this.getFoodofferCategoryFromRawFoodoffer(rawFoodoffer),
        marking_external_identifiers: this.getMarkingsExternalIdentifiersFromRawFoodoffer(rawFoodoffer),
        canteen_external_identifier: rawFoodoffer.canteen_external_identifier,
        food_id: rawFoodoffer.food_id,
      };
      result.push(foodofferForParser);
    }

    return result;
  }

  filterZsNummernOnlyForPassedExternalMarkingIdentifiersFromMarkingParser(markings: string[]) {
    let markingForParserFromMarkingParser = this.markingsJSONListFromMarkingParger;
    if (!!markingForParserFromMarkingParser) {
      let markingExternalIdentifiersFromMarkingParser = markingForParserFromMarkingParser.map(marking => {
        return marking.external_identifier;
      });
      let filteredMarkings = markings.filter(marking => {
        return markingExternalIdentifiersFromMarkingParser.includes(marking);
      });
      return filteredMarkings;
    } else {
      return markings; // if no marking parser is set, return all markings as they are
    }
  }

  getMarkingsExternalIdentifiersFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType): string[] {
    let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);
    let rawName = FoodTL1Parser._getRawNamesList(parsedReportItem).join('');
    let markingsDict = FoodTL1Parser.getMarkingLabelsDictFromFoodName(rawName);
    let marking_external_identifier_list_from_food_name = Object.keys(markingsDict);
    let menu_line_external_identifiers = FoodTL1Parser.getMarkingExternalIdentifiersForMenuLinesFromParsedReportItem(parsedReportItem);
    let total_marking_external_identifier_list = marking_external_identifier_list_from_food_name.concat(menu_line_external_identifiers);
    return total_marking_external_identifier_list;
  }

  async getRawFoodofferJSONListFromRawReport(rawReport: string | Buffer | undefined): Promise<RawFoodofferInformationListType> {
    let jsonListFromCsvString = CSVExportParser.getListOfLineObjectsWithParams(rawReport, CSVExportParser.NEW_LINE_DELIMITER, CSVExportParser.INLINE_DELIMITER_TAB, true);
    let groupedRawFoodofferItemsFromReport = FoodTL1Parser._groupParsedReportItemsToFoodofferListsItems(jsonListFromCsvString);
    return this.getRawFoodofferJSONListFromGroupedList(groupedRawFoodofferItemsFromReport);
  }

  /**
   * In the report there are multiple lines for one food offer. These lines contain the same food offer identifier but have different food ingredient ids
   * For example:
   * [
   *  { // One line parsed where SPEISE_ID 253 is for Quark
   *      "MENSA": "Mensa Haste",
   *      "DATUM": "25.01.2022",
   *      "TEXT1": "Quark (20,g)",
   *      "TEXT2": "Erdbeersauce",
   *      "SPEISE_ID": "253",
   *  },
   * { // One line parsed where SPEISE_ID 999 is for Erdbeersauce
   *      "MENSA": "Mensa Haste",
   *      "DATUM": "25.01.2022",
   *      "TEXT1": "Quark (20,g)",
   *      "TEXT2": "Erdbeersauce",
   *      "SPEISE_ID": "999",
   *  },
   *  So we want to group these lines to one food offer as our Identifier (MENSA, DATUM, TEXT1, TEXT2) is the same
   * @param parsedReportAsJsonList
   */
  static _groupParsedReportItemsToFoodofferListsItems(parsedReportAsJsonList: RawTL1FoodofferType[]): { [p: FoodofferIdentifierType]: RawTL1FoodofferType[] } {
    let dictOfFoodIngredientsForFoodoffer: {
      [p: FoodofferIdentifierType]: { [p: string]: string }[];
    } = {};
    for (let item of parsedReportAsJsonList) {
      let identifier: FoodofferIdentifierType | null = FoodTL1Parser.getFoodofferIdentifier(item);
      if (!!identifier) {
        let listOfParsedItemsForSameFoodoffer = dictOfFoodIngredientsForFoodoffer[identifier] || [];
        listOfParsedItemsForSameFoodoffer.push(item);
        dictOfFoodIngredientsForFoodoffer[identifier] = listOfParsedItemsForSameFoodoffer;
      }
    }
    return dictOfFoodIngredientsForFoodoffer;
  }

  getRawFoodofferJSONListFromGroupedList(groupedReportItems: { [p: FoodofferIdentifierType]: RawTL1FoodofferType[] }): RawFoodofferInformationListType {
    let foodOfferJSONList: RawFoodofferInformationType[] = [];
    let keys: FoodofferIdentifierType[] = Object.keys(groupedReportItems) as FoodofferIdentifierType[];
    for (let key of keys) {
      let listOfItemsForSameFoodoffer = groupedReportItems[key];
      let foodOfferJSON = this.getRawFoodofferInformationFromGroupedItems(listOfItemsForSameFoodoffer);
      if (!!foodOfferJSON) {
        foodOfferJSONList.push(foodOfferJSON);
      }
    }
    return foodOfferJSONList;
  }

  static getRecipeIdsFromRawTL1Foodoffer(listOfItemsForSameFoodoffer: RawTL1FoodofferType[] | undefined): null | string[] {
    if (!listOfItemsForSameFoodoffer || listOfItemsForSameFoodoffer.length === 0) {
      return null;
    }

    let recipe_ids: string[] = [];
    for (let item of listOfItemsForSameFoodoffer) {
      let item_id = FoodTL1Parser.getRecipeIdFunction(item);
      if (!!item_id) {
        recipe_ids.push(item_id);
      }
    }
    return recipe_ids;
  }

  getCombinedSortedRecipeIdAsString(listOfItemsForSameFoodoffer: RawTL1FoodofferType[] | undefined): null | string {
    const recipe_ids = FoodTL1Parser.getRecipeIdsFromRawTL1Foodoffer(listOfItemsForSameFoodoffer);
    if (!recipe_ids) {
      return null;
    }

    let combined_sorted_recpie_ids = FoodTL1Parser.getSortedRecipeIdFromListOfRecipeIds(recipe_ids);

    return combined_sorted_recpie_ids;
  }

  getFoodId(listOfItemsForSameFoodoffer: RawTL1FoodofferType[] | undefined): null | string {
    let sorted_recipe_ids = this.getCombinedSortedRecipeIdAsString(listOfItemsForSameFoodoffer);

    let food_id = sorted_recipe_ids;
    return food_id;
  }

  getRawFoodofferInformationFromGroupedItems(listOfItemsForSameFoodoffer: RawTL1FoodofferType[] | undefined): RawFoodofferInformationType | null {
    if (!listOfItemsForSameFoodoffer || listOfItemsForSameFoodoffer.length === 0) {
      return null;
    }
    let parsedReportItem = listOfItemsForSameFoodoffer[0];
    if (!parsedReportItem) {
      return null;
    }

    let food_id = this.getFoodId(listOfItemsForSameFoodoffer);
    if (!food_id) {
      return null;
    }

    let date = FoodTL1Parser.getDirectusDateFunction(parsedReportItem);
    if (!date) {
      return null;
    }

    let canteen_label = FoodTL1Parser.getCanteenLabelFunction(parsedReportItem);
    if (!canteen_label) {
      return null;
    }

    return {
      food_id: food_id,
      raw_tl1_foodoffer_json: parsedReportItem,
      date: date,
      canteen_external_identifier: canteen_label,
    };
  }

  /**
   * sorting the FoodIds in ascending order
   * @param string_recipe_ids the String to be sorted
   * @returns {string} returns the sorted Foodds as a string with - as a delimiter
   */
  static getSortedRecipeIdFromListOfRecipeIds(string_recipe_ids: string[] | number[]) {
    if (string_recipe_ids.length <= 0) {
      return null;
    }

    let numbers = string_recipe_ids.map(Number);
    let uniques = [...new Set(numbers)].map(Number).sort(function (a, b) {
      return a - b;
    });
    return uniques.map(String).join('-');
  }

  /**
   *
   */

  static getFoodIdToRawFoodofferDict(rawFoodofferJSONList: RawFoodofferInformationListType) {
    let foodIdsDictTorawFoodoffers: {
      [x: string]: RawFoodofferInformationType;
    } = {};
    if (!!rawFoodofferJSONList) {
      for (let rawFoodoffer of rawFoodofferJSONList) {
        let foodId = FoodTL1Parser.getFoodIdFromRawFoodoffer(rawFoodoffer);
        if (!!foodId) {
          foodIdsDictTorawFoodoffers[foodId] = rawFoodoffer;
        }
      }
    }
    return foodIdsDictTorawFoodoffers;
  }

  static getParsedReportItemFromrawFoodoffer(rawFoodoffer: RawFoodofferInformationType) {
    return rawFoodoffer.raw_tl1_foodoffer_json;
  }

  static getFoodIdFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType) {
    return rawFoodoffer.food_id;
  }

  static _hasValidName(parsedReportItem: RawTL1FoodofferType) {
    let rawNamesList = FoodTL1Parser._getRawNamesList(parsedReportItem);
    if (!!rawNamesList && rawNamesList.length > 0) {
      let rawName = rawNamesList.join('');
      return rawName.length > 0;
    } else {
      return false;
    }
  }

  static getFoodofferIdentifier(parsedReportItem: RawTL1FoodofferType): FoodofferIdentifierType | null {
    if (FoodTL1Parser._hasValidName(parsedReportItem)) {
      let foodofferIdentifier = '';
      foodofferIdentifier += FoodTL1Parser._getCanteenName(parsedReportItem);
      foodofferIdentifier += FoodTL1Parser._getRawDatum(parsedReportItem);
      foodofferIdentifier += FoodTL1Parser._getFoodIdentifierByName(parsedReportItem);
      return foodofferIdentifier as FoodofferIdentifierType;
    } else {
      return null;
    }
  }

  /**
   * A reciepe id is a identifier of an ingredient of a foodoffer. It is NOT unique for a foodoffer
   * @param parsedReportItem
   */
  static getRecipeIdFunction(parsedReportItem: RawTL1FoodofferType) {
    return parsedReportItem[FoodTL1Parser.DEFAULT_RECIPE_ID_FIELD];
  }

  static getDirectusDateFunction(parsedReportItem: RawTL1FoodofferType): FoodofferDateType | null {
    /**
     *   "DATUM": "25.01.2022",
     */
    let rawDate = FoodTL1Parser._getRawDatum(parsedReportItem);
    if (!rawDate) {
      return null;
    }
    if (rawDate.length !== 10) {
      return null;
    }
    let dateParts = rawDate.split('.');
    if (dateParts.length !== 3) {
      return null;
    }
    const dayPartString = dateParts[0];
    const monthPartString = dateParts[1];
    const yearPartString = dateParts[2];

    if (!dayPartString || !monthPartString || !yearPartString) {
      return null;
    }
    const day = parseInt(dayPartString);
    const month = parseInt(monthPartString);
    const year = parseInt(yearPartString);
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return null;
    }
    return {
      day: day,
      month: month,
      year: year,
    };

    //let isoDate = moment(rawDate, "DD-MM-YYYY");
    //return isoDate.toISOString();
  }

  static getCanteenLabelFunction(parsedReportItem: RawTL1FoodofferType) {
    return parsedReportItem[FoodTL1Parser.DEFAULT_CANTEEN_FIELD];
  }

  static findFirstPriceValueForFields(parsedReportItem: RawTL1FoodofferType, fields: string[]) {
    for (let field of fields) {
      let value = parsedReportItem[field];
      if (!!value) {
        return value;
      }
    }
    return null;
  }

  static getPriceForGroup(parsedReportItem: RawTL1FoodofferType, groupName: PriceGroupEnum): number | null | undefined {
    let foundPrice = null;
    switch (groupName) {
      case PriceGroupEnum.PRICE_GROUP_STUDENT:
        foundPrice = FoodTL1Parser.findFirstPriceValueForFields(parsedReportItem, [FoodTL1Parser.FIELD_PRICE_STUDENT_OSNABRUECK, FoodTL1Parser.FIELD_PRICE_STUDENT_HANNOVER]);
        break;
      case PriceGroupEnum.PRICE_GROUP_EMPLOYEE:
        foundPrice = FoodTL1Parser.findFirstPriceValueForFields(parsedReportItem, [FoodTL1Parser.FIELD_PRICE_EMPLOYEE_OSNABRUECK, FoodTL1Parser.FIELD_PRICE_EMPLOYEE_HANNOVER]);
        break;
      case PriceGroupEnum.PRICE_GROUP_GUEST:
        foundPrice = FoodTL1Parser.findFirstPriceValueForFields(parsedReportItem, [FoodTL1Parser.FIELD_PRICE_GUEST_OSNABRUECK, FoodTL1Parser.FIELD_PRICE_GUEST_HANNOVER]);
        break;
      default:
        return null;
    }
    if (!!foundPrice) {
      /**
       *    "STD_PREIS": "0,50",
       */
      foundPrice = foundPrice.replace(',', '.');
      return parseFloat(foundPrice);
    }
    return null;
  }

  static getAdditionalFoodAttributesFromRawTL1Foodoffer(parsedReportItem: RawTL1FoodofferType, csvAttributes: Tl1AttributeType[]): FoodParseFoodAttributesType {
    let attributeValues: FoodParseFoodAttributesType = [];
    for (let csvAttribute of csvAttributes) {
      let value = parsedReportItem[csvAttribute.field_name];
      if (csvAttribute.value_type === TL1AttributeValueType.NUMBER) {
        let value_as_number = null;
        if (!!value) {
          if (value.includes(',')) {
            value = value.replace(',', '.');
          }
          value_as_number = parseFloat(value);
        }
        attributeValues.push({
          external_identifier: csvAttribute.external_identifier,
          attribute_value: { number_value: value_as_number },
        });
      } else if (csvAttribute.value_type === TL1AttributeValueType.STRING) {
        attributeValues.push({
          external_identifier: csvAttribute.external_identifier,
          attribute_value: { string_value: value },
        });
      } else if (csvAttribute.value_type === TL1AttributeValueType.BOOLEAN) {
        let value_as_boolean = null;
        if (value === 'true') {
          value_as_boolean = true;
        } else if (value === 'false') {
          value_as_boolean = false;
        }

        attributeValues.push({
          external_identifier: csvAttribute.external_identifier,
          attribute_value: { boolean_value: value_as_boolean },
        });
      }
    }
    return attributeValues;
  }

  getFoodAttributesFromRawTL1Foodoffer(parsedReportItem: RawTL1FoodofferType): FoodParseFoodAttributesType {
    let foodAttributes: FoodParseFoodAttributesType = [];
    let nutritionAttributes = FoodTL1Parser.getFoodNutritionAttributeValuesFromRawTL1Foodoffer(parsedReportItem);
    foodAttributes = foodAttributes.concat(nutritionAttributes);

    return foodAttributes;
  }

  static getFoodNutritionAttributeValuesFromRawTL1Foodoffer(parsedReportItem: RawTL1FoodofferType): FoodParseFoodAttributesType {
    let attributeValues: FoodParseFoodAttributesType = [];

    /**
     * e. G.
     * "NAEHRWERTEJEPORT": "Brennwert=612 kJ (146 kcal), Fett=1,1g, davon gesättigte Fettsäuren=0,6g, Kohlenhydrate=19,8g, davon Zucker=18,8g, Ballaststoffe=0,0g, Eiweiß=12,8g, Salz=0,1g,"
     */
    let nutritionValuesString = parsedReportItem[FoodTL1Parser.DEFAULT_NUTRITIONS_FIELD];
    if (!!nutritionValuesString) {
      let kcalEndString = ' kcal)';
      let match = nutritionValuesString.match(/\(.* kcal/gm);
      // e. G. (XXXXXXX kcal)
      if (!!match) {
        let kcal = match[0].slice(1, kcalEndString.length); //remove starting bracket "(" and kcal)
        attributeValues.push({
          external_identifier: FoodTL1Parser.DEFAULT_NUTRITION_FIELD_BRENNWERT_EXTERNAL_IDENTIFIER,
          attribute_value: { number_value: parseInt(kcal) },
        });
      }

      attributeValues.push({
        external_identifier: FoodTL1Parser.DEFAULT_NUTRITION_FIELD_FAT_EXTERNAL_IDENTIFIER,
        attribute_value: {
          number_value: FoodTL1Parser.parseNutritionValue(nutritionValuesString, 'Fett'),
        },
      });
      attributeValues.push({
        external_identifier: FoodTL1Parser.DEFAULT_NUTRITION_FIELD_SATURATED_FAT_EXTERNAL_IDENTIFIER,
        attribute_value: {
          number_value: FoodTL1Parser.parseNutritionValue(nutritionValuesString, 'Fettsäuren'),
        },
      });
      attributeValues.push({
        external_identifier: FoodTL1Parser.DEFAULT_NUTRITION_FIELD_CARBOHYDRATE_EXTERNAL_IDENTIFIER,
        attribute_value: {
          number_value: FoodTL1Parser.parseNutritionValue(nutritionValuesString, 'Kohlenhydrate'),
        },
      });
      attributeValues.push({
        external_identifier: FoodTL1Parser.DEFAULT_NUTRITION_FIELD_SUGAR_EXTERNAL_IDENTIFIER,
        attribute_value: {
          number_value: FoodTL1Parser.parseNutritionValue(nutritionValuesString, 'Zucker'),
        },
      });
      attributeValues.push({
        external_identifier: FoodTL1Parser.DEFAULT_NUTRITION_FIELD_FIBER_EXTERNAL_IDENTIFIER,
        attribute_value: {
          number_value: FoodTL1Parser.parseNutritionValue(nutritionValuesString, 'Ballaststoffe'),
        },
      });
      attributeValues.push({
        external_identifier: FoodTL1Parser.DEFAULT_NUTRITION_FIELD_PROTEIN_EXTERNAL_IDENTIFIER,
        attribute_value: {
          number_value: FoodTL1Parser.parseNutritionValue(nutritionValuesString, 'Eiweiß'),
        },
      });
      attributeValues.push({
        external_identifier: FoodTL1Parser.DEFAULT_NUTRITION_FIELD_SALT_EXTERNAL_IDENTIFIER,
        attribute_value: {
          number_value: FoodTL1Parser.parseNutritionValue(nutritionValuesString, 'Salz'),
        },
      });
    }
    return attributeValues;
  }

  static parseFloatWithOneDecimal(str: string) {
    let num = parseFloat(str);
    if (isNaN(num)) {
      return NaN; // or some other value to indicate the parse failed
    }
    return Math.round(num * 10) / 10;
  }

  static parseNutritionValue(nutritionValuesString: string, searchValue: string) {
    try {
      let searchText = searchValue + '=';
      let regex = new RegExp(searchText + '\\d*,\\d*', 'gm');
      let match = nutritionValuesString.match(regex);
      if (!!match && match.length === 1) {
        let matchString = match[0];
        let valueString = matchString.slice(searchText.length);
        valueString = valueString.replace(',', '.');
        let valueNumer = FoodTL1Parser.parseFloatWithOneDecimal(valueString);
        return valueNumer;
      }
    } catch (err) {
      return null;
    }
    return null;
  }

  /**
   *
   */

  static MARKING_EXTERNAL_IDENTIFIER_PREFIX_FOR_MENU_LINE = 'menu_line_';
  static getMarkingExternalIdentifiersForMenuLinesFromParsedReportItem(parsedReportItem: RawTL1FoodofferType): string[] {
    let menu_line_text = parsedReportItem[FoodTL1Parser.DEFAULT_MENU_LINE_FIELD];
    return FoodTL1Parser.getMarkingExternalIdentifierForMenuLineText(menu_line_text);
  }

  static getMarkingExternalIdentifierForMenuLineText(menu_line_text: string | undefined): string[] {
    let menu_lines_with_prefix = [];
    if (!!menu_line_text && menu_line_text.length > 0) {
      const menu_lines = menu_line_text.split(','); // "a,b,c" --> ["a", "b", "c"]
      for (let menu_line of menu_lines) {
        let menu_line_trimmed = menu_line.trim();
        if (!!menu_line_trimmed && menu_line_trimmed.length > 0) {
          menu_lines_with_prefix.push(FoodTL1Parser.MARKING_EXTERNAL_IDENTIFIER_PREFIX_FOR_MENU_LINE + menu_line_trimmed);
        }
      }
    }
    return menu_lines_with_prefix;
  }

  static getMarkingLabelsDictFromFoodName(name: string) {
    let markingsDict: { [x: string]: string } = {};
    //e. G. "Strawberries (g, b) with Cream (2)"
    let rawMarkingsInName = name.match(/\([^\)]+\)/gm); //http://regex.inginf.units.it/
    //e. G. ["(g, b)", "(2)"]
    if (!!rawMarkingsInName) {
      for (let rawMarkingsPart of rawMarkingsInName) {
        //e. G. "(g, b)"
        let listOfPartMarkings = FoodTL1Parser.removeValuesAndWhitespacesAndSeperators(rawMarkingsPart, ['(', ')'], ',');
        //e. G. ["g", "b"]
        for (let partMarking of listOfPartMarkings) {
          markingsDict[partMarking] = partMarking;
        }
      }
    }
    //transform dict into list
    return markingsDict;
  }

  static removeValuesAndWhitespacesAndSeperators(string: string, valuesToRemove: string[], seperator: string) {
    //e. G. string is "(g, b)"  valuesToRemove ["(", ")"]   seperator ","
    let output = [];
    let workingString = new String(string);
    //remove values
    for (let value of valuesToRemove) {
      workingString = workingString.replace(value, '');
    }
    //e. G. "(g, b)"
    let splits = workingString.split(seperator);
    //e. G. ["g", " b"]
    for (let split of splits) {
      output.push(split.trim()); //removed whitespaces e. G. " b" --> "b"
    }
    //e. G. ["g", "b"]
    return output;
  }

  /**
     *
     {
      "MENSA": "Mensa Haste",
      "DATUM": "25.01.2022",
      "VK-ArtikelNr": "2097",
      "VK-GebindeNR": "3666",
      "SPEISE": "Dessert 2",
      "SPEISE_BEZEICHNUNG": "Dessert",
      "REZEPTUR_ID": "253",
      "TEXT1": "Quark (20,g)",
      "TEXT2": "Erdbeersauce",
      "TEXT3": "",
      "TEXT4": "",
      "TEXT5": "",
      "TEXT6": "",
      "TEXT1_1": "Quark dessert (20,g)",
      "TEXT2_1": "Strawberry sauce",
      "TEXT3_1": "",
      "TEXT4_1": "",
      "TEXT5_1": "",
      "TEXT6_1": "",
      "STD_PREIS": "0,50",
      "BED_PREIS": "1,00",
      "GÄSTE_PREIS": "1,20",
      "FREI1": "c",
      "FREI2": "",
      "FREI3": "",
      "ZSNUMMERN": "20, g, 0",
      "ZSNAMEN": "vegetarisch, Milch und Laktose (g), zusatzstoff- und allergenfrei",
      "NAEHRWERTEJE100G": "-",
      "NAEHRWERTEJEPORT": "Brennwert=612 kJ (146 kcal), Fett=1,1g, davon gesättigte Fettsäuren=0,6g, Kohlenhydrate=19,8g, davon Zucker=18,8g, Ballaststoffe=0,0g, Eiweiß=12,8g, Salz=0,1g,"
    },
     */

  static _getCanteenName(parsedReportItem: RawTL1FoodofferType) {
    return parsedReportItem[FoodTL1Parser.DEFAULT_CANTEEN_FIELD];
  }

  static _getRawDatum(parsedReportItem: RawTL1FoodofferType) {
    return parsedReportItem[FoodTL1Parser.DEFAULT_DATE_FIELD];
  }

  static _getFoodIdentifierByName(parsedReportItem: RawTL1FoodofferType) {
    return FoodTL1Parser._getRawNamesList(parsedReportItem).join('');
  }

  static _getRawNamesList(parsedReportItem: RawTL1FoodofferType, postFieldName: string = '') {
    if (!postFieldName) {
      postFieldName = '';
    }
    let food_partials_names = [];
    for (let i = 1; i <= 6; i++) {
      let partialName = parsedReportItem[FoodTL1Parser.DEFAULT_TEXT_FIELD + i + postFieldName];
      if (!!partialName && partialName.length > 0 && partialName !== ' ') {
        food_partials_names.push(partialName);
      }
    }
    return food_partials_names;
  }

  static sanitizeFoodNameFromMarkingLabels(name: string) {
    //example: "Strawberries (g, b,)"
    //expected: "Strawberries"
    // Remove all brackets and their content and a possible whitespace before the brackets
    let sanitizedName = name.replace(/\s?\([^\)]+\)/gm, '');

    // Remove all commas at the end of the string
    sanitizedName = sanitizedName.replace(/,\s*$/gm, '');
    return sanitizedName;
  }

  static _getFoodNameDe(parsedReportItem: RawTL1FoodofferType) {
    let rawFoodName = FoodTL1Parser._getRawNamesList(parsedReportItem, '').join(', ');
    return FoodTL1Parser.sanitizeFoodNameFromMarkingLabels(rawFoodName);
  }

  static _getFoodNameEn(parsedReportItem: RawTL1FoodofferType) {
    let rawFoodName = FoodTL1Parser._getRawNamesList(parsedReportItem, '_1').join(', ');
    return FoodTL1Parser.sanitizeFoodNameFromMarkingLabels(rawFoodName);
  }
}
