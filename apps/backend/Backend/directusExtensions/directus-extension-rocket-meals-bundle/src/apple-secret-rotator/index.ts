import {defineHook} from '@directus/extensions-sdk';
import {ActionInitFilterEventHelper} from "../helpers/ActionInitFilterEventHelper";

export default defineHook(({ filter, action, init, schedule }, apiContext) => {
  init(ActionInitFilterEventHelper.CLI_INIT_BEFORE, () => {
    // Only whether the secret is set, never the secret itself: logs are read by more people than the .env.
    console.log("DIRECTUS: AUTH_APPLE_CLIENT_SECRET is " + (process.env.AUTH_APPLE_CLIENT_SECRET ? "set" : "not set"))
  });
});
