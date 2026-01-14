// small jest test
import { describe, expect, it } from '@jest/globals';
import { FoodTL1Parser } from '../../FoodTL1Parser';
import { FoodTL1Parser_GetRawReportInterface } from '../../FoodTL1Parser_GetRawReportInterface';
import { FoodTL1Parser_RawReportTestReaderOsnabrueck } from '../FoodTL1Parser_RawReportTestReaderOsnabrueck';
import { FoodTL1ParserOsnabrueck } from '../FoodTL1ParserOsnabrueck';

async function getFoodoffersJson(reportToReturn?: string | undefined) {
  let testFileGetter: FoodTL1Parser_GetRawReportInterface = new FoodTL1Parser_RawReportTestReaderOsnabrueck(reportToReturn);
  let foodParser: FoodTL1Parser = new FoodTL1ParserOsnabrueck(testFileGetter);
  await foodParser.createNeededData();
  return await foodParser.getFoodoffersForParser();
}

describe('FoodTL1ParserOsnabrueck Test', () => {
  let testFileGetter: FoodTL1Parser_GetRawReportInterface = new FoodTL1Parser_RawReportTestReaderOsnabrueck();
  let foodParser: FoodTL1Parser = new FoodTL1ParserOsnabrueck(testFileGetter);

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

  it('Find menu line in markings list for meal offer', async () => {
    await foodParser.createNeededData();
    let mealOffersJson = await foodParser.getFoodoffersForParser();
    if (!!mealOffersJson) {
      let mealOffer = mealOffersJson[0];
      if (!!mealOffer) {
        let marking_external_identifiers = mealOffer.marking_external_identifiers;

        const SEARCH_MENU_LINE_MARKING_EXTERNAL_IDENTIFIER = FoodTL1Parser.MARKING_EXTERNAL_IDENTIFIER_PREFIX_FOR_MENU_LINE + 'g';

        let foundMenuLine = false;
        for (let marking_external_identifier of marking_external_identifiers) {
          if (marking_external_identifier === SEARCH_MENU_LINE_MARKING_EXTERNAL_IDENTIFIER) {
            foundMenuLine = true;
            break;
          }
        }
        expect(foundMenuLine).toBe(true);
      } else {
        expect(false).toBe(true);
      }
    } else {
      expect(false).toBe(true);
    }
  });

  it('Foodoffer with vegetarian marking shall have vegetarian marking', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderOsnabrueck.getSavedRawReportWithVegetarianValues());
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);
    const expectedMarkingExternalIdentifiers = ['20'];
    for (let foodOffer of foodOfferJson) {
      expect(foodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(expectedMarkingExternalIdentifiers));
    }
  });

  it('Foodoffers shall have correct category', async () => {
    await foodParser.createNeededData();
    let foodOffersJson = await foodParser.getFoodoffersForParser();
    let foundCategory = false;
    for (let foodOffer of foodOffersJson) {
      if (!!foodOffer.category_external_identifier) {
        foundCategory = true;
        break;
      }
    }
    expect(foundCategory).toBe(true);

    let firstFoodOffer = foodOffersJson[0];

    expect(!!firstFoodOffer).toBe(true);
    if (firstFoodOffer) {
      expect(firstFoodOffer.category_external_identifier).toBe('KM 1 + 2,20 €');
    }
  });

  it('Food with CO2 rating A and main course should have marking CO2_RATING_A', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderOsnabrueck.getSavedRawReportWithCO2RatingValuesMainCourse());
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);
    const expectedMarkingExternalIdentifiers = [FoodTL1ParserOsnabrueck.getCO2RatingMarkingExternalIdentifier('A')];
    for (let foodOffer of foodOfferJson) {
      expect(foodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(expectedMarkingExternalIdentifiers));
    }
  });

  it('Food with CO2 rating A and main course should not have marking CO2_RATING_A', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderOsnabrueck.getSavedRawReportWithCO2RatingValuesButSideCourse());
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);
    let expectedMarkingExternalIdentifiersNotToContain = [FoodTL1ParserOsnabrueck.getCO2RatingMarkingExternalIdentifier('A')];
    for (let foodOffer of foodOfferJson) {
      expect(foodOffer.marking_external_identifiers).toEqual(expect.not.arrayContaining(expectedMarkingExternalIdentifiersNotToContain));
    }
  });

  it('Food shall have correct category', async () => {
    await foodParser.createNeededData();
    let foodsJson = await foodParser.getFoodsListForParser();
    let foundCategory = false;
    for (let food of foodsJson) {
      if (!!food.category_external_identifier) {
        foundCategory = true;
        break;
      }
    }
    expect(foundCategory).toBe(true);

    let firstFood = foodsJson[0];

    expect(!!firstFood).toBe(true);
    if (firstFood) {
      expect(firstFood.category_external_identifier).toBe('Beilagen');
    }
  });

  it('Find Niedersachsen Menu line in external identifiers for meal offer', async () => {
    let foodOfferJson = await getFoodoffersJson(FoodTL1Parser_RawReportTestReaderOsnabrueck.getSavedRawReportWithNiedersachsenMenu());
    expect(!!foodOfferJson).toBe(true);
    expect(foodOfferJson.length).toBeGreaterThan(0);
    const expectedMarkingExternalIdentifiers = [FoodTL1ParserOsnabrueck.MARKING_EXTERNAL_IDENTIFIER_NIEDERSACHSEN_MENU];
    for (let foodOffer of foodOfferJson) {
        expect(foodOffer.marking_external_identifiers).toEqual(expect.arrayContaining(expectedMarkingExternalIdentifiers));
    }
  });
});
