<script setup lang="ts">
/**
 * Page "KI-Assistent": the chat of the Directus AI assistant (normally hidden in the right sidebar)
 * as a page of its own, with the Claude usage next to it.
 *
 * The chat is the sidebar's chat: this page renders the same Pinia store (`ai-store`), so a message
 * written here also shows up in the sidebar and the other way round, with the same model, tools and
 * tool approvals. Directus does not export its chat components to extensions, so the messages are
 * rendered here (markdown without html, tool calls as one line with approve/deny when asked).
 *
 * The usage card comes from `GET /rocket-meals-ai-assistant-usage` (admins only) and explains itself
 * when Claude, the Admin API key or the credit is missing. See `AiAssistantModuleHelper`.
 */
import { useApi, useStores } from '@directus/extensions-sdk';
import MarkdownIt from 'markdown-it';
import { computed, getCurrentInstance, nextTick, onMounted, ref, watch } from 'vue';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { AiAssistantModuleHelper, type AiChatModel, type ClaudeUsageOverview } from '../../helpers/rocket-meals-module/AiAssistantModuleHelper';
import { RocketMealsModulePages } from '../../helpers/rocket-meals-module/RocketMealsModulePages';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import ModuleNavigation from '../module-navigation.vue';

const api = useApi();
const { useServerStore, useUserStore } = useStores();
const serverStore = useServerStore();
const userStore = useUserStore();
const { translate, language, formatDateTime } = useAppExtensionTranslate();

const page = RocketMealsModulePages.AI_ASSISTANT;

/** Pinia puts itself on the global properties of the app, the extension shares that app. */
const pinia = getCurrentInstance()?.appContext.config.globalProperties.$pinia;
const aiStore = AiAssistantModuleHelper.findDirectusAiStore(pinia);
const aiEnabled = computed(() => serverStore.info?.ai_enabled !== false);
const chatAvailable = computed(() => aiStore !== null && aiEnabled.value);
const isAdmin = computed(() => userStore.isAdmin === true);

const markdown = new MarkdownIt({ html: false, linkify: true, breaks: true });
const renderMarkdown = (text: string) => markdown.render(text);
/** Hints of our own catalogue use `code` for the names of env variables. */
const renderInline = (text: string) => markdown.renderInline(text);

const messages = computed(() => aiStore?.messages ?? []);
const isBusy = computed(() => aiStore?.status === 'streaming' || aiStore?.status === 'submitted');
const canSend = computed(() => !!aiStore && !aiStore.isUiLoading && !aiStore.hasPendingToolCall && (aiStore.input ?? '').trim().length > 0);

const modelItems = computed(() => (aiStore?.models ?? []).map((model: AiChatModel) => ({ text: model.name ?? model.model, value: AiAssistantModuleHelper.getModelKey(model) })));
const selectedModelKey = computed({
  get: () => AiAssistantModuleHelper.getModelKey(aiStore?.selectedModel),
  set: (key: string | null) => {
    const model = aiStore?.models.find(entry => AiAssistantModuleHelper.getModelKey(entry) === key);
    if (model) aiStore?.selectModel(model);
  },
});

const contextText = computed(() => {
  if (!aiStore || aiStore.tokenUsage.totalTokens <= 0) return null;
  return translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_context_usage, {
    percent: AiAssistantModuleHelper.formatPercent(aiStore.contextUsagePercentage / 100, language.value),
    tokens: AiAssistantModuleHelper.formatTokens(aiStore.tokenUsage.totalTokens, language.value),
  });
});

const messageList = ref<HTMLElement | null>(null);
const composerInput = ref<HTMLTextAreaElement | null>(null);

function scrollToBottom() {
  nextTick(() => {
    const list = messageList.value;
    if (list) list.scrollTop = list.scrollHeight;
  });
}

// Follows a streaming answer: the last message grows without the list getting longer.
watch(() => [messages.value.length, JSON.stringify(messages.value.at(-1)?.parts ?? []).length], scrollToBottom);

function send() {
  if (!aiStore || !canSend.value) return;
  aiStore.submit().catch(error => console.error('[rocket-meals-module] AI assistant:', error));
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || event.isComposing) return;
  const isTouchDevice = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
  if (event.ctrlKey || event.metaKey || (!event.shiftKey && !isTouchDevice)) {
    event.preventDefault();
    send();
  }
}

