/**
 * ai-assistant-usage-endpoint – what the AI assistant of the Directus app costs, when it talks to Claude.
 *
 * `GET /rocket-meals-ai-assistant-usage` answers `{ data: ClaudeUsageOverview }`: where Claude is
 * configured under Settings → AI (Anthropic key, or an OpenAI-compatible provider pointing to Claude),
 * the costs of this month, the tokens per model of the last 30 days and the remaining credit
 * (`AI_ASSISTANT_CREDIT_USD` minus the costs since `AI_ASSISTANT_CREDIT_SINCE`). The numbers come
 * from the Usage & Cost Admin API of Anthropic and need an Admin API key
 * (`AI_ASSISTANT_ANTHROPIC_ADMIN_API_KEY`), see `ClaudeUsageHelper`. `?refresh=1` skips the cache.
 *
 * Only for admins: the costs of the organization are nothing for every backend user. The API keys
 * are read decrypted (SettingsService without accountability) and never leave the server.
 * The page "KI-Assistent" of the Rocket Meals module shows the answer.
 */

import { defineEndpoint } from '@directus/extensions-sdk';
import { AccountabilityHelper } from '../helpers/AccountabilityHelper';
import { ApiContext } from '../helpers/ApiContext';
import { EnvVariableHelper } from '../helpers/EnvVariableHelper';
import { CLAUDE_SETTINGS_COLUMNS, ClaudeUsageCache, ClaudeUsageHelper, type ClaudeSettingsRow } from '../helpers/ai/ClaudeUsageHelper';
import { AiAssistantModuleHelper } from '../helpers/rocket-meals-module/AiAssistantModuleHelper';

const ENDPOINT_ID = AiAssistantModuleHelper.USAGE_ENDPOINT_ID;

export default defineEndpoint({
  id: ENDPOINT_ID,
  handler: (router, apiContext: ApiContext) => {
    router.get('/', async (req: any, res: any) => {
      const accountability = AccountabilityHelper.getAccountabilityFromRequest(req);
      if (!accountability?.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      if (!AccountabilityHelper.isAdminAccountability(accountability)) {
        return res.status(403).json({ error: 'Only admins may see the AI usage.' });
      }

      try {
        const now = Date.now();
        const cached = req.query?.refresh ? null : ClaudeUsageCache.get(now);
        if (cached) {
          return res.json({ data: cached });
        }
        const settingsService = new apiContext.services.SettingsService({ schema: await apiContext.getSchema(), accountability: null });
        const row = (await settingsService.readSingleton({ fields: CLAUDE_SETTINGS_COLUMNS })) as ClaudeSettingsRow | undefined;
        const overview = await ClaudeUsageHelper.getOverview({
          row,
          envAdminKey: EnvVariableHelper.getEnvVariable(ClaudeUsageHelper.ENV_ADMIN_API_KEY),
          envCreditUsd: EnvVariableHelper.getEnvVariable(ClaudeUsageHelper.ENV_CREDIT_USD),
          envCreditSince: EnvVariableHelper.getEnvVariable(ClaudeUsageHelper.ENV_CREDIT_SINCE),
          fetchFn: (url, init) => fetch(url, init),
          now: new Date(now),
        });
        ClaudeUsageCache.set(overview, now);
        return res.json({ data: overview });
      } catch (error) {
        console.error(ENDPOINT_ID + ': could not read the AI usage', error);
        return res.status(500).json({ error: 'Could not read the AI usage.' });
      }
    });
  },
});
