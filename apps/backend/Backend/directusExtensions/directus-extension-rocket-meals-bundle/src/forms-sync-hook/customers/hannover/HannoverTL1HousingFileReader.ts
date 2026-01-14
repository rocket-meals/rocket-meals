import fs, { readFileSync } from 'fs';
import chardet from 'chardet';
import { CSVExportParser } from '../../../food-sync-hook/CSVExportParser';
import { HashHelper } from '../../../helpers/HashHelper';
import iconv from 'iconv-lite';
import { WorkflowRunLogger } from '../../../workflows-runs-hook/WorkflowRunJobInterface';
import { DateHelper, DateHelperTimezone, FormCommonHelper, StringHelper } from 'repo-depkit-common';

// VONUMMER: Haus-Wohnung-Wohnungsnummer
// 420-01-05-51-6
// 420 kostenstelle K sicheralle
// 51-6 Zimmer nummer
// B2-7

// "420";"Karl-Wiechert-Allee";197312;"Kabulova";"Aigerim";"420-01-05-51-6";01.10.2024;31.05.2025;28.02.2025;"+77056202001";"aigerimkabulova.b@gmail.com"
// "420";"Karl-Wiechert-Allee";197312;"Kabulova";"Aigerim";"420-01-05-51-7";01.10.2024;31.05.2025;28.02.2025;"+77056202001";"aigerimkabulova.b@gmail.com"
// Hier gibt es Dubletten: Herr Kabulova, hat

// MIETERNUMMER Eindeutig
// VONUMMER Eindeutig
// MIETBEGINN Eindeutig

export enum ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS {
  WOHNUNGSNUMMER = 'WHNR', // Wohnungsnummer
  WOHNUNGSNAME = 'WHNAME', // Wohnungsname
  VERWALTUNGSOBJEKT_NUMMER = 'VONUMMER', // Verwaltungsobjekt Nummer
  MIETER_PERSONENNUMMER = 'PERSONNR', // Mieter Personennummer
  MIETER_PERSON_NACHNAME = 'NAME', // Mieter Nachname
  MIETER_PERSON_VORNAME = 'VORNAME', // Mieter Vorname
  MIETER_MIETBEGINN = 'MIETBEGINN', // Mieter Mietbeginn
  MIETER_MIETENDE = 'MIETENDE', // Mieter Mietende
  MIETER_AUSZUGSDATUM = 'AUSZUG', // Mieter Auszugsdatum
  MIETER_TELEFON_MOBILE = 'TELEFONMOBIL', // Mieter Telefon Mobil
  MIETER_EMAIL = 'EMAIL', // Mieter Email
  VERFUEGBARAB = 'VERFUEGBARAB', // Verfügbar ab
  ZIMMERNR = 'ZIMMERNR', // Zimmernummer
  WOHNHEIM_EMAIL = 'WH_EMAIL', // Wohnheim Email
  GEBURTSDATUM = 'GEBURTSDATUM', // Geburtsdatum
  BANKVERBINDUNG = 'BANKVERBINDUNG', // Bankverbindung
  ADRESSE_HEIMAT = 'ADRESSE_HEIMAT', // Adresse Heimat
  ADRESSE_NEU = 'ADRESSE_NEU', // Adresse neu
}

// Define the type for ImportHousingContract
export type ImportHousingContract = {
  [key in ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS]: string | null; // Use string | null to allow for missing values
};

export type ImportHousingContracts = ImportHousingContract[];

