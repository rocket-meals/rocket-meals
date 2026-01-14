import {CheerioAPI, load} from 'cheerio';
import {
  FoodofferDateType,
  FoodoffersTypeForParser,
  FoodofferTypeWithBasicData,
  FoodParseFoodAttributeValueType
} from '../FoodParserInterface';
import {MarkingsTypeForParser} from '../MarkingParserInterface';
import {LanguageCodes} from 'repo-depkit-common';
import {MarkingTranslationFields} from '../MarkingTranslationFields';

export class FoodWebParserAachenParseHtml {
  public static getMarkingsJSONListFromWebHtml(rawReport: string | Buffer | undefined): MarkingsTypeForParser[] {
    const html = rawReport?.toString();
    if (!html) {
      return [];
    }
    const $ = load(html);
    const rawMarkings: MarkingsTypeForParser[] = [];

    // find <div id="additives">
    const additivesDiv = $('#additives');
    if (!additivesDiv.length) {
      return rawMarkings;
    }

    /**
     * <div id="additives">
     *     <p>mit (1) Farbstoff, (2) Konservierungsstoff, (3) Antioxidationsmittel, (4) Geschmacksverstärker, (5) geschwefelt, (6) geschwärzt, (7) gewachst, (8) Phosphat, (9) Süßungsmittel, (10) enthält eine Phenylalaninquelle, enthält (A) Gluten, (A1) Weizen, (A2) Roggen, (A3) Gerste, (A4) Hafer, (A5) Dinkel, (B) Sellerie, (C) Krebstiere, (D) Eier, (E) Fische, (F) Erdnüsse, (G) Sojabohnen, (H) Milch, (I) Schalenfrüchte, (I1) Mandeln, (I2) Haselnüsse, (I3) Walnüsse, (I4) Kaschunüsse, (I5) Pecannüsse, (I6) Paranüsse, (I7) Pistazien, (I8) Macadamianüsse, (J) Senf, (K) Sesamsamen, (L) Schwefeldioxid oder Sulfite, (M) Lupinen, (N) Weichtiere</p>
     * </div>
     */

    const paragraph = additivesDiv.find('p').first();
    if (!paragraph.length) {
      return rawMarkings;
    }

    const paragraphText = paragraph.text().trim();
    // extract all codes and descriptions from the paragraph text
    const regex = /\(([^)]+)\)\s*([^,(]+)/g;
    let match;
    while ((match = regex.exec(paragraphText)) !== null) {
      const code = match[1]!.trim(); // e.g. "A", "A1", "1"
      const description = match[2]!.trim(); // e.g. "Gluten", "Weizen", "Farbstoff"

      if (code && description) {
        const marking: MarkingsTypeForParser = {
          external_identifier: code,
          alias: description,
          translations: {
            [LanguageCodes.DE]: {
              [MarkingTranslationFields.TRANSLATION_FIELD_NAME]: description,
            },
          },
          excluded_by_markings: [],
        };
        rawMarkings.push(marking);
      }
    }
    return rawMarkings;
  }

  public static getRawFoodofferJSONListFromWebHtml(rawReport: string | Buffer | undefined, canteenName: string, filterDuplicatedOffersPerCanteen: boolean): FoodoffersTypeForParser[] {
    const html = rawReport?.toString();
    if (!html) {
      return [];
    }

    const $ = load(html);
    const rawFoodoffers: FoodoffersTypeForParser[] = [];

    // The HTML groups days in <div class="accordion"> with several <div class="preventBreak"> blocks.
    // Each block contains an <h3> with the date text and a following panel div containing a table.menues with rows for each offering.
    const accordion = $('.accordion');
    if (!accordion.length) {
      return rawFoodoffers;
    }

    accordion.find('div.preventBreak').each((dayIndex: number, dayElem: any) => {
      const dayRoot = $(dayElem);
      const headerText = dayRoot.find('h3 a').first().text().trim(); // e.g. "Montag, 03.11.2025"

      const dateObj = FoodWebParserAachenParseHtml.parseDateFromHeader(headerText);
      if (!dateObj) {
        return; // skip if we cannot parse date
      }

      // find all rows in table.menues for this day
      dayRoot.find('table.menues tbody tr').each((rowIndex: number, rowElem: any) => {
        const tr = $(rowElem);

        const foodoffer = FoodWebParserAachenParseHtml.createRawFoodofferFromRow($, tr, {
          dayIndex,
          rowIndex,
          dateObj,
          canteenName,
        });

        if (foodoffer) {
          rawFoodoffers.push(foodoffer);
        }
      });
    });

    if(filterDuplicatedOffersPerCanteen) {
        // filter duplicated offers per canteen based on food_id
        const uniqueOffersMap: Map<string, FoodoffersTypeForParser> = new Map();
        for(const offer of rawFoodoffers) {
            const key = offer.food_id
            if(!uniqueOffersMap.has(key)) {
                uniqueOffersMap.set(key, offer);
            }
        }
        return Array.from(uniqueOffersMap.values());
    } else {
      return rawFoodoffers;
    }
  }

