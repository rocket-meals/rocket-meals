import { Translator } from './Translator';
import { TranslatorSettings } from './TranslatorSettings';
import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { SchemaOverview } from '@directus/types';
import {SchemaHelper} from "../helpers/SchemaHelper";

export interface TranslationContext {
  schema: SchemaOverview;
  collectionName: string;
  translation_field: string;
}

export class DirectusCollectionTranslator {
  static FIELD_BE_SOURCE_FOR_TRANSLATION = 'be_source_for_translations';
  static FIELD_LET_BE_TRANSLATED = 'let_be_translated';

  static FIELD_LANGUAGES_IDS_NEW = 'languages_id';
  static FIELD_LANGUAGES_CODE_OLD = 'languages_code';
  static FIELD_LANGUAGES_ID_OR_CODE: undefined | string = undefined;

  static COLLECTION_LANGUAGES = CollectionNames.LANGUAGES;

  /**
   * We only need to translate if there are translations to translate
   * Therefore check if there are new translations to create
   * or if there are translations to update
   */
  static areTranslationsToTranslate(payload: any, translation_field: string) {
    //console.log("Are Translations to Translate?");
    //console.log("Payload: ");
    //console.log(JSON.stringify(payload, null, 2));
    if (!!payload && !!payload[translation_field]) {
      let newTranslationsActions = payload?.[translation_field] || {};
      let newTranslationsCreateActions = newTranslationsActions?.create || [];
      let newTranslationsUpdateActions = newTranslationsActions?.update || [];
      return newTranslationsCreateActions.length > 0 || newTranslationsUpdateActions.length > 0;
    }
    return false;
  }

  static getSourceTranslationFromTranslations(translations: any, context: TranslationContext) {
    if (!!translations && translations.length > 0) {
      for (let translation of translations) {
        let let_be_source_for_translation = DirectusCollectionTranslator.getValueFromPayloadOrDefaultValue(translation, DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION, context);
        if (!!let_be_source_for_translation) {
          return translation;
        }
      }
    }
  }

  static getSourceTranslationFromListsOfTranslations(listsOfTranslations: any, context: TranslationContext) {
    if (!!listsOfTranslations && listsOfTranslations.length > 0) {
      for (let i = 0; i < listsOfTranslations.length; i++) {
        let translations = listsOfTranslations[i];
        let sourceTranslation = DirectusCollectionTranslator.getSourceTranslationFromTranslations(translations, context);
        if (!!sourceTranslation) {
          return sourceTranslation;
        }
      }
    }
    return null;
  }

  /**
   * This is due to a change from languages_code to languages_ids newer than directus 9.20.1 (or mayer much newer like 10)
   * therefore we identify which field is used and set it accordingly
   * @param translation
   */
  static setFIELD_LANGUAGES_ID_OR_CODE(translation: any): string | undefined {
    const translationFieldOld = translation?.[DirectusCollectionTranslator.FIELD_LANGUAGES_CODE_OLD];
    if (!!translationFieldOld) {
      DirectusCollectionTranslator.FIELD_LANGUAGES_ID_OR_CODE = DirectusCollectionTranslator.FIELD_LANGUAGES_CODE_OLD;
      return DirectusCollectionTranslator.FIELD_LANGUAGES_CODE_OLD;
    }
    const translationFieldNew = translation?.[DirectusCollectionTranslator.FIELD_LANGUAGES_IDS_NEW];
    if (!!translationFieldNew) {
      DirectusCollectionTranslator.FIELD_LANGUAGES_ID_OR_CODE = DirectusCollectionTranslator.FIELD_LANGUAGES_IDS_NEW;
      return DirectusCollectionTranslator.FIELD_LANGUAGES_IDS_NEW;
    }
    return undefined;
  }

  static parseTranslationListToLanguagesCodeDict(translations: any) {
    let languagesCodeDict: any = {};
    for (let translation of translations) {
      let FIELD_LANGUAGES_ID_OR_CODE = DirectusCollectionTranslator.setFIELD_LANGUAGES_ID_OR_CODE(translation);
      if (!!FIELD_LANGUAGES_ID_OR_CODE) {
        languagesCodeDict[translation?.[FIELD_LANGUAGES_ID_OR_CODE]?.code] = translation;
      }
    }
    return languagesCodeDict;
  }

