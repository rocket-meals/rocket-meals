import { defineEndpoint } from '@directus/extensions-sdk';
import { ApiContext } from '../helpers/ApiContext';
import { AccountabilityHelper } from '../helpers/AccountabilityHelper';
import { generateTypes } from './GenerateTypesLogic';

export default defineEndpoint({
  id: 'generate-types-api',
  handler: (router, apiContext: ApiContext) => {
    router.get('/ts', async (req, res) => {
      try {
        const schema = await apiContext.getSchema();
        const accountability = AccountabilityHelper.getAccountabilityFromRequest(req) ?? null;

        const collectionsService = new apiContext.services.CollectionsService({ schema, accountability });
        const fieldsService = new apiContext.services.FieldsService({ schema, accountability });
        const relationsService = new apiContext.services.RelationsService({ schema, accountability });

        const typescript = await generateTypes(collectionsService, fieldsService, relationsService);

        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.send(typescript);
      } catch (error: any) {
        res.status(500).json({ error: error?.message ?? 'Unknown error' });
      }
    });
  },
});
