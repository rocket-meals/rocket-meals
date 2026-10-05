// Datenhaltung: In-Memory-Index + JSON-Dateien (eine Datei pro Issue, meta.json für Zähler).
import { EventEmitter } from "node:events";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  AgentWaitResult,
  Attachment,
  BoardEvent,
  Entry,
  InboxItem,
  InboxResult,
  Issue,
  IssueEvent,
  IssueStatus,
  IssueWaitResult,
  ModelId,
  WaitingIssue,
} from "../shared/types.ts";
import { DEFAULT_MODEL, ISSUE_STATUSES, normalizeModel, providerOf } from "../shared/types.ts";
import { StoreError } from "./errors.ts";

interface IssueRecord {
  issue: Issue;
  entries: Entry[];
  /** Name des Schlüssels, mit dem das Issue angelegt wurde (program-Schlüssel sehen nur eigene Issues). */
  owner?: string;
}

/** Einfacher Mutex: serialisiert asynchrone Abschnitte. */
class Mutex {
  private tail: Promise<unknown> = Promise.resolve();
  run<T>(fn: () => Promise<T>): Promise<T> {
    const next = this.tail.then(fn, fn);
    this.tail = next.catch(() => undefined);
    return next;
  }
}

/** Atomarer Write: erst temporäre Datei, dann rename. */
async function writeJsonAtomic(file: string, data: unknown): Promise<void> {
  const tmp = `${file}.${process.pid}.${randomBytes(4).toString("hex")}.tmp`;
  await writeFile(tmp, JSON.stringify(data, null, 2));
  await rename(tmp, file);
}

export function truncate(text: string, max: number): string {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

export function normalizeLabel(l: string): string {
  return l.trim().toLowerCase().replace(/\s+/g, "-").slice(0, 50);
}

/** "model:haiku" → "claude/haiku", "model:whisper/large-v3" → "whisper/large-v3" (sonst undefined). */
export function modelFromLabel(label: string): ModelId | undefined {
  const m = /^model:(.+)$/.exec(normalizeLabel(label));
  return m ? normalizeModel(m[1]) : undefined;
}

/** Labels "model:<x>" herausziehen: liefert übrige Labels und das (letzte) Modell daraus. */
export function splitModelLabels(labels: string[]): { labels: string[]; model?: ModelId } {
  let model: ModelId | undefined;
  const rest: string[] = [];
  for (const l of labels) {
    const m = modelFromLabel(l);
    if (m) model = m;
    else rest.push(l);
  }
  return model ? { labels: rest, model } : { labels: rest };
}

/** Erwähnte Namen (@name) in einem Text. */
export function findMentions(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(^|[^\w@])@([A-Za-z0-9][\w.-]*[A-Za-z0-9]|[A-Za-z0-9])/g)) out.add(m[2]!.toLowerCase());
  return [...out];
}

export interface StoreOptions {
  dataDir: string;
  /** Name des Agenten (z. B. "claude"). */
  agent: string;
  /** Name des Menschen (Erwähnungen, „Für dich“). */
  user: string;
  /** Sperre läuft nach so vielen ms ohne Aktivität des Agenten ab (Standard 30 min). */
  claimTtlMs?: number;
  /** Weitere Agenten-Autoren (z. B. aus agent-Schlüsseln anderer Provider). */
  isExtraAgent?: (name: string) => boolean;
}

/** Sichtbarkeit: nur Issues dieser Provider und/oder dieses Besitzers (Schlüsselname). */
export interface IssueScope {
  providers?: string[];
  owner?: string;
}

export interface CreateIssueInput {
  title: string;
  body?: string;
  labels?: string[];
  /** provider/name; alte Werte (opus/sonnet/haiku) werden zu claude/<x>. */
  model?: string;
  author: string;
  assignee?: string;
  attachments?: Attachment[];
  /** Schlüsselname des Anlegers. */
  owner?: string;
}

export interface CommentInput {
  author: string;
  body: string;
  attachments?: Attachment[];
  status?: IssueStatus;
  reason?: string;
}