function onInput(event: Event) {
  if (aiStore) aiStore.input = (event.target as HTMLTextAreaElement).value;
}

// Usage of Claude
const usage = ref<ClaudeUsageOverview | null>(null);
const usageLoading = ref(false);
const usageError = ref(false);

async function loadUsage(refresh = false) {
  if (!isAdmin.value) return;
  usageLoading.value = true;
  usageError.value = false;
  try {
    usage.value = await AiAssistantModuleHelper.loadUsage(api, refresh);
  } catch (error) {
    console.error('[rocket-meals-module] loading the AI usage failed', error);
    usageError.value = true;
  } finally {
    usageLoading.value = false;
  }
}

const creditUsedShare = computed(() => AiAssistantModuleHelper.getCreditUsedShare(usage.value));
const creditLow = computed(() => AiAssistantModuleHelper.isCreditLow(usage.value));
const formatUsd = (value: number) => AiAssistantModuleHelper.formatUsd(value, language.value);
const formatTokens = (value: number) => AiAssistantModuleHelper.formatTokens(value, language.value);

onMounted(() => {
  scrollToBottom();
  loadUsage();
});
</script>

<template>
  <private-view :title="translate(page.labelKey)" :icon="page.icon">
    <template #headline>
      <v-breadcrumb :items="[{ name: RocketMealsModulePages.MODULE_NAME, to: RocketMealsModulePages.getRoute() }]" />
    </template>

    <template #navigation>
      <module-navigation />
    </template>

    <template #actions>
      <v-button v-if="chatAvailable" v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_new_chat)" rounded icon secondary :disabled="isBusy || messages.length === 0" @click="aiStore?.reset()">
        <v-icon name="add_comment" />
      </v-button>
    </template>

    <div class="ai-assistant">
      <section class="chat">
        <v-notice v-if="!chatAvailable" type="warning" class="unavailable">
          <div class="unavailable-content">
            <span>{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_unavailable) }}</span>
            <v-button small secondary :to="AiAssistantModuleHelper.AI_SETTINGS_ROUTE">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_open_settings) }}</v-button>
          </div>
        </v-notice>

        <template v-else-if="aiStore">
          <div ref="messageList" class="messages" aria-live="polite">
            <div v-if="messages.length === 0" class="empty type-note">
              <v-icon name="auto_awesome" large />
              <span>{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_empty) }}</span>
            </div>
            <div v-for="message in messages" :key="message.id" class="message" :class="message.role === 'user' ? 'from-user' : 'from-assistant'">
              <template v-for="(part, index) in AiAssistantModuleHelper.toDisplayParts(message)" :key="index">
                <div v-if="part.kind === 'text'" class="bubble markdown" v-html="renderMarkdown(part.text)" />
                <details v-else-if="part.kind === 'reasoning'" class="reasoning type-note">
                  <summary>{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_reasoning) }}</summary>
                  <div class="markdown" v-html="renderMarkdown(part.text)" />
                </details>
                <div v-else-if="part.kind === 'file'" class="file type-note">
                  <v-icon name="attach_file" x-small />
                  <span>{{ part.name }}</span>
                </div>
                <div v-else-if="part.kind === 'tool'" class="tool" :class="{ pending: part.approvalId }">
                  <div class="tool-line type-note">
                    <v-icon :name="AiAssistantModuleHelper.getToolStateIcon(part.state)" x-small />
                    <code>{{ part.toolName }}</code>
                    <span v-if="part.errorText" class="tool-error">{{ part.errorText }}</span>
                  </div>
                  <div v-if="part.approvalId" class="tool-approval">
                    <span>{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_tool_approval, { tool: part.toolName }) }}</span>
                    <div class="tool-approval-actions">
                      <v-button x-small secondary @click="aiStore.denyToolCall(part.approvalId)">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_tool_deny) }}</v-button>
                      <v-button x-small @click="aiStore.approveToolCall(part.approvalId)">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_tool_approve) }}</v-button>
                    </div>
                  </div>
                </div>
              </template>
            </div>
            <div v-if="aiStore.showAssistantLoadingIndicator" class="message from-assistant">
              <v-progress-circular indeterminate small />
            </div>
            <v-notice v-if="aiStore.error" type="danger" class="chat-error">
              <div class="unavailable-content">
                <span>{{ aiStore.error.message || translate(BackendTranslationKeys.error) }}</span>
                <v-button small secondary @click="aiStore.retry()">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_retry) }}</v-button>
              </div>
            </v-notice>
          </div>

          <!-- A click anywhere in the box focuses the input. Only a mouse shortcut: keyboard users reach the textarea directly. -->
          <div class="composer" role="presentation" @click="composerInput?.focus()">
            <label class="visually-hidden" for="ai-assistant-input">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_placeholder) }}</label>
            <textarea id="ai-assistant-input" ref="composerInput" class="composer-input" rows="2" :value="aiStore.input" :placeholder="translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_placeholder)" @input="onInput" @keydown="onKeydown" />
            <div class="composer-actions">
              <div class="model-select" @click.stop>
                <v-select v-if="modelItems.length > 0" v-model="selectedModelKey" :items="modelItems" inline :aria-label="translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_model)" />
              </div>
              <span v-if="contextText" class="composer-hint type-note">{{ contextText }}</span>
              <span v-else class="composer-hint type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_send_hint) }}</span>
              <button v-if="isBusy" v-tooltip.top="translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_stop)" class="send-button" :aria-label="translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_stop)" @click.stop="aiStore.stop()">
                <v-icon name="stop" small />
              </button>
              <button v-else v-tooltip.top="translate(BackendTranslationKeys.send)" class="send-button" :disabled="!canSend" :aria-label="translate(BackendTranslationKeys.send)" @click.stop="send">
                <v-icon name="arrow_upward" small />
              </button>
            </div>
          </div>
        </template>
      </section>

      <aside v-if="isAdmin" class="usage" :aria-label="translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage)">
        <div class="usage-header">
          <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage) }}</span>
          <v-button v-tooltip.bottom="translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_refresh)" x-small icon secondary :loading="usageLoading" @click="loadUsage(true)">
            <v-icon name="refresh" small />
          </v-button>
        </div>

        <v-skeleton-loader v-if="usageLoading && !usage" type="block-list-item-dense" />
        <v-notice v-else-if="usageError" type="danger">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_failed) }}</v-notice>

        <template v-else-if="usage">
          <div v-if="usage.provider" class="provider">
            <v-icon name="smart_toy" small />
            <div class="provider-text">
              <span>{{ usage.provider.label }}</span>
              <span class="type-note">{{ translate(AiAssistantModuleHelper.getProviderSourceTextKey(usage.provider.source)) }}</span>
            </div>
          </div>

          <v-notice v-if="usage.unavailable_reason" type="info"><span class="usage-hint" v-html="renderInline(translate(AiAssistantModuleHelper.getUnavailableTextKey(usage.unavailable_reason)))" /></v-notice>

          <template v-else>
            <div class="tile" :class="{ low: creditLow }">
              <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_credit_remaining) }}</span>
              <template v-if="usage.credit_remaining_usd !== null && usage.credit_usd !== null">
                <span class="tile-value">{{ formatUsd(usage.credit_remaining_usd) }}</span>
                <v-progress-linear :value="(1 - (creditUsedShare ?? 0)) * 100" rounded />
                <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_credit_of, { credit: formatUsd(usage.credit_usd), date: AiAssistantModuleHelper.formatDate(usage.credit_since, language) }) }}</span>
              </template>
              <span v-else class="type-note usage-hint" v-html="renderInline(translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_credit_not_set))" />
            </div>

            <div class="tile">
              <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_cost_month) }}</span>
              <span class="tile-value">{{ formatUsd(usage.cost_month_usd ?? 0) }}</span>
            </div>

            <div class="models">
              <span class="type-label">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_models) }}</span>
              <span v-if="usage.models_last_30_days.length === 0" class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_none) }}</span>
              <div v-for="model in usage.models_last_30_days" :key="model.model" class="model">
                <code class="model-name">{{ model.model }}</code>
                <div class="model-numbers type-note">
                  <span>{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_input) }} {{ formatTokens(model.input_tokens) }}</span>
                  <span>{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_output) }} {{ formatTokens(model.output_tokens) }}</span>
                  <span>{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_cache) }} {{ formatTokens(model.cache_read_tokens + model.cache_write_tokens) }}</span>
                </div>
              </div>
            </div>

            <span class="type-note">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_org_hint) }}</span>
          </template>

          <span class="type-note updated">{{ translate(BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_updated, { date: formatDateTime(usage.fetched_at) }) }}</span>
        </template>
      </aside>
    </div>
  </private-view>
