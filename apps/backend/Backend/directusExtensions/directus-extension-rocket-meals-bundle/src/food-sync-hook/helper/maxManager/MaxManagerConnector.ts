import {
    CanteensTypeForParser,
    FoodoffersTypeForParser,
    FoodofferTypeWithBasicData,
    FoodParseFoodAttributeValueType,
    FoodParserHelper,
    FoodParserInterface,
    FoodsInformationTypeForParser
} from "../../FoodParserInterface";
import {MarkingParserInterface, MarkingsTypeForParser} from "../../MarkingParserInterface";
import {FileContentReader} from "../FileContentReader";
import {FetchHelper} from "../../../helpers/FetchHelper";
import {load} from 'cheerio';
import {FoodofferDateType, StringHelper} from "repo-depkit-common"
import {TranslationHelper, TranslationsFromParsingType} from "../../../helpers/TranslationHelper";
import {MarkingTranslationFields} from "../../MarkingTranslationFields";

export type MaxManagerConnectorConfig = {
    url?: string;
    fileContentReader?: FileContentReader;
    fetchAmountDays?: number;
    shouldCreateNewMarkingsWhenTheyDoNotExistYet?: boolean;
}

type MaxManagerPostParameters = {
    locId: string; // Canteen ID
    date: string // e.g. 2025-11-24
    lang: string // e.g. de
    startThisWeek: string // e.g. 2025-11-24
    startNextWeek: string // e.g. 2025-12-01
}

type MyMaxManagerPostParameters = {
    external_identifier: string; // Canteen ID
    date: Date;
}

type CanteenData = {
    date: Date;
    html: string;
}

export class MaxManagerConnector implements FoodParserInterface, MarkingParserInterface {

    private config: MaxManagerConnectorConfig;

    static PAGE_INDEX = "/index.php";
    static PAGE_AJAX_KONNEKTOR = "/inc/ajax-php_konnektor.inc.php";

    private canteenIdToNameMap: Record<string, string> = {};
    private canteenIdToDataMap: Record<string, CanteenData[]> = {};

    private urlCookies: string | null = null;

    constructor(config: MaxManagerConnectorConfig) {
        this.config = config;
    }

    async createNeededData(){
        this.canteenIdToNameMap = {};
        this.canteenIdToDataMap = {};

        let now = new Date();


        let amountDays = this.config.fetchAmountDays;
        if(amountDays === undefined || amountDays === null){
            amountDays = 14; // default to 14 days
        }
        //console.log("MaxManagerConnector: created needed data");


        let initialHtml: string | null = null;
        if(this.config.fileContentReader){
            const fileContentReader = this.config.fileContentReader;
            initialHtml = await fileContentReader.getContent();
        }
        if(this.config.url){
            const url = this.config.url + MaxManagerConnector.PAGE_INDEX;
            let response = await FetchHelper.fetch(url)
            initialHtml = await response.text();
        }

        if(!initialHtml){
            console.error("MaxManagerConnector: createNeededData: initialHtml is null. Cannot proceed.");
            return;
        }

        let canteenMap = this.getCanteenMap(initialHtml);
        //console.log("Selected canteen id from file: " + selectedCanteenId);
        this.canteenIdToNameMap = canteenMap;

        //console.log("Fetching foodoffers for " + amountDays + " days for all canteens...");
        for(let dayOffset = 0; dayOffset < amountDays; dayOffset++) {
            let fetchDate = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);

            //console.log(" Fetching date: " + fetchDate.toDateString());
            for(const canteenId in canteenMap){

                const html = await this.getHtml(canteenId, fetchDate, initialHtml);
                if(!html){
                    console.error("MaxManagerConnector: createNeededData: html is null for canteen id: " + canteenId + " date: " + fetchDate.toDateString());
                    continue;
                }

                let data = {
                    date: new Date(fetchDate),
                    html: html
                }

                this.canteenIdToDataMap[canteenId] = this.canteenIdToDataMap[canteenId] || [];
                this.canteenIdToDataMap[canteenId].push(data);
            }
        }

