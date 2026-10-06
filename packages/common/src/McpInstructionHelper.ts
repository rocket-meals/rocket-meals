/**
 * Die Anleitung „KI-Assistenten verbinden (MCP)“ ohne Oberfläche: welche Assistenten es gibt, welche
 * Schritte zu welchem gehören, welche Werte die Schritte zum Kopieren anbieten und wie das Token
 * entsteht.
 *
 * Gezeigt wird die Anleitung an zwei Stellen, die sich nichts anderes teilen können als diese Datei:
 * - in der App (React Native): `apps/frontend/app/app/public/mcp-instruction/index.tsx`
 * - im Directus-Modul `Rocket Meals` (Vue): `src/rocket-meals-module/mcp-instruction/mcp-instruction-page.vue`
 *   im Backend-Bundle.
 * Die Texte stehen in `McpInstructionTranslationKeys` (Teil von `CommonTranslationKeys`). Jede
 * Oberfläche rendert nur noch, was hier steht – ein neuer Schritt ist eine Zeile in `STEPS_BY_PROVIDER`
 * plus ein Text.
 *
 * Für Anfragen an den Server bringt jede Oberfläche ihren eigenen {@link McpHttpClient} mit: die App
 * `fetch` mit dem Token des Nutzers, das Directus-Modul den angemeldeten `useApi()`-Client.
 */

import { McpAccessHelper } from './McpAccessHelper';
import { McpInstructionTranslationKeys } from './translations/McpInstructionTranslationKeys';

export type McpProvider = 'claude' | 'openai' | 'other';

/** Ob der KI-Assistent mit dem eigenen Account verbunden wird oder mit dem öffentlichen MCP-User. */
export type McpAccessMode = 'personal' | 'public';

/** Werte, die die Schritte zum Kopieren anbieten. Die mit Token gibt es erst, wenn ein Token (oder der Platzhalter) da ist. */
export type McpCopyValueKind = 'appName' | 'serverUrl' | 'authorizationHeader' | 'serverUrlWithToken';

export type McpInstructionStep = {
  textKey: McpInstructionTranslationKeys;
  copy?: McpCopyValueKind;
};

export type McpProviderOption = {
  provider: McpProvider;
  /** Markenname, wird nicht übersetzt. */
  brandName?: string;
  /** Text für Optionen ohne Markennamen („Andere“). */
  labelKey?: McpInstructionTranslationKeys;
};

export type McpCopyValueContext = {
  appName: string;
  /** Adresse des Backends, z. B. `https://host/rocket-meals/api`. */
  backendUrl: string;
  token: string | null;
};

/**
 * Die Anfragen, die die Anleitung an den eigenen Server stellt. Pfade beginnen mit `/` und hängen an
 * der Backend-Adresse. Jede Methode liefert den geparsten JSON-Body und wirft bei einer fehlgeschlagenen
 * Anfrage.
 */
export interface McpHttpClient {
  get(path: string): Promise<unknown>;
  patch(path: string, body: unknown): Promise<unknown>;
  post(path: string): Promise<unknown>;
}

/** Ergebnis von {@link McpInstructionHelper.loadOrCreatePersonalToken}. */
export type McpPersonalTokenState = { kind: 'created'; token: string } | { kind: 'exists' };

export class McpInstructionHelper {
  static readonly PROVIDERS: readonly McpProviderOption[] = [
    { provider: 'openai', brandName: 'OpenAI (ChatGPT)' },
    { provider: 'claude', brandName: 'Claude' },
    { provider: 'other', labelKey: McpInstructionTranslationKeys.mcp_provider_other },
  ];

  static readonly STEPS_BY_PROVIDER: Readonly<Record<McpProvider, readonly McpInstructionStep[]>> = {
    claude: [
      { textKey: McpInstructionTranslationKeys.mcp_claude_step_open_connectors },
      { textKey: McpInstructionTranslationKeys.mcp_claude_step_add_custom },
      { textKey: McpInstructionTranslationKeys.mcp_claude_step_name, copy: 'appName' },
      { textKey: McpInstructionTranslationKeys.mcp_claude_step_url, copy: 'serverUrl' },
      { textKey: McpInstructionTranslationKeys.mcp_claude_step_continue },
      { textKey: McpInstructionTranslationKeys.mcp_claude_step_authentication },
      { textKey: McpInstructionTranslationKeys.mcp_claude_step_header, copy: 'authorizationHeader' },
      { textKey: McpInstructionTranslationKeys.mcp_claude_step_finish },
    ],
    openai: [
      { textKey: McpInstructionTranslationKeys.mcp_openai_step_open_settings },
      { textKey: McpInstructionTranslationKeys.mcp_openai_step_plugins },
      { textKey: McpInstructionTranslationKeys.mcp_openai_step_add },
      { textKey: McpInstructionTranslationKeys.mcp_openai_step_name, copy: 'appName' },
      { textKey: McpInstructionTranslationKeys.mcp_openai_step_url, copy: 'serverUrlWithToken' },
      { textKey: McpInstructionTranslationKeys.mcp_openai_step_authentication },
      { textKey: McpInstructionTranslationKeys.mcp_openai_step_use },
    ],
    other: [
      { textKey: McpInstructionTranslationKeys.mcp_other_step_url, copy: 'serverUrl' },
      { textKey: McpInstructionTranslationKeys.mcp_other_step_header, copy: 'authorizationHeader' },
      { textKey: McpInstructionTranslationKeys.mcp_other_step_url_with_token, copy: 'serverUrlWithToken' },
    ],
  };

