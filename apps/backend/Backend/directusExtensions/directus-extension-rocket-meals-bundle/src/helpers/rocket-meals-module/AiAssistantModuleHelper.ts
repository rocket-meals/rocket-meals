/**
 * AiAssistantModuleHelper.ts – data side of the page "KI-Assistent" of the Rocket Meals module
 * (`ai-assistant-page.vue`): the chat of the Directus AI assistant, embedded on its own page, and
 * the Claude usage next to it.
 *
 * The chat is not a second chat: the page talks to the same Pinia store (`ai-store`) the sidebar
 * of the Directus app uses, so messages, model and conversation are the same in both places. Directus
 * does not hand this store to extensions (`useStores()` lacks it), but Pinia is shared with
 * extensions, so the store is found by its id. If a Directus update renames it, the page falls back
 * to a hint pointing to the sidebar.
 *
 * The usage comes from `GET /rocket-meals-ai-assistant-usage` (`ai-assistant-usage-endpoint`, built on
 * `helpers/ai/ClaudeUsageHelper`). No Vue and no `openai` in here, so the rules are testable in Node
 * and the file can go into the app bundle.
 */

import { BackendTranslationKeys } from '../translations/BackendTranslationKeys';

export enum ClaudeProviderSource {
  /** Settings → AI → Anthropic. */
  ANTHROPIC = 'anthropic',
  /** Settings → AI → OpenAI-compatible, pointing to Claude. */
  OPENAI_COMPATIBLE = 'openai_compatible',
}

export enum ClaudeUsageUnavailableReason {
  /** Neither the Anthropic key nor an OpenAI-compatible provider for Claude is configured. */
  NO_CLAUDE_PROVIDER = 'no_claude_provider',
  /** Claude is configured, but there is no Admin API key to read the reports with. */
  NO_ADMIN_KEY = 'no_admin_key',
  /** Anthropic answered with an error (e.g. a revoked admin key). */
  REQUEST_FAILED = 'request_failed',
}

export type ClaudeModelUsage = {
  model: string;
  input_tokens: number;
  output_tokens: number;
  cache_read_tokens: number;
  cache_write_tokens: number;
};

/** `GET /rocket-meals-ai-assistant-usage` → `{ data: ClaudeUsageOverview }`. */
export type ClaudeUsageOverview = {
  provider: { source: ClaudeProviderSource; label: string } | null;
  /** Why there are no numbers; `null` when there are. */
  unavailable_reason: ClaudeUsageUnavailableReason | null;
  /** Costs of the current calendar month (UTC) in USD. */
  cost_month_usd: number | null;
  /** Tokens of the last 30 days, per model. */
  models_last_30_days: ClaudeModelUsage[];
  /** `AI_ASSISTANT_CREDIT_USD`, `null` when not set. */
  credit_usd: number | null;
  /** `AI_ASSISTANT_CREDIT_SINCE` as ISO timestamp, `null` when not set. */
  credit_since: string | null;
  /** Costs since `credit_since` in USD. */
  cost_since_credit_usd: number | null;
  /** `credit_usd - cost_since_credit_usd`, `null` when one of them is missing. */
  credit_remaining_usd: number | null;
  fetched_at: string;
};

/** The part of the Directus app's axios instance used here. */
export type AiAssistantApiClient = {
  get: (url: string, config?: { params?: Record<string, string> }) => Promise<{ data?: any }>;
};

/** One part of a chat message, reduced to what the page renders. */
export type AiChatDisplayPart = { kind: 'text'; text: string } | { kind: 'reasoning'; text: string } | { kind: 'file'; name: string } | { kind: 'tool'; toolName: string; state: string; approvalId: string | null; errorText: string | null };

/** The fields of a message of the Directus AI store (an AI SDK `UIMessage`) the page reads. */
export type AiChatMessage = { id: string; role: string; parts?: Record<string, any>[] };

/** The model entries of the Directus AI store (`ModelDefinition` of `@directus/ai`). */
export type AiChatModel = { provider: string; model: string; name?: string };

/** The members of the Directus AI store (`app/src/ai/stores/use-ai.ts`) the page uses. */
export type DirectusAiStore = {
  input: string;
  chatOpen: boolean;
  messages: AiChatMessage[];
  status: string;
  error: { message?: string } | undefined | null;
  models: AiChatModel[];
  selectedModel: AiChatModel | null;
  isUiLoading: boolean;
  hasPendingToolCall: boolean;
  showAssistantLoadingIndicator: boolean;
  tokenUsage: { inputTokens: number; outputTokens: number; totalTokens: number };
  contextUsagePercentage: number;
  submit: () => Promise<void>;
  stop: () => void;
  retry: () => void;
  reset: () => void;
  selectModel: (model: AiChatModel) => void;
  approveToolCall: (approvalId: string) => void;
  denyToolCall: (approvalId: string) => void;
};

export class AiAssistantModuleHelper {
  public static readonly USAGE_ENDPOINT_ID = 'rocket-meals-ai-assistant-usage';
  public static readonly USAGE_ENDPOINT = `/${AiAssistantModuleHelper.USAGE_ENDPOINT_ID}`;

  /** Id of the Pinia store behind the AI assistant of the Directus app. */
  public static readonly DIRECTUS_AI_STORE_ID = 'ai-store';

