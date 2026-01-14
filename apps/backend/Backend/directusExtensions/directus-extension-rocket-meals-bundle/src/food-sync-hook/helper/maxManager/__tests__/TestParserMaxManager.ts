import {describe, expect, it} from '@jest/globals';
import {FoodParserInterface} from "../../../FoodParserInterface";
import {MarkingParserInterface} from "../../../MarkingParserInterface";
import {MaxManagerConnector, MaxManagerConnectorConfig} from "../MaxManagerConnector";
import {MaxManagerFileContentReader} from "../MaxManagerFileContentReader";



const configMaxManagerTestLocal = {
  fileContentReader: new MaxManagerFileContentReader(),
  fetchAmountDays: 3,
}

const configMaxManagerTestOnline: MaxManagerConnectorConfig = {
    url: "https://sw-muenster-spl24.maxmanager.xyz",
    fetchAmountDays: 3,
};

const configMaxManagerTest = configMaxManagerTestLocal;
const amountDaysToFetch = configMaxManagerTest.fetchAmountDays || 14;

let foodParser: FoodParserInterface;
let markingParser: MarkingParserInterface;

//describe('MaxManagerConnector Parser Tests', () => {
describe('dev', () => {

    beforeAll(async () => {
        let foodAndMarkingParser = new MaxManagerConnector(configMaxManagerTest);
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

  it("foodoffer has price", async () => {
        let searchForFoodWithAlias = "Schokoladenpudding"
        const foodsOfferList = await foodParser.getFoodoffersForParser();
        const foodOffer = foodsOfferList.find( foodOffer => foodOffer.basicFoodofferData.alias === searchForFoodWithAlias);
        //console.log("Searching for foodoffer with alias "+searchForFoodWithAlias);
        //console.log(JSON.stringify(foodOffer, null, 2));
        expect(foodOffer).toBeDefined();

        // <div style="font-size:15px;padding:20px 0"> €&nbsp;0,90&nbsp;/&nbsp;1,35 </div>

        let expectedPriceGuest = 1.35;
        expect(foodOffer?.basicFoodofferData.price_guest ).toBeDefined();
        expect(foodOffer?.basicFoodofferData.price_guest ).toBeGreaterThan(0);
        expect(foodOffer?.basicFoodofferData.price_guest ).toBe(expectedPriceGuest);

        let expectedPriceStudent = 0.90;
        expect(foodOffer?.basicFoodofferData.price_student ).toBeDefined();
        expect(foodOffer?.basicFoodofferData.price_student ).toBeGreaterThan(0);
        expect(foodOffer?.basicFoodofferData.price_student ).toBe(expectedPriceStudent);
    });

    it('parses more than one foodoffer', async () => {
        const foodsOfferList = await foodParser.getFoodoffersForParser();
        let datesFoundDict: {[key: string]: boolean} = {};
        for (const foodOffer of foodsOfferList) {
            const dateStr = foodOffer.date.year+"-"+String(foodOffer.date.month).padStart(2,'0')+"-"+String(foodOffer.date.day).padStart(2,'0');
            datesFoundDict[dateStr] = true;
        }
        const datesFound = Object.keys(datesFoundDict);
        expect(datesFound.length).toBeGreaterThan(amountDaysToFetch -1);
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
