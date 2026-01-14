import { PrimaryKey } from '@directus/types';
import { CollectionNames, DatabaseTypes, LanguageCodes, LanguageCodesType } from 'repo-depkit-common';

import { MyDatabaseHelper } from './MyDatabaseHelper';

const FIELD_TRANSLATION_LANGUAGE_CODE = 'languages_code'; // TODO Import from directus-extension-auto-translation package the field name
const FIELD_LANGUAGE_ID = 'code'; // TODO Import from directus-extension-auto-translation package the field name

export type ExistingTranslation = {
  be_source_for_translations?: boolean | null;
  id: PrimaryKey;
  languages_code?: string | DatabaseTypes.Languages | null;
  let_be_translated?: boolean | null;
  [key: string]: any;
};
type NewTranslationForCreation = Omit<ExistingTranslation, 'id'>;

export type TranslationBaseFields = {
  be_source_for_translations?: boolean | null;
  let_be_translated?: boolean | null;
};
export type TranslationDynamicFields = {
  [key: string]: string | boolean | null;
};
export type TranslationFields = TranslationBaseFields & TranslationDynamicFields;

export type TranslationsFromParsingType = {
  [key in LanguageCodesType]?: TranslationFields;
};

export type ItemWithExistingTranslations = {
  id: PrimaryKey;
  translations: ExistingTranslation[];
};

export const NonRelationFieldsArrayFieldId = 'id';
const NonRelationFieldsArray = [NonRelationFieldsArrayFieldId, 'be_source_for_translations', 'let_be_translated', 'languages_code', 'translation_settings'] as const;

type NonRelationFields = (typeof NonRelationFieldsArray)[number];

export type TranslationRelationField<E> = Exclude<keyof E, NonRelationFields> & string;

export class TranslationHelper {
  static LANGUAGE_CODE_DE: LanguageCodesType = LanguageCodes.DE;
  static LANGUAGE_CODE_EN: LanguageCodesType = LanguageCodes.EN;

  static DefaultLanguage = TranslationHelper.LANGUAGE_CODE_DE;
  static FallBackLanguage = TranslationHelper.LANGUAGE_CODE_EN;

  static getTranslation(translationsList: ExistingTranslation[], profileLanguage: string, fieldName: string) {
    translationsList = translationsList || [];
    let translation = translationsList.find(t => t.languages_code === profileLanguage);
    let translationDefault = translationsList.find(t => t.languages_code === TranslationHelper.DefaultLanguage);
    let translationFallBack = translationsList.find(t => t.languages_code === TranslationHelper.FallBackLanguage);
    return translation?.[fieldName] || translationDefault?.[fieldName] || translationFallBack?.[fieldName];
  }

  static hasSignificantTranslationChange<E extends Record<string, any>>(existingTranslation: E, translationFromParsing: Partial<E>): boolean {
    for (const key in existingTranslation) {
      if (!existingTranslation.hasOwnProperty(key)) continue;

      // Skip keys that are in NonRelationFields
      if (NonRelationFieldsArray.includes(key as NonRelationFields)) {
        continue;
      }

      // Check if the key is present in translationFromParsing and if the values differ
      if (key in translationFromParsing && existingTranslation[key] !== translationFromParsing[key]) {
        return true;
      }
    }
    return false;
  }

  static async updateItemTranslationsForItemWithTranslationsFetched<
    T extends ItemWithExistingTranslations, // T must have an id and translations field
    E extends ExistingTranslation, // the collection of the related translations
  >(
    itemWithTranslations: T, // the item we want to update the translations for
    translationsFromParsing: TranslationsFromParsingType, // the translations we got from the parser
    items_primary_field_in_translation_table: TranslationRelationField<E>, // the primary field (to our item) in the translation table, e.g. "food_id" when translating foods
    itemsTablename: CollectionNames, // the name of the table of our item
    myDatabaseHelper: MyDatabaseHelper
  ) {
    const specificItemServiceReader = await myDatabaseHelper.getItemsServiceHelper<T>(itemsTablename);
    if (!!itemWithTranslations) {
      const { updateObject: updateObject, updateNeeded: updateNeeded } = await TranslationHelper._getUpdateInformationForTranslations(itemWithTranslations, itemWithTranslations, translationsFromParsing, items_primary_field_in_translation_table);

      if (updateNeeded) {
        //const createTranslations = updateObject.translations.create;
        //const updateTranslations = updateObject.translations.update;
        //const deleteTranslations = updateObject.translations.delete;
        // @ts-ignore
        //console.log("Update Translations for item with id: " + item?.id+ " - alias: "+item?.alias);
        //console.log("Update Translations: create (" + createTranslations.length + "), update (" + updateTranslations.length + "), delete (" + deleteTranslations.length + ")");
        //console.log("createTranslations: "+JSON.stringify(createTranslations, null, 2));
        //console.log("updateTranslations: "+JSON.stringify(updateTranslations, null, 2));
        //console.log("deleteTranslations: "+JSON.stringify(deleteTranslations, null, 2));
        //console.log(JSON.stringify(updateObject, null, 2));

        await specificItemServiceReader.updateOne(itemWithTranslations?.id, {
          id: itemWithTranslations?.id,
          ...updateObject,
        });
      }
    }
  }

