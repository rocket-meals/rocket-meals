import { describe, expect, it } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import { CollectionNames } from 'repo-depkit-common/src/databaseTypes/CollectionNames';
import { AiAssistantChatRecording, AiAssistantUiMessage } from '../AiAssistantChatRecording';

const SNAPSHOT_DIR = path.resolve(__dirname, '../../../../../../../../../data/directus-sync-data/configuration/directus-config/snapshot');

function sse(...chunks: object[]): string {
  return chunks.map(chunk => `data: ${JSON.stringify(chunk)}\n\n`).join('') + 'data: [DONE]\n\n';
}

const userMessage: AiAssistantUiMessage = { id: 'msg-user-1', role: 'user', parts: [{ type: 'text', text: 'Wie viele   Speisen\ngibt es heute?' }] };

describe('AiAssistantChatRecording.parseUiMessageStream', () => {
  it('rebuilds text, reasoning, tool calls and usage from the stream', () => {
    const result = AiAssistantChatRecording.parseUiMessageStream(sse({ type: 'start', messageId: 'msg-assistant-1' }, { type: 'start-step' }, { type: 'reasoning-start', id: 'r1' }, { type: 'reasoning-delta', id: 'r1', delta: 'Ich frage ' }, { type: 'reasoning-delta', id: 'r1', delta: 'die Datenbank.' }, { type: 'reasoning-end', id: 'r1' }, { type: 'tool-input-start', toolCallId: 'call-1', toolName: 'items' }, { type: 'tool-input-delta', toolCallId: 'call-1', inputTextDelta: '{"action"' }, { type: 'tool-input-available', toolCallId: 'call-1', toolName: 'items', input: { action: 'read', collection: 'foodoffers' } }, { type: 'tool-output-available', toolCallId: 'call-1', output: { data: [] } }, { type: 'finish-step' }, { type: 'start-step' }, { type: 'text-start', id: 't1' }, { type: 'text-delta', id: 't1', delta: 'Heute gibt es ' }, { type: 'text-delta', id: 't1', delta: '12 Speisen.' }, { type: 'text-end', id: 't1' }, { type: 'finish-step' }, { type: 'finish' }) + `data: ${JSON.stringify({ type: 'data-usage', data: { inputTokens: 1200, outputTokens: 80, totalTokens: 1280 } })}\n\n`);

    expect(result.messageId).toBe('msg-assistant-1');
    expect(result.usage).toEqual({ inputTokens: 1200, outputTokens: 80 });
    expect(result.errorText).toBeNull();
    expect(result.parts).toEqual([{ type: 'step-start' }, { type: 'reasoning', text: 'Ich frage die Datenbank.' }, { type: 'tool-items', toolCallId: 'call-1', state: 'output-available', input: { action: 'read', collection: 'foodoffers' }, output: { data: [] } }, { type: 'step-start' }, { type: 'text', text: 'Heute gibt es 12 Speisen.' }]);
  });

  it('records errors and tool approvals, ignores broken lines and unknown chunks', () => {
    const result = AiAssistantChatRecording.parseUiMessageStream('data: {not json\n\n' + ': comment\n\n' + sse({ type: 'something-new', value: 1 }, { type: 'tool-input-available', toolCallId: 'call-2', toolName: 'items', input: { action: 'delete' } }, { type: 'tool-approval-request', approvalId: 'approval-1', toolCallId: 'call-2' }, { type: 'error', errorText: 'Rate limit' }));

    expect(result.parts).toEqual([{ type: 'tool-items', toolCallId: 'call-2', state: 'approval-requested', input: { action: 'delete' }, approval: { id: 'approval-1' } }]);
    expect(result.errorText).toBe('Rate limit');
    expect(result.usage).toBeNull();
  });
});

