// small jest test
import { describe, expect, it } from '@jest/globals';
import { FoodTL1ParserHannover } from '../FoodTL1ParserHannover';
import { FoodTL1Parser_GetRawReportInterface } from '../../FoodTL1Parser_GetRawReportInterface';
import { FoodTL1Parser_RawReportTestReaderHannover } from '../FoodTL1Parser_RawReportTestReaderHannover';
import { FoodoffersTypeForParser, FoodParseFoodAttributeValueType, FoodsInformationTypeForParser } from '../../FoodParserInterface';
import { FoodTL1Parser, Tl1AttributeType, TL1AttributeValueType } from '../../FoodTL1Parser';
import { MarkingsTypeForParser } from '../../MarkingParserInterface';

function generateFoodId(foodIds: number[], markingExternalIdentifiers: string[]): string | null {
  return FoodTL1ParserHannover.getHannoverFoodIdByRecipeIdsAndMarkings(foodIds, markingExternalIdentifiers);
}

async function getFoodoffersJson(reportToReturn?: string | undefined, markingsJSONList?: MarkingsTypeForParser[] | undefined) {
  let testFileGetter: FoodTL1Parser_GetRawReportInterface = new FoodTL1Parser_RawReportTestReaderHannover(reportToReturn);
  let foodParser: FoodTL1Parser = new FoodTL1ParserHannover(testFileGetter);
  await foodParser.createNeededData(markingsJSONList);
  return await foodParser.getFoodoffersForParser();
}

async function getFoodsJson(reportToReturn?: string | undefined) {
  let testFileGetter: FoodTL1Parser_GetRawReportInterface = new FoodTL1Parser_RawReportTestReaderHannover(reportToReturn);
  let foodParser: FoodTL1Parser = new FoodTL1ParserHannover(testFileGetter);
  await foodParser.createNeededData();
  return await foodParser.getFoodsListForParser();
}

