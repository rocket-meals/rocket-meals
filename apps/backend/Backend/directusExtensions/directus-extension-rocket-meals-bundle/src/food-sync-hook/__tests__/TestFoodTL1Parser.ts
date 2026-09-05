// small jest test
import { describe, expect, it } from '@jest/globals';
import { FoodTL1Parser, RawTL1FoodofferType } from '../FoodTL1Parser';

describe('FoodTL1Parser Test', () => {
  it('Get Marking Labels from foodname', async () => {
    const exampleFoodName = 'Strawberries (g, b) with Cream (2)';
    const markingLabelsDict = FoodTL1Parser.getMarkingLabelsDictFromFoodName(exampleFoodName);
    expect(markingLabelsDict).not.toBeNull();
    expect(markingLabelsDict).not.toBeUndefined();
    expect(markingLabelsDict).toHaveProperty('g');
    expect(markingLabelsDict).toHaveProperty('b');
    expect(markingLabelsDict).toHaveProperty('2');
  });

  it('Sanitize Foodname from Marking labels', async () => {
    const exampleFoodName = 'Strawberries (g, b,) with Cream (2)';
    const expectedSanitizedFoodName = 'Strawberries with Cream';
    const sanitizedFoodName = FoodTL1Parser.sanitizeFoodNameFromMarkingLabels(exampleFoodName);
    expect(sanitizedFoodName).not.toContain('(');
    expect(sanitizedFoodName).not.toContain(')');
    expect(sanitizedFoodName).not.toContain('(g, b,)');
    expect(sanitizedFoodName).not.toContain('(2)');
    expect(sanitizedFoodName).toBe(expectedSanitizedFoodName);
  });

  // Food attributes
  it('Food attributes parsing', async () => {
    const exampleParsedReportItem: RawTL1FoodofferType = {
      [FoodTL1Parser.DEFAULT_NUTRITIONS_FIELD]: 'Brennwert=612 kJ (146 kcal), Fett=1,1g, davon gesättigte Fettsäuren=0,6g, Kohlenhydrate=19,8g, davon Zucker=18,8g, Ballaststoffe=0,0g, Eiweiß=12,8g, Salz=0,1g,',
    };

    const parsedFoodAttributes = FoodTL1Parser.getFoodNutritionAttributeValuesFromRawTL1Foodoffer(exampleParsedReportItem);
    expect(parsedFoodAttributes).not.toBeNull();
    expect(parsedFoodAttributes).not.toBeUndefined();
    // check parsedFoodAttributes.length > 0
    expect(parsedFoodAttributes.length).toBeGreaterThan(0);
    let expectedExternalIdentifiersAndValues: { [key: string]: { number_value: number } } = {
      [FoodTL1Parser.DEFAULT_NUTRITION_FIELD_BRENNWERT_EXTERNAL_IDENTIFIER]: {
        number_value: 146,
      },
      [FoodTL1Parser.DEFAULT_NUTRITION_FIELD_FIBER_EXTERNAL_IDENTIFIER]: {
        number_value: 0,
      },
      [FoodTL1Parser.DEFAULT_NUTRITION_FIELD_CARBOHYDRATE_EXTERNAL_IDENTIFIER]: {
        number_value: 19.8,
      },
      [FoodTL1Parser.DEFAULT_NUTRITION_FIELD_FAT_EXTERNAL_IDENTIFIER]: {
        number_value: 1.1,
      },
      [FoodTL1Parser.DEFAULT_NUTRITION_FIELD_SALT_EXTERNAL_IDENTIFIER]: {
        number_value: 0.1,
      },
      [FoodTL1Parser.DEFAULT_NUTRITION_FIELD_SUGAR_EXTERNAL_IDENTIFIER]: {
        number_value: 18.8,
      },
      [FoodTL1Parser.DEFAULT_NUTRITION_FIELD_PROTEIN_EXTERNAL_IDENTIFIER]: {
        number_value: 12.8,
      },
      [FoodTL1Parser.DEFAULT_NUTRITION_FIELD_SATURATED_FAT_EXTERNAL_IDENTIFIER]: {
        number_value: 0.6,
      },
    };
    let dictOfFoundExternalIdentifiers: { [key: string]: boolean } = {};
    for (let parsedFoodAttribute of parsedFoodAttributes) {
      expect(parsedFoodAttribute.external_identifier).not.toBeNull();
      expect(parsedFoodAttribute.attribute_value).not.toBeNull();
      dictOfFoundExternalIdentifiers[parsedFoodAttribute.external_identifier] = true;
      let expectedAttributeValue = expectedExternalIdentifiersAndValues[parsedFoodAttribute.external_identifier];
      expect(expectedAttributeValue).not.toBeNull();
      expect(expectedAttributeValue).not.toBeUndefined();
      expect(JSON.stringify(parsedFoodAttribute.attribute_value)).toStrictEqual(JSON.stringify(expectedAttributeValue));
      //console.log("" + JSON.stringify(parsedFoodAttribute.attribute_value) + " == " + JSON.stringify(expectedAttributeValue));
    }
    let allExternalIdentifiersFound = true;
    for (let expectedExternalIdentifier of Object.keys(expectedExternalIdentifiersAndValues)) {
      if (!dictOfFoundExternalIdentifiers[expectedExternalIdentifier]) {
        allExternalIdentifiersFound = false;
        break;
      }
    }
    expect(allExternalIdentifiersFound).toBe(true);
  });
});

