<script setup lang="ts">
/**
 * Page "KI-Assistenten verbinden (MCP)": the same instruction the app shows under
 * `/public/mcp-instruction`. Providers, steps, values to copy and the token flow come from
 * `McpInstructionHelper`, the texts from the shared catalogue – this page only renders them.
 *
 * "Mit meinem Account verbinden" means the Directus account signed in here: the token is saved on
 * the own `directus_users` entry, exactly like in the app.
 */
import { useApi, useStores } from '@directus/extensions-sdk';
import MarkdownIt from 'markdown-it';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
// Not the package index – it would drag moment-timezone and friends into the Directus app bundle.
import { McpAccessHelper } from 'repo-depkit-common/src/McpAccessHelper';
import { McpInstructionHelper, type McpAccessMode, type McpHttpClient, type McpProvider, type McpProviderOption } from 'repo-depkit-common/src/McpInstructionHelper';
import { useAppExtensionTranslate } from '../../helpers/app-extensions/useAppExtensionTranslate';
import { RocketMealsModulePages } from '../../helpers/rocket-meals-module/RocketMealsModulePages';
import { BackendTranslationKeys } from '../../helpers/translations/BackendTranslationKeys';
import ModuleNavigation from '../module-navigation.vue';

const api = useApi();
const route = useRoute();
const router = useRouter();
const { useNotificationsStore, useServerStore } = useStores();
const notificationsStore = useNotificationsStore();
const serverStore = useServerStore();
const { translate } = useAppExtensionTranslate();

const page = RocketMealsModulePages.MCP_INSTRUCTION;

/** Step texts use inline markdown (bold, `code` for labels of the assistant). Our own catalogue – no html allowed anyway. */
const markdown = new MarkdownIt({ html: false });
const renderMarkdown = (text: string) => markdown.renderInline(text);

/** The module's way to the server for `McpInstructionHelper`: the Directus app's own, signed-in client. */
const mcpHttpClient: McpHttpClient = {
  get: async path => (await api.get(path)).data,
  patch: async (path, body) => (await api.patch(path, body)).data,
  post: async path => (await api.post(path)).data,
};

/** The API lives at the client's base url (the public url of Directus), the MCP server below it. */
const backendUrl = new URL(api.defaults.baseURL ?? '/', window.location.href).href;
const appName = computed(() => serverStore.info?.project?.project_name || RocketMealsModulePages.MODULE_NAME);

const assistantParam = route.query[McpInstructionHelper.ASSISTANT_PARAM] ?? route.query[McpInstructionHelper.LEGACY_ASSISTANT_PARAM];
const provider = ref<McpProvider | null>(McpInstructionHelper.parseAssistantParam(assistantParam as string | string[] | undefined));
const accessMode = ref<McpAccessMode | null>(null);
// Like in the app: a section folds itself away once something is picked in it (a preselected
// assistant starts folded) and can be opened again by hand. Without a pick it always stays open.
const providerSectionCollapsed = ref(provider.value !== null);
const accountSectionCollapsed = ref(false);
const isProviderCollapsed = computed(() => providerSectionCollapsed.value && provider.value !== null);
const isAccountCollapsed = computed(() => accountSectionCollapsed.value && accessMode.value !== null);
// Only set right after it was created – Directus never shows a saved token again.
const personalToken = ref<string | null>(null);
const hasPersonalToken = ref<boolean | null>(null);
// The user still knows the saved token: the steps show `<TOKEN>` where it belongs.
const usesKnownToken = ref(false);
const loadingToken = ref(false);
const revokeDialogOpen = ref(false);
// The fixed token is the same on every server; the server is still asked, in case it changed.
const publicToken = ref<string>(McpAccessHelper.PUBLIC_USER_TOKEN);
let hasEnsuredPublicUser = false;

const token = computed(() =>
  McpInstructionHelper.resolveToken({
    accessMode: accessMode.value,
    publicToken: publicToken.value,
    personalToken: personalToken.value,
    usesKnownToken: usesKnownToken.value,
  })
);
const isTokenPlaceholder = computed(() => accessMode.value === 'personal' && !personalToken.value && usesKnownToken.value);
const steps = computed(() =>
  provider.value && token.value !== null
    ? McpInstructionHelper.STEPS_BY_PROVIDER[provider.value].map(step => ({
        ...step,
        copyValue: step.copy ? McpInstructionHelper.getCopyValue(step.copy, { appName: appName.value, backendUrl, token: token.value }) : null,
      }))
    : []
);
const firstCopyStepIndex = computed(() => (provider.value ? McpInstructionHelper.getFirstCopyStepIndex(provider.value) : -1));

