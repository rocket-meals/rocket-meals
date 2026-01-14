import {
  FoodTL1Parser,
  RawFoodofferInformationType,
  RawTL1FoodofferType,
  Tl1AttributeType,
  TL1AttributeValueType
} from '../FoodTL1Parser';
import {FoodTL1Parser_GetRawReportInterface} from '../FoodTL1Parser_GetRawReportInterface';
import {FoodParseFoodAttributesType} from '../FoodParserInterface';

export class FoodTL1ParserHannover extends FoodTL1Parser {
  static MENUEKENNZEICHEN_FIELD = 'MENUEKENNZEICHEN';
  static EXTINFO_CO2_BEWERTUNG = 'EXTINFO_CO2_BEWERTUNG';

  static CO2_BEWERTUNG_PREFIX_IDENTIFIER = 'CO2_RATING_';

  constructor(rawFoodofferReader: FoodTL1Parser_GetRawReportInterface) {
    super(rawFoodofferReader);
  }

  /**
   * Hanna-Jordis Schmidt 19.02.0225 08:35
   * Filter only markings which are passed by the marking parser
   * nur die Kennzeichnungen auf der Liste relevant sind für die Änderung der Speisen. Die anderen Kennzeichnungen sind wirklich nur für interne Zwecke gedacht und haben keinerlei Auswirkungen auf die Gerichte und sollen es am besten auch gar nicht haben. Gerade bei den Fotos und den Bewertungen zerhauen diese Kennzeichnungen gerade alles.
   * @param markings
   */
  _filterZsNummernOnlyForPassedExternalMarkingIdentifiersFromMarkingParser(markings: string[]) {
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

  _getMarkingsExternalIdentifiersFromRawFoodoffer(raw_tl1_foodoffer_json: RawTL1FoodofferType): string[] {
    let tl1_zusatz_nummern_string = raw_tl1_foodoffer_json[FoodTL1Parser.DEFAULT_ZSNUMMERN_FIELD];

    let tl1_menuekennzeichen_string = raw_tl1_foodoffer_json[FoodTL1ParserHannover.MENUEKENNZEICHEN_FIELD];
    let tl1_co2_bewertung_string = raw_tl1_foodoffer_json[FoodTL1ParserHannover.EXTINFO_CO2_BEWERTUNG];

    let combinedMarkings: string[] = [];
    if (!!tl1_zusatz_nummern_string) {
      let markings = tl1_zusatz_nummern_string.split(',').map(nummernString => {
        return nummernString.trim();
      });
      markings = this._filterZsNummernOnlyForPassedExternalMarkingIdentifiersFromMarkingParser(markings);
      combinedMarkings = combinedMarkings.concat(markings);
    }
    if (!!tl1_menuekennzeichen_string) {
      let markings = tl1_menuekennzeichen_string.split(',').map(nummernString => {
        return nummernString.trim();
      });
      combinedMarkings = combinedMarkings.concat(markings);
    }
    if (!!tl1_co2_bewertung_string) {
      combinedMarkings.push(FoodTL1ParserHannover.getCO2RatingMarkingExternalIdentifier(tl1_co2_bewertung_string));

      // 19.03.2025 um 12:32 schrieb Steinhauer, Katharina
      // Klimateller Icon wird automatisch ausgewiesen, wenn ein Gericht eine CO2-Bewertung mit A hat
      if (tl1_co2_bewertung_string === FoodTL1ParserHannover.CO2RATING_A_VALUE) {
        combinedMarkings.push(FoodTL1ParserHannover.KLIMA_TELLER_EXTERNAL_IDENTIFIER);
      }
    }

    return combinedMarkings;
  }

  /**
   * Wait for confirmation in mail if we should user the markings from the ZS_NUMMERN field
   * Hannover Mail: 17.10.2024
   */
  override getMarkingsExternalIdentifiersFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType) {
    //return super.getMarkingsExternalIdentifiersFromRawFoodoffer(rawFoodoffer);
    return this._getMarkingsExternalIdentifiersFromRawFoodoffer(rawFoodoffer.raw_tl1_foodoffer_json);
  }

