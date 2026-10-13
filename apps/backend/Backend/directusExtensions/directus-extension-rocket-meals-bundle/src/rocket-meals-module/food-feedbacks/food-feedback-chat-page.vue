<script setup lang="ts">
/**
 * Chat with the author of a food feedback.
 *
 * The comment of the feedback opens the conversation. The first answer creates the chat (see
 * `FoodFeedbackChatStatusHelper.buildChatForFeedback`), adds the author as participant and links it to
 * the feedback, so the author finds it in the app. Messages written here carry no profile – that
 * is how the app and `chat-conversation-state-hook` tell support messages from user messages.
 */
import { useApi, useStores } from '@directus/extensions-sdk';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ChatConversationState } from 'repo-depkit-common/src/ChatConversationState';
import { ChatHelper } from 'repo-depkit-common/src/ChatHelper';
import { FoodFeedbackChatStatus, FoodFeedbackChatStatusHelper } from 'repo-depkit-common/src/FoodFeedbackChatStatusHelper';
import { RelationHelper } from 'repo-depkit-common/src/RelationHelper';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { FoodFeedbackChatActions } from '../../helpers/rocket-meals-module/FoodFeedbackChatActions';
import { FoodFeedbackChatHelper, type FoodFeedbackChatMessage, type FoodFeedbackListItem } from '../../helpers/rocket-meals-module/FoodFeedbackChatHelper';
import { ChatQueryHelper } from '../../helpers/rocket-meals-module/ChatQueryHelper';
import { ActionRecommendationModuleHelper, type ModuleActionRecommendation } from '../../helpers/rocket-meals-module/ActionRecommendationModuleHelper';
import { ActionRecommendationAction } from '../../helpers/action-recommendations/ActionRecommendationDefinitions';
import { CollectionNames } from 'repo-depkit-common/src/databaseTypes/CollectionNames';
import { SupportChatActions } from '../../helpers/rocket-meals-module/SupportChatActions';
import { ModuleDeleteActions } from '../../helpers/rocket-meals-module/ModuleDeleteActions';
import { RocketMealsModulePages } from '../../helpers/rocket-meals-module/RocketMealsModulePages';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import ModuleNavigation from '../module-navigation.vue';
import DeleteConfirmDialog from '../module-list/delete-confirm-dialog.vue';
import ProfileAvatar from '../profiles/profile-avatar.vue';
import SupportChatConversation from '../support-chat/support-chat-conversation.vue';
import SupportChatStatusMenu from '../support-chat/support-chat-status-menu.vue';
import FoodFeedbackRating from './food-feedback-rating.vue';
import FoodImageLink from './food-image-link.vue';

const props = defineProps<{ feedbackId: string }>();

const api = useApi();
const apiRoot = String(api.defaults?.baseURL ?? '/');
const { useNotificationsStore } = useStores();
const notificationsStore = useNotificationsStore();
const router = useRouter();
const route = useRoute();

const deleteDialogOpen = ref(false);
const deleting = ref(false);

/** Deletes the feedback with its chat and messages after the question in the dialog, then goes back to the list. */
async function deleteCurrent() {
  if (!feedback.value) {
    return;
  }
  deleting.value = true;
  try {
    const result = await ModuleDeleteActions.deleteItems(api, FoodFeedbackChatHelper.FOOD_FEEDBACKS_ENDPOINT, [feedback.value]);
    if (result.failedIds.length > 0) {
      notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_delete_failed), type: 'error' });
      return;
    }
    notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_deleted, { count: 1 }), type: 'success' });
    deleteDialogOpen.value = false;
    await router.push(RocketMealsModulePages.getRoute(page));
  } finally {
    deleting.value = false;
  }
}
const { language, translate, formatDateTime } = useAppExtensionTranslate();

const page = RocketMealsModulePages.FOOD_FEEDBACKS;

/** New messages of the user show up without reloading the page. */
const MESSAGE_REFRESH_INTERVAL_MS = 20000;