  /** Directus' own settings page for the AI providers. */
  public static readonly AI_SETTINGS_ROUTE = '/settings/ai';

  /** Below this share of the credit left the remaining credit is shown as a warning. */
  public static readonly LOW_CREDIT_SHARE = 0.2;

  static async loadUsage(api: AiAssistantApiClient, refresh = false): Promise<ClaudeUsageOverview | null> {
    const response = await api.get(AiAssistantModuleHelper.USAGE_ENDPOINT, refresh ? { params: { refresh: '1' } } : undefined);
    return ((response.data as { data?: ClaudeUsageOverview } | undefined)?.data ?? null) as ClaudeUsageOverview | null;
  }

  /**
   * The AI store of the Directus app from the shared Pinia instance, or null when it is not there
   * (AI disabled, or Directus renamed it). `pinia._s` is Pinia's map of the created stores.
   */
  static findDirectusAiStore(pinia: unknown): DirectusAiStore | null {
    const stores = (pinia as { _s?: Map<string, unknown> } | null | undefined)?._s;
    const store = stores instanceof Map ? stores.get(AiAssistantModuleHelper.DIRECTUS_AI_STORE_ID) : undefined;
    if (!store || typeof (store as DirectusAiStore).submit !== 'function' || !Array.isArray((store as DirectusAiStore).messages)) {
      return null;
    }
    return store as DirectusAiStore;
  }

  /** The parts of a message the page shows, in order. Step markers and empty texts are dropped. */
  static toDisplayParts(message: AiChatMessage): AiChatDisplayPart[] {
    const parts: AiChatDisplayPart[] = [];
    for (const part of message.parts ?? []) {
      const type = typeof part?.type === 'string' ? part.type : '';
      if (type === 'text' && typeof part.text === 'string' && part.text.trim()) {
        parts.push({ kind: 'text', text: part.text });
      } else if (type === 'reasoning' && typeof part.text === 'string' && part.text.trim()) {
        parts.push({ kind: 'reasoning', text: part.text });
      } else if (type === 'file') {
        parts.push({ kind: 'file', name: typeof part.filename === 'string' ? part.filename : (part.mediaType ?? '') });
      } else if (type === 'dynamic-tool' || type.startsWith('tool-')) {
        parts.push({
          kind: 'tool',
          toolName: type === 'dynamic-tool' ? String(part.toolName ?? '') : type.slice('tool-'.length),
          state: typeof part.state === 'string' ? part.state : '',
          approvalId: part.state === 'approval-requested' && typeof part.approval?.id === 'string' ? part.approval.id : null,
          errorText: typeof part.errorText === 'string' ? part.errorText : null,
        });
      }
    }
    return parts;
  }

  /** The key of a model entry, the same `provider:model` the Directus store keeps. */
  static getModelKey(model: AiChatModel | null | undefined): string | null {
    return model ? `${model.provider}:${model.model}` : null;
  }

  static getToolStateIcon(state: string): string {
    switch (state) {
      case 'output-available':
        return 'check_circle';
      case 'output-error':
      case 'output-denied':
        return 'error';
      case 'approval-requested':
        return 'pending';
      default:
        return 'progress_activity';
    }
  }

  static getUnavailableTextKey(reason: ClaudeUsageUnavailableReason): BackendTranslationKeys {
    switch (reason) {
      case ClaudeUsageUnavailableReason.NO_CLAUDE_PROVIDER:
        return BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_no_provider;
      case ClaudeUsageUnavailableReason.NO_ADMIN_KEY:
        return BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_no_admin_key;
      default:
        return BackendTranslationKeys.rocket_meals_module_ai_assistant_usage_failed;
    }
  }

  static getProviderSourceTextKey(source: ClaudeProviderSource): BackendTranslationKeys {
    return source === ClaudeProviderSource.ANTHROPIC ? BackendTranslationKeys.rocket_meals_module_ai_assistant_source_anthropic : BackendTranslationKeys.rocket_meals_module_ai_assistant_source_openai_compatible;
  }

  /** Share of the credit already used (0–1), `null` without credit. */
  static getCreditUsedShare(overview: ClaudeUsageOverview | null): number | null {
    if (!overview || overview.credit_usd === null || overview.credit_usd <= 0 || overview.cost_since_credit_usd === null) {
      return null;
    }
    return Math.min(1, Math.max(0, overview.cost_since_credit_usd / overview.credit_usd));
  }

  static isCreditLow(overview: ClaudeUsageOverview | null): boolean {
    const used = AiAssistantModuleHelper.getCreditUsedShare(overview);
    return used !== null && 1 - used < AiAssistantModuleHelper.LOW_CREDIT_SHARE;
  }

  static formatUsd(value: number, language: string | undefined): string {
    return new Intl.NumberFormat(language, { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
  }

  /** Compact token counts, e.g. `1,2 Mio.` in German. */
  static formatTokens(value: number, language: string | undefined): string {
    return new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(value);
  }

  /** Only the day, the credit counts from midnight UTC on. */
  static formatDate(isoDate: string | null, language: string | undefined): string {
    return isoDate ? new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(isoDate)) : '';
  }

  static formatPercent(share: number, language: string | undefined): string {
    return new Intl.NumberFormat(language, { style: 'percent', maximumFractionDigits: 0 }).format(share);
  }
}
