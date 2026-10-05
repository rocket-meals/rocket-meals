// Optionaler OpenAI-Adapter: eine Anfrage = ein Issue (Label "api"), Antwort = nächster Kommentar des Agenten.
import type { IncomingMessage, ServerResponse } from "node:http";
import { CLAUDE_MODELS, DEFAULT_MODEL, LEGACY_MODELS, type Entry, type ModelId, normalizeModel } from "../shared/types.ts";
import { HttpError, disconnectSignal, sendJson, startSse } from "./http.ts";
import { completionSchema, parseBody } from "./schemas.ts";
import { type Store, truncate } from "./store.ts";

export const MODEL_ID = "agent-board";

/**
 * OpenAI-Modellname → Bearbeitungsmodell: "provider/name" (z. B. whisper/large-v3) direkt,
 * sonst enthält "haiku"/"sonnet"/"opus" → claude/<x> (agent-board-haiku → claude/haiku), sonst Standard claude/opus.
 */
export function mapModel(name: string | undefined): ModelId {
  const n = (name ?? "").trim().toLowerCase();
  if (n.includes("/")) {
    const direct = normalizeModel(n);
    if (direct) return direct;
  }
  const legacy = LEGACY_MODELS.find((m) => n.includes(m));
  return legacy ? (`claude/${legacy}` as ModelId) : DEFAULT_MODEL;
}

type RawMessage = { role: string; content?: string | { type: string; text?: string }[] | null; name?: string };

function contentToText(content: RawMessage["content"]): string {
  if (typeof content === "string") return content;
  if (!content) return "";
  return content.map((p) => (p.type === "text" && p.text ? p.text : `[${p.type}]`)).join("\n");
}

export interface CompletionOptions {
  timeoutSec: number;
  /** Autor (program-Schlüssel: aus dem Schlüssel abgeleitet); sonst programm:<user>. */
  author?: string;
  /** Schlüsselname als Besitzer neuer Issues. */
  owner?: string;
  /** Zugriff auf ein fortgesetztes Issue prüfen (wirft 403/404). */
  checkIssue?: (raw: string) => number;
  /** Modell für den Schlüssel erlaubt? (wirft 403) */
  checkModel?: (model: string) => void;
}

export async function handleCompletion(
  store: Store,
  req: IncomingMessage,
  res: ServerResponse,
  body: unknown,
  opts: CompletionOptions,
): Promise<void> {
  const input = parseBody(completionSchema, body);
  const model = input.model || MODEL_ID;
  const msgs = (input.messages as RawMessage[])
    .map((m) => ({ role: m.role, text: contentToText(m.content) }))
    .filter((m) => m.text.length > 0);
  const lastUserIdx = msgs.map((m) => m.role).lastIndexOf("user");
  if (lastUserIdx < 0) throw new HttpError(400, "messages enthält keine user-Nachricht mit Inhalt");
  const question = msgs[lastUserIdx]!.text;
  const author = opts.author ?? `programm:${input.user || "api"}`;

  const headerId = req.headers["x-issue-id"];
  const metaId = input.metadata?.["issue_id"];
  const rawId = (typeof headerId === "string" && headerId) || (metaId !== undefined ? String(metaId) : "");
  let issueId: number;
  let after: number;
  if (rawId) {
    // Fortsetzen: nur die letzte user-Nachricht als Kommentar (geschlossene Issues werden wieder geöffnet)
    issueId = opts.checkIssue ? opts.checkIssue(rawId) : Number(rawId.replace(/^#/, ""));
    const issue = store.getIssue(issueId);
    if (!Number.isInteger(issueId) || !issue) throw new HttpError(404, `Issue ${rawId} nicht gefunden`);
    const r = await store.addComment(issueId, { author, body: question, ...(issue.status === "closed" ? { status: "open" as const } : {}) });
    after = r.comment.seq;
  } else {
    // Kontext (System-/frühere Nachrichten) knapp an den Body hängen
    const context = msgs.filter((_, i) => i !== lastUserIdx).map((m) => `> ${m.role}: ${m.text.replace(/\n/g, "\n> ")}`);
    const bodyText = context.length ? `${question}\n\n**Kontext der Anfrage:**\n${context.join("\n")}` : question;
    const model = mapModel(input.model);
    opts.checkModel?.(model);
    const create: Parameters<Store["createIssue"]>[0] = { title: truncate(question, 80), body: bodyText, labels: ["api"], author, model };
    if (opts.owner) create.owner = opts.owner;
    const r = await store.createIssue(create);
    issueId = r.issue.id;
    after = r.issue.lastSeq;
  }

  const signal = disconnectSignal(req, res);
  const findAnswer = (): Entry | undefined =>
    store.getEntries(issueId, after).find((e) => e.type === "comment" && store.isAgent(e.author));
  const created = Math.floor(Date.now() / 1000);
  const timeoutMs = opts.timeoutSec * 1000;
  const later = `GET /v1/issues/${issueId}/timeline?since=${after}`;

  if (!input.stream) {
    const answer = await store.waitFor(findAnswer, timeoutMs, signal);
    if (signal.aborted) return;
    if (!answer) {
      throw new HttpError(504, `Keine Antwort innerhalb von ${opts.timeoutSec}s. Später abrufen: ${later}`, { issue_id: issueId, since: after });
    }
    sendJson(
      res,
      200,
      {
        id: `chatcmpl-${issueId}-${answer.seq}`,
        object: "chat.completion",
        created,
        model,
        choices: [{ index: 0, message: { role: "assistant", content: answer.body ?? "", refusal: null }, logprobs: null, finish_reason: "stop" }],
        usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
        issue_id: issueId,
      },
      { "x-issue-id": String(issueId) },
    );
    return;
  }

  // Streaming: Header sofort, Keepalive-Kommentare, dann ein Chunk mit dem ganzen Text
  res.setHeader("x-issue-id", String(issueId));
  startSse(res);
  const id = `chatcmpl-${issueId}-${after}`;
  const chunk = (delta: Record<string, unknown>, finish: string | null) =>
    `data: ${JSON.stringify({ id, object: "chat.completion.chunk", created, model, issue_id: issueId, choices: [{ index: 0, delta, logprobs: null, finish_reason: finish }] })}\n\n`;
  res.write(chunk({ role: "assistant", content: "" }, null));
  const keepalive = setInterval(() => res.write(": keepalive\n\n"), 15_000);
  try {
    const answer = await store.waitFor(findAnswer, timeoutMs, signal);
    if (signal.aborted) return;
    if (answer) {
      res.write(chunk({ content: answer.body ?? "" }, null));
      res.write(chunk({}, "stop"));
    } else {
      res.write(
        `data: ${JSON.stringify({ error: { message: `Keine Antwort innerhalb von ${opts.timeoutSec}s. Später: ${later}`, type: "timeout", code: "agent_timeout" }, issue_id: issueId })}\n\n`,
      );
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } finally {
    clearInterval(keepalive);
  }
}

export function modelsResponse() {
  // agent-board-opus → claude/opus usw.; andere Provider direkt als model "provider/name" angeben
  return {
    object: "list",
    data: CLAUDE_MODELS.map((m) => ({ id: `${MODEL_ID}-${m.slice(m.indexOf("/") + 1)}`, object: "model", created: 0, owned_by: "agent-board" })),
  };
}
