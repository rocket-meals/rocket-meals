import { defineModule } from '@directus/extensions-sdk';
import { RocketMealsModulePages } from '../helpers/rocket-meals-module/RocketMealsModulePages';
import OverviewPage from './overview-page.vue';
import FoodFeedbacksPage from './food-feedbacks/food-feedbacks-page.vue';
import FoodFeedbackChatPage from './food-feedbacks/food-feedback-chat-page.vue';
import McpInstructionPage from './mcp-instruction/mcp-instruction-page.vue';

/**
 * Module `Rocket Meals` – our own area in the Directus app, with a side navigation like the content
 * module. Directus modules are Vue (the Directus app is Vue); React Native screens of the apps
 * cannot be embedded here. Pages are listed in `RocketMealsModulePages`.
 *
 * The module has to be enabled in the module bar (Settings → Project → Module bar); the shipped
 * settings in `data/directus-sync-data` do that.
 */
export default defineModule({
  id: RocketMealsModulePages.MODULE_ID,
  name: RocketMealsModulePages.MODULE_NAME,
  icon: RocketMealsModulePages.MODULE_ICON,
  routes: [
    {
      path: '',
      component: OverviewPage,
    },
    {
      path: RocketMealsModulePages.FOOD_FEEDBACKS.path,
      component: FoodFeedbacksPage,
    },
    {
      path: `${RocketMealsModulePages.FOOD_FEEDBACKS.path}/:feedbackId`,
      component: FoodFeedbackChatPage,
      props: true,
    },
    {
      path: RocketMealsModulePages.MCP_INSTRUCTION.path,
      component: McpInstructionPage,
    },
  ],
});