  private static createRawFoodofferFromRow($: CheerioAPI, tr: any, context: { dayIndex: number; rowIndex: number; dateObj: Date; canteenName: string }): FoodoffersTypeForParser | null {
    // category text
    const category = tr.find('.menue-item.menue-category').first().text().trim() || null;

    // name/description: remove <sup> elements to get readable alias
    const descElem = tr.find('.menue-item.menue-desc .expand-nutr').first();
    if (!descElem.length) {
      return null;
    }

    // collect supers (additives/allergens) from all sup elements inside the desc
    const supTexts: string[] = [];
    descElem.find('sup').each((i: number, s: any) => {
      const t = $(s).text();
      if (t) {
        let cleaned = FoodWebParserAachenParseHtml.cleanSubText(t);
        supTexts.push(cleaned);
      }
    });

    // Extract individual codes like 'A', 'A1', 'B' from the collected sup texts.
    const extractedCodes: string[] = supTexts
      .map(t => t.replace(/\u00A0/g, ' '))
      .map(t => t.replace(/^[+]/, ''))
      .flatMap(t => t.split(/[,|\/]+/))
      .flatMap(t => t.split(/\s+/))
      .map((s: string) => s.replace(/[^A-Za-z0-9]/g, '').trim())
      .filter((s: string) => s.length > 0);

    // create readable alias by cloning and removing sup tags
    let alias = descElem.clone().children('sup').remove().end().text().replace(/^[+]/, '').trim();
    // alias "Kürbis-Erbsen-Eintopf mit Curry   | Fladenbrot"
    // split by '|', trim parts, and join with ' | '
    const aliasParts = alias.split('|').map((part: string) => part.trim());
    alias = aliasParts.join(' | ');

    if(alias == "Geschlossen") {  // skip closed food categories
        // Happend at 03.11.2025 for Mensa Academica
        return null;
    }

    // price
    const priceText = tr.find('.menue-item.menue-price').first().text().trim();
    let priceStudent: number | null = null;
    if (priceText) {
      // price may contain euro symbol and comma as decimal separator
      const normalized = priceText
        .replace(/\u0000/g, '')
        .replace('€', '')
        .replace(/[^0-9,\.]/g, '')
        .trim();
      const withDot = normalized.replace(',', '.');
      const parsed = parseFloat(withDot);
      if (!isNaN(parsed)) {
        priceStudent = parsed;
      }
    }

    // markings from tr.classes (e.g. vegan, OLV, Schwein, Geflügel etc.) excluding ignored ones
    //    const classAttr = (tr.attr && tr.attr('class')) ? tr.attr('class') : '';
    //    const classMarkings = (classAttr || '')
    //      .toString()
    //      .split(/\s+/)
    //      .map((c: string) => c.trim())
    //      .filter((c: string) => c && !IGNORED_ROW_CLASSES.has(c));
    //
    //    // additionally add menu_line_<category> and combine all markings into a set
    //    const markingExternalIdentifiers = new Set<string>();
    //    // add class-based markings (e.g. vegan, OLV, Geflügel)
    //    classMarkings.forEach((m: string) => markingExternalIdentifiers.add(m));
    //    // add extracted sup codes (e.g. A, A1, B)
    //    extractedCodes.forEach((code: string) => markingExternalIdentifiers.add(code));
    //    // add a menu-line category marker
    //    if (category) {
    //      markingExternalIdentifiers.add('menu_line_' + category);
    //    }
    // markingExternalIdentifiers: only take codes from <sup> tags, split by comma
    const markingExternalIdentifiers = new Set<string>();
    // each sup may contain comma-separated codes like "A,A1" or single codes; we already normalized them into extractedCodes
    extractedCodes.forEach((code: string) => markingExternalIdentifiers.add(code));

    const basicFoodofferData: FoodofferTypeWithBasicData = {
      alias: alias || null,
      price_employee: priceStudent,
      price_guest: priceStudent,
      price_student: priceStudent,
      foodoffer_components: []
    };

    const attibute_values: FoodParseFoodAttributeValueType[] = [];

    const date: FoodofferDateType = {
      year: context.dateObj.getFullYear(),
      month: context.dateObj.getMonth() + 1,
      day: context.dateObj.getDate(),
    };

    const marking_external_identifiers = Array.from(markingExternalIdentifiers);

    return {
      basicFoodofferData: basicFoodofferData,
      attribute_values: attibute_values,
      marking_external_identifiers: marking_external_identifiers,
      category_external_identifier: category,
      date: date,
      canteen_external_identifier: context.canteenName,
      food_id: FoodWebParserAachenParseHtml.generateRecipeId(basicFoodofferData, markingExternalIdentifiers),
    };
  }

  private static cleanSubText(text: string): string {
    // remove "Preis ohne Pfand" and similar suffixes
    return text.replace(/Preis ohne Pfand.*$/i, '').trim();
  }

  private static parseDateFromHeader(headerText: string): Date | null {
    // expecting strings like "Montag, 03.11.2025" or "03.11.2025"
    const match = headerText.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
    if (!match) {
      return null;
    }
    const day = parseInt(match[1]!, 10);
    const month = parseInt(match[2]!, 10);
    const year = parseInt(match[3]!, 10);
    return new Date(year, month - 1, day);
  }

  private static generateRecipeId(basicFoodofferData: FoodofferTypeWithBasicData, markingExternalIdentifiers: Set<string>): string {
    // hash alias + sorted markings
    const aliasPart = basicFoodofferData.alias ? basicFoodofferData.alias.toLowerCase().replace(/\s+/g, '_') : 'no_alias';
    const markingsPart = Array.from(markingExternalIdentifiers).sort().join('_');
    let id = `recipe_`;
    id += `${aliasPart}`;
    let involveMarkings = false;
    if (involveMarkings) {
      id += `__${markingsPart}`;
    }
    return id;
  }
}
