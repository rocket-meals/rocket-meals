/**
 * Reine Logik für `ai-assistant-history-hook`: aus Anfrage und gestreamter Antwort von
 * `POST /ai/chat` (Directus KI-Assistent) wird eine gespeicherte Unterhaltung.
 *
 * Der Studio-Client schickt bei jeder Anfrage den kompletten bisherigen Verlauf als `UIMessage[]`
 * (AI SDK) mit, aber keine Chat-ID. Die Unterhaltung erkennen wir deshalb an der ID ihrer ersten
 * Nachricht (`chat_key`). Die Antwort kommt als Server-Sent-Events im UI-Message-Stream-Format,
 * hier wird daraus wieder eine Assistenten-Nachricht.
 *
 * `/ai/chat` ist eine interne Directus-Route. Ändert Directus das Format, darf hier nichts werfen:
 * unbekannte Chunks werden ignoriert.
 */

export type AiAssistantUiMessagePart = Record<string, unknown> & { type: string };

export type AiAssistantUiMessage = {
  id: string;
  role: string;
  parts: AiAssistantUiMessagePart[];
  [key: string]: unknown;
};

export type AiAssistantUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type AiAssistantStreamResult = {
  messageId: string | null;
  parts: AiAssistantUiMessagePart[];
  usage: AiAssistantUsage | null;
  errorText: string | null;
};

type StreamChunk = Record<string, unknown> & { type?: unknown };

export class AiAssistantChatRecording {
  static readonly TITLE_MAX_LENGTH = 120;
  static readonly REMOVED_DATA_URL = '[data URL removed]';

  /**
   * Liest die Server-Sent-Events der Antwort (`data: {...}` je Zeile) und baut die Teile der
   * Assistenten-Nachricht zusammen: Text, Reasoning und Tool-Aufrufe mit Ein- und Ausgabe.
   */
  static parseUiMessageStream(sse: string): AiAssistantStreamResult {
    const result: AiAssistantStreamResult = { messageId: null, parts: [], usage: null, errorText: null };
    const textPartsById = new Map<string, AiAssistantUiMessagePart>();
    const reasoningPartsById = new Map<string, AiAssistantUiMessagePart>();
    const toolPartsById = new Map<string, AiAssistantUiMessagePart>();

    const getToolPart = (chunk: StreamChunk): AiAssistantUiMessagePart => {
      const toolCallId = String(chunk.toolCallId ?? '');
      const existing = toolPartsById.get(toolCallId);
      if (existing) {
        return existing;
      }
      const toolName = String(chunk.toolName ?? 'unknown');
      const part: AiAssistantUiMessagePart = chunk.dynamic === true ? { type: 'dynamic-tool', toolName, toolCallId, state: 'input-streaming' } : { type: `tool-${toolName}`, toolCallId, state: 'input-streaming' };
      toolPartsById.set(toolCallId, part);
      result.parts.push(part);
      return part;
    };

    for (const chunk of AiAssistantChatRecording.readChunks(sse)) {
      const type = typeof chunk.type === 'string' ? chunk.type : '';
      const id = String(chunk.id ?? '');

      if (type === 'start' && typeof chunk.messageId === 'string') {
        result.messageId = chunk.messageId;
      } else if (type === 'text-start') {
        const part: AiAssistantUiMessagePart = { type: 'text', text: '' };
        textPartsById.set(id, part);
        result.parts.push(part);
      } else if (type === 'text-delta') {
        const part = textPartsById.get(id);
        if (part) {
          part.text = String(part.text ?? '') + String(chunk.delta ?? '');
        }
      } else if (type === 'reasoning-start') {
        const part: AiAssistantUiMessagePart = { type: 'reasoning', text: '' };
        reasoningPartsById.set(id, part);
        result.parts.push(part);
      } else if (type === 'reasoning-delta') {
        const part = reasoningPartsById.get(id);
        if (part) {
          part.text = String(part.text ?? '') + String(chunk.delta ?? '');
        }
      } else if (type === 'tool-input-start') {
        getToolPart(chunk);
      } else if (type === 'tool-input-available') {
        Object.assign(getToolPart(chunk), { state: 'input-available', input: chunk.input });
      } else if (type === 'tool-input-error') {
        Object.assign(getToolPart(chunk), { state: 'output-error', input: chunk.input, errorText: chunk.errorText });
      } else if (type === 'tool-approval-request') {
        Object.assign(getToolPart(chunk), { state: 'approval-requested', approval: { id: chunk.approvalId } });
      } else if (type === 'tool-output-available') {
        Object.assign(getToolPart(chunk), { state: 'output-available', output: chunk.output });
      } else if (type === 'tool-output-error') {
        Object.assign(getToolPart(chunk), { state: 'output-error', errorText: chunk.errorText });
      } else if (type === 'tool-output-denied') {
        Object.assign(getToolPart(chunk), { state: 'output-denied' });
      } else if (type === 'start-step') {
        result.parts.push({ type: 'step-start' });
      } else if (type === 'data-usage') {
        result.usage = AiAssistantChatRecording.readUsage(chunk.data);
      } else if (type === 'error') {
        result.errorText = String(chunk.errorText ?? 'unknown error');
      }
    }

    return result;
  }

