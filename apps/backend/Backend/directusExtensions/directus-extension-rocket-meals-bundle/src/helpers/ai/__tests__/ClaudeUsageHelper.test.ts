import { describe, expect, it } from '@jest/globals';
import { ClaudeProviderSource, ClaudeUsageCache, ClaudeUsageHelper, ClaudeUsageUnavailableReason, type ClaudeUsageFetch } from '../ClaudeUsageHelper';
import { AiAssistantModuleHelper } from '../../rocket-meals-module/AiAssistantModuleHelper';

const NOW = new Date('2026-10-16T12:00:00Z');

function fakeFetch(pagesByPath: Record<string, unknown[]>, calls: string[] = []): ClaudeUsageFetch {
  const counters: Record<string, number> = {};
  return async url => {
    calls.push(url);
    const path = new URL(url).pathname;
    const startingAt = new URL(url).searchParams.get('starting_at') ?? '';
    const key = `${path}|${startingAt}`;
    const pages = pagesByPath[key] ?? pagesByPath[path] ?? [];
    const index = counters[key] ?? 0;
    counters[key] = index + 1;
    return { ok: true, status: 200, json: async () => pages[index] ?? { data: [], has_more: false } };
  };
}

describe('ClaudeUsageHelper.detectProvider', () => {
  it('prefers the Anthropic key', () => {
    const provider = ClaudeUsageHelper.detectProvider({ ai_anthropic_api_key: 'sk-ant-api', ai_openai_compatible_base_url: 'https://api.anthropic.com/v1', ai_openai_compatible_api_key: 'other' });
    expect(provider).toEqual({ source: ClaudeProviderSource.ANTHROPIC, label: 'Anthropic', apiKey: 'sk-ant-api' });
  });

  it('finds Claude behind the OpenAI-compatible provider by url, name or model', () => {
    expect(ClaudeUsageHelper.detectProvider({ ai_openai_compatible_base_url: 'https://api.anthropic.com/v1/', ai_openai_compatible_api_key: 'k' })?.label).toBe('api.anthropic.com');
    expect(ClaudeUsageHelper.detectProvider({ ai_openai_compatible_base_url: 'https://proxy.example.org', ai_openai_compatible_api_key: 'k', ai_openai_compatible_name: 'Claude Proxy' })?.source).toBe(ClaudeProviderSource.OPENAI_COMPATIBLE);
    expect(ClaudeUsageHelper.detectProvider({ ai_openai_compatible_base_url: 'https://openrouter.ai/api/v1', ai_openai_compatible_api_key: 'k', ai_openai_compatible_models: JSON.stringify([{ id: 'anthropic/claude-opus-5-5' }]) })?.label).toBe('openrouter.ai');
  });

  it('takes the x-api-key header over the bearer key', () => {
    const provider = ClaudeUsageHelper.detectProvider({ ai_openai_compatible_base_url: 'https://api.anthropic.com/v1', ai_openai_compatible_api_key: 'bearer', ai_openai_compatible_headers: [{ header: 'X-Api-Key', value: 'sk-ant-admin01' }] });
    expect(provider?.apiKey).toBe('sk-ant-admin01');
  });

  it('ignores other providers and missing settings', () => {
    expect(ClaudeUsageHelper.detectProvider({ ai_openai_compatible_base_url: 'https://api.openai.com/v1', ai_openai_compatible_api_key: 'k', ai_openai_compatible_models: ['gpt-5'] })).toBeNull();
    expect(ClaudeUsageHelper.detectProvider(null)).toBeNull();
  });
});

