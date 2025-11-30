import { defineHook } from '@directus/extensions-sdk';

import { DeepLTranslator } from './DeepLTranslator';
import { TranslatorSettings } from './TranslatorSettings';
import { DirectusCollectionTranslator } from './DirectusCollectionTranslator.js';
import { EventHelper } from '../helpers/EventHelper';
import { DatabaseInitializedCheck } from '../helpers/DatabaseInitializedCheck';
import { ApiContext } from '../helpers/ApiContext';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { EventContext } from '@directus/types';
import { CollectionNames } from 'repo-depkit-common';
import {MyDefineHook} from "../helpers/MyDefineHook";

export const scheduleNameAutoTranslation = 'auto-translation';

const DEV_MODE = false;

async function getAndInitItemsServiceCreatorAndTranslatorSettingsAndTranslatorAndSchema(myDatabaseHelper: MyDatabaseHelper) {
  let translatorSettings = new TranslatorSettings(myDatabaseHelper);
  let translator = new DeepLTranslator(translatorSettings, myDatabaseHelper);
  await translator.init();
  return {
    translatorSettings: translatorSettings,
    translator: translator,
  };
}

async function getCurrentItemForTranslation(tablename: string, meta: any, translations_field: string, myDatabaseHelper: MyDatabaseHelper) {
  //console.log("getCurrentItemForTranslation");
  let currentItem: any = {}; //For create we don't have a current item
  let primaryKeys = meta?.keys || [];
  const itemsService = myDatabaseHelper.getItemsServiceHelper(tablename as CollectionNames);

  // Get the first primary key if available
  if (primaryKeys.length > 0) {
    const primaryKey = primaryKeys[0];
    //For update we have a current item
    currentItem = await itemsService.readOne(primaryKey, {
      fields: [translations_field + '.*'],
    });
  }

  return currentItem;
}

async function handleCreateOrUpdate(tablename: string, payload: any, meta: any, myDatabaseHelper: MyDatabaseHelper) {
  if (tablename === CollectionNames.AUTO_TRANSLATION_SETTINGS) {
    // Don't translate settings
    return payload;
  }

  //console.log("handleCreateOrUpdate");

  //console.log("handleCreateOrUpdate");
  //console.log("Table: "+tablename);
  //console.log("Payload: ");
  //console.log(JSON.stringify(payload, null, 2));
  //let database = context?.database; //Have to get database here! https://github.com/directus/directus/discussions/13744

  //console.log("getSchema");
  let schemaToGetTranslationFields = await myDatabaseHelper.getSchema();

  let field_special_translation = 'translations';
  let table_schema = schemaToGetTranslationFields.collections[tablename];
  //  {
  //    "collection": "singletonExample",
  //     ...
  //    "fields": {
  // 	    ...
  //      "translations": {
  //        "field": "translations",
  //        "defaultValue": null,
  //        "nullable": true,
  //        "generated": false,
  //        "type": "alias",
  //        "dbType": null,
  //        "precision": null,
  //        "scale": null,
  //        "special": [
  //          "translations"
  //        ],
  //      }
  //    }
  //  }
  if (table_schema === undefined) {
    console.log('Table schema not found for ' + tablename);
    return payload;
  }

  const schema_fields = table_schema.fields;

  if (schema_fields === undefined) {
    console.log('Table schema fields not found for ' + tablename);
    return payload;
  }

  // search for all fields which are from type "special" and have "translations" in special array
  let translations_fields = Object.keys(schema_fields).filter(field => schema_fields?.[field]?.special?.includes(field_special_translation));
  //console.log("Translations fields: ");
  //console.log(translations_fields);

  let payloadContainsTranslations = false;
  for (let translations_field of translations_fields) {
    if (payload[translations_field] !== undefined) {
      payloadContainsTranslations = true;
      break;
    }
  }
  //console.log("Payload contains translations: "+payloadContainsTranslations);
  if (payloadContainsTranslations) {
    let { translatorSettings, translator } = await getAndInitItemsServiceCreatorAndTranslatorSettingsAndTranslatorAndSchema(myDatabaseHelper);

    let autoTranslate = await translatorSettings.isAutoTranslationEnabled();
    if (autoTranslate || DEV_MODE) {
      //console.log("Auto-Translation enabled for "+tablename+" table (DEV_MODE: "+DEV_MODE+")");
      //console.log("Table schema: ");
      //console.log(JSON.stringify(table_schema, null, 2));
      //console.log("Translations fields: ");
      //console.log(translations_fields);

      let modifiedPayload = payload;
      //console.log("["+scheduleNameAutoTranslation+"] - "+"Start translation for "+tablename+" table");
      for (let translation_field of translations_fields) {
        let currentItem = await getCurrentItemForTranslation(tablename, meta, translation_field, myDatabaseHelper);
        modifiedPayload = await DirectusCollectionTranslator.modifyPayloadForTranslation(currentItem, modifiedPayload, translator, translatorSettings, myDatabaseHelper, tablename, translation_field);
      }
      //console.log("["+scheduleNameAutoTranslation+"] - "+"End translation for "+tablename+" table");
      //console.log("Modified Payload: ");
      //console.log(JSON.stringify(modifiedPayload, null, 2));

      return modifiedPayload;
    }
  }
  return payload;
}

function registerCollectionAutoTranslation(filter: any, apiContext: ApiContext) {
  let events = ['create', 'update'];
  for (let event of events) {
    filter('items.' + event, async (payload: any, meta: any, context: EventContext) => {
      let tablename = meta?.collection;
      //console.log("Auto-Translation for "+event+" event in "+tablename);
      let myDatabaseHelper = new MyDatabaseHelper(apiContext, context);
      return await handleCreateOrUpdate(tablename, payload, meta, myDatabaseHelper);
    });
  }
}

export default MyDefineHook.defineHookWithAllTablesExisting(scheduleNameAutoTranslation, async ({ filter, action, init, schedule }, apiContext) => {

  action(EventHelper.SERVER_START_EVENT, async (meta, context) => {
    let myDatabaseHelper = new MyDatabaseHelper(apiContext, context);

    try {
      let translatorSettings = new TranslatorSettings(myDatabaseHelper);
      let translator = new DeepLTranslator(translatorSettings, myDatabaseHelper);
      await translator.init();

      registerCollectionAutoTranslation(filter, apiContext);
      //registerLanguagesFilter(filter, getSchema, services, logger); //TODO implement auto translate for new languages
    } catch (err: any) {
      console.log(err);
    }
  });
});
