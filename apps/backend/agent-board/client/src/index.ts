// @nils/agent-board-client – schlanker Client für das Issue-Board (ohne Laufzeit-Abhängigkeiten; Node ≥ 18 und Browser).
import type { AgentWaitResult, Attachment, BoardEvent, BoardInfo, Entry, Issue, IssueStatus, ModelId } from "./types.js";

export * from "./types.js";
export { runWorker, type RunWorkerOptions, type WorkerContext, type WorkerHandler } from "./worker.js";

/** undici (Node-fetch) bricht nach 300 s ohne Antwort-Header ab → Long-Polls in Stücken. */
const POLL_CHUNK_SEC = 240;

export interface AgentBoardClientOptions {
  /** z. B. "http://127.0.0.1:4317" (ein angehängtes /v1 wird entfernt). */
  baseUrl: string;
  /** Schlüssel (program-, agent- oder admin-Rolle, z. B. aus process.env); bei Servern ohne Schlüssel beliebiger Text. */
  apiKey: string;
  /** Autorname für alles, was dieser Client schreibt (Standard "programm"), z. B. "programm:import". */
  user?: string;
  /** Timeout normaler Anfragen in ms (Standard 30 000; Long-Polls haben eigene Fristen). */
  timeoutMs?: number;
  /** Eigene fetch-Implementierung (Tests, Proxys). */
  fetch?: typeof fetch;
}

/** Fehler des Clients. status = HTTP-Status (0 bei Netzwerk/Abbruch/Timeout). */
export class AgentBoardError extends Error {
  override readonly name = "AgentBoardError";
  constructor(
    message: string,
    /** HTTP-Status, 0 wenn keine Antwort. */
    readonly status: number,
    /** z. B. "not_found_error", "authentication_error", "invalid_request_error", "timeout", "aborted", "network_error", "config_error". */
    readonly code: string,
    readonly body?: unknown,
  ) {
    super(message);
  }
}

/** Dateiquelle: Blob/File, Bytes oder (nur Node) ein Dateipfad. */
export type FileSource = Blob | Uint8Array | ArrayBuffer | string;

/** Anhang: bereits hochgeladen ({sha256}) oder neu ({file}) – wird dann automatisch hochgeladen. */
export type AttachmentInput = { sha256: string; name?: string } | { file: FileSource; name?: string; mime?: string };

export interface IssueFilter {
  /** Standard am Server: alle; "active" = nicht geschlossen. */
  status?: IssueStatus | "active" | "all";
  label?: string;
  /** Nur Issues, die auf den Menschen warten (needs_human, Erwähnungen). */
  forMe?: boolean;
  /** Volltextsuche in Titel/Text. */
  q?: string;
  /** Nur Issues mit Änderungen nach dieser seq. */
  since?: number;
  limit?: number;
  /** Nur Issues dieser Provider, z. B. "claude", "whisper,ollama" ("all" = alle). */
  provider?: string;
}

export interface IssueList {
  issues: Issue[];
  total: number;
  cursor: number;
}

export interface IssueDetail {
  issue: Issue;
  entries: Entry[];
  cursor: number;
}

export interface CreateIssueInput {
  title: string;
  body?: string;
  labels?: string[];
  attachments?: AttachmentInput[];
  /** Weist das Issue direkt zu (z. B. "claude"). */
  assignee?: string;
  /**
   * Bearbeitungsmodell "provider/name": Model.CLAUDE.OPUS (Standard, Claude Opus 5.5), Model.CLAUDE.SONNET,
   * Model.CLAUDE.HAIKU oder eigener Provider, z. B. model("whisper", "large-v3").
   */
  model?: ModelId;
}

export interface CommentResult {
  comment: Entry;
  issue: Issue;
}

export interface WaitOptions {
  /** Nur Einträge nach dieser seq (Standard: aktueller Stand des Issues). */
  afterSeq?: number;
  /** Gesamtwartezeit in ms (Standard: unbegrenzt). Danach AgentBoardError code "timeout". */
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Nur Antworten dieses Autors (z. B. "claude" – passt auch auf Subagenten wie "claude:sonnet-7"); sonst jeder außer dem eigenen user. */
  from?: string;
}

