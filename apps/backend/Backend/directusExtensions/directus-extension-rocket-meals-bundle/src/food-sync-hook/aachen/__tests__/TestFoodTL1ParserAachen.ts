import {describe, expect, it} from '@jest/globals';
import {FoodAndMarkingWebParserAachen} from '../FoodAndMarkingWebParserAachen';
import {FoodWebParser_RawReportTestReaderAachen} from '../FoodWebParser_RawReportTestReaderAachen';
import {FoodParserInterface} from '../../FoodParserInterface';
import {MarkingParserInterface} from '../../MarkingParserInterface';

function getTestParser(): FoodParserInterface {
  return new FoodAndMarkingWebParserAachen(new FoodWebParser_RawReportTestReaderAachen());
}

function getMarkingParser(): MarkingParserInterface {
  return new FoodAndMarkingWebParserAachen(new FoodWebParser_RawReportTestReaderAachen());
}

describe('FoodAndMarkingWebParserAachen Test', () => {
  it('parses more than one food', async () => {
    const parser = getTestParser();
    await parser.createNeededData();
    const foodsList = await parser.getFoodsListForParser();
    expect(foodsList.length).toBeGreaterThan(1);
  });

  it('parses canteens', async () => {
    const parser = getTestParser();
    await parser.createNeededData();
    const canteensList = await parser.getCanteensList();
    expect(canteensList.length).toBeGreaterThan(0);
  });

  it('parses markings', async () => {
    const parser = getMarkingParser();
    await parser.createNeededData();
    const markingsList = await parser.getMarkingsJSONList();
    expect(markingsList.length).toBeGreaterThan(0);

    let expectedMarkingIds: string[] = [];
    // Zusatzstoffe 1,2,3,8
    expectedMarkingIds.push('1');
    expectedMarkingIds.push('2');
    expectedMarkingIds.push('3');
    expectedMarkingIds.push('8');

    // Allergene A-K + A1,A3,A4 + I1
    expectedMarkingIds.push('A');
    expectedMarkingIds.push('B');
    expectedMarkingIds.push('C');
    expectedMarkingIds.push('D');
    expectedMarkingIds.push('E');
    expectedMarkingIds.push('F');
    expectedMarkingIds.push('G');
    expectedMarkingIds.push('H');
    expectedMarkingIds.push('I');
    expectedMarkingIds.push('J');
    expectedMarkingIds.push('K');
    expectedMarkingIds.push('A1');
    expectedMarkingIds.push('A3');
    expectedMarkingIds.push('A4');
    expectedMarkingIds.push('I1');

    for (const expectedMarkingId of expectedMarkingIds) {
      const found = markingsList.find(marking => marking.external_identifier === expectedMarkingId);
      expect(found).toBeDefined();
    }
  });
});
