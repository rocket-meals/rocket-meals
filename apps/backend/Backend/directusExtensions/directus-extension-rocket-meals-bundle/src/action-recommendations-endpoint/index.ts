/**
 * action-recommendations-endpoint – AI action recommendations and summaries on request, for every
 * collection in `ActionRecommendationDefinitions` (food feedbacks, app feedbacks, …).
 *
 * `POST /action-recommendations/recommend` with `{ collection, ids, language, background? }`: asks the
 * AI what to do with each item (up to `MAX_ITEMS_PER_REQUEST`, e.g. the selection of a list page; an
 * item with a chat is asked about together with its messages) and stores the answers in
 * `action_recommendations` (`processing`, then `draft` or `failed` with `logs`;
 * `recommended_by_ai` = provider and model, `user_created` = who asked). With `background: true` it
 * answers as soon as the rows exist and asks the AI afterwards, the page reloads until they are done.
 * Answers `{ data: ActionRecommendations[], ignored: string[] }`.
 *
 * `POST /action-recommendations/summarize` with `{ collection, group_value?, language }`: summarizes
 * the newest items with text, e.g. all comments on one food (`group_value` = the food id). Not
 * stored. Answers `{ data: { summary, key_points, item_count, recommended_by_ai } | null }`.
 *
 * `GET /action-recommendations/status`: `{ data: { ai_configured, enabled } }`, whether a provider is
 * configured under Settings → AI and whether the automatic recommendations are switched on. Reveals
 * nothing about the provider.
 *
 * Only for logged-in users. The items are read with their permissions, so only what they may read
 * is sent to the AI, and only the allowlisted fields. Nothing in the source collection is changed.
 * Needs a provider under Settings → AI. `app_settings.ai_action_recommendations_enabled` only switches
 * the automatic recommendations of the hook, asking by hand works without it.
 */

import { defineEndpoint } from '@directus/extensions-sdk';
import { Accountability } from '@directus/types';
import { ApiContext } from '../helpers/ApiContext';
import { ActionRecommendationDefinitions, type ActionRecommendationDefinition } from '../helpers/action-recommendations/ActionRecommendationDefinitions';
import { ActionRecommendationService } from '../helpers/action-recommendations/ActionRecommendationService';
import { ActionRecommendationErrorCode, ActionRecommendationModuleHelper } from '../helpers/rocket-meals-module/ActionRecommendationModuleHelper';

const ENDPOINT_ID = ActionRecommendationModuleHelper.ENDPOINT_ID;

type RequestContext = { accountability: Accountability; definition: ActionRecommendationDefinition; language: string; service: ActionRecommendationService };

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Checks login, collection and AI provider. Sends the error response itself and returns null then. */
async function getRequestContext(apiContext: ApiContext, req: any, res: any): Promise<RequestContext | null> {
  const accountability = req?.accountability as Accountability | undefined;
  if (!accountability?.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  const definition = ActionRecommendationDefinitions.getDefinition(req.body?.collection);
  if (!definition) {
    res.status(400).json({ error: 'This collection has no action recommendations.', code: ActionRecommendationErrorCode.UNKNOWN_COLLECTION });
    return null;
  }
  const service = await ActionRecommendationService.create(apiContext, { requireEnabled: false });
  if (!(service instanceof ActionRecommendationService)) {
    res.status(409).json({ error: 'No OpenAI-compatible provider is configured under Settings → AI.', code: ActionRecommendationErrorCode.AI_NOT_CONFIGURED });
    return null;
  }
  return { accountability, definition, language: ActionRecommendationDefinitions.parseLanguage(req.body?.language), service };
}

export default defineEndpoint({
  id: ENDPOINT_ID,
  handler: (router, apiContext: ApiContext) => {
    router.get(ActionRecommendationModuleHelper.STATUS_ROUTE, async (req: any, res: any) => {
      if (!req?.accountability?.user) {
        return res.status(401).json({ error: 'Authentication required.' });
      }
      try {
        return res.json({ data: await ActionRecommendationService.getStatus(apiContext) });
      } catch (error) {
        apiContext.logger.error(`${ENDPOINT_ID}: reading the AI status failed: ${getErrorMessage(error)}`);
        return res.json({ data: { ai_configured: false, enabled: false } });
      }
    });

    router.post(ActionRecommendationModuleHelper.RECOMMEND_ROUTE, async (req: any, res: any) => {
      try {
        const context = await getRequestContext(apiContext, req, res);
        if (!context) {
          return;
        }
        const ids = ActionRecommendationDefinitions.parseItemIds(req.body?.ids);
        return res.json(await context.service.recommend(context.definition, ids, context.language, context.accountability, { background: req.body?.background === true }));
      } catch (error) {
        apiContext.logger.error(`${ENDPOINT_ID}: recommendation failed: ${getErrorMessage(error)}`);
        return res.status(502).json({ error: 'The AI recommendation failed.', code: ActionRecommendationErrorCode.AI_FAILED });
      }
    });

    router.post(ActionRecommendationModuleHelper.SUMMARIZE_ROUTE, async (req: any, res: any) => {
      try {
        const context = await getRequestContext(apiContext, req, res);
        if (!context) {
          return;
        }
        return res.json({ data: await context.service.summarize(context.definition, req.body?.group_value, context.language, context.accountability) });
      } catch (error) {
        apiContext.logger.error(`${ENDPOINT_ID}: summary failed: ${getErrorMessage(error)}`);
        return res.status(502).json({ error: 'The AI summary failed.', code: ActionRecommendationErrorCode.AI_FAILED });
      }
    });
  },
});
