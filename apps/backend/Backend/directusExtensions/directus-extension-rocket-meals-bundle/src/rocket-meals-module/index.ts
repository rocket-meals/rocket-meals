import { defineModule } from '@directus/extensions-sdk';
import { RocketMealsModulePages } from '../helpers/rocket-meals-module/RocketMealsModulePages';
import OverviewPage from './overview-page.vue';
import FoodFeedbacksPage from './food-feedbacks/food-feedbacks-page.vue';
import FoodFeedbackChatPage from './food-feedbacks/food-feedback-chat-page.vue';
import AppFeedbacksPage from './app-feedbacks/app-feedbacks-page.vue';
import AppFeedbackChatPage from './app-feedbacks/app-feedback-chat-page.vue';
import FeatureWishesPage from './feature-wishes/feature-wishes-page.vue';
import FeatureWishPage from './feature-wishes/feature-wish-page.vue';
import McpInstructionPage from './mcp-instruction/mcp-instruction-page.vue';
import LivePulsePage from './live-pulse/live-pulse-page.vue';
import FriendshipNetworkPage from './friendship-network/friendship-network-page.vue';
import WorkflowsPage from './workflows/workflows-page.vue';
import WorkflowDetailPage from './workflows/workflow-detail-page.vue';
import ProfilesPage from './profiles/profiles-page.vue';
import ProfileDetailsPage from './profiles/profile-details-page.vue';
import ProfilePushPage from './profiles/profile-push-page.vue';
import ChatsPage from './chats/chats-page.vue';
import ChatPage from './chats/chat-page.vue';
import MenuInsightsPage from './menu-insights/menu-insights-page.vue';
import MenuPlanningPage from './menu-planning/menu-planning-page.vue';

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
      path: RocketMealsModulePages.APP_FEEDBACKS.path,
      component: AppFeedbacksPage,
    },
    {
      path: `${RocketMealsModulePages.APP_FEEDBACKS.path}/:feedbackId`,
      component: AppFeedbackChatPage,
      props: true,
    },
    {
      path: RocketMealsModulePages.FEATURE_WISHES.path,
      component: FeatureWishesPage,
    },
    {
      path: `${RocketMealsModulePages.FEATURE_WISHES.path}/:wishId`,
      component: FeatureWishPage,
      props: true,
    },
    {
      path: RocketMealsModulePages.CHATS.path,
      component: ChatsPage,
    },
    {
      path: `${RocketMealsModulePages.CHATS.path}/:chatId`,
      component: ChatPage,
      props: true,
    },
    {
      path: RocketMealsModulePages.PROFILES.path,
      component: ProfilesPage,
    },
    {
      path: `${RocketMealsModulePages.PROFILES.path}/:profileId`,
      component: ProfileDetailsPage,
      props: true,
    },
    {
      path: `${RocketMealsModulePages.PROFILES.path}/:profileId/${RocketMealsModulePages.PROFILE_CHAT_SEGMENT}`,
      component: ChatPage,
      props: true,
    },
    {
      path: `${RocketMealsModulePages.PROFILES.path}/:profileId/${RocketMealsModulePages.PROFILE_PUSH_SEGMENT}`,
      component: ProfilePushPage,
      props: true,
    },
    {
      path: RocketMealsModulePages.MENU_INSIGHTS.path,
      component: MenuInsightsPage,
    },
    {
      path: RocketMealsModulePages.MENU_PLANNING.path,
      component: MenuPlanningPage,
    },
    {
      path: RocketMealsModulePages.LIVE_PULSE.path,
      component: LivePulsePage,
    },
    {
      path: RocketMealsModulePages.FRIENDSHIP_NETWORK.path,
      component: FriendshipNetworkPage,
    },
    {
      path: RocketMealsModulePages.WORKFLOWS.path,
      component: WorkflowsPage,
    },
    {
      path: `${RocketMealsModulePages.WORKFLOWS.path}/:workflowId`,
      component: WorkflowDetailPage,
      props: true,
    },
    {
      path: RocketMealsModulePages.MCP_INSTRUCTION.path,
      component: McpInstructionPage,
    },
  ],
});
