// Watcher: blockiert per Long-Poll und endet mit einer Arbeitsliste (eine Zeile je Issue), sobald es Neues für den Agenten gibt.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { MAX_POLL_CHUNK_SEC, RelayClient } from "../shared/client.ts";
import { formatWaiting } from "../shared/format.ts";
import type { WaitingIssue } from "../shared/types.ts";

export interface WatchOptions {
  client: RelayClient;
  /** Gesamtdauer in Sekunden. */
  timeoutSec: number;
  issueId?: number;
  /** Nur Issues dieses Providers wecken (Standard "claude"; "all" = alle; mehrere kommagetrennt). */
  provider?: string;
  once?: boolean;
  cursorFile: string;
  /** Länge eines einzelnen Long-Polls (Tests nutzen kleine Werte). */
  chunkSec?: number;
  /** Wie lange Verbindungsfehler toleriert werden, nachdem der Server schon erreichbar war. */
  retryWindowSec?: number;
  /** Nach dem ersten Ereignis noch so lange (ms) sammeln, damit gleichzeitig angelegte Issues in einen Weckruf fallen (Standard 1500). */
  minWaitMs?: number;
  /** Ausgabe als eine Zeile JSON statt Text. */
  json?: boolean;
  /** Max. Zeilen der Textliste (Standard 20). */
  maxLines?: number;
}

export interface WatchResult {
  code: number;
  /** Ausgabe (Text, ggf. mehrzeilig, oder eine Zeile JSON). */
  line: string;
  cursor: number;
  waiting: WaitingIssue[];
}

/** Cursor-Datei je Issue bzw. Provider (claude: wie bisher .agent-cursor). */
export function defaultCursorFile(dataDir: string, issueId?: number, provider = "claude"): string {
  const suffix = provider === "claude" ? "" : `-${provider.replace(/[^a-z0-9-]+/gi, "_")}`;
  return path.join(dataDir, issueId !== undefined ? `.agent-cursor${suffix}-${issueId}` : `.agent-cursor${suffix}`);
}

export async function readCursor(file: string): Promise<number | undefined> {
  try {
    const n = Number((await readFile(file, "utf8")).trim());
    return Number.isFinite(n) && n >= 0 ? n : undefined;
  } catch {
    return undefined;
  }
}

async function writeCursor(file: string, cursor: number): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  await writeFile(tmp, `${cursor}\n`);
  await rename(tmp, file);
}

/** "2h", "30m", "90s" oder Sekunden als Zahl. */
export function parseDuration(raw: string): number {
  const m = /^(\d+(?:\.\d+)?)\s*(h|m|s)?$/i.exec(raw.trim());
  if (!m) throw new Error(`Ungültige Dauer: ${raw} (z. B. 2h, 30m, 90s)`);
  const n = Number(m[1]);
  const unit = (m[2] ?? "s").toLowerCase();
  return Math.round(n * (unit === "h" ? 3600 : unit === "m" ? 60 : 1));
}

export async function runWatch(opts: WatchOptions): Promise<WatchResult> {
  const out = (code: number, cursor: number, waiting: WaitingIssue[], text: string, error?: string): WatchResult => {
    let line = text;
    if (opts.json) {
      line = JSON.stringify(error ? { error, cursor } : { changed: waiting.length > 0, cursor, issues: waiting });
    }
    return { code, line, cursor, waiting };
  };
  const minWaitMs = opts.minWaitMs ?? 1500;
  const chunk = Math.min(opts.chunkSec ?? MAX_POLL_CHUNK_SEC, MAX_POLL_CHUNK_SEC);
  const retryWindowMs = (opts.retryWindowSec ?? 60) * 1000;
  const provider = opts.provider ?? "claude";
  // Ohne Cursor-Datei ab 0: bereits offene Issues mit Aktivität werden sofort gemeldet
  let after = (await readCursor(opts.cursorFile)) ?? 0;
  const deadline = Date.now() + opts.timeoutSec * 1000;
  let reachable = false;
  let failingSince: number | undefined;

  for (;;) {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    try {
      const r = await opts.client.agentWait(after, Math.min(remaining, chunk), opts.issueId, undefined, provider);
      reachable = true;
      failingSince = undefined;
      if (r.changed) {
        let res = r;
        if (minWaitMs > 0) {
          // kurz weiter sammeln und dann alles seit dem alten Cursor abfragen (timeout 0 = sofort)
          await sleep(minWaitMs);
          res = await opts.client.agentWait(after, 0, opts.issueId, undefined, provider).catch(() => r);
          if (!res.changed) res = r;
        }
        await writeCursor(opts.cursorFile, res.cursor);
        return out(0, res.cursor, res.waiting, formatWaiting(res.waiting, opts.maxLines ?? 20));
      }
      after = r.cursor;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!reachable) {
        const t = `Server nicht erreichbar (${opts.client.baseUrl}): ${msg}`;
        return out(1, after, [], t, t);
      }
      failingSince ??= Date.now();
      if (Date.now() - failingSince > retryWindowMs) {
        const t = `Verbindung verloren (${opts.client.baseUrl}): ${msg}`;
        return out(1, after, [], t, t);
      }
      await sleep(2000);
      continue;
    }
    if (opts.once || Date.now() >= deadline) {
      await writeCursor(opts.cursorFile, after);
      return out(0, after, [], "Nichts Neues.");
    }
  }
}