describe('FoodTL1ParserHannover Test', () => {
  let testFileGetter: FoodTL1Parser_GetRawReportInterface = new FoodTL1Parser_RawReportTestReaderHannover();
  let foodParser: FoodTL1Parser = new FoodTL1ParserHannover(testFileGetter);

  // should find atleast one food
  it('Find more than one food', async () => {
    await foodParser.createNeededData();
    let foodsJson = await foodParser.getFoodsListForParser();
    expect(foodsJson.length).toBeGreaterThan(0);
  });

  // should find atleast one canteen
  it('Find more than one canteen', async () => {
    await foodParser.createNeededData();
    let canteensJson = await foodParser.getCanteensList();
    expect(canteensJson.length).toBeGreaterThan(0);
  });

  // should find atleast one meal offer
  it('Find more than one meal offer', async () => {
    await foodParser.createNeededData();
    let mealOffersJson = await foodParser.getFoodoffersForParser();
    if (!!mealOffersJson) {
      expect(mealOffersJson.length).toBeGreaterThan(0);
    } else {
      expect(false).toBe(true);
    }
  });

  function checkIfFoodHasMarking(foodId: string | null, expectedMarkingExternalIdentifiersToBeIncluded: string[], foodOffersJson: FoodoffersTypeForParser[]) {
    let foodOffersWithSpecialMarking = foodOffersJson.filter(foodOffer => {
      return foodOffer.food_id === foodId;
    });

    expect(foodOffersWithSpecialMarking.length).toBeGreaterThan(0);
    for (let foodOffer of foodOffersWithSpecialMarking) {
      // check if foodOffer.marking_external_identifiers contains 'v'
      expect(foodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(expectedMarkingExternalIdentifiersToBeIncluded));
    }
  }

  it('Markings use correctly addition field for vegetarian (v)', async () => {
    const marking_external_identifiers = ['26', '99', 'v'];
    let findFoodId = generateFoodId([801346, 802285], marking_external_identifiers);
    const expectedMarkingExternalIdentifiersToBeIncluded = ['v'];
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithVegatarian());
    checkIfFoodHasMarking(findFoodId, expectedMarkingExternalIdentifiersToBeIncluded, foodOfferJson);
  });

  it('Hannover Food Id only contains existing marking ids', async () => {
    let markingTypeForParser: MarkingsTypeForParser[] = [
      {
        external_identifier: '26',
        excluded_by_markings: [],
        translations: {},
      },
      {
        external_identifier: '99',
        excluded_by_markings: [],
        translations: {},
      },
    ];

    let notContainedMarkingId = 'NON_EXISTING_EXTERNAL_MARKING_ID';
    let additionalMarkingsString = '26, 99, ' + notContainedMarkingId;
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithNonExistingMarking(additionalMarkingsString), markingTypeForParser);
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);

    let filteredRawMarkingExternalIdentifiers = ['26', '99', 'v']; // "v" is from menu_line
    // but the food id should not contain the non existing marking id
    let expectedFoodId = generateFoodId([801346], filteredRawMarkingExternalIdentifiers);

    for (let foodOffer of foodOfferJson) {
      expect(foodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(filteredRawMarkingExternalIdentifiers));
      let foodId = foodOffer.food_id;
      expect(foodId).toBe(expectedFoodId);
      expect(foodId).not.toContain(notContainedMarkingId);
    }
  });

  it('Markings for co2 values are correctly set', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithCO2RatingValues());
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);
    const expectedMarkingExternalIdentifiers = [FoodTL1ParserHannover.getCO2RatingMarkingExternalIdentifier('A')];
    for (let foodOffer of foodOfferJson) {
      expect(foodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(expectedMarkingExternalIdentifiers));
    }
  });

  it('CO2 rating markings are ignored for food id creation', async () => {
    const co2RatingIdentifier = FoodTL1ParserHannover.getCO2RatingMarkingExternalIdentifier('A');
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithCO2RatingValues());
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);

    for (let foodOffer of foodOfferJson) {
      expect(foodOffer.marking_external_identifiers).toEqual(expect.arrayContaining([co2RatingIdentifier]));
      expect(foodOffer.food_id).not.toContain(FoodTL1ParserHannover.CO2_BEWERTUNG_PREFIX_IDENTIFIER);
      expect(foodOffer.food_id).not.toContain(co2RatingIdentifier);
    }
  });

  it('Niedersachsen Menü marking is ignored for food id creation', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithNiedersachsenMenueMarking());
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);

    const firstFoodOffer = foodOfferJson[0];
    expect(!!firstFoodOffer).toBe(true);
    if (!firstFoodOffer) {
      return;
    }
    const expectedMarkingExternalIdentifiers = ['26', '99', FoodTL1ParserHannover.NIEDERSACHSEN_MENUE_EXTERNAL_IDENTIFIER];
    const expectedFoodId = generateFoodId([801346], ['26', '99']);
    expect(firstFoodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(expectedMarkingExternalIdentifiers));
    expect(firstFoodOffer.food_id).toBe(expectedFoodId);
    expect(firstFoodOffer.food_id).not.toContain(FoodTL1ParserHannover.NIEDERSACHSEN_MENUE_EXTERNAL_IDENTIFIER);
  });

  it('Markings use correctly additional field for vegan (x)', async () => {
    const marking_external_identifiers = ['4', '20', '20A', '20C', '25', '99', 'x'];
    let findFoodId = generateFoodId([800562, 802726, 801834, 801454], marking_external_identifiers);
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithVegan());

    const expectedMarkingExternalIdentifiersToBeIncluded = ['x'];
    checkIfFoodHasMarking(findFoodId, expectedMarkingExternalIdentifiersToBeIncluded, foodOfferJson);
  });

  it('Markings correctly used the ZS_NUMMERN Field', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithMultipleFoodoofersWithCorrectMarkingsInFieldZS_NUMMER());
    let firstFoodOffer = foodOfferJson[0];
    expect(!!firstFoodOffer).toBe(true);
    if (!firstFoodOffer) {
      return;
    }

    const expectedMarkingExternalIdentifiers = ['3', '15', '20A', '22', '26', '28', 'g', '99'];
    expect(firstFoodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(expectedMarkingExternalIdentifiers));
  });

  it('Foodoffers all have category', async () => {
    await foodParser.createNeededData();
    let foodOffersJson = await foodParser.getFoodoffersForParser();
    let everyFoodofferHasCategory = true;
    for (let foodOffer of foodOffersJson) {
      if (!foodOffer.category_external_identifier) {
        everyFoodofferHasCategory = false;
        break;
      }
    }
    expect(everyFoodofferHasCategory).toBe(true);
  });

  it('Foodoffer has correct category', async () => {
    let foodOffersJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithFoodofferCategoryMeat());
    let firstFoodOffer = foodOffersJson[0];
    expect(!!firstFoodOffer).toBe(true);
    if (firstFoodOffer) {
      expect(firstFoodOffer.category_external_identifier).toBe('FLEISCH & MEER');
    }
  });

  it('Food all have category', async () => {
    await foodParser.createNeededData();
    let foodsJson = await foodParser.getFoodsListForParser();
    let everyFoodHasCategory = true;
    for (let food of foodsJson) {
      if (!food.category_external_identifier) {
        everyFoodHasCategory = false;
        break;
      }
    }
    expect(everyFoodHasCategory).toBe(true);
  });

  it('Food has correct category', async () => {
    let foodsJson = await getFoodsJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithFoodofferCategoryMeat());
    let foodJson = foodsJson[0];
    expect(!!foodJson).toBe(true);
    if (foodJson) {
      expect(foodJson.category_external_identifier).toBe('FLEISCH & MEER');
    }
  });

  it('Food offers with same recipe ids and same markings shall have same food ids', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithMultipleFoodoofersSameMarkings());
    let foodsJson = await getFoodsJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithMultipleFoodoofersSameMarkings());
    // we should have more than one foodoffer
    expect(foodOfferJson.length).toBeGreaterThan(1);
    // we should have only one food
    let dictFoodIds: { [key: string]: any } = {};
    for (let foodOffer of foodOfferJson) {
      if (!!dictFoodIds[foodOffer.food_id]) {
        dictFoodIds[foodOffer.food_id].push(foodOffer);
      } else {
        dictFoodIds[foodOffer.food_id] = [foodOffer];
      }
    }
    // we should have only one food
    expect(Object.keys(dictFoodIds).length).toBe(1);
    expect(foodsJson.length).toBe(1);
  });

  it('Food offers with CO2_Rating A should have KlimaTeller Marking', async () => {
    let co2_rating_value = FoodTL1ParserHannover.CO2RATING_A_VALUE;
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithCO2WithRatingValue(co2_rating_value));
    let expectedMarkingExternalIdentifiers = [FoodTL1ParserHannover.getCO2RatingMarkingExternalIdentifier(co2_rating_value), FoodTL1ParserHannover.KLIMA_TELLER_EXTERNAL_IDENTIFIER];
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);
    for (let foodOffer of foodOfferJson) {
      expect(foodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(expectedMarkingExternalIdentifiers));
    }
  });

  it('Food offers with CO2_Rating other than A should not have automatically KlimaTeller Marking', async () => {
    let co2_rating_value = 'B';
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithCO2WithRatingValue(co2_rating_value));
    let notExpectedMarkingExternalIdentifiers = [FoodTL1ParserHannover.KLIMA_TELLER_EXTERNAL_IDENTIFIER];
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);
    for (let foodOffer of foodOfferJson) {
      expect(foodOffer.marking_external_identifiers).not.toEqual(expect.arrayContaining(notExpectedMarkingExternalIdentifiers));
    }
  });

  it('Food offers with same recipe ids and differnet markings shall have different food ids', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithMultipleFoodoofersDifferentMarkings());
    let foodsJson = await getFoodsJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithMultipleFoodoofersDifferentMarkings());
    // we should have more than one foodoffer
    expect(foodOfferJson.length).toBeGreaterThan(1);
    // we should have more than one food
    let dictFoodIds: { [key: string]: any } = {};
    for (let foodOffer of foodOfferJson) {
      if (!!dictFoodIds[foodOffer.food_id]) {
        dictFoodIds[foodOffer.food_id].push(foodOffer);
      } else {
        dictFoodIds[foodOffer.food_id] = [foodOffer];
      }
    }
    // we should have more than one food
    expect(Object.keys(dictFoodIds).length).toBeGreaterThan(1);
    expect(foodsJson.length).toBeGreaterThan(1);
  });

  function checkForAllAttributesPassed(foodOrFoodoffersJson: FoodoffersTypeForParser[] | FoodsInformationTypeForParser[], allAttributeFields: Tl1AttributeType[]) {
    // Lets create a dict of all attributes we expect to find
    let dictAllAttributeFields: { [key: string]: Tl1AttributeType } = {};
    for (let attributeField of allAttributeFields) {
      dictAllAttributeFields[attributeField.external_identifier] = attributeField;
    }

    // for every food or foodoffer
    for (let foodOrFoodoffer of foodOrFoodoffersJson) {
      let foodofferAttributes = foodOrFoodoffer.attribute_values;
      // create a dict of all attributes present in the food or foodoffer
      let dictOfFoodOrFoodofferAttributes: {
        [key: string]: FoodParseFoodAttributeValueType;
      } = {};
      for (let foodofferAttribute of foodofferAttributes) {
        dictOfFoodOrFoodofferAttributes[foodofferAttribute.external_identifier] = foodofferAttribute;
      }

      let externalIdentifiers = Object.keys(dictAllAttributeFields);
      for (let externalIdentifier of externalIdentifiers) {
        let expectedAttribute = dictAllAttributeFields[externalIdentifier];
        expect(!!expectedAttribute).toBe(true);
        if (!expectedAttribute) {
          return;
        }

        let foundAttribute = dictOfFoodOrFoodofferAttributes[externalIdentifier];
        expect(!!foundAttribute).toBe(true);
        if (!foundAttribute) {
          return;
        }

        expect(foundAttribute.external_identifier).toBe(expectedAttribute.external_identifier);

        // Now check if the value is correct set
        if (expectedAttribute.value_type === TL1AttributeValueType.NUMBER) {
          expect(foundAttribute.attribute_value.number_value).not.toBeUndefined();
        } else if (expectedAttribute.value_type === TL1AttributeValueType.STRING) {
          expect(!!foundAttribute.attribute_value.string_value).not.toBeUndefined();
        } else if (expectedAttribute.value_type === TL1AttributeValueType.BOOLEAN) {
          expect(!!foundAttribute.attribute_value.boolean_value).not.toBeUndefined();
        }
      }
    }
  }

  it('Food offers attributes are all parsed', async () => {
    let foodoffersJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderHannover.getSavedRawReportWithAttributeValues());
    let allAttributeFields = FoodTL1ParserHannover.FOOD_ATTRIBUTE_FIELDS;
    checkForAllAttributesPassed(foodoffersJson, allAttributeFields);
  });

  it('Food attributes are all parsed', async () => {
    let foodsJson = await getFoodsJson();
    let allAttributeFields = FoodTL1ParserHannover.FOOD_ATTRIBUTE_FIELDS;
    //checkForAllAttributesPassed(foodsJson, allAttributeFields);
  });
});