export enum HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS {
  WOHNUNGSNUMMER = 'WHNR', // Wohnungsnummer
  WOHNUNGSNAME = 'WHNAME', // Wohnungsname
  VERWALTUNGSOBJEKT_NUMMER = 'VONUMMER', // Verwaltungsobjekt Nummer
  MIETER_PERSONENNUMMER = 'PERSONNR', // Mieter Personennummer
  MIETER_PERSON_NACHNAME = 'NAME', // Mieter Nachname
  MIETER_PERSON_VORNAME = 'VORNAME', // Mieter Vorname
  MIETER_MIETBEGINN = 'MIETBEGINN', // Mieter Mietbeginn
  MIETER_MIETENDE = 'MIETENDE', // Mieter Mietende
  MIETER_AUSZUGSDATUM = 'AUSZUG', // Mieter Auszugsdatum
  MIETER_TELEFON_MOBILE = 'TELEFONMOBIL', // Mieter Telefon Mobil
  MIETER_EMAIL = 'EMAIL', // Mieter Email
  VERFUEGBARAB = 'VERFUEGBARAB', // Verfügbar ab
  ZIMMERNR = 'ZIMMERNR', // Zimmernummer
  GEBURTSDATUM = 'GEBURTSDATUM', // Geburtsdatum
  BANKVERBINDUNG = 'BANKVERBINDUNG', // Bankverbindung
  ADRESSE_HEIMAT_LAND = 'Land Heimat',
  ADRESSE_HEIMAT_PLZ = 'PLZ Heimat', // Adresse Heimat PLZ
  ADRESSE_HEIMAT_STADT = 'Ort Heimat', // Adresse Heimat Stad
  ADRESSE_HEIMAT_STRASSE = 'Straße Heimat', // Adresse Heimat Straße
  ADRESSE_NEU_LAND = 'Land neue Anschrift',
  ADRESSE_NEU_PLZ = 'PLZ neue Anschrift', // Adresse neu PLZ
  ADRESSE_NEU_STADT = 'Ort neue Anschrift', // Adresse neu Stadt
  ADRESSE_NEU_STRASSE = 'Straße neue Anschrift', // Adresse neu Straße
}

const HOUSING_CONTRACT_FIELDS_FOR_ID: ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS[] = [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.VERWALTUNGSOBJEKT_NUMMER, ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_PERSONENNUMMER, ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_MIETBEGINN].sort((a, b) => a.localeCompare(b)); // sort the keys to ensure the order is always the same, so even when the order of the fields defined above changes, the id stays the same

// Define the type for ImportHousingContract
export type Tl1ImportHousingContract = {
  [key in HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS]: string;
};

export type Tl1ImportHousingContracts = Tl1ImportHousingContract[];

export interface HannoverHousingFileReaderInterface {
  readData(): Promise<ImportHousingContracts>;
  getHousingContractInternalCustomId(housingContract: ImportHousingContract): string | null; // returns a unique identifier for the housing contract; null if not possible and a field is missing
  getAlias(housingContract: ImportHousingContract): string | null; // returns a unique identifier for the housing contract; null if not possible and a field is missing
  getResultHash(TL1ImportHousingContracts: ImportHousingContracts): string;
}

export class HannoverTL1HousingFileReader implements HannoverHousingFileReaderInterface {
  private readonly path_to_file: string;
  private logger?: WorkflowRunLogger;

  constructor(path_to_file: string) {
    this.path_to_file = path_to_file;
  }

  async readData(logger?: WorkflowRunLogger): Promise<ImportHousingContracts> {
    this.logger = logger;
    if (logger) {
      await logger.appendLog('Reading data');
    }

    // check if file exists
    const fileExists = fs.existsSync(this.path_to_file);
    if (!fileExists) {
      if (logger) {
        await logger.appendLog('No file existing to read from');
      }
      return [];
    }

    let encoding = chardet.detect(fs.readFileSync(this.path_to_file));
    //console.log("Encoding detected: ", encoding);
    if (logger) {
      await logger.appendLog('Reading data from: ' + this.path_to_file);
    }

    if (!encoding) {
      throw new Error('Could not detect encoding');
    } else {
      encoding = encoding.toLowerCase();
      if (logger) {
        await logger.appendLog('Detected encoding: ' + encoding);
      }
    }

    let rawReport = '';
    try {
      const rawBuffer = readFileSync(this.path_to_file);

      // iconv-lite supports many encodings, including 'win1252' and 'iso-8859-1'
      // Normalize encoding name for iconv-lite
      const normalizedEncoding = StringHelper.replaceAllWithOptions({
        str: encoding.toLowerCase(),
        find: '_',
        replace: '-',
      });

      if (iconv.encodingExists(normalizedEncoding)) {
        rawReport = iconv.decode(rawBuffer, normalizedEncoding);
      } else {
        throw new Error('Unsupported encoding: ' + normalizedEncoding);
      }
    } catch (error: any) {
      if (logger) {
        // print the error message
        await logger.appendLog('Error reading file: ' + error.message);
        // print the error stack
        await logger.appendLog(error.toString());
        await logger.appendLog('Cannot read file, please check the file format and encoding');
      }
      throw new Error('Error reading file: ' + error.message);
    }

    if (logger) {
      await logger.appendLog('File read successfully, now parsing');
    }

    let jsonListFromCsvString = CSVExportParser.getListOfLineObjects(rawReport, {
      newLineDelimiter: CSVExportParser.NEW_LINE_DELIMITER,
      inlineDelimiter: CSVExportParser.INLINE_DELIMITER_SEMICOLON,
      removeTailoringQuotes: true,
    });
    let tl1ImportHousingContracts: Tl1ImportHousingContracts = jsonListFromCsvString as Tl1ImportHousingContracts;

    if (logger) {
      await logger.appendLog('CSV parsed successfully, now correcting date values');
    }

    let result: ImportHousingContracts = [];

    for (let i = 0; i < tl1ImportHousingContracts.length; i++) {
      if (logger) {
        await logger.appendLog('Correcting date values for housing contract from line ' + (i + 1) + ' of ' + result.length);
      }
      let tl1HousingContract = tl1ImportHousingContracts[i];
      if (tl1HousingContract) {
        result[i] = await this.parseTl1ImportElementToImportHousingContract(tl1HousingContract);
      }
    }

    return result;
  }

