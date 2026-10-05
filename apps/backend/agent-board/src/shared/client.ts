// HTTP-Client für den Board-Server (genutzt von MCP-Server, CLI und e2e).
import type { AgentWaitResult, Attachment, Entry, InboxResult, Issue, IssueStatus } from "./types.ts";

/** Node-fetch (undici) bricht nach 300 s ohne Header ab – Long-Polls daher stückeln. */
export const MAX_POLL_CHUNK_SEC = 240;

export class RelayError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export type AttachmentRef = { sha256: string; name?: string } | { name: string; mime?: string; contentBase64: string };

export interface RelayClientOptions {
  baseUrl?: string;
  apiKey?: string;
}

export class RelayClient {
  readonly baseUrl: string;
  private apiKey: string | undefined;

  constructor(opts: RelayClientOptions = {}) {
    this.baseUrl = (opts.baseUrl ?? process.env.AB_URL ?? "http://127.0.0.1:4317").replace(/\/+$/, "").replace(/\/v1$/, "");
    this.apiKey = opts.apiKey ?? process.env.AB_API_KEY;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    return this.apiKey ? { authorization: `Bearer ${this.apiKey}`, ...extra } : extra;
  }

  async request<T>(method: string, path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    const init: RequestInit = { method, headers: this.headers(body !== undefined ? { "content-type": "application/json" } : {}) };
    if (body !== undefined) init.body = JSON.stringify(body);
    if (signal) init.signal = signal;
    const res = await fetch(`${this.baseUrl}${path}`, init);
    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }
    if (!res.ok) {
      const msg = (data as { error?: { message?: string } } | undefined)?.error?.message ?? res.statusText;
      throw new RelayError(res.status, `HTTP ${res.status}: ${msg}`);
    }
    return data as T;
  }

  // --- Agent ---
  /** provider: z. B. "claude", "whisper,ollama" oder "all" (Standard am Server: alle sichtbaren). */
  inbox(after?: number, limit?: number, provider?: string): Promise<InboxResult> {
    const q = new URLSearchParams();
    if (after !== undefined) q.set("after", String(after));
    if (limit !== undefined) q.set("limit", String(limit));
    if (provider) q.set("provider", provider);
    return this.request("GET", `/v1/agent/inbox${q.size ? `?${q}` : ""}`);
  }

  /** Ein einzelner Long-Poll (timeoutSec wird auf MAX_POLL_CHUNK_SEC begrenzt). */
  agentWait(after: number, timeoutSec: number, issueId?: number, signal?: AbortSignal, provider?: string): Promise<AgentWaitResult> {
    const t = Math.max(0, Math.min(MAX_POLL_CHUNK_SEC, Math.floor(timeoutSec)));
    const q = new URLSearchParams({ after: String(after), timeout: String(t) });
    if (issueId !== undefined) q.set("issue", String(issueId));
    if (provider) q.set("provider", provider);
    return this.request("GET", `/v1/agent/wait?${q}`, undefined, signal);
  }

  // --- Issues ---
  listIssues(filter: { status?: string; label?: string; forMe?: boolean; q?: string; limit?: number; provider?: string } = {}): Promise<{
    issues: Issue[];
    total: number;
    cursor: number;
  }> {
    const q = new URLSearchParams();
    if (filter.status) q.set("status", filter.status);
    if (filter.label) q.set("label", filter.label);
    if (filter.forMe) q.set("for", "me");
    if (filter.q) q.set("q", filter.q);
    if (filter.limit) q.set("limit", String(filter.limit));
    if (filter.provider) q.set("provider", filter.provider);
    return this.request("GET", `/v1/issues${q.size ? `?${q}` : ""}`);
  }

  getIssue(id: number): Promise<{ issue: Issue; entries: Entry[]; cursor: number }> {
    return this.request("GET", `/v1/issues/${id}`);
  }

  timeline(id: number, since = 0): Promise<{ entries: Entry[]; cursor: number }> {
    return this.request("GET", `/v1/issues/${id}/timeline?since=${since}`);
  }

  createIssue(input: {
    title: string;
    body?: string;
    labels?: string[];
    /** provider/name, z. B. claude/haiku (alte Werte wie "haiku" werden umgesetzt). */
    model?: string;
    author?: string;
    attachments?: AttachmentRef[];
  }): Promise<Issue> {
    return this.request("POST", "/v1/issues", input);
  }

  /** Übernehmen mit Sperre (409, wenn ein anderer Agent aktiv daran arbeitet bzw. das Issue zu einem anderen Provider gehört). */
  claim(id: number, agent: string, opts: { provider?: string; force?: boolean } = {}): Promise<Issue> {
    return this.request("POST", `/v1/issues/${id}/claim`, { agent, ...opts });
  }

  release(id: number, agent: string, reason?: string): Promise<Issue> {
    return this.request("POST", `/v1/issues/${id}/release`, reason ? { agent, reason } : { agent });
  }

  comment(
    id: number,
    input: { body: string; author?: string; attachments?: AttachmentRef[]; status?: IssueStatus; reason?: string },
  ): Promise<{ comment: Entry; issue: Issue }> {
    return this.request("POST", `/v1/issues/${id}/comments`, input);
  }

  patchIssue(
    id: number,
    patch: {
      author?: string;
      status?: IssueStatus;
      reason?: string;
      title?: string;
      labels?: string[];
      addLabels?: string[];
      removeLabels?: string[];
      assignee?: string | null;
      model?: string;
    },
  ): Promise<Issue> {
    return this.request("PATCH", `/v1/issues/${id}`, patch);
  }

  waitIssue(id: number, after: number, timeoutSec: number, opts: { notAuthor?: string; commentsOnly?: boolean } = {}): Promise<{
    changed: boolean;
    cursor: number;
    entries: Entry[];
  }> {
    const q = new URLSearchParams({ after: String(after), timeout: String(Math.min(timeoutSec, MAX_POLL_CHUNK_SEC)) });
    if (opts.notAuthor) q.set("notAuthor", opts.notAuthor);
    if (opts.commentsOnly) q.set("comments", "1");
    return this.request("GET", `/v1/issues/${id}/wait?${q}`);
  }

  // --- Dateien ---
  async upload(data: Uint8Array, name: string, mime?: string): Promise<Attachment> {
    const res = await fetch(`${this.baseUrl}/v1/files?name=${encodeURIComponent(name)}`, {
      method: "POST",
      headers: this.headers({ "content-type": mime ?? "application/octet-stream" }),
      body: data,
    });
    const json = (await res.json()) as Attachment & { error?: { message: string } };
    if (!res.ok) throw new RelayError(res.status, `HTTP ${res.status}: ${json.error?.message ?? ""}`);
    return json;
  }

  /** Bildvorschau (JPEG/PNG, lange Kante ≤ maxEdge, aufrecht) – auch für HEIC. */
  async preview(ref: string, maxEdge: number): Promise<{ data: Buffer; mime: string; name: string; width: number; height: number }> {
    const r = await this.download(`${encodeURIComponent(ref)}/preview?max=${maxEdge}`, true);
    return { ...r, width: Number(r.headers.get("x-image-width")), height: Number(r.headers.get("x-image-height")) };
  }

  async download(ref: string, rawPath = false): Promise<{ data: Buffer; mime: string; name: string; headers: Headers }> {
    const res = await fetch(`${this.baseUrl}/v1/files/${rawPath ? ref : encodeURIComponent(ref)}`, { headers: this.headers() });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
      throw new RelayError(res.status, `HTTP ${res.status}: ${j.error?.message ?? res.statusText}`);
    }
    const disp = res.headers.get("content-disposition") ?? "";
    const m = /filename\*=UTF-8''([^;]+)/.exec(disp);
    return {
      data: Buffer.from(await res.arrayBuffer()),
      mime: (res.headers.get("content-type") ?? "application/octet-stream").split(";")[0]!.trim(),
      name: m ? decodeURIComponent(m[1]!) : ref,
      headers: res.headers,
    };
  }
}
