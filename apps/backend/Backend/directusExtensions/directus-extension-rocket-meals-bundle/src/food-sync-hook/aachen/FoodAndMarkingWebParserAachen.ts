import {
  CanteensTypeForParser,
  FoodoffersTypeForParser,
  FoodParserHelper,
  FoodParserInterface,
  FoodsInformationTypeForParser
} from '../FoodParserInterface';
import {MarkingParserInterface, MarkingsTypeForParser} from '../MarkingParserInterface';
import {FoodWebParserAachenReadHtmlFiles} from './FoodWebParserAachenReadHtmlFiles';
import {FoodWebParserAachenParseHtml} from './FoodWebParserAachenParseHtml';
import {FoodWebParser_RawReportWebReaderAachen} from './FoodWebParser_RawReportWebReaderAachen';

export type CanteenNamesToHtmlFileDict = { [canteenName: string]: string };

export class FoodAndMarkingWebParserAachen implements FoodParserInterface, MarkingParserInterface {
  private readonly htmlFileReader: FoodWebParserAachenReadHtmlFiles;
  private canteensHtmlFilesMap: CanteenNamesToHtmlFileDict = {};

  private filterDuplicatedOffersPerCanteen: boolean = true;

  constructor(htmlFileReader?: FoodWebParserAachenReadHtmlFiles) {
    if (!htmlFileReader) {
      this.htmlFileReader = new FoodWebParser_RawReportWebReaderAachen();
    } else {
      this.htmlFileReader = htmlFileReader;
    }
    this.resetData();
  }

  private resetData() {
    this.canteensHtmlFilesMap = {};
  }

  async createNeededData(markingsJSONList?: MarkingsTypeForParser[] | undefined) {
    this.canteensHtmlFilesMap = await this.htmlFileReader.getHtmlFilesForCanteens();
  }

  public getCanteensList(): Promise<CanteensTypeForParser[]> {
    let canteensList: CanteensTypeForParser[] = [];
    let keyList = Object.keys(this.canteensHtmlFilesMap);
    for (let canteenName of keyList) {
      canteensList.push({
        external_identifier: canteenName,
      });
    }
    return Promise.resolve(canteensList);
  }

  public async getFoodsListForParser(): Promise<FoodsInformationTypeForParser[]> {
    let foodoffersList: FoodoffersTypeForParser[] = await this.getFoodoffersForParser();
    return FoodParserHelper.getFoodsListFromFoodoffersList(foodoffersList);
  }

  public getFoodoffersForParser(): Promise<FoodoffersTypeForParser[]> {
    let foodoffersList: FoodoffersTypeForParser[] = this.getFullFoodoffersListAfterCreateNeededData(this.canteensHtmlFilesMap);
    return Promise.resolve(foodoffersList);
  }

  private getFullFoodoffersListAfterCreateNeededData(canteensHtmlFilesMap: CanteenNamesToHtmlFileDict): FoodoffersTypeForParser[] {
    let foodoffersList: FoodoffersTypeForParser[] = [];
    const canteenNames = Object.keys(canteensHtmlFilesMap);
    for (const canteenName of canteenNames) {
      const htmlContent = canteensHtmlFilesMap[canteenName];

      const foodoffersForCanteen = FoodWebParserAachenParseHtml.getRawFoodofferJSONListFromWebHtml(htmlContent, canteenName, this.filterDuplicatedOffersPerCanteen);
      foodoffersList = foodoffersList.concat(foodoffersForCanteen);
    }
    return foodoffersList;
  }

  shouldCreateNewMarkingsWhenTheyDoNotExistYet(): boolean {
    return true;
  }

  getMarkingsJSONList(): Promise<MarkingsTypeForParser[]> {
    /**
     * Zusatzstoffe: (1) Farbstoff, (2) Konservierungsstoff, (3) Antioxidationsmittel, (8) Phosphat
     * Allergene: (A) glutenhaltiges Getreide, (B) Sellerie, (D) Eier, (E) Fisch, (F) Erdnüsse, (G) Sojabohnen, (H) Milch, (I) Schalenfrüchte, (J) Senf, (K) Sesamsamen, (A1) Weizen, (A3) Gerste, (A4) Hafer, (I1) Mandeln
     */
    let firstHtmlFile: string | undefined;
    const canteenNames = Object.keys(this.canteensHtmlFilesMap);
    for (const canteenName of canteenNames) {
      firstHtmlFile = this.canteensHtmlFilesMap[canteenName];
    }
    if (firstHtmlFile) {
      let markings = FoodWebParserAachenParseHtml.getMarkingsJSONListFromWebHtml(firstHtmlFile);
      return Promise.resolve(markings);
    } else {
      return Promise.resolve([]);
    }
  }
}