  /**
    export enum ROCKET_MEALS_HOUSING_CONTRACT_FORM_FIELDS {
    WOHNUNGSNUMMER = "WHNR", // Wohnungsnummer
    WOHNUNGSNAME = "WHNAME", // Wohnungsname
    VERWALTUNGSOBJEKT_NUMMER = "VONUMMER", // Verwaltungsobjekt Nummer
    MIETER_PERSONENNUMMER = "PERSONNR", // Mieter Personennummer
    MIETER_PERSON_NACHNAME = "NAME", // Mieter Nachname
    MIETER_PERSON_VORNAME = "VORNAME", // Mieter Vorname
    MIETER_MIETBEGINN = "MIETBEGINN", // Mieter Mietbeginn
    MIETER_MIETENDE = "MIETENDE", // Mieter Mietende
    MIETER_AUSZUGSDATUM = "AUSZUG", // Mieter Auszugsdatum
    MIETER_TELEFON_MOBILE = "TELEFONMOBIL", // Mieter Telefon Mobil
    MIETER_EMAIL = "EMAIL", // Mieter Email
    VERFUEGBARAB = "VERFUEGBARAB", // Verfügbar ab
    ZIMMERNR = "ZIMMERNR", // Zimmernummer
    WOHNHEIM_EMAIL = "WH_EMAIL", // Wohnheim Email
    GEBURTSDATUM = "GEBURTSDATUM", // Geburtsdatum
    BANKVERBINDUNG = "BANKVERBINDUNG", // Bankverbindung
    ADRESSE_HEIMAT = "ADRESSE_HEIMAT", // Adresse Heimat
    ADRESSE_NEU = "ADRESSE_NEU", // Adresse neu
}
        */

