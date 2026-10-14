/**
 * menu-insights-endpoint – the numbers behind the page "Speiseplan-Analyse" of the Rocket Meals
 * module and the experimental AI menu planning.
 *
 * `GET /rocket-meals-menu-insights?days=90&canteen=<id>&language=de-DE` answers `{ data: MenuInsights }`:
 * offers and variety, ratings (distribution, top, flop), awaited foods, markings with their coverage
 * of the days and the preferences of the profiles, food and canteen feedback labels, canteen visits
 * and the languages of the profiles. Without `canteen` all canteens.
 *
 * `GET /rocket-meals-menu-insights/planning/status` answers `{ data: { ai_configured } }`.
 *
 * `POST /rocket-meals-menu-insights/planning` with `{ canteen?, year, week, weeks, notes?, language }`
 * answers `{ data: MenuPlanningResult }`: the menu of the same weeks a year ago (with ratings and
 * comments) and, when a provider is configured under Settings → AI, the suggestion of the AI. Nothing
 * is stored.
 *
 * Only for logged-in users. Everything is read with their permissions, so neither the page nor the
 * AI gets more than they may read anyway.
 */

import { defineEndpoint } from '@directus/extensions-sdk';
import type { Accountability } from '@directus/types';
import type { ApiContext } from '../helpers/ApiContext';
import { MenuInsightsService } from '../helpers/menu-insights/MenuInsightsService';
import { MenuInsightsHelper, type MenuInsightsResponse } from '../helpers/rocket-meals-module/MenuInsightsHelper';
import { MenuPlanningErrorCode, MenuPlanningHelper, type MenuPlanningResponse } from '../helpers/rocket-meals-module/MenuPlanningHelper';

const ENDPOINT_ID = MenuInsightsHelper.ENDPOINT_ID;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** The accountability of a logged-in user; sends 401 and returns null otherwise. */
function requireUser(req: any, res: any): Accountability | null {
  const accountability = req?.accountability as Accountability | undefined;
  if (!accountability?.user) {
    res.status(401).json({ error: 'Authentication required.' });
    return null;
  }
  return accountability;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export default defineEndpoint({
  id: ENDPOINT_ID,
  handler: (router, apiContext: ApiContext) => {
    router.get('/', async (req: any, res: any) => {
      const accountability = requireUser(req, res);
      if (!accountability) {
        return;
      }
      try {
        const service = new MenuInsightsService(apiContext, accountability);
        const data = await service.getInsights({ canteen: readString(req.query?.canteen), days: MenuInsightsHelper.parseDays(req.query?.days), language: readString(req.query?.language) ?? 'de-DE' });
        const body: MenuInsightsResponse = { data };
        return res.json(body);
      } catch (error) {
        apiContext.logger.error(`${ENDPOINT_ID}: reading the insights failed: ${getErrorMessage(error)}`);
        return res.status(500).json({ error: 'Could not read the menu insights.' });
      }
    });

    router.get(MenuPlanningHelper.STATUS_ROUTE, async (req: any, res: any) => {
      if (!requireUser(req, res)) {
        return;
      }
      try {
        return res.json({ data: { ai_configured: await MenuInsightsService.isAiConfigured(apiContext) } });
      } catch (error) {
        apiContext.logger.error(`${ENDPOINT_ID}: reading the AI status failed: ${getErrorMessage(error)}`);
        return res.json({ data: { ai_configured: false } });
      }
    });

    router.post(MenuPlanningHelper.PLANNING_ROUTE, async (req: any, res: any) => {
      const accountability = requireUser(req, res);
      if (!accountability) {
        return;
      }
      const request = MenuPlanningHelper.parseRequest(req.body);
      if (!request) {
        return res.status(400).json({ error: 'Year and calendar week are required.', code: MenuPlanningErrorCode.INVALID_REQUEST });
      }
      try {
        const body: MenuPlanningResponse = { data: await new MenuInsightsService(apiContext, accountability).plan(request) };
        return res.json(body);
      } catch (error) {
        apiContext.logger.error(`${ENDPOINT_ID}: planning failed: ${getErrorMessage(error)}`);
        return res.status(500).json({ error: 'Could not plan the menu.' });
      }
    });
  },
});
