import { defineEndpoint } from '@directus/extensions-sdk';
import { AccountabilityHelper } from '../helpers/AccountabilityHelper';
import { TypeScriptTypeGenerator } from './TypeScriptTypeGenerator';
import { ApiContext } from '../helpers/ApiContext';

/**
 * REST endpoint that generates TypeScript type definitions from the
 * current Directus schema.
 *
 * GET /generate-types-api/ts
 *
 * Requires admin authentication (Bearer token or session cookie).
 * Returns the generated TypeScript file as `text/plain`.
 */
export default defineEndpoint({
  id: 'generate-types-api',
  handler: (router, apiContext: ApiContext) => {
    router.get('/ts', async (req, res) => {
      try {
        const accountability = AccountabilityHelper.getAccountabilityFromRequest(req);

        if (!AccountabilityHelper.isAdminAccountability(accountability)) {
          res.status(403).json({ errors: [{ message: 'Admin access required' }] });
          return;
        }

        const types = await TypeScriptTypeGenerator.generate(apiContext, accountability!);

        res.set('Content-Type', 'text/plain; charset=UTF-8');
        res.set('Content-Disposition', 'attachment; filename="types.ts"');
        res.send(types);
      } catch (error: any) {
        console.error('generate-types-api error:', error);
        res.status(500).json({ errors: [{ message: error.message || 'Internal Server Error' }] });
      }
    });
  },
});