        // print the canteenIdToDataMap keys and number of entries
        /**
        console.log("Canteen data map:");
        for(const canteenId in this.canteenIdToDataMap){
            const dataList = this.canteenIdToDataMap[canteenId];
            if(dataList){
                console.log(" - Canteen ID: " + canteenId + " has " + dataList.length + " entries");
            }
        }
            */


    }

    private async getHtml(canteenId: string, fetchDate: Date, initialHtml: string): Promise<string | undefined> {
        if(this.config.fileContentReader){
            const fileContentReader = this.config.fileContentReader;
            let fileContent = await fileContentReader.getContent();
            return fileContent;
        }
        if(this.config.url){

            const url = this.config.url + MaxManagerConnector.PAGE_INDEX;
            let response = await FetchHelper.fetch(url)
            let cookies = response.headers.get("set-cookie");
            // node-fetch: alle Set-Cookie-Header holen
            let setCookieHeaders = (response.headers as any).raw?.()['set-cookie'] as string[] | undefined;
            setCookieHeaders = [cookies || ''];

            //console.log("Set cookie: " + setCookieHeaders);
            if (setCookieHeaders && setCookieHeaders.length > 0) {
                // Nur "name=value"-Teil nehmen und zu einem Cookie-Header zusammenbauen
                this.urlCookies = setCookieHeaders
                    .map(c => c.split(';')[0])
                    .join('; ');
            }

            const postParameters: MyMaxManagerPostParameters = {
                external_identifier: canteenId,
                date: fetchDate
            };

            try{
                const partialCanteenHtml = await this.getSpeiseplanFromEndpoint(postParameters);

                //console.log("")

                // max Manager loads only the speiseplan part via ajax, so we need to insert it into the full html
                let searchStringStart = "<div id='speiseplan'>";
                let completeHtmlForCanteen = initialHtml.replace(searchStringStart, searchStringStart+partialCanteenHtml);

                return completeHtmlForCanteen;
                //console.log(" - Fetched speiseplan for canteen id: " + canteenId + " for date: " + data.date.toDateString()+" HTML length: " + completeHtmlForCanteen.length);
            } catch (error) {
                console.error("Failed to fetch speiseplan for canteen id: " + canteenId);
            }
        }
        return undefined;
    }

    private getStartThisWeek(date: Date): Date {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(date.setDate(diff));
    }

    private getStartNextWeek(date: Date): Date {
        const startThisWeek = this.getStartThisWeek(date);
        return new Date(startThisWeek.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    private getDateFormatForMaxManager(date: Date): string {
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    private async getSpeiseplanFromEndpoint(myPostParameters: MyMaxManagerPostParameters): Promise<string> {
        //console.log("Fetching speiseplan for locId: " + myPostParameters.external_identifier);
        let url = this.config.url;
        if(!url){
            throw new Error("No URL configured for MaxManagerConnector");
        }
        url += MaxManagerConnector.PAGE_AJAX_KONNEKTOR;

        let dateCopy = new Date(myPostParameters.date);
        let date = this.getDateFormatForMaxManager(dateCopy);
        let startThisWeekDate = this.getStartThisWeek(dateCopy);
        let startNextWeekDate = this.getStartNextWeek(dateCopy);
        let startThisWeek = this.getDateFormatForMaxManager(startThisWeekDate);
        let startNextWeek = this.getDateFormatForMaxManager(startNextWeekDate);
        const postParameters: MaxManagerPostParameters = {
            locId: myPostParameters.external_identifier,
            date: date,
            lang: "de",
            startThisWeek: startThisWeek,
            startNextWeek: startNextWeek
        };

        let body = new URLSearchParams({
            func: "make_spl",
            locId: postParameters.locId,
            date: postParameters.date,
            lang: postParameters.lang,
            startThisWeek: postParameters.startThisWeek,
            startNextWeek: postParameters.startNextWeek
        })

        /**
         console.log("Post parameters:");
         console.log(JSON.stringify(postParameters, null, 2));
         console.log("Post parameters body:");
         console.log(body.toString());
         */

            //console.log(body.toString());

        const cookieHeaderParts: string[] = [];

        // Cookies vom Server (z. B. splswmunster=...)
        if (this.urlCookies) {
            cookieHeaderParts.push(this.urlCookies);
        }


// Clientseitiger Cookie aus dem Browser (savekennzfilterinput=0)
// Den setzt dein Node-Skript ja nicht automatisch, also einfach manuell ergänzen:
        cookieHeaderParts.push('savekennzfilterinput=0');

        const cookieHeader = cookieHeaderParts.join('; ');

        //console.log("Fetch from url: ", url);

        const response = await FetchHelper.fetch(url, {
            method: 'POST',
            headers: {
                "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:145.0) Gecko/20100101 Firefox/145.0",
                "Accept": "*/*",
                "Accept-Language": "de,en-US;q=0.7,en;q=0.3",
                "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                "X-Requested-With": "XMLHttpRequest",
                "Sec-GPC": "1",
                "Sec-Fetch-Dest": "empty",
                "Sec-Fetch-Mode": "cors",
                "Sec-Fetch-Site": "same-origin",
                "Pragma": "no-cache",
                "Cache-Control": "no-cache",
                "Cookie": cookieHeader
            },
            "referrer": this.config.url,
            //credentials: "include", // cookies are already set in headers
            mode: "cors",
            body: body
        });
        if(!response.ok){
            throw new Error("Failed to fetch speiseplan from MaxManager endpoint");
        }
        const html = await response.text();
        //console.log(html);

        return html;
    }

    private getCurrentSelectedCanteenId(html: string): string | null {
        const $ = load(html);
        const selectedOption = $('#listbox-locations option');
        if (selectedOption.length > 0) {
            return selectedOption.attr('value') || null;
        }
        return null;
    }


    private getCanteenMap(html: string): Record<string, string> {
        // search for <select id="listbox-locations"
        const $ = load(html);
        const canteens: Record<string, string> = {};
        $('#listbox-locations option').each((index, element) => {
            const id = $(element).attr('value');
            const name = $(element).text().trim();
            if(id && name){
                canteens[id] = name;
            }
        });
        //console.log("Canteens list of canteens list");
        //console.log(canteens);
        return canteens;
    }


    getCanteensList(): Promise<CanteensTypeForParser[]> {
        // search for <select id="listbox-locations"
        const canteens: CanteensTypeForParser[] = [];
        const canteenMap = this.canteenIdToNameMap;
        for(const canteenId in canteenMap){
            const name = canteenMap[canteenId];
            if(name){
                canteens.push({
                    external_identifier: canteenId,
                    alias: name
                });
            }
        }
        return Promise.resolve(canteens);
    }

    async getFoodoffersForParser(): Promise<FoodoffersTypeForParser[]> {
        let foodoffers: FoodoffersTypeForParser[] = [];

        // we need the markings list since some foods have markings but only as image or sup elements
        let allMarkings = await this.getMarkingsJSONList();

        for(const canteenId in this.canteenIdToDataMap){
            //console.log("------");
            //console.log("Canteen ID: " + canteenId);
            let canteenName = this.canteenIdToNameMap[canteenId];
            //console.log("Canteen Name: " + canteenName);
            const canteenDataList = this.canteenIdToDataMap[canteenId];
            if(canteenDataList){
                for(const canteenData of canteenDataList){
                    const date = canteenData.date;
                    //console.log(" Parsing foodoffers for canteen id: " + canteenId + " for date: " + date.toDateString());
                    const html = canteenData.html;
                    const $ = load(html);

                    // Parse foods from HTML

                    // search for class "row splMeal" with spaces
                    // <div class="row splMeal" data-kennz="9,G,J,Rin" tabindex="0" role="button" aria-label="Gericht: Rindergeschnetzeltes nach Stroganoff Art - vom westfälischen Weiderind Hof Keil&nbsp;9,G,Jmit Süßungsmittel, enthält Milch, enthält Senf, Preis:  €&nbsp;4,70&nbsp;/&nbsp;7,05" aria-describedby="meal-icons-1">
                    //
                    //                 <div class="col-12 d-block d-md-none">
                    //                     <span style="font-size:15px">Rindergeschnetzeltes nach Stroganoff Art - vom westfälischen Weiderind Hof Keil<sup class="tooltip-trigger ptr" data-tooltip="mit Süßungsmittel, enthält Milch, enthält Senf" aria-describedby="allergen-c872bc6e741402a03d6558605fe6dd72" role="button" tabindex="0" style="font-size:[26]px">&nbsp;9,G,J</sup><span id="allergen-c872bc6e741402a03d6558605fe6dd72" class="sr-only">mit Süßungsmittel, enthält Milch, enthält Senf</span></span>
                    //                 </div>
                    //
                    //                 <div class="col-md-6 d-none d-md-block">
                    //                     <span style="font-size: 15px">Rindergeschnetzeltes nach Stroganoff Art - vom westfälischen Weiderind Hof Keil<sup class="tooltip-trigger ptr" data-tooltip="mit Süßungsmittel, enthält Milch, enthält Senf" aria-describedby="allergen-c872bc6e741402a03d6558605fe6dd72" role="button" tabindex="0" style="font-size:[26]px">&nbsp;9,G,J</sup><span id="allergen-c872bc6e741402a03d6558605fe6dd72" class="sr-only">mit Süßungsmittel, enthält Milch, enthält Senf</span></span>
                    //                 </div>
                    //
                    //                 <div class="col-md-3 d-none d-md-block" style="text-align:right">
                    //                     <div class="tooltip-container"><img src="https://sw-muenster-spl24.maxmanager.xyz/assets/icons/H2O_bewertung_B.png?v=1" class="iconNormal" alt="26,64 l Wasserverbrauch / Portion | Der Wasserverbrauch ist doppelt so hoch wie der Durchschnitt."><span class="tooltip">26,64 l Wasserverbrauch / Portion | Der Wasserverbrauch ist doppelt so hoch wie der Durchschnitt.</span></div><div class="tooltip-container"><img src="https://sw-muenster-spl24.maxmanager.xyz/assets/icons/CO2_bewertung_C.png?v=1" class="iconNormal" alt="3176 g CO2 / Portion | Der CO&lt;sub&gt;2&lt;/sub&gt;-Verbrauch ist schlechter als der Durchschnitt."><span class="tooltip">3176 g CO2 / Portion | Der CO<sub>2</sub>-Verbrauch ist schlechter als der Durchschnitt.</span></div><div class="tooltip-container"><img src="https://sw-muenster-spl24.maxmanager.xyz/assets/icons/R.png?v=1" class="iconNormal" alt="Rind"><span class="tooltip">Rind</span></div>
                    //                 </div>
                    //                 <div class="col-md-3 d-none d-md-block" style="text-align:right">
                    //                     €&nbsp;4,70&nbsp;/&nbsp;7,05<br>
                    //                 </div>
                    //
                    //                 <div class="col-6 d-block d-md-none" style="height:30px;padding:0 0 10px 0">
                    //                     <div style="padding:0 0 20px 10px"><div class="tooltip-container"><img src="https://sw-muenster-spl24.maxmanager.xyz/assets/icons/H2O_bewertung_B.png?v=1" class="iconLarge" alt="26,64 l Wasserverbrauch / Portion | Der Wasserverbrauch ist doppelt so hoch wie der Durchschnitt."><span class="tooltip">26,64 l Wasserverbrauch / Portion | Der Wasserverbrauch ist doppelt so hoch wie der Durchschnitt.</span></div><div class="tooltip-container"><img src="https://sw-muenster-spl24.maxmanager.xyz/assets/icons/CO2_bewertung_C.png?v=1" class="iconLarge" alt="3176 g CO2 / Portion | Der CO&lt;sub&gt;2&lt;/sub&gt;-Verbrauch ist schlechter als der Durchschnitt."><span class="tooltip">3176 g CO2 / Portion | Der CO<sub>2</sub>-Verbrauch ist schlechter als der Durchschnitt.</span></div><div class="tooltip-container"><img src="https://sw-muenster-spl24.maxmanager.xyz/assets/icons/R.png?v=1" class="iconLarge" alt="Rind"><span class="tooltip">Rind</span></div></div>
                    //                 </div>
                    //                 <div class="col-6 d-block d-md-none" style="height:30px;text-align: right">
                    //                     <div style="font-size:15px;padding:20px 0"> €&nbsp;4,70&nbsp;/&nbsp;7,05 </div>
                    //                 </div>
                    //
                    //                 <div class="col-12 d-block d-md-none">
                    //                     <div style="height:16px">&nbsp;</div>
                    //                 </div>
                    //             </div>
                    $('div.row.splMeal').each((index, element) => {
                        let foodofferDate: FoodofferDateType = {
                            day: date.getDate(),
                            month: date.getMonth() + 1,
                            year: date.getFullYear()
                        };

                        const markingElement = $(element).find('div.col-12.d-block.d-md-none span').first();
                        // find all sup elements inside markingElement
                        const supElements = markingElement.find('sup');
                        const markings: string[] = [];
                        supElements.each((i, supElement) => {
                            // 782dd9ce018e7ad7b12d" role="button" tabindex="0" style="font-size:[26]px">&nbsp;C,G,I,N</sup>
                            // get all text inside sup element, remove &nbsp; and split by ","
                            let supText = $(supElement).text().replace(/\u00a0/g, '').trim();
                            let supMarkings = supText.split(",");
                            supMarkings.forEach((marking) => {
                                marking = marking.trim();
                                if(marking.length > 0){
                                    markings.push(marking);
                                }
                            });
                        });

                        // search for markings by images in the element
                        const imgElements = $(element).find('img');
                        imgElements.each((i, imgElement) => {
                            // get image src and search with it in allMarkings
                            const imgSrc = $(imgElement).attr('src');
                            if(imgSrc){
                                const foundMarking = allMarkings.find(marking => marking.image_remote_url === imgSrc);
                                if(foundMarking){
                                    markings.push(foundMarking.external_identifier);
                                }
                            }
                        });

                        // remove duplicate markings
                        const uniqueMarkingExternalIdentifiers = Array.from(new Set(markings));





                        const mealNameElement = $(element).find('div.col-12.d-block.d-md-none span').first();

                        // get spawn text
                        // remove all "sup" elements from it
                        mealNameElement.find('sup').remove();

                        // <span style="font-size: 15px">Schokoladenpudding<sup class="tooltip-trigger ptr" data-tooltip="enthält Milch" aria-describedby="allergen-8e4ded5e1b61dfc50d85fbf0a2bad298" role="button" tabindex="0" style="font-size:[26]px">&nbsp;G</sup><span id="allergen-8e4ded5e1b61dfc50d85fbf0a2bad298" class="sr-only">enthält Milch</span></span>
                        // remove all spawn with class "sr-only"
                        mealNameElement.find('span.sr-only').remove();

                        // gehe durch alle span Elemente und nehme nur den Text
                        let mealName = mealNameElement.text().trim();
                        // remove " ," alle Leerzeigen + Komma irgendwo im Text
                        mealName = StringHelper.replaceAllWithOptions({
                          str: mealName,
                          find: " ,",
                          replace: "",
                        });


                        // Preis
                        // <div style="font-size:15px;padding:20px 0"> €&nbsp;0,90&nbsp;/&nbsp;1,35 </div>
                        const priceElement = $(element).find('div.col-md-3.d-none.d-md-block').last();
                        // price student / employee
                        let priceStudent: number | null = null;
                        let priceGuest: number | null = null;

                        let log = mealName === "Schokoladenpudding" ? true : false;

                        if(priceElement){
                            let priceText = priceElement.text().trim();
                            if(log){
                                //console.log("Price text for "+mealName+": '"+priceText+"'");
                            }
                            // split by "/"
                            let priceParts = priceText.split("/");
                            let priceStudentString = priceParts?.[0]
                            if(priceStudentString){
                                priceStudentString = priceStudentString.replace("€", "").trim();
                                priceStudentString = priceStudentString.replace(",", ".").trim();
                                priceStudent = parseFloat(priceStudentString);
                            }
                            let priceGuestSting = priceParts?.[1];
                            if(priceGuestSting){
                                priceGuestSting = priceGuestSting.replace("€", "").trim();
                                priceGuestSting = priceGuestSting.replace(",", ".").trim();
                                priceGuest = parseFloat(priceGuestSting);
                            }
                        }

                        let basicFoodofferData: FoodofferTypeWithBasicData = {
                            alias: mealName,
                            price_employee: null,
                            price_guest: priceGuest,
                            price_student: priceStudent,
                            foodoffer_components: [],
                        }

                        let attribute_values: FoodParseFoodAttributeValueType[] = [];

                        // simplified food id
                        let food_id = mealName;

                        let foodoffer: FoodoffersTypeForParser = {
                            basicFoodofferData: basicFoodofferData,
                            attribute_values: attribute_values,
                            marking_external_identifiers: uniqueMarkingExternalIdentifiers,
                            category_external_identifier: null,
                            date: foodofferDate,
                            canteen_external_identifier: canteenId+"",
                            food_id: food_id
                        }

                        foodoffers.push(foodoffer);
                    });
                }
            }
        }

        return Promise.resolve(foodoffers);
    }

    async getFoodsListForParser(): Promise<FoodsInformationTypeForParser[]> {
        let foodoffersList: FoodoffersTypeForParser[] = await this.getFoodoffersForParser();
        return FoodParserHelper.getFoodsListFromFoodoffersList(foodoffersList);
    }

    private getFirstNotEmptyHtml(){
        for(const canteenId in this.canteenIdToDataMap){
            const canteenDataList = this.canteenIdToDataMap[canteenId];
            if(canteenDataList){
                for(const canteenData of canteenDataList){
                    const html = canteenData.html;
                    if(html && html.length > 0){
                        return html;
                    }
                }
            }
        }
        return null;
    }

    async getMarkingsJSONList(): Promise<MarkingsTypeForParser[]> {
        let markingsList: MarkingsTypeForParser[] = [];
        let html = this.getFirstNotEmptyHtml();
        if(html) {
            const $ = load(html);

            // search for id legende-content
            // <div id="legende-content" class="container-fluid legende hidden mt-3">
            const legendeContent = $('#legende-content');

            // search for tr which is not in thead
            //                         <table class="table table-sm">
            //                             <thead>
            //                             <tr>
            //                                 <th colspan="2">ALLERGENE</th>
            //                             </tr>
            //                             </thead>
            //                             <tbody>
            //                             <tr>
            //                                 <td class="text-center" style="width: 50px;">(A)</td>
            //                                 <td>enthält glutenhaltiges Getreide</td>
            //                             </tr>
            // <tr>
            //   <td class="text-center" style="width: 50px;">
            //   <img src="https://sw-muenster-spl24.maxmanager.xyz/assets/icons/A.png?v=1" style="height:20px" alt="Piktogramm Alkohol" title="Piktogramm Alkohol">
            //   </td>
            //   <td>Alkohol</td>
            // </tr>
            legendeContent.find('table.table.table-sm tbody tr').each((index, element) => {
                // the external identifier is either the text in parentheses or if an image is present the image filename
                const codeElement = $(element).find('td').first();
                let externalIdentifier: string | undefined = undefined;
                const codeText = codeElement.text().trim();
                const codeMatch = codeText.match(/\(([^)]+)\)/);
                if(codeMatch && codeMatch.length > 1){
                    externalIdentifier = codeMatch[1] || undefined;
                } else {
                    // check for img element
                    const imgElement = codeElement.find('img');
                    if(imgElement && imgElement.length > 0) {
                        const imgSrc = imgElement.attr('src');
                        if(imgSrc){
                            // get filename without extension
                            const imgFilename = imgSrc.split('/').pop() || "";
                            externalIdentifier = imgFilename;
                        }
                    }
                }
                if(!externalIdentifier || externalIdentifier?.length === 0){
                    console.error("MaxManagerConnector: getMarkingsJSONList: externalIdentifier is null. Skip this marking.");
                    return;
                }

                const descriptionElement = $(element).find('td').last();

                const description = descriptionElement.text().trim();

                // external image if codeElement contains img
                const imgElement = $(element).find('img');
                let image_remote_url = null;
                if(imgElement && imgElement.length > 0) {
                    const imgSrc = imgElement.attr('src');
                    if(imgSrc){
                        image_remote_url = imgSrc;
                    }
                }

                if(externalIdentifier.length > 0){
                    let translations: TranslationsFromParsingType = {};
                    translations[TranslationHelper.LANGUAGE_CODE_DE] = {
                        [MarkingTranslationFields.TRANSLATION_FIELD_NAME]: description,
                    };

                    const marking: MarkingsTypeForParser = {
                        external_identifier: externalIdentifier,
                        image_remote_url: image_remote_url,
                        translations: translations,
                        excluded_by_markings: []
                    }
                    markingsList.push(marking);
                }
            });

        }

        return markingsList;
    }

    shouldCreateNewMarkingsWhenTheyDoNotExistYet(): boolean {
        return this.config.shouldCreateNewMarkingsWhenTheyDoNotExistYet || false;
    }

}
