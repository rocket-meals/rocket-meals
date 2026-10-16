/**
 * ClaudeUsageHelper.ts – how much the AI assistant of the Directus app costs, when it talks to Claude.
 *
 * Which provider is Claude: the Anthropic key under Settings → AI (`ai_anthropic_api_key`) first.
 * Without it, the OpenAI-compatible provider of the same settings counts as Claude when its url points
 * to `anthropic.com`, or its name or one of its models says Claude/Anthropic (e.g. Claude behind a
 * proxy). The settings row is read by the endpoint, this file only decides.
 *
 * Where the numbers come from: the Usage & Cost Admin API of Anthropic
 * (`/v1/organizations/cost_report`, `/v1/organizations/usage_report/messages`). It only accepts an
 * Admin API key (`sk-ant-admin…`), a normal API key is rejected. So the key is
 * `AI_ASSISTANT_ANTHROPIC_ADMIN_API_KEY`, or the configured key itself when it already is an admin
 * key. Anthropic has no API for the remaining credit balance: `AI_ASSISTANT_CREDIT_USD` (e.g. `200`)
 * and `AI_ASSISTANT_CREDIT_SINCE` (the day it was topped up, e.g. `2026-10-16`) let the page subtract
 * the costs since then. The reports cover the whole Anthropic organization, not only this server.
 *
 * The API key never leaves the backend; the answer only says where Claude was found.
 */

import { ClaudeProviderSource, ClaudeUsageUnavailableReason, type ClaudeModelUsage, type ClaudeUsageOverview } from '../rocket-meals-module/AiAssistantModuleHelper';

export { ClaudeProviderSource, ClaudeUsageUnavailableReason };
export type { ClaudeModelUsage, ClaudeUsageOverview };
import { DirectusOpenAiCompatibleClient } from './DirectusOpenAiCompatibleClient';

/** The columns of `directus_settings` this helper looks at. */
export type ClaudeSettingsRow = {
  ai_anthropic_api_key?: string | null;
  ai_openai_compatible_name?: string | null;
  ai_openai_compatible_base_url?: string | null;
  ai_openai_compatible_api_key?: string | null;
  ai_openai_compatible_headers?: unknown;
  ai_openai_compatible_models?: unknown;
};

export const CLAUDE_SETTINGS_COLUMNS = ['ai_anthropic_api_key', 'ai_openai_compatible_name', 'ai_openai_compatible_base_url', 'ai_openai_compatible_api_key', 'ai_openai_compatible_headers', 'ai_openai_compatible_models'];

export type ClaudeProvider = {
  source: ClaudeProviderSource;
  /** Shown on the page: `Anthropic` or the name / host of the OpenAI-compatible provider. */
  label: string;
  /** The key Directus sends to Claude – only used here when it happens to be an admin key. */
  apiKey: string | null;
};

