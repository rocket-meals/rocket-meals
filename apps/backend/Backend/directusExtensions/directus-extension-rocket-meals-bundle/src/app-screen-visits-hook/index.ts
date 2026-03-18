import { defineHook } from '@directus/extensions-sdk';
import { ActionInitFilterEventHelper } from '../helpers/ActionInitFilterEventHelper';
import { CollectionNames } from 'repo-depkit-common';

const HOOK_NAME = 'app_screen_visits';
export const APP_SCREEN_VISITS_COLLECTION = 'app_screen_visits';

async function ensureCollectionExists(apiContext: any) {
  const schema = await apiContext.getSchema();
  if (schema?.collections?.[APP_SCREEN_VISITS_COLLECTION]) {
    return;
  }

  console.log(`${HOOK_NAME}: Creating collection '${APP_SCREEN_VISITS_COLLECTION}'`);

  const { CollectionsService, FieldsService } = apiContext.services;
  const collectionsService = new CollectionsService({ accountability: null, schema });
  const fieldsService = new FieldsService({ accountability: null, schema });

  await collectionsService.createOne({
    collection: APP_SCREEN_VISITS_COLLECTION,
    meta: {
      collection: APP_SCREEN_VISITS_COLLECTION,
      icon: 'analytics',
      note: 'Tracks which screens users visit for usage analytics',
      display_template: '{{screen_name}}',
      archive_field: null,
      archive_value: null,
      unarchive_value: null,
      sort_field: null,
    },
    schema: {
      name: APP_SCREEN_VISITS_COLLECTION,
    },
    fields: [],
  });

  await fieldsService.createField(APP_SCREEN_VISITS_COLLECTION, {
    field: 'screen_name',
    type: 'string',
    meta: {
      field: 'screen_name',
      required: true,
      note: 'The identifier of the visited screen',
    },
    schema: {
      name: 'screen_name',
      is_nullable: false,
      data_type: 'varchar',
      max_length: 255,
    },
  });

  await fieldsService.createField(APP_SCREEN_VISITS_COLLECTION, {
    field: 'profile',
    type: 'uuid',
    meta: {
      field: 'profile',
      note: 'The profile that visited the screen (optional)',
    },
    schema: {
      name: 'profile',
      is_nullable: true,
      data_type: 'uuid',
      foreign_key_table: CollectionNames.PROFILES,
      foreign_key_column: 'id',
    },
  });

  console.log(`${HOOK_NAME}: Collection '${APP_SCREEN_VISITS_COLLECTION}' created successfully`);
}

async function ensurePublicCreatePermission(apiContext: any) {
  const schema = await apiContext.getSchema();
  const { PermissionsService } = apiContext.services;
  const permissionsService = new PermissionsService({ accountability: null, schema });

  const existingPermissions = await permissionsService.readByQuery({
    filter: {
      collection: { _eq: APP_SCREEN_VISITS_COLLECTION },
      action: { _eq: 'create' },
      role: { _null: true },
    },
    limit: 1,
  });

  if (existingPermissions.length === 0) {
    console.log(`${HOOK_NAME}: Creating public 'create' permission for '${APP_SCREEN_VISITS_COLLECTION}'`);
    await permissionsService.createOne({
      collection: APP_SCREEN_VISITS_COLLECTION,
      action: 'create',
      role: null,
      permissions: {},
      validation: {},
      fields: ['*'],
    });
  }
}

export default defineHook(async ({ init }, apiContext) => {
  init(ActionInitFilterEventHelper.INIT_APP_STARTED, async () => {
    try {
      await ensureCollectionExists(apiContext);
      await ensurePublicCreatePermission(apiContext);
      console.log(`${HOOK_NAME}: Initialization complete`);
    } catch (error) {
      console.error(`${HOOK_NAME}: Error during initialization:`, error);
    }
  });
});