  /** `?assistant=claude` wählt den Assistenten vor, damit ein Link direkt zu seinen Schritten führt. */
  static readonly ASSISTANT_PARAM = 'assistant';

  /** Früherer Name von `assistant` – wird weiter gelesen, damit geteilte Links funktionieren. */
  static readonly LEGACY_ASSISTANT_PARAM = 'ai-agent';

  private static readonly ASSISTANT_PARAM_VALUES: Readonly<Record<string, McpProvider>> = {
    claude: 'claude',
    openai: 'openai',
    chatgpt: 'openai',
    other: 'other',
  };

  static parseAssistantParam(value: string | string[] | null | undefined): McpProvider | null {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw ? (McpInstructionHelper.ASSISTANT_PARAM_VALUES[raw.trim().toLowerCase()] ?? null) : null;
  }

  static getProviderOption(provider: McpProvider | null | undefined): McpProviderOption | undefined {
    return McpInstructionHelper.PROVIDERS.find(option => option.provider === provider);
  }

  /** Index des ersten Schritts mit Kopierwert – dort steht der Hinweis „Zum Kopieren antippen“. */
  static getFirstCopyStepIndex(provider: McpProvider): number {
    return McpInstructionHelper.STEPS_BY_PROVIDER[provider].findIndex(step => step.copy !== undefined);
  }

  /**
   * Das Token, mit dem die Schritte gefüllt werden, oder `null`, solange es noch keins gibt (dann
   * zeigt die Anleitung noch keine Schritte). Kennt der Nutzer sein gespeichertes Token noch, steht
   * {@link McpAccessHelper.TOKEN_PLACEHOLDER} an seiner Stelle.
   */
  static resolveToken(state: { accessMode: McpAccessMode | null; publicToken: string; personalToken: string | null; usesKnownToken: boolean }): string | null {
    if (state.accessMode === 'public') {
      return state.publicToken;
    }
    if (state.accessMode === 'personal') {
      return state.personalToken ?? (state.usesKnownToken ? McpAccessHelper.TOKEN_PLACEHOLDER : null);
    }
    return null;
  }

  static getCopyValue(kind: McpCopyValueKind, context: McpCopyValueContext): string | null {
    switch (kind) {
      case 'appName':
        return context.appName;
      case 'serverUrl':
        return McpAccessHelper.buildServerUrl(context.backendUrl);
      case 'authorizationHeader':
        return context.token ? McpAccessHelper.buildAuthorizationHeaderValue(context.token) : null;
      case 'serverUrlWithToken':
        return context.token ? McpAccessHelper.buildServerUrlWithToken(context.backendUrl, context.token) : null;
    }
  }

  /**
   * Ob der Nutzer schon ein Token hat. Directus liefert ein gesetztes Token verdeckt (`**********`),
   * man sieht also, dass es eins gibt, aber nie wieder welches.
   */
  static async hasPersonalToken(client: McpHttpClient): Promise<boolean> {
    return McpAccessHelper.hasTokenInOwnUserResponse(await client.get(McpAccessHelper.OWN_TOKEN_PATH));
  }

  /** Setzt ein neues Token (Zufallsstring von Directus) am eigenen User. Ersetzt ein vorhandenes. */
  static async createPersonalToken(client: McpHttpClient): Promise<string> {
    const token = McpAccessHelper.parseRandomStringResponse(await client.get(McpAccessHelper.buildRandomStringPath()));
    if (!token) {
      throw new Error('Random string response is invalid');
    }
    await client.patch(McpAccessHelper.OWN_TOKEN_PATH, { token });
    return token;
  }

  /** Löscht das Token des eigenen Users. Alle damit verbundenen KI-Assistenten verlieren den Zugriff. */
  static async revokePersonalToken(client: McpHttpClient): Promise<void> {
    await client.patch(McpAccessHelper.OWN_TOKEN_PATH, { token: null });
  }

  /**
   * „Mit meinem Account verbinden“: Gibt es noch kein Token, wird sofort eins erstellt und gespeichert.
   * Gibt es schon eins, bleibt es unangetastet – dann fragt die Oberfläche, ob der Nutzer es noch kennt.
   */
  static async loadOrCreatePersonalToken(client: McpHttpClient): Promise<McpPersonalTokenState> {
    if (await McpInstructionHelper.hasPersonalToken(client)) {
      return { kind: 'exists' };
    }
    return { kind: 'created', token: await McpInstructionHelper.createPersonalToken(client) };
  }

  /** Lässt den Server den öffentlichen MCP-User sicherstellen und liefert dessen aktuelles Token. */
  static async ensurePublicUser(client: McpHttpClient): Promise<string> {
    const token = McpAccessHelper.parsePublicUserResponse(await client.post(McpAccessHelper.buildPublicUserPath()));
    if (!token) {
      throw new Error('Public MCP user response is invalid');
    }
    return token;
  }
}
