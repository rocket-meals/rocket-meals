import {MarkingParserInterface, MarkingsTypeForParser} from "./MarkingParserInterface";
import {CSVExportParser} from "./CSVExportParser";
import {TranslationHelper, TranslationsFromParsingType} from "../helpers/TranslationHelper";
import {ApiContext} from "../helpers/ApiContext";
import {SystemFileHelper} from "../helpers/SystemFileHelper";

const FIELD_MARKING_TRANSLATION_NAME = "name"

export class MarkingTL1Parser implements MarkingParserInterface {

    private path_to_tl1_export: string;
    private encoding: BufferEncoding;
    private parsedReport: {[p: string]: string}[];
    // @ts-ignore
    private apiContext: ApiContext

    constructor(apiContext: ApiContext, path_to_tl1_marking_export: string, encoding: BufferEncoding) {
        this.apiContext = apiContext
        this.parsedReport = [];
        this.path_to_tl1_export = path_to_tl1_marking_export;
        this.encoding = encoding;
    }

    async createNeededData(){
        this.parsedReport = [];
        let rawExport = await this.getRawReport();
        this.parsedReport = CSVExportParser.getListOfLineObjects(rawExport, CSVExportParser.NEW_LINE_DELIMITER, CSVExportParser.INLINE_DELIMITER_SEMICOLON, true);
    }

    async getRawReport(): Promise<string | undefined> {
        return SystemFileHelper.readFileSync(this.path_to_tl1_export, this.encoding);
    }

    async getMarkingsJSONList(): Promise<MarkingsTypeForParser[]> {
        let markings: MarkingsTypeForParser[] = [];
        for (let i = 0; i < this.parsedReport.length; i++){
            let parsedLineObject = this.parsedReport[i];
            if(!!parsedLineObject){
                let marking = MarkingTL1Parser.getMarkingJSONFromRawMarking(parsedLineObject);
                if(!!marking){
                    markings.push(marking);
                }
            }
        }
        return markings;
    }

    private static getMarkingJSONFromRawMarking(rawMarking: { [p: string]: string }): MarkingsTypeForParser | null {
        let id = rawMarking["ID"];
        let name = rawMarking["BESCHREIBUNG"];
        // @ts-ignore
        let hint = rawMarking["HINWEISE"];
        let short = rawMarking["KUERZEL"];

        let external_identifier = MarkingTL1Parser.getMarkingExternalIdentifier(id, short);
        if (!external_identifier){
            console.log("MarkingTL1Parser: getMarkingJSONFromRawMarking: externalIdentifier is null. Skip this marking.")
            console.log("MarkingTL1Parser: getMarkingJSONFromRawMarking: rawMarking: "+JSON.stringify(rawMarking, null, 2))
            return null;
        }

        let translations: TranslationsFromParsingType = {};
        if (name){
            let nameDe = MarkingTL1Parser.getMarkingNameDe(name);
            if(nameDe){
                translations[TranslationHelper.LANGUAGE_CODE_DE] = {[FIELD_MARKING_TRANSLATION_NAME]: nameDe};
            }
            let nameEn = MarkingTL1Parser.getMarkingNameEn(name);
            if(nameEn){
                translations[TranslationHelper.LANGUAGE_CODE_EN] = {[FIELD_MARKING_TRANSLATION_NAME]: nameEn};
            }
        }

        let marking: MarkingsTypeForParser = {
            external_identifier: external_identifier,
            alias: name,
            translations: translations
        }

        return marking;

    }

    private static getMarkingNameDe(name: string | undefined): string | undefined{
        /**
         *          " 104";"Gesund&Munter";"";"m"
         *          " 100";"nachhaltige Fischerei / sustainable fishery";"";"f"
         */

        // check if name is empty string then return undefined
        if (!name || name.trim() === ""){
            return undefined;
        }

        // check if name has a slash then return the part before the slash without leading and trailing spaces
        let slashIndex = name.indexOf("/");
        if (slashIndex > -1){
            return name.substring(0, slashIndex).trim();
        } else {
            return name.trim();
        }
    }

    private static getMarkingNameEn(name: string | undefined): string | undefined{
        /**
         *          " 104";"Gesund&Munter";"";"m"
         *          " 100";"nachhaltige Fischerei / sustainable fishery";"";"f"
         */

        // check if name is empty string then return undefined
        if (!name || name.trim() === ""){
            return undefined;
        }

        // check if name has a slash then return the part after the slash without leading and trailing spaces
        let slashIndex = name.indexOf("/");
        if (slashIndex > -1){
            return name.substring(slashIndex+1).trim();
        } else {
            return undefined;
        }
    }

    private static getMarkingExternalIdentifier(id: string | undefined, short: string | undefined): string | null{
        // Hannover Mail to Mister Wiebesiek 15.05.2024 um 03:51 Uhr. Confirm the following:
        // The external identifier is, the short or if the short is empty the id without leading spaces and leading zeros.
        // id e.g. " 103" -> "103" or " 098" -> "98"
        // short e.g. "kt" -> "kt"
        let externalIdentifier = null
        if (short){
            externalIdentifier = short;
        } else if (id){
            externalIdentifier = id.trim();
            // check for leading zeros
            externalIdentifier = externalIdentifier.replace(/^0+/, '');
        }
        return externalIdentifier;
    }

}