  static FIELD_FOR_TRANSLATION_FETCHING = 'translations.*';
  static QUERY_FIELDS_FOR_ALL_FIELDS_AND_FOR_TRANSLATION_FETCHING = {
    fields: ['*', TranslationHelper.FIELD_FOR_TRANSLATION_FETCHING],
  };

  /**
   * Updates the translations for a specific item.
   *
   * **Warning:** This function is resource-intensive and includes a bottleneck
   * during the item fetching phase. It takes approximately 1 second on average.
   * Consider using alternative methods if possible for better performance.
   * Prefer using `updateItemTranslationsForItemWithTranslationsFetched`
   * if you already have the item's data with translations fetched, as it avoids the
   * performance bottleneck.
   *
   * @deprecated This function has a known bottleneck and is slow. Avoid using it unless necessary.
   */
  static async updateItemTranslations<
    T extends ItemWithExistingTranslations, // T must have an id and translations field
    E extends ExistingTranslation, // the collection of the related translations
  >(
    item: T, // the item we want to update the translations for
    translationsFromParsing: TranslationsFromParsingType, // the translations we got from the parser
    items_primary_field_in_translation_table: TranslationRelationField<E>, // the primary field (to our item) in the translation table, e.g. "food_id" when translating foods
    itemsTablename: CollectionNames, // the name of the table of our item
    myDatabaseHelper: MyDatabaseHelper
  ) {
    const specificItemServiceReader = await myDatabaseHelper.getItemsServiceHelper<T>(itemsTablename);
    let itemWithTranslations = await specificItemServiceReader.readOne(item?.id, {
      ...TranslationHelper.QUERY_FIELDS_FOR_ALL_FIELDS_AND_FOR_TRANSLATION_FETCHING,
    }); // Bottleneck HERE. Takes on average 1.0s
    return TranslationHelper.updateItemTranslationsForItemWithTranslationsFetched(itemWithTranslations, translationsFromParsing, items_primary_field_in_translation_table, itemsTablename, myDatabaseHelper);
  }