export interface Reply {
  issueId: number;
  /** Text aller neuen Antwort-Kommentare (durch Leerzeile getrennt). */
  text: string;
  attachments: Attachment[];
  comments: Entry[];
  /** seq für das nächste waitForReply. */
  cursor: number;
}

export interface AskOptions extends Omit<WaitOptions, "afterSeq"> {
  labels?: string[];
  /** Bearbeitungsmodell (Standard Model.CLAUDE.OPUS). */
  model?: ModelId;
  attachments?: AttachmentInput[];
}

export interface AskResult extends Reply {
  issue: Issue;
}

export interface EventsOptions {
  signal?: AbortSignal;
  /** Ab dieser seq nachliefern (Standard: nur Neues ab Verbindungsaufbau). */
  after?: number;
  /** Verbindungsfehler (vor dem automatischen Neuaufbau). */
  onError?: (err: unknown) => void;
  /** Erste Wartezeit vor Neuaufbau in ms (verdoppelt sich bis 30 s). */
  reconnectMs?: number;
}

export interface FileDownload {
  data: Uint8Array;
  mime: string;
  name: string;
}

interface RequestOptions {
  json?: unknown;
  body?: NonNullable<RequestInit["body"]>;
  headers?: Record<string, string>;
  signal?: AbortSignal | undefined;
  timeoutMs?: number;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve) => {
    const t = setTimeout(done, ms);
    function done() {
      clearTimeout(t);
      signal?.removeEventListener("abort", done);
      resolve();
    }
    signal?.addEventListener("abort", done, { once: true });
  });

/** Abbruch durch Nutzer-Signal oder Timeout zu einem Signal verbinden (ohne AbortSignal.any → Node 18). */
function linkSignal(timeoutMs: number | undefined, outer?: AbortSignal) {
  const ac = new AbortController();
  let timedOut = false;
  const onAbort = () => ac.abort();
  if (outer?.aborted) ac.abort();
  outer?.addEventListener("abort", onAbort, { once: true });
  const timer =
    timeoutMs && timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          ac.abort();
        }, timeoutMs)
      : undefined;
  return {
    signal: ac.signal,
    timedOut: () => timedOut,
    done: () => {
      if (timer) clearTimeout(timer);
      outer?.removeEventListener("abort", onAbort);
    },
  };
}

const MIME: Record<string, string> = {
  txt: "text/plain",
  log: "text/plain",
  md: "text/markdown",
  json: "application/json",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  zip: "application/zip",
};

export class AgentBoardClient {
  readonly baseUrl: string;
  readonly user: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private readonly fetchFn: typeof fetch;

  constructor(opts: AgentBoardClientOptions) {
    if (!opts || typeof opts.baseUrl !== "string" || !/^https?:\/\/[^/]/.test(opts.baseUrl)) {
      throw new AgentBoardError('AgentBoardClient: baseUrl fehlt oder ist ungültig (z. B. "http://127.0.0.1:4317")', 0, "config_error");
    }
    if (typeof opts.apiKey !== "string" || !opts.apiKey) {
      throw new AgentBoardError("AgentBoardClient: apiKey fehlt (Wert von AB_API_KEY; bei Servern ohne Key beliebiger Text)", 0, "config_error");
    }
    this.baseUrl = opts.baseUrl.replace(/\/+$/, "").replace(/\/v1$/, "");
    this.apiKey = opts.apiKey;
    this.user = opts.user || "programm";
    this.timeoutMs = opts.timeoutMs ?? 30_000;
    this.fetchFn = opts.fetch ?? ((...args) => fetch(...args));
  }

  // --- Grundlagen ---