const feedback = ref<FoodFeedbackListItem | null>(null);
const messages = ref<FoodFeedbackChatMessage[]>([]);
const loading = ref(false);
const loadError = ref(false);
const sending = ref(false);
const updatingState = ref(false);

/** The open AI recommendation of this feedback: its draft reply is offered in the input. */
const recommendation = ref<ModuleActionRecommendation | null>(null);
const draftReply = computed(() => ActionRecommendationModuleHelper.getDraftReply(recommendation.value));
/** Set by "Chat mit Vorschlag starten" in the list. */
const useDraft = computed(() => route.query[ActionRecommendationModuleHelper.USE_DRAFT_QUERY] !== undefined);

async function loadRecommendation() {
  const byItem = await ActionRecommendationModuleHelper.loadOpen(api, CollectionNames.FOODS_FEEDBACKS, [props.feedbackId]);
  recommendation.value = byItem[props.feedbackId] ?? null;
}

/** Whether a provider is configured under Settings → AI: the button "Vorschlag generieren" is greyed out otherwise. */
const aiConfigured = ref(false);
const requestingRecommendation = ref(false);
const recommendationBusy = computed(() => requestingRecommendation.value || ActionRecommendationModuleHelper.isProcessing(recommendation.value));

/**
 * Asks the AI what to do with this feedback (reply with a draft, or mark as done), knowing the comment
 * and the whole chat. The row appears right away as "Die KI wird gefragt", the page reloads it until done.
 */
async function requestRecommendation() {
  if (!aiConfigured.value || recommendationBusy.value) {
    return;
  }
  requestingRecommendation.value = true;
  try {
    await ActionRecommendationModuleHelper.requestRecommendations(api, CollectionNames.FOODS_FEEDBACKS, [props.feedbackId], language.value);
    await loadRecommendation();
  } catch (error) {
    console.error('[rocket-meals-module] requesting the action recommendation failed', error);
    notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_generate_failed), type: 'error' });
  } finally {
    requestingRecommendation.value = false;
  }
}

/** While the AI is still being asked, the recommendation is reloaded until it answered. */
let processingRefresh: ReturnType<typeof setTimeout> | undefined;
watch(recommendation, current => {
  clearTimeout(processingRefresh);
  if (ActionRecommendationModuleHelper.isProcessing(current)) {
    processingRefresh = setTimeout(() => {
      loadRecommendation().catch(() => undefined);
    }, ActionRecommendationModuleHelper.PROCESSING_REFRESH_INTERVAL_MS);
  }
});
onBeforeUnmount(() => clearTimeout(processingRefresh));

/** Whether the reason of the recommendation is shown; folded away by default. */
const reasonExpanded = ref(false);

/** Turned down: the recommendation is closed as rejected and no longer shows up. */
async function dismissRecommendation() {
  await closeRecommendation(null);
}

/**
 * Once support answered or closed the feedback, the recommendation is used up: accepted when
 * `takenAction` is the recommended one, rejected otherwise (`null`: turned down).
 */
async function closeRecommendation(takenAction: ActionRecommendationAction | null) {
  if (!recommendation.value) {
    return;
  }
  try {
    await ActionRecommendationModuleHelper.close(api, [recommendation.value], takenAction);
    recommendation.value = null;
  } catch (error) {
    console.error('[rocket-meals-module] closing the action recommendation failed', error);
    notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_update_failed), type: 'warning' });
  }
}

const chatId = computed(() => RelationHelper.getId(feedback.value?.chat));
const status = computed(() => (feedback.value ? FoodFeedbackChatStatusHelper.getStatus(feedback.value) : FoodFeedbackChatStatus.NEW));
const canWrite = computed(() => !!feedback.value && FoodFeedbackChatStatusHelper.canStartChat(feedback.value));
const foodName = computed(() => (feedback.value ? FoodFeedbackChatHelper.getFoodName(feedback.value) : undefined));
const title = computed(() => foodName.value || translate(page.labelKey));

async function loadFeedback() {
  const response = await api.get(`${FoodFeedbackChatHelper.FOOD_FEEDBACKS_ENDPOINT}/${props.feedbackId}`, {
    params: { fields: FoodFeedbackChatHelper.LIST_FIELDS.join(',') },
  });
  feedback.value = response.data?.data ?? null;
}