  static async modifyPayloadForTranslation(currentItem: any, payload: any, translator: Translator, translatorSettings: TranslatorSettings, myDatabaseHelper: MyDatabaseHelper, collectionName: string, translation_field: string) {
    //console.log("Modify Payload for Translation");
    //console.log("translation_field: ", translation_field);

    if (DirectusCollectionTranslator.areTranslationsToTranslate(payload, translation_field)) {
      //console.log("There are translations to translate");
      let workPayload = JSON.parse(JSON.stringify(payload));

      const schema = await myDatabaseHelper.getSchema();
      const context: TranslationContext = { schema, collectionName, translation_field };

      /**
              workPayload either:
              {
                "translations": {
                  "create": [],
                  "update": [
                    {
                      "description": "Okay was geht ab?",
                      "languages_id": {
                        "code": "de-DE"
                      },
                      "id": 1
                    }
                  ],
                  "delete": []
                }
              }
             */
      /**
       * In a singleton
       * Payload:
       * {
       *   "housing_translations": {
       *     "create": [],
       *     "update": [
       *       {
       *         "be_source_for_translations": true,
       *         "languages_code": {
       *           "code": "de-DE"
       *         },
       *         "id": 1,
       *         "content": "Das ist ein Singleton Test!"
       *       }
       *     ],
       *     "delete": []
       *   }
       * }
       */

      //console.log("currentItem: ");
      //console.log(JSON.stringify(currentItem, null, 2));

      let currentTranslations = currentItem?.[translation_field] || []; //need to know, if we need to update old translations or create them

      //console.log("currentTranslations: ");
      //console.log(JSON.stringify(currentTranslations, null, 2));

      /**
             currentTranslations
             [
               {
                 "id": 1,
                 "test_id": 1,
                 "languages_id": "de-DE",
                 "be_source_for_translation": true,
                 "let_be_translated": true,
                 "create_translations_for_all_languages": true,
                 "description": "Okay was geht ab?"
               },
               {
                 "id": 2,
                 "test_id": 1,
                 "languages_id": "ar-SA",
                 "be_source_for_translation": false,
                 "let_be_translated": true,
                 "create_translations_for_all_languages": true,
                 "description": null
               }
             ]
             */

      let existingTranslations: any = {};
      //console.log("Fill existingTranslations");
      for (let translation of currentTranslations) {
        //console.log("Check translation: ");
        //console.log(JSON.stringify(translation, null, 2));
        let FIELD_LANGUAGES_ID_OR_CODE = DirectusCollectionTranslator.setFIELD_LANGUAGES_ID_OR_CODE(translation);
        //console.log("DirectusCollectionTranslator.FIELD_LANGUAGES_ID_OR_CODE: ", DirectusCollectionTranslator.FIELD_LANGUAGES_ID_OR_CODE);
        if (!!FIELD_LANGUAGES_ID_OR_CODE) {
          existingTranslations[translation?.[FIELD_LANGUAGES_ID_OR_CODE]] = translation;
        }
      }

      //console.log("existingTranslations: ");
      //console.log(JSON.stringify(existingTranslations, null, 2));

      let newTranslationsActions = workPayload?.[translation_field] || {};
      let newTranslationsCreateActions = newTranslationsActions?.create || [];
      let newTranslationsUpdateActions = newTranslationsActions?.update || [];

      let newTranslationsCreateLanguageDict = DirectusCollectionTranslator.parseTranslationListToLanguagesCodeDict(newTranslationsCreateActions);
      let newTranslationsUpdateLanguageDict = DirectusCollectionTranslator.parseTranslationListToLanguagesCodeDict(newTranslationsUpdateActions);

      let sourceTranslationInExistingItem = DirectusCollectionTranslator.getSourceTranslationFromListsOfTranslations([currentTranslations], context);
      let sourceTranslationInPayload = DirectusCollectionTranslator.getSourceTranslationFromListsOfTranslations([newTranslationsCreateActions, newTranslationsUpdateActions], context);

      let sourceTranslation = sourceTranslationInPayload || sourceTranslationInExistingItem;
      /**
       * From Singleton
       * sourceTranslation:
       * {
       *   "be_source_for_translations": true,
       *   "languages_code": {
       *     "code": "de-DE"
       *   },
       *   "id": 1,
       *   "content": "Das ist ein Singleton Test!"
       * }
       *
       * From normal collection
       * {
       *   "title": "Hallo Freunde",
       *   "languages_code": {
       *     "code": "de-DE"
       *   },
       *   "id": 1
       * }
       */

      //TODO Maybe throw an error if multiple source translations are found?

      if (sourceTranslation) {
        // we should always have a source translation, since we checked if there are update or create translations
        let FIELD_LANGUAGES_ID_OR_CODE = DirectusCollectionTranslator.setFIELD_LANGUAGES_ID_OR_CODE(sourceTranslation);
        let sourceTranslationLanguageCode: any = undefined;
        if (!!FIELD_LANGUAGES_ID_OR_CODE) {
          sourceTranslationLanguageCode = sourceTranslation?.[FIELD_LANGUAGES_ID_OR_CODE]?.code;
        }
        //console.log("sourceTranslationLanguageCode: ", sourceTranslationLanguageCode);

        let languagesService = myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.Languages>(DirectusCollectionTranslator.COLLECTION_LANGUAGES);
        let languages = await languagesService.readByQuery({});
        if (languages.length > 0 && !!FIELD_LANGUAGES_ID_OR_CODE) {
          let translationsToCreate = [];
          let translationsToUpdate = [];
          let translationsToDelete: any[] = [];

          let fieldsToTranslate = DirectusCollectionTranslator.getFieldsToTranslate(context);
          // fieldsToTranslate:  [ 'content', 'title' ]

          for (let language of languages) {
            let language_code = language?.code;
            //console.log("--------");
            //console.log("Check for language_code: ", language_code);

            let existingTranslation = existingTranslations[language_code];
            let isSourceTranslation = language_code === sourceTranslationLanguageCode;

            if (!!existingTranslation) {
              // we have an existing translation, so we need to update it
              /**
               * UPDATE
               */
              //console.log("There is an existingTranslation");
              if (isSourceTranslation) {
                //console.log("Its the source translation, we just pass it through");
                //TODO set be_source_for_translation to false
                translationsToUpdate.push({
                  ...sourceTranslation,
                });
              } else {
                //console.log("Its not the source translation, we need to check if it needs to be updated");
                let translationInPayload = newTranslationsUpdateLanguageDict[language_code];

                //check if in the payload the user has given the field "let_be_translated" and overwrite the existing value if it exists
                let letBeTranslatedInExistingTranslation = existingTranslation?.[DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED];
                //console.log("The existing translation has the field let_be_translated: ", letBeTranslatedInExistingTranslation);
                let createTranslation = letBeTranslatedInExistingTranslation;
                let letBeTranslatedInPayload = DirectusCollectionTranslator.getValueFromPayloadOrDefaultValue(translationInPayload, DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED, context);
                //console.log("The translation in the payload has the field let_be_translated: ", letBeTranslatedInPayload);
                if (DirectusCollectionTranslator.isValueDefined(letBeTranslatedInPayload)) {
                  //if payload has false or true, overwrite existing value
                  createTranslation = letBeTranslatedInPayload;
                }
                //console.log("The translation in the payload will be created: ", createTranslation);

                if (!!createTranslation) {
                  //console.log("Update translation");
                  //console.log("language_code: ", language_code);
                  //console.log("fieldsToTranslate: ", fieldsToTranslate);
                  //console.log("sourceTranslation: ");
                  //console.log(JSON.stringify(sourceTranslation, null, 2));

                  let translatedItem = await DirectusCollectionTranslator.translateTranslationItem(sourceTranslation, language_code, translator, translatorSettings, fieldsToTranslate, FIELD_LANGUAGES_ID_OR_CODE);
                  //console.log("translatedItem: ");
                  //console.log(JSON.stringify(translatedItem, null, 2));
                  translationsToUpdate.push({
                    ...existingTranslation,
                    ...translatedItem,
                  });
                } else if (!!translationInPayload) {
                  //The user has given a payload but dont want it to be translated
                  //console.log("Use the given payload")
                  translationsToUpdate.push({
                    ...translationInPayload,
                    [DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION]: false, //but we dont want it to be the source translation anymore
                  });
                } else {
                  //console.log("No payload given for this language");
                }
              }
            } else {
              /**
               * CREATE
               */
              //console.log("No existingTranslation");
              if (isSourceTranslation) {
                //TODO set be_source_for_translation to false
                //console.log("Its the source translation, we just pass it through");
                translationsToCreate.push({
                  ...sourceTranslation,
                  [DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED]: DirectusCollectionTranslator.getValueFromPayloadOrDefaultValue(sourceTranslation, DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED, context),
                  [DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION]: true,
                });
              } else {
                //console.log("Its not the source translation, we need to check if it needs to be created");
                //If we dont have an existing translation and the permission to all languages is set
                let translationInPayload = newTranslationsCreateLanguageDict[language_code];

                //console.log("translationInPayload: ");
                //console.log(translationInPayload);
                let letBeTranslatedInPayload = DirectusCollectionTranslator.getValueFromPayloadOrDefaultValue(translationInPayload, DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED, context);
                let letBeTranslated = true; //only if the user explicitly set it to false, we dont create the translation, otherwise on undefined we create it
                //console.log("letBeTranslatedInPayload", letBeTranslatedInPayload);
                if (DirectusCollectionTranslator.isValueDefined(letBeTranslatedInPayload)) {
                  //if payload has false or true, overwrite existing value
                  //console.log("letBeTranslatedInPayload is defined");
                  letBeTranslated = letBeTranslatedInPayload;
                }

                //console.log("language_code: ", language_code);
                //console.log("letBeTranslated: ", letBeTranslated);
                if (letBeTranslated) {
                  //console.log("Create translation");
                  let translatedItem = await DirectusCollectionTranslator.translateTranslationItem(sourceTranslation, language?.code, translator, translatorSettings, fieldsToTranslate, FIELD_LANGUAGES_ID_OR_CODE);
                  //console.log("translatedItem: ");
                  //console.log(JSON.stringify(translatedItem, null, 2));
                  translationsToCreate.push({
                    ...translatedItem,
                  });
                } else if (!!translationInPayload) {
                  //The user has given a payload but dont want it to be translated
                  //console.log("Use the given payload")
                  translationsToCreate.push({
                    ...translationInPayload,
                    [DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION]: false, //but we dont want it to be the source translation
                  });
                } else {
                  //console.log("No payload given for this language");
                }
              }
            }
          }

          payload[translation_field] = {
            create: translationsToCreate,
            update: translationsToUpdate,
            delete: translationsToDelete,
          };
          return payload; //We musst alter the payload reference !
        }
      }
    }
    return payload; //return does not matter
  }

