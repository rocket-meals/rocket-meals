import {describe, expect, it} from '@jest/globals';
import {FoodAndMarkingWebParserMuenster} from '../FoodAndMarkingWebParserMuenster';
import {FoodParserInterface} from '../../FoodParserInterface';
import {MarkingParserInterface} from '../../MarkingParserInterface';
import {MaxManagerFileContentReaderMuenster} from "../MaxManagerFileContentReaderMuenster";
import {MaxManagerConnector} from "../../helper/maxManager/MaxManagerConnector";

const configMaxManagerTest = {
  fileContentReader: new MaxManagerFileContentReaderMuenster(),
  // fetchAmountDays: 1,
}

let foodParser: FoodParserInterface;
let markingParser: MarkingParserInterface;

describe('FoodAndMarkingWebParserMünster Test', () => {

  beforeAll(async () => {
    let foodAndMarkingParser = new FoodAndMarkingWebParserMuenster(configMaxManagerTest);
    await foodAndMarkingParser.createNeededData();

    foodParser = foodAndMarkingParser;
    markingParser = foodAndMarkingParser;
  });

  it('parses canteens', async () => {
    const canteensList = await foodParser.getCanteensList();
    expect(canteensList.length).toBeGreaterThan(0);
  });


  it('parses more than one foodoffer', async () => {
    const foodsOfferList = await foodParser.getFoodoffersForParser();
    expect(foodsOfferList.length).toBeGreaterThan(1);
  });


  it('parses markings', async () => {
    const markingsList = await markingParser.getMarkingsJSONList();

    expect(markingsList.length).toBeGreaterThan(0);

    let expectedMarkingIds: string[] = [];
    // Zusatzstoffe 1,2,3,8
    expectedMarkingIds.push('A');
    expectedMarkingIds.push('ADI');
    expectedMarkingIds.push('F');
    // ....
    expectedMarkingIds.push('HQU');
    // ...
    expectedMarkingIds.push('1');
    expectedMarkingIds.push('10');
    expectedMarkingIds.push('16');

    expectedMarkingIds.push('A.png?v=1'); // alcohol
    expectedMarkingIds.push('R.png?v=1'); // rind
    expectedMarkingIds.push('CO2_bewertung_C.png?v=1'); // CO2 Bewertung C

    for (const expectedMarkingId of expectedMarkingIds) {
      const found = markingsList.find(marking => marking.external_identifier === expectedMarkingId);
      expect(found?.external_identifier).toBe(expectedMarkingId);
      expect(found).toBeDefined();
    }
  });
});
