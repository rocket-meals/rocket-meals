import { McpAccessHelper } from '../McpAccessHelper';
import { McpHttpClient, McpInstructionHelper } from '../McpInstructionHelper';
import { CommonTranslationKeys } from '../translations/CommonTranslationKeys';
import { McpInstructionTranslationKeys } from '../translations/McpInstructionTranslationKeys';

type Call = { method: 'get' | 'patch' | 'post'; path: string; body?: unknown };

function createClient(responses: Record<string, unknown>): { client: McpHttpClient; calls: Call[] } {
  const calls: Call[] = [];
  const respond = (path: string) => {
    if (!(path in responses)) {
      throw new Error('unexpected request ' + path);
    }
    return Promise.resolve(responses[path]);
  };
  return {
    calls,
    client: {
      get: path => {
        calls.push({ method: 'get', path });
        return respond(path);
      },
      patch: (path, body) => {
        calls.push({ method: 'patch', path, body });
        return Promise.resolve({ data: {} });
      },
      post: path => {
        calls.push({ method: 'post', path });
        return respond(path);
      },
    },
  };
}

describe('McpInstructionHelper', () => {
  it('parses the assistant param, including the legacy values', () => {
    expect(McpInstructionHelper.parseAssistantParam('claude')).toBe('claude');
    expect(McpInstructionHelper.parseAssistantParam(' ChatGPT ')).toBe('openai');
    expect(McpInstructionHelper.parseAssistantParam(['other', 'claude'])).toBe('other');
    expect(McpInstructionHelper.parseAssistantParam('gemini')).toBeNull();
    expect(McpInstructionHelper.parseAssistantParam(undefined)).toBeNull();
  });

  it('has steps for every provider, all with a shared translation key', () => {
    const commonKeys = new Set<string>(Object.values(CommonTranslationKeys));
    for (const option of McpInstructionHelper.PROVIDERS) {
      const steps = McpInstructionHelper.STEPS_BY_PROVIDER[option.provider];
      expect(steps.length).toBeGreaterThan(0);
      for (const step of steps) {
        expect(commonKeys.has(step.textKey)).toBe(true);
      }
      expect(option.brandName ?? option.labelKey).toBeTruthy();
    }
  });

  it('names the first step that offers a value to copy', () => {
    expect(McpInstructionHelper.getFirstCopyStepIndex('claude')).toBe(2);
    expect(McpInstructionHelper.getFirstCopyStepIndex('other')).toBe(0);
  });

  it('resolves the token the steps are filled with', () => {
    const base = { publicToken: 'PUBLIC', personalToken: null, usesKnownToken: false };
    expect(McpInstructionHelper.resolveToken({ ...base, accessMode: null })).toBeNull();
    expect(McpInstructionHelper.resolveToken({ ...base, accessMode: 'public' })).toBe('PUBLIC');
    expect(McpInstructionHelper.resolveToken({ ...base, accessMode: 'personal' })).toBeNull();
    expect(McpInstructionHelper.resolveToken({ ...base, accessMode: 'personal', usesKnownToken: true })).toBe(McpAccessHelper.TOKEN_PLACEHOLDER);
    expect(McpInstructionHelper.resolveToken({ ...base, accessMode: 'personal', personalToken: 'abc', usesKnownToken: true })).toBe('abc');
  });

  it('builds the values to copy', () => {
    const context = { appName: 'Rocket Meals', backendUrl: 'https://example.com/api', token: 'abc' };
    expect(McpInstructionHelper.getCopyValue('appName', context)).toBe('Rocket Meals');
    expect(McpInstructionHelper.getCopyValue('serverUrl', context)).toBe('https://example.com/api/mcp');
    expect(McpInstructionHelper.getCopyValue('authorizationHeader', context)).toBe('Bearer abc');
    expect(McpInstructionHelper.getCopyValue('serverUrlWithToken', context)).toBe('https://example.com/api/mcp?access_token=abc');
    expect(McpInstructionHelper.getCopyValue('authorizationHeader', { ...context, token: null })).toBeNull();
  });

  it('creates and saves a token when the user has none', async () => {
    const { client, calls } = createClient({
      [McpAccessHelper.OWN_TOKEN_PATH]: { data: { token: null } },
      [McpAccessHelper.buildRandomStringPath()]: { data: 'random' },
    });
    await expect(McpInstructionHelper.loadOrCreatePersonalToken(client)).resolves.toEqual({ kind: 'created', token: 'random' });
    expect(calls).toContainEqual({ method: 'patch', path: McpAccessHelper.OWN_TOKEN_PATH, body: { token: 'random' } });
  });

  it('keeps an existing token untouched', async () => {
    const { client, calls } = createClient({ [McpAccessHelper.OWN_TOKEN_PATH]: { data: { token: '**********' } } });
    await expect(McpInstructionHelper.loadOrCreatePersonalToken(client)).resolves.toEqual({ kind: 'exists' });
    expect(calls.filter(call => call.method === 'patch')).toEqual([]);
  });

  it('revokes the token by saving null', async () => {
    const { client, calls } = createClient({});
    await McpInstructionHelper.revokePersonalToken(client);
    expect(calls).toEqual([{ method: 'patch', path: McpAccessHelper.OWN_TOKEN_PATH, body: { token: null } }]);
  });

  it('reads the public token from the server and rejects an invalid answer', async () => {
    await expect(McpInstructionHelper.ensurePublicUser(createClient({ '/mcp-public-user': { token: 'PUBLIC' } }).client)).resolves.toBe('PUBLIC');
    await expect(McpInstructionHelper.ensurePublicUser(createClient({ '/mcp-public-user': {} }).client)).rejects.toThrow();
  });

  it('shares its texts through CommonTranslationKeys', () => {
    expect(CommonTranslationKeys.mcp_instruction).toBe(McpInstructionTranslationKeys.mcp_instruction);
  });
});