// Brand names stay as they are, only "Andere" is translated.
function getProviderLabel(option: McpProviderOption) {
  return option.brandName ?? (option.labelKey ? translate(option.labelKey) : option.provider);
}

const selectedProviderLabel = computed(() => {
  const option = McpInstructionHelper.getProviderOption(provider.value);
  return option ? getProviderLabel(option) : undefined;
});
const accessModeLabels = computed<Record<McpAccessMode, string>>(() => ({
  personal: translate(BackendTranslationKeys.mcp_connect_with_account),
  public: translate(BackendTranslationKeys.mcp_continue_without_account),
}));
const ACCESS_MODE_ICONS: Record<McpAccessMode, string> = { personal: 'key', public: 'public' };

function selectProvider(selected: McpProvider) {
  provider.value = selected;
  providerSectionCollapsed.value = true;
  // Keeps the choice in the url, so the page can be shared or bookmarked as it is.
  router.replace({ query: { ...route.query, [McpInstructionHelper.ASSISTANT_PARAM]: selected, [McpInstructionHelper.LEGACY_ASSISTANT_PARAM]: undefined } });
}

function notifyError(key: BackendTranslationKeys, error: unknown) {
  console.error('[rocket-meals-module] MCP instruction:', error);
  notificationsStore.add({ title: translate(key), type: 'error' });
}

async function loadOrCreatePersonalToken() {
  if (personalToken.value || usesKnownToken.value) {
    return;
  }
  loadingToken.value = true;
  try {
    const state = await McpInstructionHelper.loadOrCreatePersonalToken(mcpHttpClient);
    hasPersonalToken.value = true;
    if (state.kind === 'created') {
      personalToken.value = state.token;
    }
  } catch (error) {
    notifyError(BackendTranslationKeys.mcp_access_token_load_failed, error);
  } finally {
    loadingToken.value = false;
  }
}

async function ensurePublicUser() {
  if (hasEnsuredPublicUser) {
    return;
  }
  hasEnsuredPublicUser = true;
  try {
    publicToken.value = await McpInstructionHelper.ensurePublicUser(mcpHttpClient);
  } catch (error) {
    // The fixed token from McpAccessHelper stays in place – it is right on every up-to-date server.
    console.error('[rocket-meals-module] could not ensure the public MCP user', error);
  }
}

function selectAccessMode(selected: McpAccessMode) {
  accessMode.value = selected;
  accountSectionCollapsed.value = true;
}

watch(accessMode, mode => {
  if (mode === 'personal') loadOrCreatePersonalToken();
  if (mode === 'public') ensurePublicUser();
});

async function createPersonalToken() {
  loadingToken.value = true;
  try {
    personalToken.value = await McpInstructionHelper.createPersonalToken(mcpHttpClient);
    hasPersonalToken.value = true;
    usesKnownToken.value = false;
  } catch (error) {
    notifyError(BackendTranslationKeys.mcp_access_token_load_failed, error);
  } finally {
    loadingToken.value = false;
  }
}

async function revokePersonalToken() {
  revokeDialogOpen.value = false;
  loadingToken.value = true;
  try {
    await McpInstructionHelper.revokePersonalToken(mcpHttpClient);
    personalToken.value = null;
    hasPersonalToken.value = false;
    usesKnownToken.value = false;
    // Without a token the steps are gone – the account choice starts over.
    accessMode.value = null;
    accountSectionCollapsed.value = false;
    notificationsStore.add({ title: translate(BackendTranslationKeys.mcp_access_token_revoked), type: 'success' });
  } catch (error) {
    notifyError(BackendTranslationKeys.mcp_access_token_revoke_failed, error);
  } finally {
    loadingToken.value = false;
  }
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    notificationsStore.add({ title: translate(BackendTranslationKeys.copied), type: 'success' });
  } catch (error) {
    notifyError(BackendTranslationKeys.error, error);
  }
}
</script>