describe('ClaudeUsageHelper parsing', () => {
  it('uses the env admin key, else a configured admin key', () => {
    const provider = { source: ClaudeProviderSource.ANTHROPIC, label: 'Anthropic', apiKey: 'sk-ant-api01' };
    expect(ClaudeUsageHelper.getAdminApiKey(provider, ' sk-ant-admin-env ')).toBe('sk-ant-admin-env');
    expect(ClaudeUsageHelper.getAdminApiKey(provider, undefined)).toBeNull();
    expect(ClaudeUsageHelper.getAdminApiKey({ ...provider, apiKey: 'sk-ant-admin01-x' }, '')).toBe('sk-ant-admin01-x');
  });

  it('parses credit and date', () => {
    expect(ClaudeUsageHelper.parseCreditUsd('200')).toBe(200);
    expect(ClaudeUsageHelper.parseCreditUsd('199,50')).toBe(199.5);
    expect(ClaudeUsageHelper.parseCreditUsd('abc')).toBeNull();
    expect(ClaudeUsageHelper.parseCreditUsd(undefined)).toBeNull();
    expect(ClaudeUsageHelper.parseCreditSince('2026-10-01')?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
    expect(ClaudeUsageHelper.parseCreditSince('nope')).toBeNull();
  });

  it('sums cost reports (cents) and usage reports per model', () => {
    expect(ClaudeUsageHelper.sumCostReportUsd([{ data: [{ results: [{ amount: '1050.5', currency: 'USD' }] }, { results: [{ amount: '49.5' }] }] }])).toBeCloseTo(11);
    const models = ClaudeUsageHelper.sumUsageReportByModel([
      { data: [{ results: [{ model: 'claude-opus-5-5', uncached_input_tokens: 10, output_tokens: 5, cache_read_input_tokens: 3, cache_creation: { ephemeral_5m_input_tokens: 1, ephemeral_1h_input_tokens: 2 } }] }] },
      {
        data: [
          {
            results: [
              { model: 'claude-opus-5-5', uncached_input_tokens: 1, output_tokens: 1 },
              { model: 'claude-haiku-5-5', output_tokens: 100 },
            ],
          },
        ],
      },
    ]);
    expect(models).toEqual([
      { model: 'claude-haiku-5-5', input_tokens: 0, output_tokens: 100, cache_read_tokens: 0, cache_write_tokens: 0 },
      { model: 'claude-opus-5-5', input_tokens: 11, output_tokens: 6, cache_read_tokens: 3, cache_write_tokens: 3 },
    ]);
  });
});

describe('ClaudeUsageHelper.getOverview', () => {
  const row = { ai_anthropic_api_key: 'sk-ant-api01' };

  it('explains a missing provider and a missing admin key', async () => {
    const none = await ClaudeUsageHelper.getOverview({ row: {}, fetchFn: fakeFetch({}), now: NOW });
    expect(none.unavailable_reason).toBe(ClaudeUsageUnavailableReason.NO_CLAUDE_PROVIDER);
    const noKey = await ClaudeUsageHelper.getOverview({ row, fetchFn: fakeFetch({}), now: NOW });
    expect(noKey.unavailable_reason).toBe(ClaudeUsageUnavailableReason.NO_ADMIN_KEY);
    expect(noKey.provider).toEqual({ source: ClaudeProviderSource.ANTHROPIC, label: 'Anthropic' });
  });

  it('reads all pages and subtracts the costs since the credit date', async () => {
    const calls: string[] = [];
    const fetchFn = fakeFetch(
      {
        '/v1/organizations/cost_report|2026-10-01T00:00:00.000Z': [
          { data: [{ results: [{ amount: '1000' }] }], has_more: true, next_page: 'p2' },
          { data: [{ results: [{ amount: '500' }] }], has_more: false },
        ],
        '/v1/organizations/cost_report|2026-09-20T00:00:00.000Z': [{ data: [{ results: [{ amount: '2500' }] }], has_more: false }],
        '/v1/organizations/usage_report/messages': [{ data: [{ results: [{ model: 'claude-opus-5-5', output_tokens: 7 }] }], has_more: false }],
      },
      calls
    );
    const overview = await ClaudeUsageHelper.getOverview({ row, envAdminKey: 'sk-ant-admin01', envCreditUsd: '200', envCreditSince: '2026-09-20', fetchFn, now: NOW });
    expect(overview.unavailable_reason).toBeNull();
    expect(overview.cost_month_usd).toBe(15);
    expect(overview.cost_since_credit_usd).toBe(25);
    expect(overview.credit_remaining_usd).toBe(175);
    expect(overview.models_last_30_days[0]?.output_tokens).toBe(7);
    expect(calls.some(url => url.includes('page=p2'))).toBe(true);
    expect(calls.some(url => url.includes('group_by[]=model'))).toBe(true);
    expect(AiAssistantModuleHelper.getCreditUsedShare(overview)).toBeCloseTo(0.125);
    expect(AiAssistantModuleHelper.isCreditLow(overview)).toBe(false);
  });

  it('reports a failed request without throwing', async () => {
    const fetchFn: ClaudeUsageFetch = async () => ({ ok: false, status: 401, json: async () => ({}) });
    const overview = await ClaudeUsageHelper.getOverview({ row, envAdminKey: 'sk-ant-admin01', fetchFn, now: NOW });
    expect(overview.unavailable_reason).toBe(ClaudeUsageUnavailableReason.REQUEST_FAILED);
  });
});

describe('ClaudeUsageCache', () => {
  it('keeps an answer for the TTL', async () => {
    const overview = await ClaudeUsageHelper.getOverview({ row: {}, fetchFn: fakeFetch({}), now: NOW });
    ClaudeUsageCache.set(overview, 1000);
    expect(ClaudeUsageCache.get(1000 + ClaudeUsageCache.TTL_MS - 1)).toBe(overview);
    expect(ClaudeUsageCache.get(1000 + ClaudeUsageCache.TTL_MS)).toBeNull();
    ClaudeUsageCache.clear();
  });
});

describe('AiAssistantModuleHelper', () => {
  it('finds the Directus AI store in the Pinia instance', () => {
    const store = { submit: async () => undefined, messages: [] };
    expect(AiAssistantModuleHelper.findDirectusAiStore({ _s: new Map([['ai-store', store]]) })).toBe(store);
    expect(AiAssistantModuleHelper.findDirectusAiStore({ _s: new Map() })).toBeNull();
    expect(AiAssistantModuleHelper.findDirectusAiStore(undefined)).toBeNull();
  });

  it('reduces message parts to what the page renders', () => {
    const parts = AiAssistantModuleHelper.toDisplayParts({
      id: 'm1',
      role: 'assistant',
      parts: [{ type: 'step-start' }, { type: 'reasoning', text: 'thinking' }, { type: 'text', text: '  ' }, { type: 'tool-items', state: 'approval-requested', approval: { id: 'a1' } }, { type: 'dynamic-tool', toolName: 'mcp_search', state: 'output-error', errorText: 'boom' }, { type: 'text', text: 'Hello' }],
    });
    expect(parts).toEqual([
      { kind: 'reasoning', text: 'thinking' },
      { kind: 'tool', toolName: 'items', state: 'approval-requested', approvalId: 'a1', errorText: null },
      { kind: 'tool', toolName: 'mcp_search', state: 'output-error', approvalId: null, errorText: 'boom' },
      { kind: 'text', text: 'Hello' },
    ]);
  });

  it('lists the page in the module', () => {
    expect(AiAssistantModuleHelper.getModelKey({ provider: 'anthropic', model: 'claude-opus-5-5' })).toBe('anthropic:claude-opus-5-5');
    expect(AiAssistantModuleHelper.getUnavailableTextKey(ClaudeUsageUnavailableReason.NO_ADMIN_KEY)).toBe('rocket_meals_module_ai_assistant_usage_no_admin_key');
  });
});

describe('AiAssistantModuleHelper formatting', () => {
  it('formats the credit day without time', () => {
    expect(AiAssistantModuleHelper.formatDate('2026-10-01T00:00:00.000Z', 'en-US')).toBe('Oct 1, 2026');
    expect(AiAssistantModuleHelper.formatDate(null, 'en-US')).toBe('');
  });
});
