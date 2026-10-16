import { DatabaseTypes } from 'repo-depkit-common';
import { MyDatabaseHelper } from '../MyDatabaseHelper';
import { AiAssistantChatRecording, AiAssistantStreamResult } from './AiAssistantChatRecording';

export type AiAssistantChatRequest = {
  body: unknown;
  userId: string;
};

/**
 * Speichert eine Runde des Directus KI-Assistenten in `ai_assistant_conversations`:
 * eine Zeile pro Unterhaltung, bei jeder Folgeanfrage aktualisiert.
 */
export class AiAssistantConversationService {
  constructor(private readonly myDatabaseHelper: MyDatabaseHelper) {}

  async saveRound(request: AiAssistantChatRequest, sse: string): Promise<void> {
    const requestMessages = AiAssistantChatRecording.readRequestMessages(request.body);
    const chatKey = AiAssistantChatRecording.getChatKey(requestMessages);
    if (chatKey === null) {
      return;
    }

    const response: AiAssistantStreamResult = AiAssistantChatRecording.parseUiMessageStream(sse);
    const messages = AiAssistantChatRecording.removeDataUrls(AiAssistantChatRecording.mergeResponse(requestMessages, response));
    const body = (request.body ?? {}) as Record<string, unknown>;

    const helper = this.myDatabaseHelper.getAiAssistantConversationsHelper();
    const existing = await helper.findFirstItem({ chat_key: chatKey, user: request.userId });

    const update: Partial<DatabaseTypes.AiAssistantConversations> = {
      chat_key: chatKey,
      user: request.userId,
      title: AiAssistantChatRecording.getTitle(messages),
      provider: typeof body.provider === 'string' ? body.provider : null,
      model: typeof body.model === 'string' ? body.model : null,
      messages,
      message_count: messages.length,
      transcript: AiAssistantChatRecording.buildTranscript(messages),
      context: body.context ?? null,
      request_count: (existing?.request_count ?? 0) + 1,
      input_tokens: (existing?.input_tokens ?? 0) + (response.usage?.inputTokens ?? 0),
      output_tokens: (existing?.output_tokens ?? 0) + (response.usage?.outputTokens ?? 0),
      last_error: response.errorText ?? existing?.last_error ?? null,
    };

    if (existing) {
      await helper.updateOne(existing.id, update);
    } else {
      await helper.createOne(update);
    }
  }
}