export interface UpdateInput {
  actor: string;
  status?: IssueStatus;
  reason?: string;
  title?: string;
  body?: string;
  labels?: string[];
  addLabels?: string[];
  removeLabels?: string[];
  assignee?: string | null;
  model?: string;
}

export interface IssueFilter extends IssueScope {
  status?: IssueStatus | "active" | "all";
  label?: string;
  forUser?: boolean;
  since?: number;
  q?: string;
}

/** Arbeitskontext einer Schreiboperation. */
interface Tx {
  rec: IssueRecord;
  actor: string;
  now: string;
  entries: Entry[];
  /** Änderung ohne Verlaufseintrag (z. B. Sperre erneuert) → trotzdem speichern. */
  dirty?: boolean;
}

export class Store {
  readonly events = new EventEmitter();
  private issues = new Map<number, IssueRecord>();
  private seq = 0;
  private nextId = 1;
  private mutex = new Mutex();
  private issueDir: string;
  readonly agent: string;
  readonly user: string;
  readonly claimTtlMs: number;

  private constructor(private opts: StoreOptions) {
    this.issueDir = path.join(opts.dataDir, "issues");
    this.agent = opts.agent.toLowerCase();
    this.user = opts.user.toLowerCase();
    this.claimTtlMs = opts.claimTtlMs ?? 30 * 60_000;
    this.events.setMaxListeners(0);
  }

  static async open(opts: StoreOptions): Promise<Store> {
    const store = new Store(opts);
    await store.load();
    return store;
  }

  private async load(): Promise<void> {
    await mkdir(this.issueDir, { recursive: true });
    try {
      const meta = JSON.parse(await readFile(path.join(this.opts.dataDir, "meta.json"), "utf8")) as { seq?: number; nextId?: number };
      this.seq = meta.seq ?? 0;
      this.nextId = meta.nextId ?? 1;
    } catch {
      // erster Start
    }
    for (const name of await readdir(this.issueDir)) {
      if (!name.endsWith(".json")) continue;
      try {
        const rec = JSON.parse(await readFile(path.join(this.issueDir, name), "utf8")) as IssueRecord;
        // Daten aus älteren Versionen: fehlendes Modell bzw. "haiku" → "claude/haiku", Provider ableiten
        rec.issue.model = normalizeModel(rec.issue.model) ?? DEFAULT_MODEL;
        rec.issue.provider = providerOf(rec.issue.model);
        this.issues.set(rec.issue.id, rec);
        // Zähler nie hinter gespeicherte Daten zurückfallen lassen
        this.seq = Math.max(this.seq, rec.issue.lastSeq);
        this.nextId = Math.max(this.nextId, rec.issue.id + 1);
      } catch {
        // defekte Datei überspringen
      }
    }
  }

  get currentSeq(): number {
    return this.seq;
  }

  /** Agent oder Subagent: "claude", "claude:sonnet-7", "claude-haiku" … (Name + Trennzeichen). */
  isAgent(name: string): boolean {
    const n = name.toLowerCase();
    if (n === this.agent || (n.startsWith(this.agent) && /[^a-z0-9]/.test(n[this.agent.length]!))) return true;
    return this.opts.isExtraAgent?.(n) ?? false;
  }

  /** Schlüsselname des Anlegers (für program-Schlüssel). */
  ownerOf(id: number): string | undefined {
    return this.issues.get(id)?.owner;
  }

  /** Liegt das Issue im Sichtbereich (Provider/Besitzer)? */
  inScope(id: number, scope: IssueScope | undefined): boolean {
    const rec = this.issues.get(id);
    if (!rec) return false;
    if (!scope) return true;
    if (scope.providers && !scope.providers.includes(rec.issue.provider)) return false;
    if (scope.owner !== undefined && rec.owner !== scope.owner) return false;
    return true;
  }

  /** Aktive (nicht abgelaufene) Sperre eines Issues. */
  activeClaim(issue: Issue, now = Date.now()): string | undefined {
    const c = issue.claim;
    if (!c || issue.status !== "in_progress") return undefined;
    return now - Date.parse(c.lastActivity) < this.claimTtlMs ? c.agent : undefined;
  }

  // --- Lesen ---