describe('FoodTL1Parser regex reliability (SonarCloud: super-linear regex backtracking)', () => {
  // Both `getFoodNutritionAttributeValuesFromRawTL1Foodoffer` (kcal extraction) and
  // `getMarkingLabelsDictFromFoodName` (marking extraction) previously used unbounded
  // regex quantifiers (`.* kcal` / `[^)]+`), flagged by SonarCloud for super-linear
  // runtime due to backtracking. Both are now bounded ({1,50} / {1,100}).

  it('kcal extraction stays fast for a long value with no "(... kcal" match', () => {
    const pathological: RawTL1FoodofferType = {
      [FoodTL1Parser.DEFAULT_NUTRITIONS_FIELD]: `Brennwert=612 kJ (${'0'.repeat(1_000_000)}`,
    };

    const start = Date.now();
    const parsedFoodAttributes = FoodTL1Parser.getFoodNutritionAttributeValuesFromRawTL1Foodoffer(pathological);
    const durationMs = Date.now() - start;

    expect(parsedFoodAttributes.some((a) => a.external_identifier === FoodTL1Parser.DEFAULT_NUTRITION_FIELD_BRENNWERT_EXTERNAL_IDENTIFIER)).toBe(false);
    expect(durationMs).toBeLessThan(500);
  });

  it('marking extraction stays fast for a long name with an unterminated parenthesis', () => {
    const pathological = `Strawberries (${'g'.repeat(1_000_000)}`;

    const start = Date.now();
    const markingLabelsDict = FoodTL1Parser.getMarkingLabelsDictFromFoodName(pathological);
    const durationMs = Date.now() - start;

    expect(markingLabelsDict).toEqual({});
    expect(durationMs).toBeLessThan(500);
  });
});

describe('FoodTL1Parser price reference', () => {
  class PriceReferenceTestParser extends FoodTL1Parser {
    static readonly TEST_PRICE_REFERENCE_FIELD = 'FREI2';

    constructor() {
      super({
        getRawReport: async () => '',
      } as never);
    }

    override getPriceReferenceFieldName(): string | null {
      return PriceReferenceTestParser.TEST_PRICE_REFERENCE_FIELD;
    }
  }

  it('imports no price reference while no TL1 field is configured', () => {
    const parser = new FoodTL1Parser({ getRawReport: async () => '' } as never);
    const parsedReportItem: RawTL1FoodofferType = { FREI2: '100g' };

    // an empty object keeps the result_hash of per-dish foodoffers unchanged
    expect(parser.getPriceReferenceFieldsFromParsedReportItem(parsedReportItem)).toEqual({});
  });

  it('imports the price reference from the configured TL1 field', () => {
    const parser = new PriceReferenceTestParser();
    const parsedReportItem: RawTL1FoodofferType = { FREI2: 'pro 100 g' };

    expect(parser.getPriceReferenceFieldsFromParsedReportItem(parsedReportItem)).toEqual({
      price_reference_amount: 100,
      price_reference_unit: 'g',
    });
  });

  it('imports no price reference when the configured TL1 field is empty', () => {
    const parser = new PriceReferenceTestParser();

    expect(parser.getPriceReferenceFieldsFromParsedReportItem({ FREI2: '' })).toEqual({});
    expect(parser.getPriceReferenceFieldsFromParsedReportItem({})).toEqual({});
  });
});
