import { defineHook } from '@directus/extensions-sdk';
import { ActionInitFilterEventHelper } from '../helpers/ActionInitFilterEventHelper';
import { runInitHooks } from '../helpers/InitHookAfterMigrationHelper';
import { EnvVariableHelper } from '../helpers/EnvVariableHelper';
// @ts-ignore - JS module without type definitions
import { importSchema } from '../../../../../sync/importSchema.js';

export default defineHook(async ({ init }) => {
  init(ActionInitFilterEventHelper.INIT_APP_STARTED, async () => {
    const envDict = {
      MYHOST: EnvVariableHelper.getEnvVariable('MYHOST'),
      ROCKET_MEALS_PATH: EnvVariableHelper.getEnvVariable('ROCKET_MEALS_PATH'),
      ROCKET_MEALS_BACKEND_PATH: EnvVariableHelper.getEnvVariable('ROCKET_MEALS_BACKEND_PATH'),
      ADMIN_EMAIL: EnvVariableHelper.getAdminEmail(),
      ADMIN_PASSWORD: EnvVariableHelper.getAdminPassword(),
    };

    await importSchema(envDict);
    await runInitHooks();
  });
});

