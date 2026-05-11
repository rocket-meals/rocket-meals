import { Translator } from './Translator';
import { TranslatorSettings } from './TranslatorSettings';
import { CollectionNames, DatabaseTypes } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { SchemaOverview } from '@directus/types';
import {SchemaHelper} from "../helpers/SchemaHelper";

export type TranslationSchemaContext = {
  schema: SchemaOverview;
  collectionName: string;
  translation_field: string;
};

export type TranslationEntryOptions = {
  isSourceTranslation: boolean;
  sourceTranslation: any;
  language_code: string;
  translator: Translator;
  translatorSettings: TranslatorSettings;
  fieldsToTranslate: string[];
  FIELD_LANGUAGES_ID_OR_CODE: string;
  context: TranslationSchemaContext;
};

export class DirectusCollectionTranslator {
  static readonly FIELD_BE_SOURCE_FOR_TRANSLATION = 'be_source_for_translations';
  static readonly FIELD_LET_BE_TRANSLATED = 'let_be_translated';

  static readonly FIELD_LANGUAGES_ID_OR_CODE_NEW = 'languages_id';
  static readonly FIELD_LANGUAGES_CODE_OLD = 'languages_code';

  static readonly COLLECTION_LANGUAGES = CollectionNames.LANGUAGES;

  /**
   * We only need to translate if there are translations to translate
   * Therefore check if there are new translations to create
   * or if there are translations to update
   */
  static areTranslationsToTranslate(payload: any, translation_field: string) {
    if (payload?.[translation_field]) {
      let newTranslationsActions = payload?.[translation_field] || {};
      let newTranslationsCreateActions = newTranslationsActions?.create || [];
      let newTranslationsUpdateActions = newTranslationsActions?.update || [];
      return newTranslationsCreateActions.length > 0 || newTranslationsUpdateActions.length > 0;
    }
    return false;
  }

  static getSourceTranslationFromTranslations(translations: any, context: TranslationSchemaContext) {
    if (translations && translations.length > 0) {
      for (const translation of translations) {
        const let_be_source_for_translation = DirectusCollectionTranslator.getValueFromPayloadOrDefaultValue(translation, DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION, context);
        if (let_be_source_for_translation) {
          return translation;
        }
      }
    }
  }

