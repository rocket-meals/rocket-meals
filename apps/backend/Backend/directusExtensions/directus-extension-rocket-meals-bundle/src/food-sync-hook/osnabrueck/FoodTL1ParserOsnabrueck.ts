import { FoodTL1Parser, RawFoodofferInformationType, RawTL1FoodofferType, TL1AttributeValueType } from '../FoodTL1Parser';
import { FoodTL1ParserGetRawReportInterface } from '../FoodTL1Parser_GetRawReportInterface';
import {FoodoffersTypeForParser, FoodParseFoodAttributesType} from '../FoodParserInterface';

export class FoodTL1ParserOsnabrueck extends FoodTL1Parser {
  static DEFAULT_CO2_RATING_FIELD = 'EXTINFO_CO2_BEWERTUNG';

  static MARKING_EXTERNAL_IDENTIFIER_NIEDERSACHSEN_MENU = "custom_niedersachsen_menu";
  static FOODOFFER_CATEGORY_NIEDERSACHSEN_MENU = "Niedersachsenmenü"

  constructor(rawFoodofferReader: FoodTL1ParserGetRawReportInterface) {
    super(rawFoodofferReader);
  }

  override shouldCreateNewMarkingsWhenTheyDoNotExistYet(): boolean {
    // Osnabrück adds custom markings (menu line, CO2 rating, Niedersachsen menu) that are not
    // provided by the MarkingTL1Parser, so they must be auto-created when missing.
    return true;
  }

  override getFoodCategoryFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType): string | null {
    let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);
    return parsedReportItem?.['SPEISE_BEZEICHNUNG'] || null;
  }

  override getFoodofferCategoryFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType): string | null {
    let parsedReportItem = FoodTL1Parser.getParsedReportItemFromrawFoodoffer(rawFoodoffer);
    return parsedReportItem?.['SPEISE'] || null;
  }

  private isMainCourse(rawFoodoffer: RawFoodofferInformationType): boolean {
    let courseType = this.getFoodCategoryFromRawFoodoffer(rawFoodoffer);
    return courseType === 'Hauptgericht';
  }

  override getMarkingsExternalIdentifiersFromRawFoodoffer(rawFoodoffer: RawFoodofferInformationType) {
    let combinedMarkings: string[] = [];
    let defaultMarkings = super.getMarkingsExternalIdentifiersFromRawFoodoffer(rawFoodoffer);
    combinedMarkings = combinedMarkings.concat(defaultMarkings);

    let raw_tl1_foodoffer_json = rawFoodoffer.raw_tl1_foodoffer_json;
    let tl1_co2_bewertung_string = raw_tl1_foodoffer_json[FoodTL1ParserOsnabrueck.DEFAULT_CO2_RATING_FIELD];

    // Philipp Heckmann 19.02.2025 - Spalte „Ext. CO2 Bew.“ erfolgen. Immer wenn in dieser Spalte bei einem Hauptgericht die beste Empfehlung „A“
    if (!!tl1_co2_bewertung_string && tl1_co2_bewertung_string === FoodTL1ParserOsnabrueck.CO2RATING_A_VALUE) {
      // 11.03.2025 Nathalie Hasenkampf: Klimateller nur bei Hauptgerichten, nicht bei Beilagen
      if (this.isMainCourse(rawFoodoffer)) {
        // if not main course, then we need to filter out the Klimateller marking
        combinedMarkings.push(FoodTL1ParserOsnabrueck.getCO2RatingMarkingExternalIdentifier(tl1_co2_bewertung_string));
      }
    }

    // Niedersachsen Menü
    let foodofferCategory = this.getFoodofferCategoryFromRawFoodoffer(rawFoodoffer);
    if (foodofferCategory === FoodTL1ParserOsnabrueck.FOODOFFER_CATEGORY_NIEDERSACHSEN_MENU) {
      combinedMarkings.push(FoodTL1ParserOsnabrueck.MARKING_EXTERNAL_IDENTIFIER_NIEDERSACHSEN_MENU);
    }


    return combinedMarkings;
  }

  /**
   * Rating like A, B, C, D, E will be transformed to CO2_RATING_A, CO2_RATING_B, CO2_RATING_C, CO2_RATING_D, CO2_RATING_E
   * @param co2_bewertung_string
   */
  static CO2RATING_A_VALUE = 'A';

  static getCO2RatingMarkingExternalIdentifier(co2_bewertung_string: string) {
    return "CO2_RATING_" + co2_bewertung_string;
  }

  static getKlimaTellerMarkingExternalIdentifier() {
    return FoodTL1ParserOsnabrueck.getCO2RatingMarkingExternalIdentifier(FoodTL1ParserOsnabrueck.CO2RATING_A_VALUE);
  }


  override async getFoodoffersForParser(): Promise<FoodoffersTypeForParser[]> {
    let superPromise = await super.getFoodoffersForParser();

    return superPromise;
  }

  override getFoodAttributesFromRawTL1Foodoffer(parsedReportItem: RawTL1FoodofferType): FoodParseFoodAttributesType {
    let foodAttributes = super.getFoodAttributesFromRawTL1Foodoffer(parsedReportItem);

    const csvAttributes = [
      {
        field_name: "EXTINFO_CO2_WERT",
        external_identifier: 'co2_g',
        value_type: TL1AttributeValueType.NUMBER,
      },
      {
        field_name: "EXTINFO_CO2_EINSPARUNG",
        external_identifier: 'co2_saving_percentage',
        value_type: TL1AttributeValueType.NUMBER,
      },
      {
        field_name: FoodTL1ParserOsnabrueck.DEFAULT_CO2_RATING_FIELD,
        external_identifier: 'co2_rating',
        value_type: TL1AttributeValueType.STRING,
      },
    ];

    let additionalAttributes = FoodTL1Parser.getAdditionalFoodAttributesFromRawTL1Foodoffer(parsedReportItem, csvAttributes);
    foodAttributes = foodAttributes.concat(additionalAttributes);

    return foodAttributes;
  }
}
