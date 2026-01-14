import {TranslationsFromParsingType} from '../helpers/TranslationHelper';
import {DatabaseTypes, DateHelper, LanguageCodes} from 'repo-depkit-common';
import {MarkingsTypeForParser} from './MarkingParserInterface';
import {HashHelper} from '../helpers/HashHelper';

export type FoodParseFoodAttributeValueType = {
  external_identifier: string;
  attribute_value: Omit<DatabaseTypes.FoodsAttributesValues, 'id' | 'food_attribute' | 'food_id' | 'foodoffer_id'>;
};
export type FoodParseFoodAttributesType = FoodParseFoodAttributeValueType[];

// Remove all fields with relation to other tables
export type FoodWithBasicData = Omit<DatabaseTypes.Foods, 'user_created' | 'user_updated' | 'markings' | 'image' | 'feedbacks' | 'translations' | 'environmental_impact' | 'nutrition' | 'rating_legacy_settings' | 'rating_settings' | 'food_category' | 'category' | 'attribute_values'>;
export type FoodWithBasicDataWithoutIdType = Omit<FoodWithBasicData, 'id'>;

export type FoodsInformationTypeForParser = {
  basicFoodData: FoodWithBasicData;
  attribute_values: FoodParseFoodAttributesType;
  category_external_identifier: string | null;
  marking_external_identifiers: string[];
  translations: TranslationsFromParsingType;
};

// Remove all fields with relation to other tables
type CanteenTypeOmitedFields = Omit<DatabaseTypes.Canteens, 'id' | 'user_created' | 'user_updated' | 'building' | 'foodservice_hours' | 'foodservice_hours_during_semester_break' | 'utilization_group'>;
export type CanteensTypeForParser = CanteenTypeOmitedFields & {
  external_identifier: string;
}; // make external_identifier required

export type FoodofferDateType = {
  year: number; // e.g. 2021
  month: number; // 01-12
  day: number; // 01-31
};
export type FoodofferTypeWithBasicData = Omit<DatabaseTypes.Foodoffers, 'id' | 'user_created' | 'user_updated' | 'canteen' | 'food' | 'markings' | 'date' | 'environmental_impact' | 'nutrition' | 'prices' | 'foodoffer_category' | 'category' | 'attribute_values'>;
export type FoodoffersTypeForParser = {
  basicFoodofferData: FoodofferTypeWithBasicData;
  attribute_values: FoodParseFoodAttributesType;
  marking_external_identifiers: string[];
  category_external_identifier: string | null;
  date: FoodofferDateType;
  canteen_external_identifier: string;
  food_id: string;
};

export type FoodofferTypeForCreation = FoodofferTypeWithBasicData & {
  date: string | null; // in the format "YYYY-MM-DD" e.g. "2021-01-01" where month 01 is January
  canteen: string; // we require the primary key of the canteen
  food: string; // we require the primary key of the food
};

export class FoodParserHelper {
  static getFoodofferForParserInformation(foodoffer: DatabaseTypes.Foodoffers): FoodoffersTypeForParser | null {
    const dateString = foodoffer.date;
    if (!dateString) {
      return null;
    }

    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }

    const foodId = typeof foodoffer.food === 'object' ? foodoffer.food?.id : foodoffer.food;
    if (!foodId) {
      return null;
    }

    const canteenExternalIdentifier =
      typeof foodoffer.canteen === 'object' ? foodoffer.canteen?.external_identifier : null;
    if (!canteenExternalIdentifier) {
      return null;
    }

    const categoryExternalIdentifier =
      typeof foodoffer.foodoffer_category === 'object'
        ? foodoffer.foodoffer_category?.external_identifier || null
        : null;

    const {id, user_created, user_updated, canteen, food, markings, date: _, foodoffer_category, category, ...rest} = foodoffer;

    const basicFoodofferData: FoodofferTypeWithBasicData = {
      ...rest,
      alias:
        foodoffer.alias ?? (typeof foodoffer.food === 'object' && foodoffer.food ? foodoffer.food.alias ?? null : null),
      foodoffer_components: foodoffer.foodoffer_components ?? [],
    } as FoodofferTypeWithBasicData;