<template>
  <private-view :title="translate(page.labelKey)" :icon="page.icon">
    <template #headline>
      <v-breadcrumb :items="[{ name: RocketMealsModulePages.MODULE_NAME, to: RocketMealsModulePages.getRoute() }]" />
    </template>

    <template #navigation>
      <module-navigation />
    </template>

    <div class="mcp-instruction">
      <p class="markdown" v-html="renderMarkdown(translate(BackendTranslationKeys.mcp_instruction_intro))" />

      <section class="section">
        <button class="section-header" :aria-expanded="!isProviderCollapsed" @click="providerSectionCollapsed = !isProviderCollapsed">
          <v-icon name="smart_toy" />
          <span class="section-header-text">
            <span class="type-label">{{ translate(BackendTranslationKeys.mcp_provider) }}</span>
            <span v-if="selectedProviderLabel" class="type-note">{{ selectedProviderLabel }}</span>
          </span>
          <v-icon :name="isProviderCollapsed ? 'expand_more' : 'expand_less'" />
        </button>
        <template v-if="!isProviderCollapsed">
          <p class="markdown" v-html="renderMarkdown(translate(BackendTranslationKeys.mcp_choose_provider))" />
          <div class="choices">
            <button v-for="option in McpInstructionHelper.PROVIDERS" :key="option.provider" class="choice" :class="{ active: option.provider === provider }" @click="selectProvider(option.provider)">
              <v-icon :name="option.provider === provider ? 'radio_button_checked' : 'radio_button_unchecked'" />
              {{ getProviderLabel(option) }}
            </button>
          </div>
        </template>
      </section>

      <section v-if="provider" class="section">
        <button class="section-header" :aria-expanded="!isAccountCollapsed" @click="accountSectionCollapsed = !isAccountCollapsed">
          <v-icon :name="accessMode ? ACCESS_MODE_ICONS[accessMode] : 'person'" />
          <span class="section-header-text">
            <span class="type-label">{{ translate(BackendTranslationKeys.mcp_account) }}</span>
            <span v-if="accessMode" class="type-note">{{ accessModeLabels[accessMode] }}</span>
          </span>
          <v-icon :name="isAccountCollapsed ? 'expand_more' : 'expand_less'" />
        </button>
        <template v-if="!isAccountCollapsed">
          <p class="markdown" v-html="renderMarkdown(translate(BackendTranslationKeys.mcp_access_choice_question))" />
          <div class="choices">
            <button class="choice" :class="{ active: accessMode === 'personal' }" @click="selectAccessMode('personal')">
              <v-icon :name="accessMode === 'personal' ? 'radio_button_checked' : 'radio_button_unchecked'" />
              {{ translate(BackendTranslationKeys.mcp_connect_with_account) }}
            </button>
            <button class="choice" :class="{ active: accessMode === 'public' }" @click="selectAccessMode('public')">
              <v-icon :name="accessMode === 'public' ? 'radio_button_checked' : 'radio_button_unchecked'" />
              {{ translate(BackendTranslationKeys.mcp_continue_without_account) }}
            </button>
          </div>
        </template>

        <template v-if="accessMode === 'personal' && !personalToken">
          <v-progress-circular v-if="hasPersonalToken === null || (loadingToken && !hasPersonalToken)" indeterminate />
          <template v-else-if="hasPersonalToken">
            <p class="markdown" v-html="renderMarkdown(translate(BackendTranslationKeys.mcp_access_token_exists_hint))" />
            <div class="choices">
              <button class="choice" :class="{ active: usesKnownToken }" @click="usesKnownToken = true">
                <v-icon :name="usesKnownToken ? 'radio_button_checked' : 'radio_button_unchecked'" />
                {{ translate(BackendTranslationKeys.mcp_access_token_known_yes) }}
              </button>
              <button class="choice" :disabled="loadingToken" @click="createPersonalToken">
                <v-progress-circular v-if="loadingToken" indeterminate small />
                <v-icon v-else name="key" />
                {{ translate(BackendTranslationKeys.mcp_access_token_known_no) }}
              </button>
            </div>
          </template>
        </template>
      </section>

      <section v-if="steps.length > 0" class="section">
        <div class="type-title">{{ translate(BackendTranslationKeys.mcp_steps_title) }}</div>
        <p v-if="isTokenPlaceholder" class="markdown" v-html="renderMarkdown(translate(BackendTranslationKeys.mcp_access_token_placeholder_hint))" />
        <ol class="steps">
          <li v-for="(step, index) in steps" :key="step.textKey" class="step">
            <span class="step-number">{{ index + 1 }}</span>
            <div class="step-content">
              <p class="markdown" v-html="renderMarkdown(translate(step.textKey))" />
              <template v-if="step.copyValue">
                <button class="copy-row" @click="copyToClipboard(step.copyValue)">
                  <span class="copy-value">{{ step.copyValue }}</span>
                  <v-icon name="content_copy" />
                </button>
                <div v-if="index === firstCopyStepIndex" class="type-note tap-hint">{{ translate(BackendTranslationKeys.mcp_tap_to_copy) }}</div>
              </template>
            </div>
          </li>
        </ol>
      </section>

      <section v-if="accessMode === 'personal' && hasPersonalToken" class="section">
        <div class="type-title">{{ translate(BackendTranslationKeys.mcp_access_token) }}</div>
        <template v-if="personalToken">
          <p class="markdown" v-html="renderMarkdown(translate(BackendTranslationKeys.mcp_access_token_personal_hint))" />
          <button class="copy-row" @click="copyToClipboard(personalToken)">
            <span class="copy-value">{{ personalToken }}</span>
            <v-icon name="content_copy" />
          </button>
        </template>
        <p v-else class="markdown" v-html="renderMarkdown(translate(BackendTranslationKeys.mcp_access_token_unknown_hint))" />
        <div>
          <v-button kind="danger" secondary :loading="loadingToken" @click="revokeDialogOpen = true">
            <v-icon name="key_off" left />
            {{ translate(BackendTranslationKeys.mcp_access_token_revoke) }}
          </v-button>
        </div>
      </section>

      <p class="type-note">{{ translate(BackendTranslationKeys.mcp_trademark_notice) }}</p>
    </div>

    <v-dialog v-model="revokeDialogOpen" @esc="revokeDialogOpen = false">
      <v-card>
        <v-card-title>{{ translate(BackendTranslationKeys.mcp_access_token_revoke) }}</v-card-title>
        <v-card-text>{{ translate(BackendTranslationKeys.mcp_access_token_revoke_confirm) }}</v-card-text>
        <v-card-actions>
          <v-button secondary @click="revokeDialogOpen = false">{{ translate(BackendTranslationKeys.cancel) }}</v-button>
          <v-button kind="danger" @click="revokePersonalToken">{{ translate(BackendTranslationKeys.mcp_access_token_revoke) }}</v-button>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </private-view>
