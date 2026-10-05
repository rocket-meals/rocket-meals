// Generischer Worker für eigene Provider (z. B. whisper, ollama): wartet per Long-Poll auf offene Issues
// des Providers, übernimmt sie (claim), ruft handle auf und schließt bzw. bittet bei Fehlern einen Menschen um Hilfe.
import { type AttachmentInput, type CommentResult, type FileDownload, type FileSource, AgentBoardClient, AgentBoardError } from "./index.js";
import type { Entry, Issue } from "./types.js";

export interface WorkerContext {
  /** Das übernommene Issue (Status in_progress). */
  issue: Issue;
  /** Kompletter Verlauf (Kommentare/Ereignisse) zum Zeitpunkt der Übernahme. */
  entries: Entry[];
  /** Client mit user = agent (für weitere Aufrufe). */
  board: AgentBoardClient;
  /** Bricht ab, wenn der Worker beendet wird. */
  signal: AbortSignal;
  /** Zwischenstand kommentieren (optional mit Anhängen). */
  comment(body: string, attachments?: AttachmentInput[]): Promise<CommentResult>;
  /** Datei (Bytes, Blob oder – Node – Pfad) als Kommentar anhängen. */
  attach(file: FileSource, opts?: { name?: string; mime?: string; comment?: string }): Promise<CommentResult>;
  /** Anhang des Issues laden (sha256). */
  download(ref: string): Promise<FileDownload>;
  /** Menschen um Hilfe bitten (needs_human); beendet die Bearbeitung. */
  requestHuman(reason: string): Promise<void>;
  /** Mit Abschlusskommentar schließen; beendet die Bearbeitung. */
  close(comment: string, attachments?: AttachmentInput[]): Promise<void>;
}

/** Rückgabe string → Issue wird mit diesem Text geschlossen; sonst (ohne close/requestHuman) mit „Erledigt.“. */
export type WorkerHandler = (issue: Issue, ctx: WorkerContext) => Promise<string | void> | string | void;

export interface RunWorkerOptions {
  baseUrl: string;
  /** agent-Schlüssel (z. B. --role agent --providers echo). */
  apiKey: string;
  /** Provider ("echo") oder genaues Modell ("echo/v1") – nur diese Issues werden bearbeitet. */
  provider: string;
  /** Autorname des Workers, z. B. "echo-worker" (muss zum Schlüssel passen). */
  agent: string;
  handle: WorkerHandler;
  /** Max. gleichzeitig bearbeitete Issues (Standard 1). */
  concurrency?: number;
  /** Beendet den Worker (laufende Bearbeitungen bekommen ctx.signal). */
  signal?: AbortSignal;
  /** Länge eines Long-Polls in s (Standard 60). */
  pollSec?: number;
  /** Fehler (Verbindung, handle). */
  onError?: (err: unknown, issue?: Issue) => void;
  /** Kurze Statusmeldungen, z. B. console.log. */
  log?: (msg: string) => void;
  fetch?: typeof fetch;
}

const pause = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done, { once: true });
  });

/**
 * Worker-Schleife: läuft, bis opts.signal abbricht. Übernimmt nur Issues des eigenen Providers
 * (claim mit provider → 409 für fremde/bereits übernommene, die übersprungen werden).
 */
