/**
 * ai-assistant-history-hook – speichert die Unterhaltungen des Directus KI-Assistenten
 * (Studio, `POST /ai/chat`) in `ai_assistant_conversations`, damit Admins sie später einsehen
 * und auswerten können. Directus selbst speichert sie nirgends, der Verlauf lebt nur im Browser.
 *
 * Directus feuert für den Assistenten keine Hook-Events. Deshalb hängt sich der Hook als
 * Express-Middleware vor die Route (`routes.before`: Body ist geparst, Nutzer ist bekannt),
 * liest die gestreamte Antwort mit und speichert nach dem Ende der Antwort.
 * Fehler beim Speichern werden nur geloggt, der Chat selbst läuft immer weiter.
 */

import { defineHook } from '@directus/extensions-sdk';
import { CollectionNames } from 'repo-depkit-common';
import { DatabaseInitializedCheck } from '../helpers/DatabaseInitializedCheck';
import { MyDatabaseHelper } from '../helpers/MyDatabaseHelper';
import { AiAssistantConversationService } from '../helpers/ai-assistant-history/AiAssistantConversationService';

const HOOK_NAME = 'ai-assistant-history-hook';
const AI_CHAT_ROUTE = '/ai/chat';
/** Größere Antworten werden nicht gespeichert, damit ein Ausreißer den Server nicht belastet. */
const MAX_RECORDED_BYTES = 5 * 1024 * 1024;

type ChatRequest = {
  method: string;
  body: unknown;
  accountability?: { app?: boolean; user?: string | null } | null;
};

type ChatResponse = {
  statusCode: number;
  write: (chunk: unknown, ...args: unknown[]) => boolean;
  once: (event: 'close', listener: () => void) => void;
};

function toBuffer(chunk: unknown): Buffer | null {
  if (typeof chunk === 'string') {
    return Buffer.from(chunk);
  }
  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk);
  }
  return null;
}

export default defineHook(({ init }, apiContext) => {
  init('routes.before', ({ app }) => {
    app.use(AI_CHAT_ROUTE, (req: ChatRequest, res: ChatResponse, next: () => void) => {
      const userId = req.accountability?.user;
      if (req.method !== 'POST' || !req.accountability?.app || !userId) {
        next();
        return;
      }

      const body = req.body;
      const recording = { chunks: [] as Buffer[], bytes: 0, tooLarge: false };
      const originalWrite = res.write.bind(res);
      res.write = (chunk: unknown, ...args: unknown[]) => {
        const buffer = toBuffer(chunk);
        if (buffer && !recording.tooLarge) {
          recording.bytes += buffer.length;
          recording.tooLarge = recording.bytes > MAX_RECORDED_BYTES;
          recording.chunks.push(buffer);
        }
        return originalWrite(chunk, ...args);
      };

      res.once('close', () => {
        if (res.statusCode !== 200 || recording.chunks.length === 0 || recording.tooLarge) {
          return;
        }
        const sse = Buffer.concat(recording.chunks).toString('utf8');
        saveRound(body, userId, sse).catch(error => {
          apiContext.logger.error(`${HOOK_NAME}: could not save the conversation: ${error}`);
        });
      });

      next();
    });
  });

  async function saveRound(body: unknown, userId: string, sse: string): Promise<void> {
    const tableExists = await DatabaseInitializedCheck.checkTablesExist(HOOK_NAME, apiContext, [CollectionNames.AI_ASSISTANT_CONVERSATIONS]);
    if (!tableExists) {
      return;
    }
    await new AiAssistantConversationService(new MyDatabaseHelper(apiContext)).saveRound({ body, userId }, sse);
  }
});
