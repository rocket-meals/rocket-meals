import {defineHook} from '@directus/extensions-sdk';
import {ActionInitFilterEventHelper} from '../helpers/ActionInitFilterEventHelper';
import {runInitHooksAfterMigration, runInitHooksBeforeMigration} from '../helpers/InitHookMigrationHelper';
import {EnvVariableHelper} from '../helpers/EnvVariableHelper';
// @ts-ignore - JS module without type definitions
import {importSchema} from "./importSchema"

export default defineHook(async ({ init, action }) => {
  action(ActionInitFilterEventHelper.SERVER_STARTED, async () => {
    console.log("INIT_APP_STARTED");
    const envDict = {
      MYHOST: EnvVariableHelper.getMyHost(),
      ROCKET_MEALS_PATH: EnvVariableHelper.getRocketMealsPath(),
      ROCKET_MEALS_BACKEND_PATH: EnvVariableHelper.getRocketMealsBackendPath(),
      ADMIN_EMAIL: EnvVariableHelper.getAdminEmail(),
      ADMIN_PASSWORD: EnvVariableHelper.getAdminPassword(),
    };

    await runInitHooksBeforeMigration();
    await importSchema(envDict);
    await runInitHooksAfterMigration();
  });
});