  private static readChunks(sse: string): StreamChunk[] {
    return sse
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.startsWith('data:'))
      .map(line => line.slice('data:'.length).trim())
      .filter(data => data.length > 0 && data !== '[DONE]')
      .map(data => AiAssistantChatRecording.parseJson(data))
      .filter((chunk): chunk is StreamChunk => chunk !== null);
  }

  private static parseJson(data: string): StreamChunk | null {
    try {
      const parsed = JSON.parse(data);
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private static readUsage(data: unknown): AiAssistantUsage | null {
    if (typeof data !== 'object' || data === null) {
      return null;
    }
    const usage = data as Record<string, unknown>;
    const inputTokens = typeof usage.inputTokens === 'number' ? usage.inputTokens : 0;
    const outputTokens = typeof usage.outputTokens === 'number' ? usage.outputTokens : 0;
    return { inputTokens, outputTokens };
  }

  /** Nur die Nachrichten, die wie `UIMessage` aussehen. Alles andere kommt nicht in die Datenbank. */
  static readRequestMessages(body: unknown): AiAssistantUiMessage[] {
    const messages = (body as { messages?: unknown } | null | undefined)?.messages;
    if (!Array.isArray(messages)) {
      return [];
    }
    return messages.filter((message): message is AiAssistantUiMessage => typeof message === 'object' && message !== null && typeof message.id === 'string' && typeof message.role === 'string' && Array.isArray(message.parts));
  }

  /**
   * Hängt die Antwort an den Verlauf der Anfrage. Setzt die Antwort eine Assistenten-Nachricht fort
   * (gleiche ID, z. B. nach einer Tool-Freigabe), werden ihre Teile angehängt bzw. aktualisiert.
   */
  static mergeResponse(requestMessages: AiAssistantUiMessage[], response: AiAssistantStreamResult): AiAssistantUiMessage[] {
    if (response.parts.length === 0) {
      return requestMessages;
    }
    const lastMessage = requestMessages[requestMessages.length - 1];
    const continuesLastMessage = lastMessage !== undefined && lastMessage.role === 'assistant' && (response.messageId === null || response.messageId === lastMessage.id);
    if (!continuesLastMessage) {
      return [...requestMessages, { id: response.messageId ?? `response-${requestMessages.length}`, role: 'assistant', parts: response.parts }];
    }

    const responseToolCallIds = new Set<unknown>(response.parts.map(part => part.toolCallId).filter(toolCallId => typeof toolCallId === 'string'));
    const keptParts = lastMessage.parts.filter(part => !responseToolCallIds.has(part.toolCallId));
    return [...requestMessages.slice(0, -1), { ...lastMessage, parts: [...keptParts, ...response.parts] }];
  }

  /** `data:`-URLs (eingebettete Dateien) können Megabytes groß sein und gehören nicht in den Verlauf. */
  static removeDataUrls(messages: AiAssistantUiMessage[]): AiAssistantUiMessage[] {
    return messages.map(message => ({
      ...message,
      parts: message.parts.map(part => (typeof part.url === 'string' && part.url.startsWith('data:') ? { ...part, url: AiAssistantChatRecording.REMOVED_DATA_URL } : part)),
    }));
  }

  static getChatKey(messages: AiAssistantUiMessage[]): string | null {
    return messages[0]?.id ?? null;
  }

  static getTitle(messages: AiAssistantUiMessage[]): string | null {
    const firstUserMessage = messages.find(message => message.role === 'user');
    const text = firstUserMessage ? AiAssistantChatRecording.getText(firstUserMessage).trim() : '';
    if (text.length === 0) {
      return null;
    }
    const singleLine = text.split(/\s+/).join(' ');
    return singleLine.length > AiAssistantChatRecording.TITLE_MAX_LENGTH ? singleLine.slice(0, AiAssistantChatRecording.TITLE_MAX_LENGTH - 1) + '…' : singleLine;
  }

  private static getText(message: AiAssistantUiMessage): string {
    return message.parts
      .filter(part => part.type === 'text' && typeof part.text === 'string')
      .map(part => String(part.text))
      .join('\n');
  }

  /**
   * Lesbare Fassung für die Auswertung in Directus. Die Rollen-Bezeichner sind technische Labels
   * (wie in Logs), der Verlauf ist nur für Admins sichtbar.
   */
  static buildTranscript(messages: AiAssistantUiMessage[]): string {
    return messages
      .map(message => {
        const lines = message.parts.map(part => AiAssistantChatRecording.describePart(part)).filter((line): line is string => line !== null);
        return `### ${message.role}\n${lines.join('\n')}`;
      })
      .join('\n\n');
  }

  private static describePart(part: AiAssistantUiMessagePart): string | null {
    if (part.type === 'text') {
      return String(part.text ?? '');
    }
    if (part.type === 'file') {
      return `[file] ${String(part.filename ?? part.mediaType ?? '')}`;
    }
    const isTool = part.type === 'dynamic-tool' || part.type.startsWith('tool-');
    if (!isTool) {
      return null;
    }
    const toolName = part.type === 'dynamic-tool' ? String(part.toolName ?? '') : part.type.slice('tool-'.length);
    const input = part.input === undefined ? '' : ` ${JSON.stringify(part.input)}`;
    const error = typeof part.errorText === 'string' ? `\n  -> error: ${part.errorText}` : '';
    return `[tool ${toolName}] (${String(part.state ?? '')})${input}${error}`;
  }
}