  private async send(method: string, path: string, opts: RequestOptions = {}): Promise<Response> {
    const headers: Record<string, string> = { authorization: `Bearer ${this.apiKey}`, ...opts.headers };
    let body = opts.body;
    if (opts.json !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(opts.json);
    }
    const link = linkSignal(opts.timeoutMs ?? this.timeoutMs, opts.signal);
    try {
      const init: RequestInit = { method, headers, signal: link.signal };
      if (body !== undefined) init.body = body;
      const res = await this.fetchFn(`${this.baseUrl}${path}`, init);
      if (!res.ok) {
        const data = (await res.json().catch(() => undefined)) as { error?: { message?: string; type?: string } } | undefined;
        const msg = data?.error?.message ?? res.statusText;
        throw new AgentBoardError(`HTTP ${res.status}: ${msg}`, res.status, data?.error?.type ?? `http_${res.status}`, data);
      }
      return res;
    } catch (e) {
      if (e instanceof AgentBoardError) throw e;
      if (opts.signal?.aborted) throw new AgentBoardError("Abgebrochen", 0, "aborted");
      if (link.timedOut()) throw new AgentBoardError(`Zeitüberschreitung nach ${opts.timeoutMs ?? this.timeoutMs} ms: ${method} ${path}`, 0, "timeout");
      throw new AgentBoardError(`Server nicht erreichbar (${this.baseUrl}): ${e instanceof Error ? e.message : String(e)}`, 0, "network_error");
    } finally {
      link.done();
    }
  }