  override getFoodCategoryFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType): string | null {
    let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);
    return parsedReportItem?.['SPEISE'] || null;
  }

  override getFoodofferCategoryFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType): string | null {
    let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);
    return parsedReportItem?.['SPEISE'] || null; // ATTENTION: Hannover has no specific field for foodoffer category
  }

  static KLIMA_TELLER_EXTERNAL_IDENTIFIER = 'kt';
  static NIEDERSACHSEN_MENUE_EXTERNAL_IDENTIFIER = 'q';
  static FOOD_ID_EXCLUDED_MARKINGS = [FoodTL1ParserHannover.NIEDERSACHSEN_MENUE_EXTERNAL_IDENTIFIER];

  /**
   * Rating like A, B, C, D, E will be transformed to CO2_RATING_A, CO2_RATING_B, CO2_RATING_C, CO2_RATING_D, CO2_RATING_E
   * @param co2_bewertung_string
   */
  static CO2RATING_A_VALUE = 'A';

  /**
   * Rating like A, B, C, D, E will be transformed to CO2_RATING_A, CO2_RATING_B, CO2_RATING_C, CO2_RATING_D, CO2_RATING_E
   * @param co2_bewertung_string
   */
  static getCO2RatingMarkingExternalIdentifier(co2_bewertung_string: string) {
    return FoodTL1ParserHannover.CO2_BEWERTUNG_PREFIX_IDENTIFIER + co2_bewertung_string;
  }

  static getCombinedSortedMarkingsExternalIdentifiersAsString(total_marking_external_identifier_list: string[]) {
    let sorted_marking_external_identifiers = total_marking_external_identifier_list.sort((a, b) => a.localeCompare(b));
    let combined_marking_ids_as_string = sorted_marking_external_identifiers.join('-');
    return combined_marking_ids_as_string;
  }

  /**
   * Schmidt 05.12.2025 E-Mail
   * CO2 Bewertung Kennzeichnungen sollen nicht zur Food Id Bildung beitragen
   * @param markingExternalIdentifiers
   */
  private filterMarkingsNotImportantForFoodID(markingExternalIdentifiers: string[]): string[] {
    return markingExternalIdentifiers.filter(marking => {
      if (marking.startsWith(FoodTL1ParserHannover.CO2_BEWERTUNG_PREFIX_IDENTIFIER)) {
        return false;
      }
      return !FoodTL1ParserHannover.FOOD_ID_EXCLUDED_MARKINGS.includes(marking);
    });
  }

  static getHannoverFoodIdByRecipeIdsAndMarkings(recipe_ids: string[] | number[], marking_ids: string[]) {
    let sorted_recipe_ids = FoodTL1Parser.getSortedRecipeIdFromListOfRecipeIds(recipe_ids);
    let combined_marking_ids_as_string = FoodTL1ParserHannover.getCombinedSortedMarkingsExternalIdentifiersAsString(marking_ids);
    let food_id = sorted_recipe_ids;
    if (!!combined_marking_ids_as_string && combined_marking_ids_as_string.length > 0) {
      food_id += '_' + combined_marking_ids_as_string;
    }
    return food_id;
  }

  override getFoodId(listOfItemsForSameFoodoffer: RawTL1FoodofferType[] | undefined): null | string {
    /**
     * Agreement with Hannover: A unique food is defined by the combination of the recipe ids and the marking ids
     */

    const recipe_ids = FoodTL1Parser.getRecipeIdsFromRawTL1Foodoffer(listOfItemsForSameFoodoffer);
    if (!recipe_ids) {
      return null;
    }

    let firstRawTL1Foodoffer = listOfItemsForSameFoodoffer?.[0];
    if (!firstRawTL1Foodoffer) {
      return null;
    }
    let total_marking_external_identifier_list = this._getMarkingsExternalIdentifiersFromRawFoodoffer(firstRawTL1Foodoffer);

    let filtered_marking_identifiers_for_food_id = this.filterMarkingsNotImportantForFoodID(total_marking_external_identifier_list);

    let food_id = FoodTL1ParserHannover.getHannoverFoodIdByRecipeIdsAndMarkings(recipe_ids, filtered_marking_identifiers_for_food_id);

    return food_id;
  }

  static FOOD_ATTRIBUTE_FIELDS: Tl1AttributeType[] = [
    {
      field_name: 'NW_KCAL',
      external_identifier: 'calories_kcal',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'NW_FETT',
      external_identifier: 'fat_g',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'NW_GESFETT',
      external_identifier: 'saturated_fat_g',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'NW_EIWEISS',
      external_identifier: 'protein_g',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'NW_KH',
      external_identifier: 'carbohydrate_g',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'NW_ZUCKER',
      external_identifier: 'sugar_g',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'NW_SALZ',
      external_identifier: 'salt_g',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'EXTINFO_CO2_WERT',
      external_identifier: 'co2_g',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'EXTINFO_CO2_EINSPARUNG',
      external_identifier: 'co2_saving_percentage',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'EXTINFO_CO2_BEWERTUNG',
      external_identifier: 'co2_rating',
      value_type: TL1AttributeValueType.STRING,
    },
    {
      field_name: 'EXTINFO_WASSER_WERT',
      external_identifier: 'water_usage',
      value_type: TL1AttributeValueType.NUMBER,
    },
    {
      field_name: 'EXTINFO_WASSER_BEWERTUNG',
      external_identifier: 'water_rating',
      value_type: TL1AttributeValueType.STRING,
    },
    {
      field_name: 'EXTINFO_TIERWOHL',
      external_identifier: 'animal_welfare',
      value_type: TL1AttributeValueType.STRING,
    },
    {
      field_name: 'EXTINFO_REGENWALD',
      external_identifier: 'rainforest',
      value_type: TL1AttributeValueType.STRING,
    },
  ];

  override getFoodAttributesFromRawTL1Foodoffer(parsedReportItem: RawTL1FoodofferType): FoodParseFoodAttributesType {
    let foodAttributes = FoodTL1Parser.getAdditionalFoodAttributesFromRawTL1Foodoffer(parsedReportItem, FoodTL1ParserHannover.FOOD_ATTRIBUTE_FIELDS);
    return foodAttributes;
  }
}