  private require(id: number): IssueRecord {
    const rec = this.issues.get(id);
    if (!rec) throw new StoreError(404, `Issue #${id} nicht gefunden`);
    return rec;
  }

  getIssue(id: number): Issue | undefined {
    return this.issues.get(id)?.issue;
  }

  getEntries(id: number, since = 0): Entry[] {
    return this.require(id).entries.filter((e) => e.seq > since);
  }

  /** Alle Einträge (issueübergreifend) mit seq > after, aufsteigend. */
  entriesAfter(after: number): Entry[] {
    const out: Entry[] = [];
    for (const rec of this.issues.values()) for (const e of rec.entries) if (e.seq > after) out.push(e);
    return out.sort((a, b) => a.seq - b.seq);
  }

  /** Wartet der Mensch? needs_human oder unbeantwortete Erwähnung. */
  isForUser(rec: IssueRecord): boolean {
    if (rec.issue.status === "closed") return false;
    if (rec.issue.status === "needs_human") return true;
    let lastOwn = 0;
    let lastMention = 0;
    for (const e of rec.entries) {
      if (e.author.toLowerCase() === this.user) lastOwn = e.seq;
      if (e.event?.kind === "mention" && e.event.user === this.user) lastMention = e.seq;
    }
    return lastMention > lastOwn;
  }