</template>

<style scoped>
.mcp-instruction {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-inline-size: 48rem;
  padding: var(--content-padding);
  padding-block-start: 0;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.markdown {
  line-height: 1.6;
}

.markdown :deep(code) {
  font-family: var(--theme--fonts--monospace--font-family, monospace);
}

.section-header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 1rem;
  color: var(--theme--foreground);
  text-align: start;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  cursor: pointer;
  transition: border-color var(--fast) var(--transition);
}

.section-header:hover {
  border-color: var(--theme--primary);
}

.section-header-text {
  display: flex;
  flex: 1;
  flex-direction: column;
}

.choices {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.choice {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 1rem;
  color: var(--theme--foreground);
  text-align: start;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  cursor: pointer;
  transition: border-color var(--fast) var(--transition);
}

.choice:hover,
.choice.active {
  border-color: var(--theme--primary);
}

.choice.active {
  --v-icon-color: var(--theme--primary);
}

.steps {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.step {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.step-number {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  inline-size: 1.75rem;
  block-size: 1.75rem;
  color: var(--foreground-inverted, #fff);
  font-weight: 700;
  background: var(--theme--primary);
  border-radius: 50%;
}

.step-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.5rem;
  min-inline-size: 0;
}

.copy-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  color: var(--theme--foreground);
  text-align: start;
  background: var(--theme--background-subdued);
  border: var(--theme--border-width) solid var(--theme--border-color-subdued);
  border-radius: var(--theme--border-radius);
  cursor: pointer;
  transition: border-color var(--fast) var(--transition);
}

.copy-row:hover {
  border-color: var(--theme--primary);
}

.copy-value {
  overflow-wrap: anywhere;
}

.tap-hint {
  margin-block-start: -0.25rem;
}
</style>
