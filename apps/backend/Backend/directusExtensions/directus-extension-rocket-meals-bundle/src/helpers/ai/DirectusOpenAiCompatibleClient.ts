import OpenAI from 'openai';
import { ApiContext } from '../ApiContext';

/** The OpenAI-compatible provider configured in Directus under Settings → AI. */
export type DirectusOpenAiCompatibleSettings = {
  name: string | null;
  baseUrl: string;
  apiKey: string;
  headers: Record<string, string>;
  models: string[];
};

type RawSettingsRow = {
  ai_openai_compatible_name?: string | null;
  ai_openai_compatible_base_url?: string | null;
  ai_openai_compatible_api_key?: string | null;
  ai_openai_compatible_headers?: unknown;
  ai_openai_compatible_models?: unknown;
};

const SETTINGS_COLUMNS = ['ai_openai_compatible_name', 'ai_openai_compatible_base_url', 'ai_openai_compatible_api_key', 'ai_openai_compatible_headers', 'ai_openai_compatible_models'];

function parseJsonValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

/** The custom headers, stored as a list of `{ header, value }` entries; incomplete entries are skipped. */
function parseHeaders(rawHeaders: unknown): Record<string, string> {
  const headers: Record<string, string> = {};
  if (!Array.isArray(rawHeaders)) {
    return headers;
  }
  for (const entry of rawHeaders) {
    const header = (entry as { header?: unknown })?.header;
    const value = (entry as { value?: unknown })?.value;
    if (typeof header === 'string' && header.trim() && typeof value === 'string') {
      headers[header.trim()] = value;
    }
  }
  return headers;
}

/** The model ids, stored either as plain strings or as `{ id }` entries; empty ids are skipped. */
function parseModels(rawModels: unknown): string[] {
  const models: string[] = [];
  if (!Array.isArray(rawModels)) {
    return models;
  }
  for (const entry of rawModels) {
    const id = typeof entry === 'string' ? entry : (entry as { id?: unknown })?.id;
    if (typeof id === 'string' && id.trim()) {
      models.push(id.trim());
    }
  }
  return models;
}

/**
 * Client for the OpenAI-compatible provider that is stored in the Directus settings (the same one the
 * AI assistant of the Directus app uses), so the provider is configured once per server in the UI.
 *
 * Separate from `helpers/ai/moderation` (OpenAI moderation endpoint for the food image generation):
 * OpenAI-compatible servers usually only offer chat completions.
 */
export class DirectusOpenAiCompatibleClient {
  private readonly settings: DirectusOpenAiCompatibleSettings;
  private readonly openai: OpenAI;

  constructor(settings: DirectusOpenAiCompatibleSettings, openai?: OpenAI) {
    this.settings = settings;
    this.openai =
      openai ??
      new OpenAI({
        apiKey: settings.apiKey,
        baseURL: settings.baseUrl,
        defaultHeaders: settings.headers,
        // An agent behind the provider may take a while to answer.
        timeout: 10 * 60 * 1000,
        maxRetries: 1,
      });
  }

  /** Turns the stored settings row into usable settings, or null when no provider is configured. */
  static parseSettings(row: RawSettingsRow | null | undefined): DirectusOpenAiCompatibleSettings | null {
    const baseUrl = row?.ai_openai_compatible_base_url?.trim();
    const apiKey = row?.ai_openai_compatible_api_key?.trim();
    if (!baseUrl || !apiKey) {
      return null;
    }
    const headers = parseHeaders(parseJsonValue(row?.ai_openai_compatible_headers));
    const models = parseModels(parseJsonValue(row?.ai_openai_compatible_models));
    return { name: row?.ai_openai_compatible_name ?? null, baseUrl, apiKey, headers, models };
  }

  /**
   * Reads the provider from the Directus settings, the same way the AI assistant of the Directus app
   * does. The API key is stored encrypted (`special: encrypt`), only the SettingsService without
   * accountability returns it decrypted. A raw read from `directus_settings` would send the cipher
   * text as bearer token (401). These values never leave the backend.
   */
  static async fromDirectusSettings(apiContext: ApiContext): Promise<DirectusOpenAiCompatibleClient | null> {
    const settingsService = new apiContext.services.SettingsService({ schema: await apiContext.getSchema(), accountability: null });
    const row = (await settingsService.readSingleton({ fields: SETTINGS_COLUMNS })) as RawSettingsRow | undefined;
    const settings = DirectusOpenAiCompatibleClient.parseSettings(row);
    return settings ? new DirectusOpenAiCompatibleClient(settings) : null;
  }

  getDefaultModel(): string | null {
    return this.settings.models[0] ?? null;
  }

  /**
   * Who answered, for `action_recommendations.recommended_by_ai`: the provider name from the
   * settings (or the host of its URL) and the model, e.g. `OpenRouter · gpt-4o`.
   */
  getRecommenderLabel(model: string | null = this.getDefaultModel()): string {
    let provider = this.settings.name?.trim() || '';
    if (!provider) {
      try {
        provider = new URL(this.settings.baseUrl).host;
      } catch {
        provider = this.settings.baseUrl;
      }
    }
    return model ? `${provider} · ${model}` : provider;
  }

  /**
   * The content of the first ``` code block (an optional `json` tag right after the opening fence is
   * dropped), or `null` without a complete block. Done with `indexOf` because the equivalent regex
   * backtracks super-linearly.
   */
  static getFencedContent(text: string): string | null {
    const fence = '```';
    const start = text.indexOf(fence);
    if (start < 0) {
      return null;
    }
    const end = text.indexOf(fence, start + fence.length);
    if (end < 0) {
      return null;
    }
    let content = text.slice(start + fence.length, end);
    if (content.slice(0, 4).toLowerCase() === 'json') {
      content = content.slice(4);
    }
    return content.trim();
  }

  /** Extracts the JSON object from a model answer, also when it is wrapped in a code block or text. */
  static extractJson(text: string): unknown {
    const trimmed = text.trim();
    const candidate = DirectusOpenAiCompatibleClient.getFencedContent(trimmed) ?? trimmed;
    try {
      return JSON.parse(candidate);
    } catch {
      const start = candidate.indexOf('{');
      const end = candidate.lastIndexOf('}');
      if (start >= 0 && end > start) {
        return JSON.parse(candidate.slice(start, end + 1));
      }
      throw new Error('The answer of the AI contains no JSON object.');
    }
  }

  /** Sends a system and a user message and returns the parsed JSON object of the answer. */
  async chatJson(options: { system: string; user: string; model?: string }): Promise<unknown> {
    const model = options.model ?? this.getDefaultModel();
    if (!model) {
      throw new Error('No model configured for the OpenAI-compatible provider in the Directus settings.');
    }
    const completion = await this.openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: options.system },
        { role: 'user', content: options.user },
      ],
    });
    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('The AI answered without content.');
    }
    return DirectusOpenAiCompatibleClient.extractJson(content);
  }
}