  listIssues(filter: IssueFilter = {}): Issue[] {
    const q = filter.q?.toLowerCase();
    const label = filter.label ? normalizeLabel(filter.label) : undefined;
    return [...this.issues.values()]
      .filter((r) => {
        const s = r.issue.status;
        if (!this.inScope(r.issue.id, filter)) return false;
        if (filter.status === "active" && s === "closed") return false;
        if (filter.status && filter.status !== "active" && filter.status !== "all" && s !== filter.status) return false;
        if (label && !r.issue.labels.includes(label)) return false;
        if (filter.since !== undefined && r.issue.lastSeq <= filter.since) return false;
        if (filter.forUser && !this.isForUser(r)) return false;
        if (q && !`${r.issue.title}\n${r.issue.body}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((r) => r.issue)
      .sort((a, b) => b.lastSeq - a.lastSeq);
  }

  /** Einträge, die den Agenten wecken sollen: neue Issues, Kommentare, Wiedereröffnung – nicht vom Agenten selbst. */
  private isRelevant(e: Entry): boolean {
    if (this.isAgent(e.author)) return false;
    if (e.type === "comment") return true;
    if (e.event?.kind === "opened") return true;
    return e.event?.kind === "status" && e.event.from === "closed" && e.event.to !== "closed";
  }

  private waitingInfo(rec: IssueRecord, after: number): WaitingIssue | undefined {
    const news = rec.entries.filter((e) => e.seq > after && this.isRelevant(e));
    if (news.length === 0) return undefined;
    const i = rec.issue;
    const comments = news.filter((e) => e.type === "comment");
    const w: WaitingIssue = {
      issueId: i.id,
      title: truncate(i.title, 50),
      status: i.status,
      model: i.model,
      provider: i.provider,
      newEntries: news.length,
      opened: news.some((e) => e.event?.kind === "opened"),
      comments: comments.length,
      commentAuthors: [...new Set(comments.map((e) => e.author))],
      reopened: news.some((e) => e.event?.kind === "status"),
      preview: truncate(comments.at(-1)?.body || i.body, 80),
    };
    const claimed = this.activeClaim(i);
    if (claimed) w.claimedBy = claimed;
    return w;
  }

  /** Für /v1/agent/wait: nicht geschlossene Issues mit relevanten Einträgen (seq > after). */
  agentState(after: number, issueId?: number, scope?: IssueScope): AgentWaitResult {
    const waiting: WaitingIssue[] = [];
    for (const rec of this.issues.values()) {
      if (issueId !== undefined && rec.issue.id !== issueId) continue;
      if (!this.inScope(rec.issue.id, scope)) continue;
      if (rec.issue.status === "closed") continue;
      const w = this.waitingInfo(rec, after);
      if (w) waiting.push(w);
    }
    waiting.sort((a, b) => a.issueId - b.issueId);
    return { changed: waiting.length > 0, cursor: Math.max(after, this.seq), waiting };
  }

  /** Kompakte Übersicht: offene Issues + alles mit Neuem seit after. */
  inbox(after = 0, limit = 30, scope?: IssueScope): InboxResult {
    const counts = { ...(Object.fromEntries(ISSUE_STATUSES.map((s) => [s, 0])) as Record<IssueStatus, number>), forYou: 0 };
    const items: InboxItem[] = [];
    for (const rec of this.issues.values()) {
      const i = rec.issue;
      if (!this.inScope(i.id, scope)) continue;
      counts[i.status]++;
      if (this.isForUser(rec)) counts.forYou++;
      const news = rec.entries.filter((e) => e.seq > after && this.isRelevant(e));
      const include = i.status === "open" || (news.length > 0 && (i.status !== "closed" || after > 0));
      if (!include) continue;
      const last = [...rec.entries].reverse().find((e) => this.isRelevant(e) && e.type === "comment");
      const item: InboxItem = {
        issueId: i.id,
        title: truncate(i.title, 50),
        status: i.status,
        model: i.model,
        provider: i.provider,
        labels: i.labels,
        newEntries: news.length,
        preview: truncate(last?.body ?? i.body, 80),
        lastSeq: i.lastSeq,
      };
      const claimed = this.activeClaim(i);
      if (claimed) item.claimedBy = claimed;
      items.push(item);
    }
    items.sort((a, b) => b.newEntries - a.newEntries || a.issueId - b.issueId);
    return { cursor: this.seq, counts, items: items.slice(0, limit), more: Math.max(0, items.length - limit) };
  }

  /** author-Filter: exakt; der Agentenname selbst ("claude") passt auch auf Subagenten ("claude:sonnet-7"). */
  private authorMatches(author: string, wanted: string): boolean {
    const a = author.toLowerCase();
    const w = wanted.toLowerCase();
    return a === w || (w === this.agent && this.isAgent(a));
  }

  issueState(id: number, after: number, filter: { notAuthor?: string; author?: string; commentsOnly?: boolean } = {}): IssueWaitResult {
    const entries = this.getEntries(id, after).filter(
      (e) =>
        (!filter.commentsOnly || e.type === "comment") &&
        (!filter.notAuthor || e.author.toLowerCase() !== filter.notAuthor.toLowerCase()) &&
        (!filter.author || this.authorMatches(e.author, filter.author)),
    );
    return { changed: entries.length > 0, cursor: Math.max(after, this.seq), entries };
  }

  // --- Schreiben ---

  /** Modell normalisieren (alte Werte → claude/<x>); ungültig → 400. */
  private checkModel(raw: string | undefined): ModelId | undefined {
    if (raw === undefined) return undefined;
    const m = normalizeModel(raw);
    if (!m) throw new StoreError(400, `Ungültiges Modell "${raw}" – erwartet provider/name, z. B. claude/opus`);
    return m;
  }

  private push(tx: Tx, partial: Omit<Entry, "seq" | "issueId" | "createdAt" | "author"> & { author?: string }): Entry {
    const e: Entry = { seq: ++this.seq, issueId: tx.rec.issue.id, createdAt: tx.now, author: partial.author ?? tx.actor, type: partial.type };
    if (partial.body !== undefined) e.body = partial.body;
    if (partial.attachments) e.attachments = partial.attachments;
    if (partial.event) e.event = partial.event;
    tx.rec.entries.push(e);
    tx.entries.push(e);
    tx.rec.issue.lastSeq = e.seq;
    tx.rec.issue.updatedAt = tx.now;
    // Aktivität des Sperr-Inhabers verlängert die Sperre
    const claim = tx.rec.issue.claim;
    if (claim && claim.agent.toLowerCase() === e.author.toLowerCase()) claim.lastActivity = tx.now;
    return e;
  }

  private event(tx: Tx, ev: IssueEvent): void {
    this.push(tx, { type: "event", event: ev });
  }

  private mentions(tx: Tx, text: string, reason?: string): void {
    for (const user of findMentions(text)) {
      if (user === tx.actor.toLowerCase()) continue;
      const ev: IssueEvent = { kind: "mention", user };
      if (reason) ev.reason = reason;
      this.event(tx, ev);
    }
  }

  /** Statuswechsel inkl. Regeln (Agent schließt nur mit Begründung, Mensch hat das letzte Wort). */
  private setStatus(tx: Tx, to: IssueStatus, reason: string | undefined, hasComment: boolean): void {
    const issue = tx.rec.issue;
    const from = issue.status;
    const byAgent = this.isAgent(tx.actor);
    const holder = this.activeClaim(issue, Date.parse(tx.now));
    if (to === "in_progress" && byAgent && holder && holder.toLowerCase() !== tx.actor.toLowerCase()) {
      throw new StoreError(409, `Issue #${issue.id} ist bereits von ${holder} übernommen`);
    }
    if (from === to) return;
    if (to === "closed" && byAgent) {
      if (!reason && !hasComment) throw new StoreError(400, "Der Agent schließt nur mit Abschlusskommentar (reason oder Kommentar)");
      if (issue.reopenedBy) {
        throw new StoreError(409, `Von ${issue.reopenedBy} wiedereröffnet – nur ein Mensch darf es schließen. Stattdessen needs_human setzen.`);
      }
    }
    if (to === "needs_human" && byAgent && !reason && !hasComment) {
      throw new StoreError(400, "needs_human braucht einen Grund");
    }
    issue.status = to;
    // Statuswechsel weg von in_progress gibt die Sperre frei
    if (to !== "in_progress" && issue.claim) delete issue.claim;
    if (to === "closed") {
      issue.closedAt = tx.now;
      issue.closedBy = tx.actor;
      if (!byAgent) delete issue.reopenedBy;
    } else if (from === "closed") {
      delete issue.closedAt;
      delete issue.closedBy;
      if (!byAgent) issue.reopenedBy = tx.actor;
    }
    const ev: IssueEvent = { kind: "status", from, to };
    if (reason) ev.reason = reason;
    this.event(tx, ev);
    if (to === "in_progress" && byAgent && !issue.assignee) this.setAssignee(tx, tx.actor);
    if (to === "needs_human" && tx.actor.toLowerCase() !== this.user) {
      const m: IssueEvent = { kind: "mention", user: this.user };
      if (reason) m.reason = reason;
      // keine doppelte Erwähnung, wenn der Kommentar @user schon enthält
      if (!tx.entries.some((e) => e.event?.kind === "mention" && e.event.user === this.user)) this.event(tx, m);
    }
  }

  private setAssignee(tx: Tx, to: string | null): void {
    const from = tx.rec.issue.assignee;
    if ((to ?? undefined) === from) return;
    if (to) tx.rec.issue.assignee = to;
    else delete tx.rec.issue.assignee;
    const ev: IssueEvent = { kind: "assign" };
    if (from) ev.from = from;
    if (to) ev.to = to;
    this.event(tx, ev);
  }

  private setLabels(tx: Tx, next: string[]): void {
    const cur = tx.rec.issue.labels;
    const clean = [...new Set(next.map(normalizeLabel).filter(Boolean))];
    const added = clean.filter((l) => !cur.includes(l));
    const removed = cur.filter((l) => !clean.includes(l));
    if (!added.length && !removed.length) return;
    tx.rec.issue.labels = clean;
    this.event(tx, { kind: "labels", added, removed });
  }

  /** Transaktion: Änderungen im Speicher, dann atomar speichern, dann Ereignis senden. */
  private async tx<T>(id: number | undefined, actor: string, fn: (tx: Tx) => T, create?: () => IssueRecord): Promise<{ result: T; tx: Tx }> {
    return this.mutex.run(async () => {
      const now = new Date().toISOString();
      const rec = create ? create() : this.require(id!);
      // bei Fehlern Zustand zurückrollen
      const snapshot = JSON.stringify(rec);
      const seqBefore = this.seq;
      const tx: Tx = { rec, actor, now, entries: [] };
      let result: T;
      try {
        result = fn(tx);
      } catch (e) {
        this.seq = seqBefore;
        if (create) this.nextId--;
        else this.issues.set(rec.issue.id, JSON.parse(snapshot) as IssueRecord);
        throw e;
      }
      if (create) this.issues.set(rec.issue.id, rec);
      if (tx.entries.length || create || tx.dirty) {
        await writeJsonAtomic(path.join(this.issueDir, `${rec.issue.id}.json`), rec);
        await writeJsonAtomic(path.join(this.opts.dataDir, "meta.json"), { seq: this.seq, nextId: this.nextId });
        const ev: BoardEvent = { type: "issue", seq: this.seq, issue: { ...rec.issue }, entries: tx.entries };
        if (tx.entries.length || create) this.events.emit("event", ev);
      }
      return { result, tx };
    });
  }

  async createIssue(input: CreateIssueInput): Promise<{ issue: Issue; entries: Entry[] }> {
    const { tx } = await this.tx(
      undefined,
      input.author,
      (tx) => {
        this.event(tx, { kind: "opened" });
        // Feld ist maßgeblich; Label "model:<x>" wird nur übernommen, wenn kein Feld angegeben ist
        const split = splitModelLabels(input.labels ?? []);
        tx.rec.issue.model = this.checkModel(input.model) ?? split.model ?? DEFAULT_MODEL;
        tx.rec.issue.provider = providerOf(tx.rec.issue.model);
        if (split.labels.length) tx.rec.issue.labels = [...new Set(split.labels.map(normalizeLabel).filter(Boolean))];
        if (input.assignee) tx.rec.issue.assignee = input.assignee;
        this.mentions(tx, `${input.title}\n${input.body ?? ""}`);
      },
      () => {
        const now = new Date().toISOString();
        return {
          issue: {
            id: this.nextId++,
            title: input.title,
            body: input.body ?? "",
            status: "open",
            labels: [],
            model: DEFAULT_MODEL,
            provider: providerOf(DEFAULT_MODEL),
            author: input.author,
            createdAt: now,
            updatedAt: now,
            attachments: input.attachments ?? [],
            commentCount: 0,
            lastSeq: 0,
          },
          entries: [],
          ...(input.owner ? { owner: input.owner } : {}),
        };
      },
    );
    return { issue: { ...tx.rec.issue }, entries: tx.entries };
  }

  async addComment(id: number, input: CommentInput): Promise<{ issue: Issue; comment: Entry; entries: Entry[] }> {
    const { result, tx } = await this.tx(id, input.author, (tx) => {
      const c = this.push(tx, { type: "comment", body: input.body, attachments: input.attachments ?? [] });
      tx.rec.issue.commentCount++;
      this.mentions(tx, input.body, input.reason);
      if (input.status) this.setStatus(tx, input.status, input.reason, true);
      // Antwort eines Menschen/Programms auf needs_human → wieder offen für den Agenten
      else if (tx.rec.issue.status === "needs_human" && !this.isAgent(input.author)) this.setStatus(tx, "open", undefined, true);
      return c;
    });
    return { issue: { ...tx.rec.issue }, comment: result, entries: tx.entries };
  }

  async updateIssue(id: number, input: UpdateInput): Promise<{ issue: Issue; entries: Entry[] }> {
    const { tx } = await this.tx(id, input.actor, (tx) => {
      const issue = tx.rec.issue;
      const edited: string[] = [];
      if (input.title !== undefined && input.title !== issue.title) {
        issue.title = input.title;
        edited.push("title");
      }
      if (input.body !== undefined && input.body !== issue.body) {
        issue.body = input.body;
        edited.push("body");
      }
      let model = input.model;
      if (input.labels || input.addLabels || input.removeLabels) {
        let next = input.labels ?? issue.labels;
        if (input.addLabels) next = [...next, ...input.addLabels];
        if (input.removeLabels) {
          const rm = input.removeLabels.map(normalizeLabel);
          next = next.filter((l) => !rm.includes(normalizeLabel(l)));
        }
        const split = splitModelLabels(next);
        model ??= split.model;
        this.setLabels(tx, split.labels);
      }
      model = this.checkModel(model);
      if (model && model !== issue.model) {
        issue.model = model as ModelId;
        issue.provider = providerOf(model);
        edited.push("model");
      }
      if (edited.length) this.event(tx, { kind: "edit", fields: edited });
      if (input.assignee !== undefined) this.setAssignee(tx, input.assignee);
      if (input.status) this.setStatus(tx, input.status, input.reason, false);
    });
    return { issue: { ...tx.rec.issue }, entries: tx.entries };
  }

  /**
   * Issue atomar übernehmen: in_progress + assignee + Sperre. 409, wenn ein anderer Agent eine aktive Sperre hält
   * oder das Issue geschlossen ist. Derselbe Agent erneuert seine Sperre.
   */
  async claimIssue(id: number, agent: string, opts: { provider?: string; force?: boolean } = {}): Promise<{ issue: Issue; entries: Entry[] }> {
    const { tx } = await this.tx(id, agent, (tx) => {
      const issue = tx.rec.issue;
      const now = Date.parse(tx.now);
      if (issue.status === "closed") throw new StoreError(409, `Issue #${id} ist geschlossen`);
      const wanted = opts.provider?.toLowerCase();
      if (wanted && wanted !== "all" && issue.provider !== wanted && !opts.force) {
        throw new StoreError(
          409,
          `Issue #${id} gehört zu Provider ${issue.provider} (Modell ${issue.model}), nicht zu ${wanted} – nicht bearbeiten (nur mit force übernehmen)`,
        );
      }
      const holder = this.activeClaim(issue, now);
      if (holder && holder.toLowerCase() !== agent.toLowerCase()) {
        const until = new Date(Date.parse(issue.claim!.lastActivity) + this.claimTtlMs).toISOString();
        throw new StoreError(409, `Issue #${id} ist bereits von ${holder} übernommen (Sperre bis ${until}, sofern keine Aktivität)`);
      }
      const prev = holder ? issue.claim! : undefined;
      issue.claim = { agent, since: prev?.since ?? tx.now, lastActivity: tx.now };
      tx.dirty = true;
      if (issue.status !== "in_progress") this.setStatus(tx, "in_progress", undefined, false);
      this.setAssignee(tx, agent);
    });
    return { issue: { ...tx.rec.issue }, entries: tx.entries };
  }

  /** Sperre freigeben (nur Inhaber oder bei abgelaufener Sperre); in_progress → open. */
  async releaseIssue(id: number, agent: string, reason?: string): Promise<{ issue: Issue; entries: Entry[] }> {
    const { tx } = await this.tx(id, agent, (tx) => {
      const issue = tx.rec.issue;
      const holder = this.activeClaim(issue, Date.parse(tx.now));
      if (holder && holder.toLowerCase() !== agent.toLowerCase()) {
        throw new StoreError(409, `Sperre gehört ${holder} – nur der Inhaber gibt frei`);
      }
      if (issue.claim) {
        delete issue.claim;
        tx.dirty = true;
      }
      if (issue.status === "in_progress") this.setStatus(tx, "open", reason, false);
      if (issue.assignee && issue.assignee.toLowerCase() === agent.toLowerCase()) this.setAssignee(tx, null);
    });
    return { issue: { ...tx.rec.issue }, entries: tx.entries };
  }

  /**
   * Long-Poll-Helfer: ruft check() sofort und nach jedem Ereignis auf,
   * bis ein Ergebnis kommt, der Timeout abläuft oder signal abbricht.
   */
  waitFor<T>(check: () => T | undefined, timeoutMs: number, signal?: AbortSignal): Promise<T | undefined> {
    const first = check();
    if (first !== undefined || timeoutMs <= 0 || signal?.aborted) return Promise.resolve(first);
    return new Promise((resolve) => {
      const finish = (v: T | undefined) => {
        clearTimeout(timer);
        this.events.off("event", onEvent);
        signal?.removeEventListener("abort", onAbort);
        resolve(v);
      };
      const onEvent = () => {
        const v = check();
        if (v !== undefined) finish(v);
      };
      const onAbort = () => finish(undefined);
      const timer = setTimeout(() => finish(undefined), timeoutMs);
      this.events.on("event", onEvent);
      signal?.addEventListener("abort", onAbort);
    });
  }
}