export async function runWorker(opts: RunWorkerOptions): Promise<void> {
  const clientOpts: ConstructorParameters<typeof AgentBoardClient>[0] = { baseUrl: opts.baseUrl, apiKey: opts.apiKey, user: opts.agent };
  if (opts.fetch) clientOpts.fetch = opts.fetch;
  const board = new AgentBoardClient(clientOpts);
  const [providerName, modelName] = opts.provider.toLowerCase().split("/") as [string, string | undefined];
  const exactModel = modelName ? `${providerName}/${modelName}` : undefined;
  const concurrency = Math.max(1, opts.concurrency ?? 1);
  const stop = opts.signal ?? new AbortController().signal;
  const busy = new Map<number, Promise<void>>();
  const log = opts.log ?? (() => undefined);
  let wake: (() => void) | undefined;

  async function work(issue: Issue): Promise<void> {
    let finished = false;
    const finish = () => {
      finished = true;
    };
    try {
      const { entries } = await board.getIssue(issue.id);
      const ctx: WorkerContext = {
        issue,
        entries,
        board,
        signal: stop,
        comment: (body, attachments) => board.comment(issue.id, body, attachments),
        attach: (file, o = {}) => {
          const a: AttachmentInput = { file };
          if (o.name) a.name = o.name;
          if (o.mime) a.mime = o.mime;
          return board.comment(issue.id, o.comment ?? `Datei: ${o.name ?? "Anhang"}`, [a]);
        },
        download: (ref) => board.downloadFileWithMeta(ref),
        requestHuman: async (reason) => {
          await board.requestHuman(issue.id, reason);
          finish();
        },
        close: async (comment, attachments) => {
          await board.comment(issue.id, comment, attachments, { status: "closed" });
          finish();
        },
      };
      const result = await opts.handle(issue, ctx);
      if (!finished) await board.comment(issue.id, typeof result === "string" && result ? result : "Erledigt.", undefined, { status: "closed" });
      log(`#${issue.id} erledigt`);
    } catch (e) {
      opts.onError?.(e, issue);
      log(`#${issue.id} Fehler: ${e instanceof Error ? e.message : String(e)}`);
      if (!finished && !stop.aborted) {
        await board
          .requestHuman(issue.id, `Fehler im Worker ${opts.agent}: ${e instanceof Error ? e.message : String(e)}`.slice(0, 1900))
          .catch((err: unknown) => opts.onError?.(err, issue));
      }
    }
  }

  let cursor = 0;
  let failures = 0;
  while (!stop.aborted) {
    try {
      // 1) offene Issues des Providers übernehmen (älteste zuerst), solange Plätze frei sind
      const list = await board.listIssues({ status: "open", provider: providerName, limit: 100 });
      cursor = Math.max(cursor, list.cursor);
      for (const issue of [...list.issues].sort((a, b) => a.id - b.id)) {
        if (busy.size >= concurrency || stop.aborted) break;
        if (busy.has(issue.id) || (exactModel && issue.model !== exactModel)) continue;
        let claimed: Issue;
        try {
          claimed = await board.claim(issue.id, opts.agent, { provider: providerName });
        } catch (e) {
          if (e instanceof AgentBoardError && e.status === 409) continue; // schon übernommen / anderer Provider
          throw e;
        }
        log(`#${claimed.id} übernommen (${claimed.model})`);
        busy.set(
          claimed.id,
          work(claimed).finally(() => {
            busy.delete(claimed.id);
            wake?.();
          }),
        );
      }
      failures = 0;
      // 2) warten: auf Neues am Board oder auf einen frei werdenden Platz
      const ac = new AbortController();
      const onStop = () => ac.abort();
      stop.addEventListener("abort", onStop, { once: true });
      const slot = new Promise<void>((resolve) => (wake = resolve));
      const poll =
        busy.size < concurrency
          ? board.agentWait(cursor, { timeoutSec: opts.pollSec ?? 60, provider: providerName, signal: ac.signal }).then(
              (r) => void (cursor = Math.max(cursor, r.cursor)),
              (e: unknown) => {
                if (!(e instanceof AgentBoardError && e.code === "aborted")) throw e;
              },
            )
          : new Promise<void>(() => undefined);
      try {
        await Promise.race([poll, slot, pause(24 * 3600_000, ac.signal)]);
      } finally {
        wake = undefined;
        ac.abort();
        stop.removeEventListener("abort", onStop);
        poll.catch(() => undefined);
      }
    } catch (e) {
      if (stop.aborted) break;
      if (e instanceof AgentBoardError && (e.status === 401 || e.status === 403)) throw e; // falscher Schlüssel → beenden
      opts.onError?.(e);
      failures++;
      await pause(Math.min(30_000, 500 * 2 ** Math.min(failures, 6)), stop);
    }
  }
  await Promise.allSettled([...busy.values()]);
}