  static async _getUpdateInformationForTranslations<
    T extends ItemWithExistingTranslations, // T must have an id and translations field
    E extends ExistingTranslation, // the collection of the related translations
  >(
    itemWithTranslations: T, // the item we want to update the translations for
    item: T, // the item we want to update the translations for
    translationsFromParsing: TranslationsFromParsingType, // the translations we got from the parser
    items_primary_field_in_translation_table: TranslationRelationField<E> // the primary field (to our item) in the translation table, e.g. "food_id" when translating foods
  ) {
    /** translationsFromParsing is an object with the following structure:
         {
         [LanguageCodes.DE]: {
         name: "...",
         description: "...",
         ... (other fields)
         ... (be_source_for_translations, let_be_translated)
         }
         }
         */
    let remaining_translationsFromParsing = JSON.parse(JSON.stringify(translationsFromParsing)); //make a work copy
    /** remaining_translationsFromParsing is an object with the following structure:
         {
         [TranslationHelper.]: {name ....},
         [TranslationHelper.]: {....}
         }
         */
    let createTranslations: NewTranslationForCreation[] = [];
    let updateTranslations: ExistingTranslation[] = [];
    let deleteTranslations: ExistingTranslation[] = [];

    let existingTranslations = itemWithTranslations?.translations || [];

    let existingTranslationsDifferentFromParsing = false;
    let newTranslationsFromParsing = false;

    // find the existing language which is source for translations
    let defaultLanguageCodeForSourceTranslation: LanguageCodesType = TranslationHelper.LANGUAGE_CODE_DE;
    let usedLanguageCodeForSourceTranslation: LanguageCodesType = defaultLanguageCodeForSourceTranslation;
    for (let existingTranslation of existingTranslations) {
      if (existingTranslation?.be_source_for_translations) {
        if (!existingTranslation?.languages_code || typeof existingTranslation?.languages_code !== 'string') {
          // if the language code is not a string, we use the default language code
        } else {
          usedLanguageCodeForSourceTranslation = existingTranslation?.languages_code as LanguageCodesType;
        }
      }
    }

    for (let existingTranslation of existingTranslations) {
      //check all existing translations
      let existingLanguageCode = existingTranslation?.[FIELD_TRANSLATION_LANGUAGE_CODE];
      if (!existingLanguageCode || typeof existingLanguageCode !== 'string') {
        continue;
      }
      const existingLanguageCodeAsString = existingLanguageCode as LanguageCodesType;

      const translationFromParsing = translationsFromParsing[existingLanguageCodeAsString];
      if (!!translationFromParsing) {
        //we also got a translation from the parse
        /* Update translation */
        const translationFromParsingCopy = JSON.parse(JSON.stringify(translationFromParsing)); //make a copy
        delete remaining_translationsFromParsing[existingLanguageCode]; // dont create a new translation for this language

        if (TranslationHelper.hasSignificantTranslationChange(existingTranslation, translationFromParsingCopy)) {
          existingTranslationsDifferentFromParsing = true;
          //console.log("existingTranslation is different from parsing")
          //console.log("existingTranslation: "+JSON.stringify(existingTranslation, null, 2))
          //console.log("translationFromParsing: "+JSON.stringify(translationFromParsingCopy, null, 2))

          // be_source_for_translations if language Code is German
          let be_source_for_translations: boolean = false;
          if (existingLanguageCode === usedLanguageCodeForSourceTranslation) {
            be_source_for_translations = true;
          }

          updateTranslations.push({
            id: existingTranslation?.id,
            let_be_translated: false, // if we have a translation from the parser, we do not need to translate it
            be_source_for_translations: be_source_for_translations,
            ...translationFromParsingCopy,
            [FIELD_TRANSLATION_LANGUAGE_CODE]: {
              [FIELD_LANGUAGE_ID]: existingLanguageCode,
            },
          });
        } else {
          //translation is the same, do nothing
          //console.log("translation is the same, do nothing")
        }
      } else {
        //the parser dont provide a translation, we should delete it?
        //TODO check if translation was generated or manually typed
        delete remaining_translationsFromParsing[existingLanguageCode]; // dont create a new translation for this language
      }
    }
    //check remaining translationsFromParsing, then put into createTranslations
    let remaining_languageKeys = Object.keys(remaining_translationsFromParsing);
    for (let i = 0; i < remaining_languageKeys?.length; i++) {
      let remaining_languageKey = remaining_languageKeys[i] as LanguageCodesType | undefined;
      if (!!remaining_languageKey) {
        let translationFromParsing = translationsFromParsing[remaining_languageKey];
        if (!!translationFromParsing) {
          newTranslationsFromParsing = true;

          // be_source_for_translations if language Code is German
          let be_source_for_translations: boolean = false;
          if (remaining_languageKey === TranslationHelper.LANGUAGE_CODE_DE) {
            be_source_for_translations = true;
          }

          createTranslations.push({
            [items_primary_field_in_translation_table]: item?.id,
            be_source_for_translations: be_source_for_translations,
            let_be_translated: false, // if we have a translation from the parser, we dont need to translate it
            ...translationFromParsing,
            [FIELD_TRANSLATION_LANGUAGE_CODE]: {
              [FIELD_LANGUAGE_ID]: remaining_languageKey,
            },
          });
        }
      }
    }

    let updateObject = {
      translations: {
        create: createTranslations,
        update: updateTranslations,
        delete: deleteTranslations,
      },
    };

    let updateNeeded = existingTranslationsDifferentFromParsing || newTranslationsFromParsing;

    return {
      updateObject: updateObject,
      updateNeeded: updateNeeded,
    };
  }
}