  static isValueDefined(value: any) {
    return value !== undefined && value !== null;
  }

  static getValueFromPayloadOrDefaultValue(payloadItem: any, fieldName: string, context: TranslationContext) {
    let translationCollectionSchema = DirectusCollectionTranslator.getTranslationCollectionSchema(context);

    let valueInPayload = payloadItem?.[fieldName];
    if (DirectusCollectionTranslator.isValueDefined(valueInPayload)) {
      //if payload has false or true, overwrite existing value
      return valueInPayload;
    } else {
      //nothing found? use the default value
      let defaultValue = translationCollectionSchema?.fields?.[fieldName]?.defaultValue;
      return defaultValue;
    }
  }

  static async translateTranslationItem(sourceTranslation: any, language_code: string, translator: Translator, translatorSettings: TranslatorSettings, fieldsToTranslate: string[], FIELD_LANGUAGES_ID_OR_CODE: string) {
    let translatedItem: any = {};
    if (!!fieldsToTranslate && fieldsToTranslate.length > 0) {
      for (let field of fieldsToTranslate) {
        let fieldValue = sourceTranslation[field];
        if (!!fieldValue) {
          try {
            let translatedValue = await translator.translate(fieldValue, sourceTranslation?.[FIELD_LANGUAGES_ID_OR_CODE]?.code, language_code);
            if (!!translatedValue) {
              translatedItem[field] = translatedValue;
            } else {
              //TODO: check if this would ever happen
            }
          } catch (err) {
            //TODO: error handling?
            console.log(err);
          }
        }
      }
    }

    translatedItem[FIELD_LANGUAGES_ID_OR_CODE] = {
      code: language_code,
    };
    translatedItem[DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED] = true; //if we create a translation, we want it in the future also
    translatedItem[DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION] = false; //if translated it wont be the source translation anymore
    return translatedItem;
  }