</template>

<style scoped>
.ai-assistant {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 20rem;
  gap: 1.5rem;
  align-items: start;
  padding: var(--content-padding);
  padding-block-start: 0;
}

@media (max-width: 1100px) {
  .ai-assistant {
    grid-template-columns: minmax(0, 1fr);
  }

  .usage {
    order: -1;
  }
}

.chat {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-inline-size: 0;
}

.unavailable-content {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.messages {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  block-size: calc(100vh - 19rem);
  min-block-size: 16rem;
  padding: 1.25rem;
  overflow-y: auto;
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.empty {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  align-items: center;
  justify-content: center;
  block-size: 100%;
  text-align: center;
}

.message {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-inline-size: 85%;
}

.message.from-user {
  align-self: flex-end;
  align-items: flex-end;
}

.message.from-assistant {
  align-self: flex-start;
}

.bubble {
  padding: 0.75rem 1rem;
  overflow-wrap: anywhere;
  background: var(--theme--background-accent);
  border-radius: 1rem 1rem 1rem 0.25rem;
}

.from-user .bubble {
  color: var(--foreground-inverted, #fff);
  background: var(--theme--primary);
  border-radius: 1rem 1rem 0.25rem 1rem;
}

.markdown :deep(p) {
  margin: 0 0 0.5rem;
}

.markdown :deep(p:last-child) {
  margin-block-end: 0;
}

.markdown :deep(pre) {
  padding: 0.5rem 0.75rem;
  overflow-x: auto;
  background: var(--theme--background-subdued);
  border-radius: var(--theme--border-radius);
}

.markdown :deep(ul),
.markdown :deep(ol) {
  margin: 0 0 0.5rem;
  padding-inline-start: 1.25rem;
}

.markdown :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.reasoning summary {
  cursor: pointer;
}

.file,
.tool-line {
  display: flex;
  gap: 0.375rem;
  align-items: center;
}

.tool {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
}

.tool.pending {
  border-color: var(--theme--warning);
}

.tool-error {
  color: var(--theme--danger);
}

.tool-approval {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
}

.tool-approval-actions {
  display: flex;
  gap: 0.5rem;
}

/* Input like the chat of the support pages: one rounded box, text on top, round send button. */
.composer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0.75rem 0.625rem 1rem;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color);
  border-radius: 1.5rem;
  cursor: text;
  transition: border-color var(--fast) var(--transition);
}

.composer:focus-within {
  border-color: var(--theme--primary);
}

.composer-input {
  inline-size: 100%;
  min-block-size: 3rem;
  max-block-size: 15rem;
  padding: 0.25rem 0;
  color: var(--theme--foreground);
  font: inherit;
  line-height: 1.5;
  background: transparent;
  border: none;
  outline: none;
  resize: vertical;
}

.composer-input::placeholder {
  color: var(--theme--foreground-subdued);
}

.composer-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: flex-end;
}