async function loadMessages() {
  if (!chatId.value) {
    messages.value = [];
    return;
  }
  const response = await api.get(ChatQueryHelper.CHAT_MESSAGES_ENDPOINT, { params: ChatQueryHelper.buildMessagesQuery(String(chatId.value)) });
  messages.value = ChatHelper.sortMessagesChronologically(response.data?.data ?? []);
}

async function load() {
  loading.value = true;
  try {
    await loadFeedback();
    await loadMessages();
    await loadRecommendation();
    loadError.value = false;
  } catch (error) {
    console.error('[rocket-meals-module] loading food feedback chat failed', error);
    loadError.value = true;
  } finally {
    loading.value = false;
  }
}

/** Creates the chat on the first answer and links it to the feedback. */
async function ensureChat(): Promise<string> {
  if (!feedback.value) {
    throw new Error('feedback not loaded');
  }
  return FoodFeedbackChatActions.ensureChat(api, feedback.value);
}

async function setConversationState(state: ChatConversationState) {
  if (!chatId.value) {
    return;
  }
  await SupportChatActions.setConversationState(api, String(chatId.value), state);
}

/** Sends an answer; resolves `true` when it was sent, so the input is cleared. */
async function sendMessage(text: string): Promise<boolean> {
  if (!canWrite.value) {
    return false;
  }
  sending.value = true;
  try {
    const targetChatId = await ensureChat();
    await api.post(ChatQueryHelper.CHAT_MESSAGES_ENDPOINT, { chat: targetChatId, message: text });
    await closeRecommendation(ActionRecommendationAction.REPLY);
  } catch (error) {
    console.error('[rocket-meals-module] sending chat message failed', error);
    notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_send_failed), type: 'error' });
    sending.value = false;
    return false;
  }
  // The message is saved – what follows only updates the page, so a failure there must not look like a failed send.
  try {
    await loadFeedback();
    // Set explicitly as well: the hook only recognises support by the app access of the writer.
    await setConversationState(ChatHelper.getConversationStateAfterMessage(true));
    await loadFeedback();
    await loadMessages();
  } catch (error) {
    console.error('[rocket-meals-module] reloading food feedback chat after the answer failed', error);
    notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_load_failed), type: 'warning' });
  } finally {
    sending.value = false;
  }
  return true;
}

/**
 * Sets the status by hand. A feedback without chat gets one first – the status lives in
 * `chats.conversation_state`. Note: the author then sees the (still empty) chat in the app.
 */
async function changeStatus(nextStatus: FoodFeedbackChatStatus) {
  const nextState = FoodFeedbackChatStatusHelper.getConversationStateForStatus(nextStatus);
  if (!nextState || nextStatus === status.value || updatingState.value || !canWrite.value) {
    return;
  }
  updatingState.value = true;
  try {
    if (!chatId.value) {
      await ensureChat();
      await loadFeedback();
    }
    await setConversationState(nextState);
    await loadFeedback();
    if (nextStatus === FoodFeedbackChatStatus.RESOLVED) {
      await closeRecommendation(ActionRecommendationAction.MARK_RESOLVED);
    }
  } catch (error) {
    console.error('[rocket-meals-module] updating chat state failed', error);
    notificationsStore.add({ title: translate(BackendTranslationKeys.rocket_meals_module_status_change_failed), type: 'error' });
  } finally {
    updatingState.value = false;
  }
}

let refreshInterval: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  load();
  ActionRecommendationModuleHelper.loadAiStatus(api).then(status => {
    aiConfigured.value = status.ai_configured;
  });
  refreshInterval = setInterval(() => {
    if (!sending.value) {
      loadMessages().catch(() => undefined);
    }
  }, MESSAGE_REFRESH_INTERVAL_MS);
});
onBeforeUnmount(() => clearInterval(refreshInterval));
watch(() => props.feedbackId, load);
</script>