  static getTranslationCollectionName(context: TranslationContext): string | null {
    const { schema, collectionName, translation_field } = context;
    //console.log("Get Translation Collection Name for collection: ", collectionName);
    //console.log("translation_field: ", translation_field);

    let relations = schema?.relations || [];

    for (let relation of relations) {
      /**
             {
             "collection": "wikis_translations",
             "field": "wikis_id",
             "related_collection": "wikis",
             ...
             }
             */
      if (relation?.related_collection === collectionName) {
        /**
         * relationToCollection:
         * {
         *       "collection": "app_settings_housing_translations",   // <--- This is the translation collection
         *       "field": "app_settings_id",
         *       "related_collection": "app_settings",
         *       "schema": {
         *         "constraint_name": "app_settings_housing_translations_app_settings_id_foreign",
         *         "table": "app_settings_housing_translations",
         *         "column": "app_settings_id",
         *         "foreign_key_schema": "public",
         *         "foreign_key_table": "app_settings",
         *         "foreign_key_column": "id",
         *         "on_update": "NO ACTION",
         *         "on_delete": "CASCADE"
         *       },
         *       "meta": {
         *         "id": 9,
         *         "many_collection": "app_settings_housing_translations",
         *         "many_field": "app_settings_id",
         *         "one_collection": "app_settings",           // <--- This is the collection
         *         "one_field": "housing_translations",       // <--- This is the translation field
         *         "one_collection_field": null,
         *         "one_allowed_collections": null,
         *         "junction_field": "languages_code",
         *         "sort_field": null,
         *         "one_deselect_action": "delete"
         *       }
         *     },
         */
        const meta = relation?.meta;
        const metaOneCollection = meta?.one_collection;
        const metaOneField = meta?.one_field;
        const collectionOfTranslation = relation?.collection;
        if (metaOneCollection === collectionName && metaOneField === translation_field) {
          return collectionOfTranslation;
        }
      }
    }

    return null;
  }