  private async json<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
    const res = await this.send(method, path, opts);
    try {
      return (await res.json()) as T;
    } catch {
      // z. B. Abbruch während des Lesens
      if (opts.signal?.aborted) throw new AgentBoardError("Abgebrochen", 0, "aborted");
      throw new AgentBoardError(`Ungültige Antwort: ${method} ${path}`, res.status, "invalid_response");
    }
  }

  /** Server-Infos (Nutzer-/Agentname, Dateilimit); prüft nebenbei den API-Key. */
  info(): Promise<BoardInfo & { authOk?: boolean }> {
    return this.json("GET", "/v1/info");
  }

  /** true, wenn der Server antwortet. */
  async health(): Promise<boolean> {
    try {
      return (await this.json<{ ok: boolean }>("GET", "/health")).ok === true;
    } catch {
      return false;
    }
  }

  // --- Issues ---

  listIssues(filter: IssueFilter = {}): Promise<IssueList> {
    const q = new URLSearchParams();
    if (filter.status) q.set("status", filter.status);
    if (filter.label) q.set("label", filter.label);
    if (filter.forMe) q.set("for", "me");
    if (filter.q) q.set("q", filter.q);
    if (filter.since !== undefined) q.set("since", String(filter.since));
    if (filter.limit !== undefined) q.set("limit", String(filter.limit));
    if (filter.provider) q.set("provider", filter.provider);
    const qs = q.toString();
    return this.json("GET", `/v1/issues${qs ? `?${qs}` : ""}`);
  }

  getIssue(id: number): Promise<IssueDetail> {
    return this.json("GET", `/v1/issues/${id}`);
  }

  async createIssue(input: CreateIssueInput): Promise<Issue> {
    const body: Record<string, unknown> = { title: input.title, author: this.user };
    if (input.body !== undefined) body.body = input.body;
    if (input.labels) body.labels = input.labels;
    if (input.assignee) body.assignee = input.assignee;
    if (input.model) body.model = input.model;
    if (input.attachments?.length) body.attachments = await this.refs(input.attachments);
    return this.json("POST", "/v1/issues", { json: body });
  }

  /** Kommentar, optional mit Anhängen und Statuswechsel (z. B. { status: "closed" }). */
  async comment(id: number, body: string, attachments?: AttachmentInput[], opts: { status?: IssueStatus; reason?: string } = {}): Promise<CommentResult> {
    const json: Record<string, unknown> = { body, author: this.user };
    if (attachments?.length) json.attachments = await this.refs(attachments);
    if (opts.status) json.status = opts.status;
    if (opts.reason) json.reason = opts.reason;
    return this.json("POST", `/v1/issues/${id}/comments`, { json });
  }

  setStatus(id: number, status: IssueStatus, reason?: string): Promise<Issue> {
    return this.patch(id, reason ? { status, reason } : { status });
  }

  /** Bearbeitungsmodell ändern. */
  setModel(id: number, model: ModelId): Promise<Issue> {
    return this.patch(id, { model });
  }

  /**
   * Issue mit Sperre übernehmen (in_progress + Zuweisung; braucht einen agent- oder admin-Schlüssel).
   * AgentBoardError status 409, wenn ein anderer Agent es gerade bearbeitet oder – mit opts.provider – das Issue
   * zu einem anderen Provider gehört (außer opts.force). agent Standard: user des Clients.
   */
  claim(id: number, agent: string = this.user, opts: { provider?: string; force?: boolean } = {}): Promise<Issue> {
    return this.json("POST", `/v1/issues/${id}/claim`, { json: { agent, ...opts } });
  }

  /**
   * Long-Poll für Agenten/Worker: wartet, bis es nach afterSeq Neues gibt (neue Issues, Kommentare anderer,
   * Wiedereröffnungen) – optional nur für einen Provider. Braucht einen agent- oder admin-Schlüssel.
   */
  agentWait(afterSeq: number, opts: { timeoutSec?: number; provider?: string; signal?: AbortSignal } = {}): Promise<AgentWaitResult> {
    const t = Math.max(0, Math.min(POLL_CHUNK_SEC, Math.floor(opts.timeoutSec ?? 60)));
    const q = new URLSearchParams({ after: String(afterSeq), timeout: String(t) });
    if (opts.provider) q.set("provider", opts.provider);
    return this.json("GET", `/v1/agent/wait?${q}`, { signal: opts.signal, timeoutMs: t * 1000 + 30_000 });
  }

  /** Sperre freigeben (in_progress → open). */
  release(id: number, agent: string = this.user, reason?: string): Promise<Issue> {
    return this.json("POST", `/v1/issues/${id}/release`, { json: reason ? { agent, reason } : { agent } });
  }

  addLabels(id: number, labels: string[]): Promise<Issue> {
    return this.patch(id, { addLabels: labels });
  }

  removeLabels(id: number, labels: string[]): Promise<Issue> {
    return this.patch(id, { removeLabels: labels });
  }

  /** Schließen, optional mit Abschlusskommentar. */
  async close(id: number, comment?: string): Promise<Issue> {
    if (!comment) return this.setStatus(id, "closed");
    const r = await this.json<CommentResult>("POST", `/v1/issues/${id}/comments`, {
      json: { body: comment, author: this.user, status: "closed" },
    });
    return r.issue;
  }

  reopen(id: number): Promise<Issue> {
    return this.setStatus(id, "open");
  }

  /** Mensch um Hilfe bitten: Status needs_human + Grund (erscheint beim Menschen unter „Für mich“). */
  async requestHuman(id: number, reason: string): Promise<CommentResult> {
    return this.json("POST", `/v1/issues/${id}/comments`, {
      json: { body: reason, author: this.user, status: "needs_human", reason },
    });
  }

  private patch(id: number, fields: Record<string, unknown>): Promise<Issue> {
    return this.json("PATCH", `/v1/issues/${id}`, { json: { author: this.user, ...fields } });
  }

  // --- Dateien ---

  /** Datei hochladen (Blob/File, Bytes oder – nur Node – Pfad). */
  async uploadFile(file: FileSource, name?: string, mime?: string): Promise<Attachment> {
    let data: Blob | Uint8Array | ArrayBuffer;
    let fileName = name;
    let type = mime;
    if (typeof file === "string") {
      data = await readLocalFile(file);
      fileName ??= file.split(/[\\/]/).pop() || "datei";
    } else {
      data = file;
      if (typeof Blob !== "undefined" && file instanceof Blob) {
        type ??= file.type || undefined;
        fileName ??= (file as Blob & { name?: string }).name;
      }
    }
    fileName ||= "datei";
    type ??= MIME[fileName.split(".").pop()?.toLowerCase() ?? ""] ?? "application/octet-stream";
    return this.json("POST", `/v1/files?name=${encodeURIComponent(fileName)}`, {
      body: data as NonNullable<RequestInit["body"]>,
      headers: { "content-type": type },
      timeoutMs: Math.max(this.timeoutMs, 120_000),
    });
  }

  /** Datei (Original) als Bytes laden; ref = sha256 oder eindeutiger Präfix (≥ 8 Zeichen). */
  async downloadFile(ref: string): Promise<Uint8Array> {
    return (await this.downloadFileWithMeta(ref)).data;
  }

  async downloadFileWithMeta(ref: string, opts: { preview?: boolean | number } = {}): Promise<FileDownload> {
    const suffix = opts.preview ? `/preview${typeof opts.preview === "number" ? `?max=${opts.preview}` : ""}` : "";
    const res = await this.send("GET", `/v1/files/${encodeURIComponent(ref)}${suffix}`, { timeoutMs: Math.max(this.timeoutMs, 120_000) });
    const disp = res.headers.get("content-disposition") ?? "";
    const m = /filename\*=UTF-8''([^;]+)/.exec(disp);
    return {
      data: new Uint8Array(await res.arrayBuffer()),
      mime: (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0]!.trim(),
      name: m ? decodeURIComponent(m[1]!) : ref,
    };
  }

  /** URL einer Datei (z. B. für <img>); enthält den API-Key als ?token=. */
  fileUrl(ref: string, opts: { download?: boolean; preview?: boolean } = {}): string {
    const q = new URLSearchParams({ token: this.apiKey });
    if (opts.download) q.set("download", "1");
    return `${this.baseUrl}/v1/files/${encodeURIComponent(ref)}${opts.preview ? "/preview" : ""}?${q}`;
  }

  private async refs(list: AttachmentInput[]): Promise<{ sha256: string; name?: string }[]> {
    const out: { sha256: string; name?: string }[] = [];
    for (const a of list) {
      if ("sha256" in a) out.push(a.name ? { sha256: a.sha256, name: a.name } : { sha256: a.sha256 });
      else {
        const up = await this.uploadFile(a.file, a.name, a.mime);
        out.push({ sha256: up.sha256, name: up.name });
      }
    }
    return out;
  }

  // --- Warten & Ereignisse ---

  /**
   * Wartet per Long-Poll auf neue Kommentare anderer Autoren (Standard: alle außer dem eigenen user,
   * mit opts.from nur von diesem Autor). Wirft AgentBoardError "timeout" nach opts.timeoutMs bzw. "aborted".
   */
  async waitForReply(id: number, opts: WaitOptions = {}): Promise<Reply> {
    const deadline = opts.timeoutMs !== undefined ? Date.now() + opts.timeoutMs : Number.POSITIVE_INFINITY;
    let after = opts.afterSeq ?? (await this.getIssue(id)).issue.lastSeq;
    for (;;) {
      if (opts.signal?.aborted) throw new AgentBoardError("Abgebrochen", 0, "aborted");
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new AgentBoardError(`Keine Antwort auf #${id} innerhalb von ${opts.timeoutMs} ms`, 0, "timeout");
      const chunk = Math.max(1, Math.min(POLL_CHUNK_SEC, Math.ceil(remaining / 1000)));
      const q = new URLSearchParams({ after: String(after), timeout: String(chunk), comments: "1" });
      if (opts.from) q.set("author", opts.from);
      else q.set("notAuthor", this.user);
      const r = await this.json<{ changed: boolean; cursor: number; entries: Entry[] }>("GET", `/v1/issues/${id}/wait?${q}`, {
        signal: opts.signal,
        timeoutMs: chunk * 1000 + 30_000,
      });
      if (r.changed && r.entries.length) {
        return {
          issueId: id,
          text: r.entries.map((e) => e.body ?? "").join("\n\n"),
          attachments: r.entries.flatMap((e) => e.attachments ?? []),
          comments: r.entries,
          cursor: r.cursor,
        };
      }
      after = r.cursor;
    }
  }

  /** Frage als Issue anlegen und auf die Antwort warten (createIssue + waitForReply). */
  async ask(title: string, body: string, opts: AskOptions = {}): Promise<AskResult> {
    const input: CreateIssueInput = { title, body };
    if (opts.labels) input.labels = opts.labels;
    if (opts.model) input.model = opts.model;
    if (opts.attachments) input.attachments = opts.attachments;
    const issue = await this.createIssue(input);
    const wait: WaitOptions = { afterSeq: issue.lastSeq };
    if (opts.timeoutMs !== undefined) wait.timeoutMs = opts.timeoutMs;
    if (opts.signal) wait.signal = opts.signal;
    if (opts.from) wait.from = opts.from;
    return { ...(await this.waitForReply(issue.id, wait)), issue };
  }

  /**
   * Server-Sent Events aller Änderungen; baut die Verbindung bei Fehlern automatisch neu auf
   * (setzt beim letzten Ereignis fort). Läuft bis opts.signal abbricht; 401/403 beenden mit Fehler.
   */
  async events(onEvent: (ev: BoardEvent) => void | Promise<void>, opts: EventsOptions = {}): Promise<void> {
    let after = opts.after;
    const base = opts.reconnectMs ?? 1000;
    let delay = base;
    while (!opts.signal?.aborted) {
      // eigene Verbindung: bricht bei Nutzer-Abbruch oder Funkstille ab (Server pingt alle 15 s)
      const ac = new AbortController();
      const onAbort = () => ac.abort();
      opts.signal?.addEventListener("abort", onAbort, { once: true });
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      const kick = () => {
        if (watchdog) clearTimeout(watchdog);
        watchdog = setTimeout(() => ac.abort(), 45_000);
      };
      try {
        const q = after !== undefined ? `?after=${after}` : "";
        const res = await this.fetchFn(`${this.baseUrl}/v1/events${q}`, {
          headers: { authorization: `Bearer ${this.apiKey}`, accept: "text/event-stream" },
          signal: ac.signal,
        });
        if (!res.ok || !res.body) {
          const data = (await res.json().catch(() => undefined)) as { error?: { message?: string; type?: string } } | undefined;
          const err = new AgentBoardError(`HTTP ${res.status}: ${data?.error?.message ?? res.statusText}`, res.status, data?.error?.type ?? `http_${res.status}`);
          if (res.status === 401 || res.status === 403) throw err;
          throw Object.assign(err, { retry: true });
        }
        delay = base;
        kick();
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        let id: string | undefined;
        let event = "message";
        let data: string[] = [];
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          kick();
          buf += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.search(/\r\n|\r|\n/)) >= 0) {
            const line = buf.slice(0, nl);
            buf = buf.slice(nl + (buf[nl] === "\r" && buf[nl + 1] === "\n" ? 2 : 1));
            if (line === "") {
              if (data.length && event === "issue") {
                const ev = JSON.parse(data.join("\n")) as BoardEvent;
                await onEvent(ev);
                after = id !== undefined ? Number(id) : ev.seq;
              }
              id = undefined;
              event = "message";
              data = [];
            } else if (!line.startsWith(":")) {
              const i = line.indexOf(":");
              const field = i < 0 ? line : line.slice(0, i);
              const val = i < 0 ? "" : line.slice(i + 1).replace(/^ /, "");
              if (field === "data") data.push(val);
              else if (field === "event") event = val;
              else if (field === "id") id = val;
            }
          }
        }
      } catch (e) {
        if (opts.signal?.aborted) break;
        if (e instanceof AgentBoardError && !(e as AgentBoardError & { retry?: boolean }).retry) throw e;
        opts.onError?.(e);
      } finally {
        if (watchdog) clearTimeout(watchdog);
        opts.signal?.removeEventListener("abort", onAbort);
        ac.abort();
      }
      if (opts.signal?.aborted) break;
      await sleep(delay, opts.signal);
      delay = Math.min(30_000, delay * 2);
    }
  }
}

/** Datei von der Platte lesen (nur Node; im Browser Blob/File übergeben). */
async function readLocalFile(p: string): Promise<Uint8Array> {
  const proc = (globalThis as { process?: { versions?: { node?: string } } }).process;
  if (!proc?.versions?.node) throw new AgentBoardError("Dateipfade gehen nur unter Node – im Browser Blob/File übergeben", 0, "config_error");
  const mod = "node:fs/promises";
  const fs = (await import(/* @vite-ignore */ mod)) as { readFile(path: string): Promise<Uint8Array> };
  return fs.readFile(p);
}