  static getSourceTranslationFromListsOfTranslations(listsOfTranslations: any, context: TranslationSchemaContext) {
    if (listsOfTranslations && listsOfTranslations.length > 0) {
      for (const translations of listsOfTranslations) {
        const sourceTranslation = DirectusCollectionTranslator.getSourceTranslationFromTranslations(translations, context);
        if (sourceTranslation) {
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
  static detectLanguagesIdOrCodeField(translation: any): string | undefined {
    const translationFieldOld = translation?.[DirectusCollectionTranslator.FIELD_LANGUAGES_CODE_OLD];
    if (translationFieldOld) {
      return DirectusCollectionTranslator.FIELD_LANGUAGES_CODE_OLD;
    }
    const translationFieldNew = translation?.[DirectusCollectionTranslator.FIELD_LANGUAGES_ID_OR_CODE_NEW];
    if (translationFieldNew) {
      return DirectusCollectionTranslator.FIELD_LANGUAGES_ID_OR_CODE_NEW;
    }
    return undefined;
  }

  static parseTranslationListToLanguagesCodeDict(translations: any) {
    let languagesCodeDict: any = {};
    for (let translation of translations) {
      const FIELD_LANGUAGES_ID_OR_CODE = DirectusCollectionTranslator.detectLanguagesIdOrCodeField(translation);
      if (FIELD_LANGUAGES_ID_OR_CODE) {
        languagesCodeDict[translation?.[FIELD_LANGUAGES_ID_OR_CODE]?.code] = translation;
      }
    }
    return languagesCodeDict;
  }

  static async modifyPayloadForTranslation(currentItem: any, payload: any, translator: Translator, translatorSettings: TranslatorSettings, myDatabaseHelper: MyDatabaseHelper, collectionName: string, translation_field: string) {
    if (!DirectusCollectionTranslator.areTranslationsToTranslate(payload, translation_field)) {
      return payload;
    }

    const workPayload = JSON.parse(JSON.stringify(payload));
    const schema = await myDatabaseHelper.getSchema();
    const context: TranslationSchemaContext = { schema, collectionName, translation_field };

    const currentTranslations = currentItem?.[translation_field] || [];
    const existingTranslations = DirectusCollectionTranslator.buildExistingTranslationsMap(currentTranslations);

    const newTranslationsActions = workPayload?.[translation_field] || {};
    const newTranslationsCreateActions = newTranslationsActions?.create || [];
    const newTranslationsUpdateActions = newTranslationsActions?.update || [];

    const newTranslationsCreateLanguageDict = DirectusCollectionTranslator.parseTranslationListToLanguagesCodeDict(newTranslationsCreateActions);
    const newTranslationsUpdateLanguageDict = DirectusCollectionTranslator.parseTranslationListToLanguagesCodeDict(newTranslationsUpdateActions);

    const sourceTranslationInPayload = DirectusCollectionTranslator.getSourceTranslationFromListsOfTranslations([newTranslationsCreateActions, newTranslationsUpdateActions], context);
    const sourceTranslationInExistingItem = DirectusCollectionTranslator.getSourceTranslationFromListsOfTranslations([currentTranslations], context);
    const sourceTranslation = sourceTranslationInPayload || sourceTranslationInExistingItem;

    if (!sourceTranslation) {
      return payload;
    }

    const FIELD_LANGUAGES_ID_OR_CODE = DirectusCollectionTranslator.detectLanguagesIdOrCodeField(sourceTranslation);
    if (!FIELD_LANGUAGES_ID_OR_CODE) {
      return payload;
    }

    const sourceTranslationLanguageCode = sourceTranslation?.[FIELD_LANGUAGES_ID_OR_CODE]?.code;

    const languagesService = myDatabaseHelper.getItemsServiceHelper<DatabaseTypes.Languages>(DirectusCollectionTranslator.COLLECTION_LANGUAGES);
    const languages = await languagesService.readByQuery({});
    if (languages.length === 0) {
      return payload;
    }

    const fieldsToTranslate = DirectusCollectionTranslator.getFieldsToTranslate(context);
    const translationsToCreate = [];
    const translationsToUpdate = [];
    const translationsToDelete: any[] = [];

    for (const language of languages) {
      const language_code = language?.code;
      const existingTranslation = existingTranslations[language_code];
      const isSourceTranslation = language_code === sourceTranslationLanguageCode;

      const entryOptions: TranslationEntryOptions = {
        isSourceTranslation,
        sourceTranslation,
        language_code,
        translator,
        translatorSettings,
        fieldsToTranslate,
        FIELD_LANGUAGES_ID_OR_CODE,
        context,
      };

      if (existingTranslation) {
        const updateEntry = await DirectusCollectionTranslator.buildUpdateEntry(
          entryOptions, existingTranslation, newTranslationsUpdateLanguageDict
        );
        if (updateEntry) {
          translationsToUpdate.push(updateEntry);
        }
      } else {
        const createEntry = await DirectusCollectionTranslator.buildCreateEntry(
          entryOptions, newTranslationsCreateLanguageDict
        );
        if (createEntry) {
          translationsToCreate.push(createEntry);
        }
      }
    }

    payload[translation_field] = {
      create: translationsToCreate,
      update: translationsToUpdate,
      delete: translationsToDelete,
    };
    return payload;
  }

  private static buildExistingTranslationsMap(currentTranslations: any[]): Record<string, any> {
    const existingTranslations: Record<string, any> = {};
    for (const translation of currentTranslations) {
      const field = DirectusCollectionTranslator.detectLanguagesIdOrCodeField(translation);
      if (field) {
        existingTranslations[translation?.[field]] = translation;
      }
    }
    return existingTranslations;
  }

  private static async buildUpdateEntry(
    options: TranslationEntryOptions,
    existingTranslation: any,
    newTranslationsUpdateLanguageDict: Record<string, any>
  ): Promise<any> {
    const { isSourceTranslation, sourceTranslation, language_code, context } = options;
    if (isSourceTranslation) {
      return { ...sourceTranslation };
    }

    const translationInPayload = newTranslationsUpdateLanguageDict[language_code];
    const letBeTranslatedInExisting = existingTranslation?.[DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED];
    let createTranslation = letBeTranslatedInExisting;
    const letBeTranslatedInPayload = DirectusCollectionTranslator.getValueFromPayloadOrDefaultValue(translationInPayload, DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED, context);
    if (DirectusCollectionTranslator.isValueDefined(letBeTranslatedInPayload)) {
      createTranslation = letBeTranslatedInPayload;
    }

    if (createTranslation) {
      const translatedItem = await DirectusCollectionTranslator.translateTranslationItem(options);
      return { ...existingTranslation, ...translatedItem };
    } else if (translationInPayload) {
      return {
        ...translationInPayload,
        [DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION]: false,
      };
    }

    return null;
  }

  private static async buildCreateEntry(
    options: TranslationEntryOptions,
    newTranslationsCreateLanguageDict: Record<string, any>
  ): Promise<any> {
    const { isSourceTranslation, sourceTranslation, language_code, context } = options;
    if (isSourceTranslation) {
      return {
        ...sourceTranslation,
        [DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED]: DirectusCollectionTranslator.getValueFromPayloadOrDefaultValue(sourceTranslation, DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED, context),
        [DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION]: true,
      };
    }

    const translationInPayload = newTranslationsCreateLanguageDict[language_code];
    const letBeTranslatedInPayload = DirectusCollectionTranslator.getValueFromPayloadOrDefaultValue(translationInPayload, DirectusCollectionTranslator.FIELD_LET_BE_TRANSLATED, context);
    let letBeTranslated = true; //only if the user explicitly set it to false, we don't create the translation
    if (DirectusCollectionTranslator.isValueDefined(letBeTranslatedInPayload)) {
      letBeTranslated = letBeTranslatedInPayload;
    }

    if (letBeTranslated) {
      const translatedItem = await DirectusCollectionTranslator.translateTranslationItem(options);
      return { ...translatedItem };
    } else if (translationInPayload) {
      return {
        ...translationInPayload,
        [DirectusCollectionTranslator.FIELD_BE_SOURCE_FOR_TRANSLATION]: false,
      };
    }

    return null;
  }

  static isValueDefined(value: any) {
    return value !== undefined && value !== null;
  }

  static getValueFromPayloadOrDefaultValue(payloadItem: any, fieldName: string, context: TranslationSchemaContext) {
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

  static async translateTranslationItem(options: TranslationEntryOptions) {
    const { sourceTranslation, language_code, translator, fieldsToTranslate, FIELD_LANGUAGES_ID_OR_CODE } = options;
    let translatedItem: any = {};
    if (fieldsToTranslate && fieldsToTranslate.length > 0) {
      for (const field of fieldsToTranslate) {
        const fieldValue = sourceTranslation[field];
        if (fieldValue) {
          try {
            const translatedValue = await translator.translate({ text: fieldValue, source_language: sourceTranslation?.[FIELD_LANGUAGES_ID_OR_CODE]?.code, destination_language: language_code });
            if (translatedValue) {
              translatedItem[field] = translatedValue;
            }
          } catch (err) {
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

  static getTranslationCollectionName(context: TranslationSchemaContext): string | null {
    const { schema, collectionName, translation_field } = context;

    const relations = schema?.relations || [];

    for (const relation of relations) {
      if (relation?.related_collection === collectionName) {
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

  static getTranslationCollectionSchema(context: TranslationSchemaContext) {
    const { schema } = context;
    let translationCollectionName = DirectusCollectionTranslator.getTranslationCollectionName(context);
    if (!translationCollectionName) {
      return null;
    }
    let collectionInformations = DirectusCollectionTranslator.getSchemaForCollection(schema, translationCollectionName);
    return collectionInformations;
  }

  /**
   * Gets a list of all fields that are translatable
   * Only watches for text and string
   * Ignores the primary key field
   * Ignores fields that are relations
   */
  static getFieldsToTranslate(context: TranslationSchemaContext) {
    const { schema } = context;
    const translationCollectionInformations = DirectusCollectionTranslator.getTranslationCollectionSchema(context);
    const collectionFieldsInformationsDict = translationCollectionInformations?.fields || {};

    const collectionFields = Object.keys(collectionFieldsInformationsDict);

    const primaryFieldKey = translationCollectionInformations?.primary || 'id'; //we need to know the primary field key

    const translationCollectionName = DirectusCollectionTranslator.getTranslationCollectionName(context);

    const fieldsToTranslateDict: any = {};
    for (const field of collectionFields) {
      if (field !== primaryFieldKey) {
        const fieldsInformation = collectionFieldsInformationsDict[field];
        // we only translate fields of type string and text
        if (fieldsInformation?.type === 'text' || fieldsInformation?.type === 'string') {
          fieldsToTranslateDict[field] = true;
        }
      }
    }

    // remove relation fields that belong to the translation collection from translation candidates
    const relations = schema?.relations || [];
    for (const relation of relations) {
      if (relation?.collection === translationCollectionName) {
        delete fieldsToTranslateDict[relation?.field];
      }
    }

    return Object.keys(fieldsToTranslateDict);
  }
}