describe('AiAssistantChatRecording.mergeResponse', () => {
  it('appends the answer as a new assistant message', () => {
    const merged = AiAssistantChatRecording.mergeResponse([userMessage], { messageId: 'a1', parts: [{ type: 'text', text: 'Hallo' }], usage: null, errorText: null });
    expect(merged).toEqual([userMessage, { id: 'a1', role: 'assistant', parts: [{ type: 'text', text: 'Hallo' }] }]);
  });

  it('continues the last assistant message after a tool approval instead of duplicating it', () => {
    const assistant: AiAssistantUiMessage = {
      id: 'a1',
      role: 'assistant',
      parts: [
        { type: 'text', text: 'Ich lösche das.' },
        { type: 'tool-items', toolCallId: 'call-2', state: 'approval-responded', input: { action: 'delete' } },
      ],
    };
    const merged = AiAssistantChatRecording.mergeResponse([userMessage, assistant], {
      messageId: 'a1',
      parts: [
        { type: 'tool-items', toolCallId: 'call-2', state: 'output-available', output: { ok: true } },
        { type: 'text', text: 'Erledigt.' },
      ],
      usage: null,
      errorText: null,
    });

    expect(merged).toHaveLength(2);
    expect(merged[1]?.parts).toEqual([
      { type: 'text', text: 'Ich lösche das.' },
      { type: 'tool-items', toolCallId: 'call-2', state: 'output-available', output: { ok: true } },
      { type: 'text', text: 'Erledigt.' },
    ]);
  });

  it('keeps the request unchanged when the answer is empty', () => {
    expect(AiAssistantChatRecording.mergeResponse([userMessage], { messageId: 'a1', parts: [], usage: null, errorText: 'x' })).toEqual([userMessage]);
  });
});

describe('AiAssistantChatRecording helpers', () => {
  it('only keeps message-like entries from the request body', () => {
    expect(AiAssistantChatRecording.readRequestMessages({ messages: [userMessage, { foo: 1 }, null, 'x'] })).toEqual([userMessage]);
    expect(AiAssistantChatRecording.readRequestMessages(undefined)).toEqual([]);
    expect(AiAssistantChatRecording.readRequestMessages({ messages: 'nope' })).toEqual([]);
  });

  it('identifies the conversation by its first message and titles it with the first user text', () => {
    expect(AiAssistantChatRecording.getChatKey([userMessage])).toBe('msg-user-1');
    expect(AiAssistantChatRecording.getChatKey([])).toBeNull();
    expect(AiAssistantChatRecording.getTitle([userMessage])).toBe('Wie viele Speisen gibt es heute?');
    const long = AiAssistantChatRecording.getTitle([{ id: 'x', role: 'user', parts: [{ type: 'text', text: 'a'.repeat(500) }] }]);
    expect(long).toHaveLength(AiAssistantChatRecording.TITLE_MAX_LENGTH);
  });

  it('removes embedded data URLs but keeps normal file links', () => {
    const message: AiAssistantUiMessage = {
      id: 'u',
      role: 'user',
      parts: [
        { type: 'file', mediaType: 'image/png', url: 'data:image/png;base64,AAAA' },
        { type: 'file', mediaType: 'image/png', url: 'https://example.org/a.png' },
      ],
    };
    const [cleaned] = AiAssistantChatRecording.removeDataUrls([message]);
    expect(cleaned?.parts[0]?.url).toBe(AiAssistantChatRecording.REMOVED_DATA_URL);
    expect(cleaned?.parts[1]?.url).toBe('https://example.org/a.png');
  });

  it('writes a readable transcript with tool calls', () => {
    const transcript = AiAssistantChatRecording.buildTranscript([
      userMessage,
      {
        id: 'a1',
        role: 'assistant',
        parts: [{ type: 'step-start' }, { type: 'tool-items', toolCallId: 'c', state: 'output-error', input: { action: 'read' }, errorText: 'Forbidden' }, { type: 'text', text: 'Das darf ich nicht.' }],
      },
    ]);
    expect(transcript).toBe('### user\nWie viele   Speisen\ngibt es heute?\n\n### assistant\n[tool items] (output-error) {"action":"read"}\n  -> error: Forbidden\nDas darf ich nicht.');
  });
});

describe('ai_assistant_conversations schema', () => {
  it('has a snapshot for the collection and every field the service writes', () => {
    const collection = CollectionNames.AI_ASSISTANT_CONVERSATIONS;
    expect(fs.existsSync(path.join(SNAPSHOT_DIR, 'collections', `${collection}.json`))).toBe(true);
    const fields = ['id', 'chat_key', 'user', 'title', 'provider', 'model', 'messages', 'message_count', 'transcript', 'context', 'request_count', 'input_tokens', 'output_tokens', 'last_error', 'date_created', 'date_updated'];
    for (const field of fields) {
      expect(fs.existsSync(path.join(SNAPSHOT_DIR, 'fields', collection, `${field}.json`))).toBe(true);
    }
    const relation = JSON.parse(fs.readFileSync(path.join(SNAPSHOT_DIR, 'relations', collection, 'user.json'), 'utf8'));
    expect(relation.schema.on_delete).toBe('CASCADE');
  });
});