.model-select {
  cursor: default;
}

.composer-hint {
  margin-inline-end: auto;
}

.send-button {
  --v-icon-color: var(--foreground-inverted, #fff);

  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  inline-size: 2.25rem;
  block-size: 2.25rem;
  background: var(--theme--primary);
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition:
    background var(--fast) var(--transition),
    opacity var(--fast) var(--transition);
}

.send-button:hover:not(:disabled) {
  background: var(--theme--primary-accent);
}

.send-button:disabled {
  opacity: 0.35;
  cursor: default;
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.usage {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  background: var(--theme--background-subdued);
  border-radius: var(--theme--border-radius);
}

.usage .v-notice {
  min-inline-size: 0;
}

.usage-hint {
  min-inline-size: 0;
  overflow-wrap: anywhere;
}

.usage-header,
.provider {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
}

.provider {
  justify-content: flex-start;
}

.provider-text,
.tile,
.models,
.model {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-inline-size: 0;
}

.tile {
  padding: 0.75rem;
  background: var(--theme--background);
  border-radius: var(--theme--border-radius);
}

.tile.low .tile-value {
  color: var(--theme--danger);
}

.tile-value {
  font-weight: 700;
  font-size: 1.5rem;
}

.models {
  gap: 0.75rem;
}

.model-name {
  overflow-wrap: anywhere;
}

.model-numbers {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.75rem;
}

@media (pointer: coarse) {
  .composer-input {
    font-size: 16px;
  }
}
</style>
