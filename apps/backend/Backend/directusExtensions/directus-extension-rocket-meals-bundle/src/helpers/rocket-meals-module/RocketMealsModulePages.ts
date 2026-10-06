/**
 * RocketMealsModulePages.ts – the pages of the `Rocket Meals` module in the Directus app.
 *
 * The module is the place for backend tools that do not fit Directus' generic content views:
 * today the food feedback chats and the MCP instruction, later e.g. housing management or top/flop lists of dishes.
 * A new page is one entry here plus a route in `src/rocket-meals-module/index.ts`; the side
 * navigation and the overview page are built from this list.
 */

import { BackendTranslationKeys } from '../translations/BackendTranslationKeys';

export type RocketMealsModulePage = {
  /** Path segment below the module, e.g. `food-feedbacks` → `/admin/rocket-meals/food-feedbacks`. */
  path: string;
  icon: string;
  labelKey: BackendTranslationKeys;
  descriptionKey: BackendTranslationKeys;
};

export class RocketMealsModulePages {
  /** Module id, also the URL segment: `/admin/rocket-meals`. */
  public static readonly MODULE_ID = 'rocket-meals';

  /** Product name, not translated. */
  public static readonly MODULE_NAME = 'Rocket Meals';

  public static readonly MODULE_ICON = 'rocket_launch';

  public static readonly FOOD_FEEDBACKS: RocketMealsModulePage = {
    path: 'food-feedbacks',
    icon: 'rate_review',
    labelKey: BackendTranslationKeys.rocket_meals_module_food_feedbacks,
    descriptionKey: BackendTranslationKeys.rocket_meals_module_food_feedbacks_description,
  };

  /** The instruction "connect an AI assistant via MCP" – the same one the app shows under `/public/mcp-instruction`. */
  public static readonly MCP_INSTRUCTION: RocketMealsModulePage = {
    path: 'mcp-instruction',
    icon: 'smart_toy',
    labelKey: BackendTranslationKeys.mcp_instruction,
    descriptionKey: BackendTranslationKeys.rocket_meals_module_mcp_instruction_description,
  };

  /** All pages, in the order of the navigation. */
  public static readonly PAGES: readonly RocketMealsModulePage[] = [RocketMealsModulePages.FOOD_FEEDBACKS, RocketMealsModulePages.MCP_INSTRUCTION];

  /** `/rocket-meals/food-feedbacks/abc` – a path for the Vue router of the Directus app. */
  static getRoute(page?: RocketMealsModulePage, ...segments: string[]): string {
    const parts = [RocketMealsModulePages.MODULE_ID, ...(page ? [page.path] : []), ...segments.map(segment => encodeURIComponent(segment))];
    return `/${parts.join('/')}`;
  }
}