    const attribute_values: FoodParseFoodAttributesType = [];
    for (const attributeValue of (foodoffer.attribute_values as DatabaseTypes.FoodsAttributesValues[]) || []) {
      const foodAttribute = attributeValue.food_attribute as DatabaseTypes.FoodsAttributes | null | undefined;
      const externalIdentifier =
        typeof foodAttribute === 'object' && foodAttribute ? foodAttribute.external_identifier || null : null;
      if (!externalIdentifier) {
        continue;
      }

      const {id, food_attribute, food_id, foodoffer_id, ...attributeValueWithoutRelations} = attributeValue;
      attribute_values.push({
        external_identifier: externalIdentifier,
        attribute_value: attributeValueWithoutRelations,
      });
    }

    const marking_external_identifiers: string[] = [];
    for (const markingRelation of (foodoffer.markings as DatabaseTypes.FoodoffersMarkings[]) || []) {
      const marking = markingRelation.markings_id as DatabaseTypes.Markings | null | undefined;
      if (typeof marking === 'object' && marking?.external_identifier) {
        marking_external_identifiers.push(marking.external_identifier);
      }
    }

    return {
      basicFoodofferData,
      attribute_values,
      marking_external_identifiers,
      category_external_identifier: categoryExternalIdentifier,
      date: DateHelper.getFoodofferDateTypeFromDate(date),
      canteen_external_identifier: canteenExternalIdentifier,
      food_id: foodId,
    };
  }

  static getFoodTypeForParserFromFoodofferTypeForParser(foodoffer: FoodoffersTypeForParser): FoodsInformationTypeForParser | null {
    const food_id = foodoffer.food_id;
    if (!food_id) {
      return null;
    }
    const alias = foodoffer.basicFoodofferData.alias;
    if (!alias) {
      return null;
    }


    const translations: TranslationsFromParsingType = {
      [LanguageCodes.DE]: {
        name: alias,
      },
    };

    const basicFoodData: FoodWithBasicData = {
      id: food_id,
      alias: alias,
    };

    return {
      basicFoodData: basicFoodData,
      attribute_values: foodoffer.attribute_values,
      translations: translations,
      category_external_identifier: foodoffer.category_external_identifier,
      marking_external_identifiers: foodoffer.marking_external_identifiers,
    };
  }

  static getFoodsListFromFoodoffersList(foodoffersList: FoodoffersTypeForParser[]): FoodsInformationTypeForParser[] {
    let foodsInformationDict: { [key: string]: FoodsInformationTypeForParser } = {};
    for (let rawFoodoffer of foodoffersList) {
      const foodInformation = FoodParserHelper.getFoodTypeForParserFromFoodofferTypeForParser(rawFoodoffer);
      if (foodInformation) {
        foodsInformationDict[foodInformation.basicFoodData.id] = foodInformation;
      }
    }
    const foodsInformationList = Object.values(foodsInformationDict);
    return foodsInformationList
  }

  static getFoodofferIdFromFoodofferInformationForParser(foodofferInformationForParser: FoodoffersTypeForParser): string {
    const normalizedMarkings = [...foodofferInformationForParser.marking_external_identifiers].sort();
    const normalizedDate = DateHelper.foodofferDateTypeToString(foodofferInformationForParser.date);

    const normalizedFoodofferInformationForParser = {
      ...foodofferInformationForParser,
      marking_external_identifiers: normalizedMarkings,
      date: normalizedDate,
    };

    return HashHelper.hashFromObject(normalizedFoodofferInformationForParser);
  }
}

export interface FoodParserInterface {
  /**
   * This method should create the needed data for the parser to work on every call of the parser.
   */
  createNeededData(markingsJSONList?: MarkingsTypeForParser[] | undefined): Promise<void>;

  /**
   * This method should return the list of all canteens
   */
  getCanteensList(): Promise<CanteensTypeForParser[]>;

  /**
   * This method should return the list of all foods
   */
  getFoodsListForParser(): Promise<FoodsInformationTypeForParser[]>;

  /**
   * This method should return the list of all foodoffers
   */
  getFoodoffersForParser(): Promise<FoodoffersTypeForParser[]>;

  /**
   * Should create new markings when they do not exist yet
   */
  shouldCreateNewMarkingsWhenTheyDoNotExistYet(): boolean;
}
