// Gemeinsame Typen für Server, MCP-Server, CLI und Web-Oberfläche.

export const ISSUE_STATUSES = ["open", "in_progress", "needs_human", "closed"] as const;
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

/**
 * Bearbeitungsmodell eines Issues: "<provider>/<name>", z. B. "claude/opus" (Standard), "whisper/large-v3".
 * Issues des Providers "claude" bearbeitet Claude (Subagent mit dem Namen nach dem Schrägstrich),
 * andere Provider ihre eigenen Worker (runWorker im Client-Paket).
 */
export const Model = {
  CLAUDE: { OPUS: "claude/opus", SONNET: "claude/sonnet", HAIKU: "claude/haiku" },
} as const;
export type ClaudeModel = (typeof Model.CLAUDE)[keyof typeof Model.CLAUDE];
export type ModelId = ClaudeModel | `${string}/${string}`;
/** Früherer Name des Modelltyps. */
export type IssueModel = ModelId;
export const CLAUDE_PROVIDER = "claude";
export const CLAUDE_MODELS = [Model.CLAUDE.OPUS, Model.CLAUDE.SONNET, Model.CLAUDE.HAIKU] as const;
/** @deprecated Alias für CLAUDE_MODELS. */
export const ISSUE_MODELS = CLAUDE_MODELS;
export const DEFAULT_MODEL: ModelId = Model.CLAUDE.OPUS;
export const MODEL_NAMES: Record<ClaudeModel, string> = {
  "claude/opus": "Claude Opus 5.5",
  "claude/sonnet": "Claude Sonnet 5.5",
  "claude/haiku": "Claude Haiku 4.5",
};
/** Erlaubte Form eines Modells: provider/name (Kleinbuchstaben). */
export const MODEL_PATTERN = /^[a-z0-9-]+\/[a-z0-9._-]+$/;
/** Werte aus älteren Versionen (ohne Provider) → claude/<x>. */
export const LEGACY_MODELS = ["opus", "sonnet", "haiku"] as const;

/** Eingabe normalisieren: "haiku" → "claude/haiku", "Whisper/Large-V3" → "whisper/large-v3"; ungültig → undefined. */
export function normalizeModel(raw: string | undefined | null): ModelId | undefined {
  if (typeof raw !== "string") return undefined;
  const s = raw.trim().toLowerCase();
  if ((LEGACY_MODELS as readonly string[]).includes(s)) return `${CLAUDE_PROVIDER}/${s}` as ModelId;
  return MODEL_PATTERN.test(s) ? (s as ModelId) : undefined;
}

/** Provider eines Modells ("claude/opus" → "claude"). */
export function providerOf(model: string): string {
  const i = model.indexOf("/");
  return i < 0 ? CLAUDE_PROVIDER : model.slice(0, i);
}

/** Eigenes Modell bauen, z. B. model("whisper", "large-v3"); wirft bei ungültigen Zeichen. */
export function model(provider: string, name: string): ModelId {
  const id = `${provider.trim().toLowerCase()}/${name.trim().toLowerCase()}`;
  if (!MODEL_PATTERN.test(id)) throw new TypeError(`Ungültiges Modell "${id}" (erlaubt: provider/name aus a-z 0-9 . _ -)`);
  return id as ModelId;
}

/** Sperre gegen Doppelbearbeitung (POST /v1/issues/:id/claim). */
export interface IssueClaim {
  /** z. B. "claude:sonnet-7" */
  agent: string;
  since: string;
  /** Letzte Aktivität des Agenten im Issue; Sperre läuft danach nach AB_CLAIM_TTL_MIN ab. */
  lastActivity: string;
}

/** Abgeleitete JPEG-Vorschau (HEIC, große Fotos); eigene Datei unter /v1/files/<sha256>. */
export interface AttachmentPreview {
  sha256: string;
  mime: string;
  size: number;
  width: number;
  height: number;
}