<template>
  <private-view :title="title" :icon="page.icon" show-back :back-to="RocketMealsModulePages.getRoute(page)">
    <template #headline>
      <v-breadcrumb
        :items="[
          { name: RocketMealsModulePages.MODULE_NAME, to: RocketMealsModulePages.getRoute() },
          { name: translate(page.labelKey), to: RocketMealsModulePages.getRoute(page) },
        ]"
      />
    </template>

    <template #navigation>
      <module-navigation />
    </template>

    <template #actions>
      <v-button v-if="feedback" v-tooltip.bottom="translate(BackendTranslationKeys.delete)" rounded icon secondary kind="danger" :loading="deleting" :aria-label="translate(BackendTranslationKeys.delete)" @click="deleteDialogOpen = true">
        <v-icon name="delete" />
      </v-button>
      <v-button v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_open_feedback_item)" rounded icon secondary :to="`/content/foods_feedbacks/${feedbackId}`">
        <v-icon name="open_in_new" />
      </v-button>
      <v-button v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_refresh)" rounded icon secondary :loading="loading" @click="load">
        <v-icon name="refresh" />
      </v-button>
    </template>

    <div class="chat-page">
      <v-notice v-if="loadError" type="danger">{{ translate(BackendTranslationKeys.rocket_meals_module_load_failed) }}</v-notice>

      <template v-else-if="feedback">
        <div class="feedback-info">
          <food-image-link :feedback="feedback" :api-root="apiRoot" />
          <support-chat-status-menu :status="status" :can-write="canWrite" :updating="updatingState" @change="changeStatus" />
          <span class="type-label">{{ foodName }}</span>
          <food-feedback-rating :rating="feedback.rating" />
          <span class="spacer" />
          <profile-avatar v-if="feedback.profile" :profile="feedback.profile" :size="28" with-name />
          <span class="type-note">
            <template v-if="FoodFeedbackChatHelper.getCanteenName(feedback)"> {{ translate(BackendTranslationKeys.rocket_meals_module_canteen) }}: {{ FoodFeedbackChatHelper.getCanteenName(feedback) }} · </template>
            {{ formatDateTime(feedback.date_created) }}
          </span>
          <div class="feedback-actions">
            <!-- The wrapper carries the tooltip: a disabled button gets no mouse events. -->
            <span v-tooltip.bottom="aiConfigured ? undefined : translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_ai_not_configured)">
              <v-button small secondary :disabled="!aiConfigured || !FoodFeedbackChatStatusHelper.hasComment(feedback)" :loading="recommendationBusy" @click="requestRecommendation">
                <v-icon :name="ActionRecommendationModuleHelper.ICON" left small />
                {{ translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_generate) }}
              </v-button>
            </span>
            <v-button v-if="FoodFeedbackChatHelper.canReopen(feedback)" small secondary :loading="updatingState" @click="changeStatus(FoodFeedbackChatStatus.WAITING_FOR_SUPPORT)">
              <v-icon name="undo" left small />
              {{ translate(BackendTranslationKeys.rocket_meals_module_reopen) }}
            </v-button>
            <v-button v-else-if="FoodFeedbackChatHelper.canMarkResolved(feedback)" small :secondary="!ActionRecommendationModuleHelper.isHighlighted(recommendation, ActionRecommendationAction.MARK_RESOLVED, null)" :loading="updatingState" @click="changeStatus(FoodFeedbackChatStatus.RESOLVED)">
              <v-icon name="task_alt" left small />
              {{ translate(BackendTranslationKeys.rocket_meals_module_mark_resolved) }}
              <v-icon v-if="ActionRecommendationModuleHelper.isAction(recommendation, ActionRecommendationAction.MARK_RESOLVED)" v-tooltip="translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_recommended)" :name="ActionRecommendationModuleHelper.ICON" right small />
            </v-button>
          </div>
        </div>

        <div v-if="ActionRecommendationModuleHelper.isProcessing(recommendation)" class="recommendation recommendation-state type-note">
          <v-progress-circular indeterminate x-small />
          <span>{{ translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_processing) }}</span>
        </div>
        <div v-else-if="recommendation" class="recommendation" :class="{ 'recommendation-failed': ActionRecommendationModuleHelper.isFailed(recommendation) }">
          <div class="recommendation-header type-note">
            <v-icon :name="ActionRecommendationModuleHelper.isFailed(recommendation) ? 'error' : ActionRecommendationModuleHelper.ICON" x-small />
            <span v-if="ActionRecommendationModuleHelper.isFailed(recommendation)">{{ translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_failed) }}</span>
            <span v-else>
              {{ translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_title) }}<template v-if="ActionRecommendationModuleHelper.getActionLabelKey(recommendation)">: {{ translate(ActionRecommendationModuleHelper.getActionLabelKey(recommendation)!) }}</template>
            </span>
            <span v-if="ActionRecommendationModuleHelper.getRecommendedBy(recommendation)" class="recommendation-by">
              · {{ translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_recommended_by, { by: ActionRecommendationModuleHelper.getRecommendedBy(recommendation) ?? '' }) }}
            </span>
            <span class="spacer" />
            <v-button v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_dismiss)" x-small icon secondary :aria-label="translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_dismiss)" @click="dismissRecommendation">
              <v-icon name="close" small />
            </v-button>
          </div>
          <div v-if="ActionRecommendationModuleHelper.isFailed(recommendation)" class="recommendation-log type-note">{{ ActionRecommendationModuleHelper.getLastLogLine(recommendation) }}</div>
          <template v-else-if="recommendation.reason">
            <!-- The reason stays folded away, the recommended action is what matters at a glance. -->
            <div class="recommendation-reason-toggle">
              <v-button x-small secondary :aria-expanded="reasonExpanded" @click.stop="reasonExpanded = !reasonExpanded">
                <v-icon :name="reasonExpanded ? 'expand_less' : 'expand_more'" left x-small />
                {{ reasonExpanded ? translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_hide_reason) : translate(BackendTranslationKeys.rocket_meals_module_action_recommendation_show_reason) }}
              </v-button>
            </div>
            <div v-if="reasonExpanded">{{ recommendation.reason }}</div>
          </template>
        </div>

        <support-chat-conversation
          :opening="FoodFeedbackChatStatusHelper.hasComment(feedback) ? { text: feedback.comment ?? '', date: feedback.date_created } : null"
          :user-profile="feedback.profile"
          :messages="messages"
          :can-write="canWrite"
          :empty-text="canWrite ? translate(BackendTranslationKeys.rocket_meals_module_chat_empty) : translate(BackendTranslationKeys.rocket_meals_module_chat_not_possible)"
          :send="sendMessage"
          :suggestion="draftReply"
          :use-suggestion="useDraft"
        />
      </template>

      <v-progress-circular v-else-if="loading" indeterminate />
    </div>
    <delete-confirm-dialog v-model="deleteDialogOpen" :count="1" :loading="deleting" @confirm="deleteCurrent" />
  </private-view>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-inline-size: 56rem;
  padding: var(--content-padding);
  padding-block-start: 0;
}

.feedback-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.spacer {
  flex: 1;
}

.feedback-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  inline-size: 100%;
  justify-content: flex-end;
}

.recommendation {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  overflow-wrap: anywhere;
  background: var(--theme--primary-background);
  border-inline-start: 3px solid var(--theme--primary);
  border-radius: var(--theme--border-radius);
}

.recommendation-state {
  flex-direction: row;
  align-items: center;
  color: var(--theme--primary);
}

.recommendation-header {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  align-items: center;
  color: var(--theme--primary);
}

.recommendation-by {
  color: var(--theme--foreground-subdued);
}

.recommendation-failed {
  background: var(--theme--danger-background);
  border-inline-start-color: var(--theme--danger);
}

.recommendation-failed .recommendation-header {
  color: var(--theme--danger);
}

.recommendation-reason-toggle {
  display: flex;
}

.recommendation-log {
  font-family: var(--theme--fonts--monospace--font-family, monospace);
}
</style>
