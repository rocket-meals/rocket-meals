import { defineEndpoint } from '@directus/extensions-sdk';
import { ApiContext } from '../helpers/ApiContext';
import { AccountabilityHelper } from '../helpers/AccountabilityHelper';

const EndpointTopName = 'delete-by-query';

export default defineEndpoint({
  id: EndpointTopName,
  handler: (router, apiContext: ApiContext) => {
    const { services, getSchema } = apiContext;

    /**
     * DELETE /delete-by-query/:collection
     *
     * Deletes items in a collection matching the provided query/filter.
     * Uses the requesting user's accountability to respect Directus permissions.
     *
     * Body: { query: { filter: { ... }, limit?: number } }
     * Returns: { deleted_keys: PrimaryKey[] }
     */
    router.delete('/:collection', async (req, res) => {
      try {
        const { collection } = req.params;
        const { query } = req.body;

        if (!collection) {
          return res.status(400).json({ error: 'Collection parameter is required.' });
        }

        if (!query || !query.filter) {
          return res.status(400).json({ error: 'Request body must contain a "query" object with a "filter" property.' });
        }

        const accountability = AccountabilityHelper.getAccountabilityFromRequest(req);
        if (!accountability) {
          return res.status(401).json({ error: 'Unauthorized. Authentication is required.' });
        }

        const schema = await getSchema();
        const { ItemsService } = services;

        const itemsService = new ItemsService(collection, {
          accountability,
          schema,
        });

        const deletedKeys = await itemsService.deleteByQuery(query);

        return res.json({ deleted_keys: deletedKeys });
      } catch (error: any) {
        if (error?.status) {
          return res.status(error.status).json({ error: error.message || 'An error occurred.' });
        }
        return res.status(500).json({ error: error?.message || 'Internal server error.' });
      }
    });
  },
});