export interface Attachment {
  sha256: string;
  name: string;
  mime: string;
  size: number;
  /** Bildmaße des Originals (wenn bekannt). */
  width?: number;
  height?: number;
  preview?: AttachmentPreview;
}

export interface Issue {
  id: number;
  title: string;
  body: string;
  status: IssueStatus;
  labels: string[];
  /** Bearbeitungsmodell "<provider>/<name>" (Standard "claude/opus"); Labels "model:<x>" werden beim Anlegen/Ändern hierher übernommen. */
  model: ModelId;
  /** Abgeleitet aus model (Teil vor dem Schrägstrich), z. B. "claude", "whisper". */
  provider: string;
  author: string;
  assignee?: string;
  /** Aktuelle oder abgelaufene Sperre; aktiv nur, solange nicht abgelaufen. */
  claim?: IssueClaim;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
  closedBy?: string;
  attachments: Attachment[];
  commentCount: number;
  /** Sequenznummer des letzten Verlaufseintrags. */
  lastSeq: number;
  /** Gesetzt, wenn ein Mensch/Programm das Issue wiedereröffnet hat – dann darf der Agent nicht mehr schließen. */
  reopenedBy?: string;
}

export type IssueEvent =
  | { kind: "opened" }
  | { kind: "status"; from: IssueStatus; to: IssueStatus; reason?: string }
  | { kind: "labels"; added: string[]; removed: string[] }
  | { kind: "assign"; from?: string; to?: string }
  | { kind: "mention"; user: string; reason?: string }
  | { kind: "edit"; fields: string[] };

/** Verlaufseintrag: Kommentar oder Ereignis (globale, monotone seq). */
export interface Entry {
  seq: number;
  issueId: number;
  type: "comment" | "event";
  author: string;
  createdAt: string;
  body?: string;
  attachments?: Attachment[];
  event?: IssueEvent;
}

/** Ereignis für SSE und Long-Polls: alle Einträge einer Operation. */
export interface BoardEvent {
  type: "issue";
  seq: number;
  issue: Issue;
  entries: Entry[];
}

export interface WaitingIssue {
  issueId: number;
  title: string;
  status: IssueStatus;
  model: ModelId;
  provider: string;
  /** relevante neue Einträge (von anderen als dem Agenten). */
  newEntries: number;
  opened: boolean;
  comments: number;
  /** Autoren der neuen Kommentare (ohne Agenten). */
  commentAuthors: string[];
  reopened: boolean;
  /** max. 80 Zeichen: letzter neuer Kommentar, sonst Issue-Text (ggf. leer). */
  preview: string;
  /** Agent mit aktiver Sperre (arbeitet gerade daran). */
  claimedBy?: string;
}

export interface AgentWaitResult {
  changed: boolean;
  cursor: number;
  waiting: WaitingIssue[];
}

export interface InboxItem {
  issueId: number;
  title: string;
  status: IssueStatus;
  model: ModelId;
  provider: string;
  labels: string[];
  newEntries: number;
  preview: string;
  lastSeq: number;
  claimedBy?: string;
}

export interface InboxResult {
  cursor: number;
  counts: Record<IssueStatus, number> & { forYou: number };
  items: InboxItem[];
  more: number;
}

export interface IssueWaitResult {
  changed: boolean;
  cursor: number;
  entries: Entry[];
}

export const KEY_ROLES = ["admin", "agent", "program"] as const;
/** admin: alles · agent: lesen/claimen/kommentieren (ggf. nur eigene Provider) · program: nur eigene Issues. */
export type KeyRole = (typeof KEY_ROLES)[number];

export interface BoardInfo {
  user: string;
  agent: string;
  maxFileBytes: number;
  authRequired: boolean;
  /** Angemeldeter Schlüssel (nur mit gültigem Schlüssel). */
  key?: { name: string; role: KeyRole; providers?: string[]; author?: string };
}