  private async parseTl1ImportElementToImportHousingContract(housingContract: Tl1ImportHousingContract): Promise<ImportHousingContract> {
    let result: ImportHousingContract = {
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.WOHNUNGSNUMMER]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.WOHNUNGSNUMMER),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.WOHNUNGSNAME]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.WOHNUNGSNAME),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.VERWALTUNGSOBJEKT_NUMMER]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.VERWALTUNGSOBJEKT_NUMMER),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_PERSONENNUMMER]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.MIETER_PERSONENNUMMER),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_PERSON_NACHNAME]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.MIETER_PERSON_NACHNAME),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_PERSON_VORNAME]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.MIETER_PERSON_VORNAME),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_MIETBEGINN]: this.getDateValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.MIETER_MIETBEGINN),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_MIETENDE]: this.getDateValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.MIETER_MIETENDE),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_AUSZUGSDATUM]: this.getDateValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.MIETER_AUSZUGSDATUM),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_TELEFON_MOBILE]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.MIETER_TELEFON_MOBILE),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_EMAIL]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.MIETER_EMAIL),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.VERFUEGBARAB]: this.getDateValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.VERFUEGBARAB),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.ZIMMERNR]: this.getZimmernummer(housingContract),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.WOHNHEIM_EMAIL]: this.getWohnheimEmail(housingContract),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.GEBURTSDATUM]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.GEBURTSDATUM),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.BANKVERBINDUNG]: this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.BANKVERBINDUNG),
      // Adresse Heimat
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.ADRESSE_HEIMAT]: this.getAdresseHeimat(housingContract),
      [ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.ADRESSE_NEU]: this.getAdresseNeu(housingContract),
    };

    return result;
  }

  private getAdresseHeimat(housingContract: Tl1ImportHousingContract): string | null {
    let land = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ADRESSE_HEIMAT_LAND);
    let plz = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ADRESSE_HEIMAT_PLZ);
    let stadt = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ADRESSE_HEIMAT_STADT);
    let strasse = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ADRESSE_HEIMAT_STRASSE);

    return this.combineAddressValues(land, plz, stadt, strasse);
  }

  private getAdresseNeu(housingContract: Tl1ImportHousingContract): string | null {
    let land = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ADRESSE_NEU_LAND);
    let plz = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ADRESSE_NEU_PLZ);
    let stadt = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ADRESSE_NEU_STADT);
    let strasse = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ADRESSE_NEU_STRASSE);

    return this.combineAddressValues(land, plz, stadt, strasse);
  }

  private combineAddressValues(land: string | null, plz: string | null, stadt: string | null, strasse: string | null): string | null {
    let unknownValue = '???'; // in the export file, if a value is not set, it is set to "???", so we use this as a placeholder for missing values only for adresses
    if (land === unknownValue) {
      land = '';
    }
    if (plz === unknownValue) {
      plz = '';
    }
    if (stadt === unknownValue) {
      stadt = '';
    }
    if (strasse === unknownValue) {
      strasse = '';
    }
    // if all values are empty, return null
    if (!land && !plz && !stadt && !strasse) {
      return null;
    }
    return `${land}, ${plz} ${stadt}, ${strasse}`.trim();
  }

  private getValue(housingContract: Tl1ImportHousingContract, field: HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS): string | null {
    let value = housingContract[field];
    if (!value) {
      return null;
    }
    return value;
  }

  private getZimmernummer(housingContract: Tl1ImportHousingContract): string | null {
    // Mail mit Wiebesiek 16.05.2025 - 15:17
    // e.G. "21-3" -> "213"
    let zimmernummer = housingContract[HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.ZIMMERNR];
    if (zimmernummer) {
      zimmernummer = StringHelper.replaceAllWithOptions({
        str: zimmernummer,
        find: '-',
        replace: '',
      });
      return zimmernummer;
    } else {
      return null;
    }
  }

  getResultHash(importHousingContracts: ImportHousingContracts): string {
    return HashHelper.hashFromObject(importHousingContracts);
  }

  private getDateValue(housingContract: Tl1ImportHousingContract, field: HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS): string | null {
    let value = housingContract[field];
    if (value) {
      let date = DateHelper.formatDDMMYYYYToDateWithTimeZone(value, DateHelperTimezone.GERMANY);
      return date.toISOString();
    } else {
      return null;
    }
  }

  /**
   * email address for the given housing contract.
   * Mail: Martin Gertz: 15.05.2025
   * @private
   */
  private static readonly WOHNHEIM_NUMMER_TO_EMAIL: Record<string, string> = {
    'Bischofsholer Damm': 'whl-bida@studentenwerk-hannover.de',
    Hufelandstraße: 'WHL-Hu@studentenwerk-hannover.de',
    Jägerstraße: 'whl-jae@studentenwerk-hannover.de',
    'Am Georgengarten': 'whl-ge@studentenwerk-hannover.de',
    Schneiderberg: 'WHL-Sn@studentenwerk-hannover.de',
    Dorotheenstraße: 'whl-do@studentenwerk-hannover.de',
    'Internationales Quartier': 'whl-do@studentenwerk-hannover.de', // gleiche Mail wie Dorotheenstraße
    'MHH-Wohnhäuser': 'whl-mhh@studentenwerk-hannover.de',
    'Haus Am Berggarten': 'WHL-Hal@studentenwerk-hannover.de',
    'Callinstraße 25': 'whl-ca@studentenwerk-hannover.de',
    'Callinstraße 18': 'whl-ca@studentenwerk-hannover.de', // gleiche Mail wie Callinstraße 25
    'Karl-Wiechert-Allee': 'WHL-Kawi@studentenwerk-hannover.de',
    Nobelring: 'WHL-No@studentenwerk-hannover.de',
    'Ritter-Brüning-Straße': 'whl-rbs@studentenwerk-hannover.de',
    'Studentenwohnhaus Klaus Bahlsen': 'WHL-SKB@studentenwerk-hannover.de',
    Emdenstraße: 'WHL-Em@studentenwerk-hannover.de',
    Garbsen: 'whl-ga@studentenwerk-hannover.de',
    Heidjerhof: 'WHL-Heidjer@studentenwerk-hannover.de',
    'Am Papehof': 'WHL-pa@studentenwerk-hannover.de',
    Menschingstr: 'WHL-me@studentenwerk-hannover.de',
  };

  private getWohnheimEmail(housingContract: Tl1ImportHousingContract): string {
    let wohnheimName = this.getValue(housingContract, HANNOVER_TL1_EXTERNAL_HOUSING_CONTRACT_FIELDS.WOHNUNGSNAME);
    if (!wohnheimName) {
      return '';
    }

    //console.log("Getting wohnheim email for wohnheimname: ", wohnheimName);
    let wohnheimEmail = HannoverTL1HousingFileReader.WOHNHEIM_NUMMER_TO_EMAIL[wohnheimName];
    if (!wohnheimEmail) {
      //console.log("No email found for wohnheimname: ", wohnheimName);
      return '';
    } else {
      //console.log("Found email for wohnheimname: ", wohnheimName, " -> ", wohnheimEmail);
      return wohnheimEmail;
    }
  }

  getAlias(housingContract: ImportHousingContract): string {
    let FOLDER_SEPERATOR = FormCommonHelper.FORM_VISUAL_FOLDER_SEPARATOR;

    let partialIds: (string | null)[] = [];

    let wohnheimname = housingContract[ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.WOHNUNGSNAME];
    partialIds.push(wohnheimname);

    let mietendeRaw = housingContract[ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_MIETENDE];
    let mietende: string | null = null;
    if (mietendeRaw) {
      let date = new Date(mietendeRaw);
      mietende = DateHelper.getHumanReadableDate(date, false);
    }

    let nachname = housingContract[ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_PERSON_NACHNAME];


    let dateAndMieter = mietende + '-' + nachname;

    // Include tenant number (MIETER_PERSONENNUMMER) in the alias if present
    let mieternummer = housingContract[ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_PERSONENNUMMER];
    if (mieternummer) {
      // append the tenant number to make aliases more specific
      dateAndMieter += `${dateAndMieter} - ${ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS.MIETER_PERSONENNUMMER}: ${mieternummer}`;
    }
    partialIds.push(dateAndMieter);

    // if any partial id is missing, return id
    let allPartialIdsDefined = true;
    for (let partialId of partialIds) {
      if (!allPartialIdsDefined) {
        break;
      }
      if (!partialId) {
        allPartialIdsDefined = false;
      }
    }

    if (allPartialIdsDefined) {
      return partialIds.join(FOLDER_SEPERATOR);
    } else {
      let id = this.getHousingContractInternalCustomId(housingContract);
      return id || '';
    }
  }

  private getPartialExternalId(housingContract: ImportHousingContract, field: ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS): string | null {
    let value = housingContract[field];
    if (!value) {
      return null;
    }
    return `${field}_${housingContract[field]}`;
  }

  static isValueRequiredNotEmpty(field: ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS): boolean {
    // if field is in composite id, it is required
    if (HOUSING_CONTRACT_FIELDS_FOR_ID.includes(field)) {
      return true;
    }
    return false;
  }

  public static getSortedKeysForHousingContractCompositeId(): ROCKET_MEALS_HANNOVER_HOUSING_CONTRACT_FORM_FIELDS[] {
    let sortedKeysForHousingContractCompositeId = HOUSING_CONTRACT_FIELDS_FOR_ID.sort((a, b) => a.localeCompare(b));
    return sortedKeysForHousingContractCompositeId;
  }

  getHousingContractInternalCustomId(housingContract: ImportHousingContract): string | null {
    let partialIds: (string | null)[] = [];

    let sortedKeysForHousingContractCompositeId = HannoverTL1HousingFileReader.getSortedKeysForHousingContractCompositeId();
    for (let partialKey of sortedKeysForHousingContractCompositeId) {
      let partialId = this.getPartialExternalId(housingContract, partialKey);
      if (!partialId) {
        return null;
      }
      partialIds.push(partialId);
    }

    return partialIds.join('-');
  }
}