/** The part of `fetch` used here, so tests can hand in a fake. */
export type ClaudeUsageFetch = (url: string, init: { headers: Record<string, string> }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

type ReportPage = { data?: { starting_at?: string; results?: Record<string, unknown>[] }[]; has_more?: boolean; next_page?: string | null };

export class ClaudeUsageHelper {
  public static readonly ENV_ADMIN_API_KEY = 'AI_ASSISTANT_ANTHROPIC_ADMIN_API_KEY';
  public static readonly ENV_CREDIT_USD = 'AI_ASSISTANT_CREDIT_USD';
  public static readonly ENV_CREDIT_SINCE = 'AI_ASSISTANT_CREDIT_SINCE';

  public static readonly API_BASE_URL = 'https://api.anthropic.com';
  public static readonly API_VERSION = '2023-06-01';
  public static readonly ADMIN_KEY_PREFIX = 'sk-ant-admin';
  /** Daily buckets per page: the maximum the reports allow. */
  public static readonly PAGE_LIMIT = 31;
  /** Stops the paging after about two and a half years of daily buckets. */
  public static readonly MAX_PAGES = 30;
  public static readonly PROVIDER_LABEL_ANTHROPIC = 'Anthropic';

  private static readonly CLAUDE_NAME_PATTERN = /claude|anthropic/i;

  /** Where Claude is configured under Settings → AI, or null. The Anthropic key wins. */
  static detectProvider(row: ClaudeSettingsRow | null | undefined): ClaudeProvider | null {
    const anthropicKey = row?.ai_anthropic_api_key?.trim();
    if (anthropicKey) {
      return { source: ClaudeProviderSource.ANTHROPIC, label: ClaudeUsageHelper.PROVIDER_LABEL_ANTHROPIC, apiKey: anthropicKey };
    }
    const compatible = DirectusOpenAiCompatibleClient.parseSettings(row);
    if (!compatible) {
      return null;
    }
    const host = ClaudeUsageHelper.getHost(compatible.baseUrl);
    const pointsToAnthropic = host === 'anthropic.com' || host.endsWith('.anthropic.com');
    const namedClaude = ClaudeUsageHelper.CLAUDE_NAME_PATTERN.test(compatible.name ?? '');
    const servesClaude = compatible.models.some(model => ClaudeUsageHelper.CLAUDE_NAME_PATTERN.test(model));
    if (!pointsToAnthropic && !namedClaude && !servesClaude) {
      return null;
    }
    const headerKey = Object.entries(compatible.headers)
      .find(([header]) => header.toLowerCase() === 'x-api-key')?.[1]
      ?.trim();
    return {
      source: ClaudeProviderSource.OPENAI_COMPATIBLE,
      label: compatible.name?.trim() || host || compatible.baseUrl,
      apiKey: headerKey || compatible.apiKey,
    };
  }

  /** The admin key for the reports: the env variable, else the configured key if it is one. */
  static getAdminApiKey(provider: ClaudeProvider | null, envAdminKey: string | null | undefined): string | null {
    const fromEnv = envAdminKey?.trim();
    if (fromEnv) {
      return fromEnv;
    }
    return provider?.apiKey?.startsWith(ClaudeUsageHelper.ADMIN_KEY_PREFIX) ? provider.apiKey : null;
  }

  /** `AI_ASSISTANT_CREDIT_USD` as a number, `null` when unset or not a positive number. */
  static parseCreditUsd(value: string | null | undefined): number | null {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = Number.parseFloat(trimmed.split(',').join('.'));
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  /** `AI_ASSISTANT_CREDIT_SINCE` as the start of that day (UTC), `null` when unset or not a date. */
  static parseCreditSince(value: string | null | undefined): Date | null {
    const trimmed = value?.trim();
    if (!trimmed) {
      return null;
    }
    const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? `${trimmed}T00:00:00Z` : trimmed);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  static getStartOfMonthUtc(now: Date): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  static getDaysAgoUtc(now: Date, days: number): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days));
  }

  /** Sum of a cost report in USD. The report states amounts in cents, as decimal strings. */
  static sumCostReportUsd(pages: ReportPage[]): number {
    const cents = pages
      .flatMap(page => page.data ?? [])
      .flatMap(bucket => bucket.results ?? [])
      .filter(result => (result['currency'] ?? 'USD') === 'USD')
      .map(result => Number.parseFloat(String(result['amount'] ?? '0')))
      .filter(amount => Number.isFinite(amount))
      .reduce((sum, amount) => sum + amount, 0);
    return cents / 100;
  }

  /** Tokens per model of a usage report grouped by model, most output first. */
  static sumUsageReportByModel(pages: ReportPage[]): ClaudeModelUsage[] {
    const byModel = new Map<string, ClaudeModelUsage>();
    const results = pages.flatMap(page => page.data ?? []).flatMap(bucket => bucket.results ?? []);
    for (const result of results) {
      const model = typeof result['model'] === 'string' && result['model'] ? result['model'] : '?';
      const entry = byModel.get(model) ?? { model, input_tokens: 0, output_tokens: 0, cache_read_tokens: 0, cache_write_tokens: 0 };
      const cacheCreation = (result['cache_creation'] ?? {}) as Record<string, unknown>;
      entry.input_tokens += ClaudeUsageHelper.toNumber(result['uncached_input_tokens']);
      entry.output_tokens += ClaudeUsageHelper.toNumber(result['output_tokens']);
      entry.cache_read_tokens += ClaudeUsageHelper.toNumber(result['cache_read_input_tokens']);
      entry.cache_write_tokens += ClaudeUsageHelper.toNumber(cacheCreation['ephemeral_5m_input_tokens']) + ClaudeUsageHelper.toNumber(cacheCreation['ephemeral_1h_input_tokens']);
      byModel.set(model, entry);
    }
    return [...byModel.values()].sort((a, b) => b.output_tokens - a.output_tokens || a.model.localeCompare(b.model));
  }

  /** Reads all pages of a report from `startingAt` until now. Throws on an error answer. */
  static async fetchReport(fetchFn: ClaudeUsageFetch, adminApiKey: string, path: string, startingAt: Date, extraParams: string[] = []): Promise<ReportPage[]> {
    const headers = { 'x-api-key': adminApiKey, 'anthropic-version': ClaudeUsageHelper.API_VERSION };
    const baseParams = [`starting_at=${encodeURIComponent(startingAt.toISOString())}`, 'bucket_width=1d', `limit=${ClaudeUsageHelper.PAGE_LIMIT}`, ...extraParams];
    const fetchFrom = async (pageToken: string | null, pagesLeft: number): Promise<ReportPage[]> => {
      const params = pageToken ? [...baseParams, `page=${encodeURIComponent(pageToken)}`] : baseParams;
      const response = await fetchFn(`${ClaudeUsageHelper.API_BASE_URL}${path}?${params.join('&')}`, { headers });
      if (!response.ok) {
        throw new Error(`Anthropic answered ${response.status} for ${path}`);
      }
      const page = (await response.json()) as ReportPage;
      if (!page.has_more || !page.next_page || pagesLeft <= 1) {
        return [page];
      }
      return [page, ...(await fetchFrom(page.next_page, pagesLeft - 1))];
    };
    return fetchFrom(null, ClaudeUsageHelper.MAX_PAGES);
  }

  /** Everything the page shows, from the settings row and the env values. */
  static async getOverview(params: { row: ClaudeSettingsRow | null | undefined; envAdminKey?: string | null; envCreditUsd?: string | null; envCreditSince?: string | null; fetchFn: ClaudeUsageFetch; now?: Date }): Promise<ClaudeUsageOverview> {
    const now = params.now ?? new Date();
    const provider = ClaudeUsageHelper.detectProvider(params.row);
    const creditUsd = ClaudeUsageHelper.parseCreditUsd(params.envCreditUsd);
    const creditSince = ClaudeUsageHelper.parseCreditSince(params.envCreditSince);
    const overview: ClaudeUsageOverview = {
      provider: provider ? { source: provider.source, label: provider.label } : null,
      unavailable_reason: null,
      cost_month_usd: null,
      models_last_30_days: [],
      credit_usd: creditUsd,
      credit_since: creditSince ? creditSince.toISOString() : null,
      cost_since_credit_usd: null,
      credit_remaining_usd: null,
      fetched_at: now.toISOString(),
    };
    const adminApiKey = ClaudeUsageHelper.getAdminApiKey(provider, params.envAdminKey);
    if (!provider && !adminApiKey) {
      return { ...overview, unavailable_reason: ClaudeUsageUnavailableReason.NO_CLAUDE_PROVIDER };
    }
    if (!adminApiKey) {
      return { ...overview, unavailable_reason: ClaudeUsageUnavailableReason.NO_ADMIN_KEY };
    }
    try {
      const monthStart = ClaudeUsageHelper.getStartOfMonthUtc(now);
      const [monthCost, usage, creditCost] = await Promise.all([ClaudeUsageHelper.fetchReport(params.fetchFn, adminApiKey, '/v1/organizations/cost_report', monthStart), ClaudeUsageHelper.fetchReport(params.fetchFn, adminApiKey, '/v1/organizations/usage_report/messages', ClaudeUsageHelper.getDaysAgoUtc(now, 30), [`group_by[]=model`]), creditSince && creditSince < now ? ClaudeUsageHelper.fetchReport(params.fetchFn, adminApiKey, '/v1/organizations/cost_report', creditSince) : Promise.resolve(null)]);
      const costSinceCredit = creditCost ? ClaudeUsageHelper.sumCostReportUsd(creditCost) : creditSince ? 0 : null;
      return {
        ...overview,
        cost_month_usd: ClaudeUsageHelper.sumCostReportUsd(monthCost),
        models_last_30_days: ClaudeUsageHelper.sumUsageReportByModel(usage),
        cost_since_credit_usd: costSinceCredit,
        credit_remaining_usd: creditUsd !== null && costSinceCredit !== null ? creditUsd - costSinceCredit : null,
      };
    } catch (error) {
      console.error('[ClaudeUsageHelper] reading the Anthropic usage failed', error);
      return { ...overview, unavailable_reason: ClaudeUsageUnavailableReason.REQUEST_FAILED };
    }
  }

  private static toNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private static getHost(url: string): string {
    try {
      return new URL(url).host.toLowerCase();
    } catch {
      return '';
    }
  }
}

/** Keeps the last answer for a few minutes: the reports change slowly and Anthropic limits the calls. */
export class ClaudeUsageCache {
  public static readonly TTL_MS = 5 * 60 * 1000;
  private static entry: { overview: ClaudeUsageOverview; storedAt: number } | null = null;

  static get(now: number): ClaudeUsageOverview | null {
    const entry = ClaudeUsageCache.entry;
    return entry && now - entry.storedAt < ClaudeUsageCache.TTL_MS ? entry.overview : null;
  }

  static set(overview: ClaudeUsageOverview, now: number): void {
    ClaudeUsageCache.entry = { overview, storedAt: now };
  }

  static clear(): void {
    ClaudeUsageCache.entry = null;
  }
}