  static getSchemaForCollection(schema: SchemaOverview, collectionName: string) {
    return SchemaHelper.getSchemaForCollection(schema, collectionName);
  }

  static getTranslationCollectionSchema(context: TranslationContext) {
    let translationCollectionName = DirectusCollectionTranslator.getTranslationCollectionName(context);
    if (!translationCollectionName) {
      return null;
    }
    let collectionInformations = DirectusCollectionTranslator.getSchemaForCollection(context.schema, translationCollectionName);
    return collectionInformations;
  }

  /**
   * Gets a list of all fields that are translatable
   * Only watches for text and string
   * Ignores the primary key field
   * Ignores fields that are relations
   */
  static getFieldsToTranslate(context: TranslationContext) {
    /**
     * Get Fields to Translate for collection:  news
     * translationCollectionName:  news_translations
     * collectionFields:  [
     *   'be_source_for_translations',
     *   'content',
     *   'id',
     *   'languages_code',
     *   'let_be_translated',
     *   'news_id',
     *   'title'
     * ]
     */
    let translationCollectionInformations = DirectusCollectionTranslator.getTranslationCollectionSchema(context);
    let collectionFieldsInformationsDict = translationCollectionInformations?.fields || {};

    let collectionFields = Object.keys(collectionFieldsInformationsDict);

    let primaryFieldKey = translationCollectionInformations?.primary || 'id'; //we need to know the primary field key

    let fieldsToTranslateDict: any = {};
    for (let field of collectionFields) {
      if (field !== primaryFieldKey) {
        //we dont translate the primary field
        let fieldsInformation = collectionFieldsInformationsDict[field];
        /**"
                 "content": {
                    "type": "text",
                    ...
                },
                 },
                 "title": {
                    "type": "string",
                    ...
                 */
        //we only translate fields of type string and text
        //TODO: check if there are more field types
        if (fieldsInformation?.type === 'text' || fieldsInformation?.type === 'string') {
          fieldsToTranslateDict[field] = true;
        }
      }
    }

    //We should now remove all relations fields
    let relations = context.schema?.relations || [];
    let translationRelations = [];
    for (let relation of relations) {
      /**
             {
                    "collection": "wikis_translations",
                    "field": "wikis_id",
                    "related_collection": "wikis",
                    ...
                }
             */
      delete fieldsToTranslateDict[relation?.field]; //we dont translate the relation field
    }

    let fieldsToTranslate = Object.keys(fieldsToTranslateDict);
    return fieldsToTranslate;
  }
}
