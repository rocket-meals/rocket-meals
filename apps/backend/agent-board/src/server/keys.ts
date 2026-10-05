// Benannte Schlüssel mit Rollen (admin | agent | program): Datei data/keys.json (nur SHA-256-Hashes),
// zusätzlich AB_KEYS (JSON, z. B. für Docker) und AB_API_KEY (abwärtskompatibel als admin).
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { KEY_ROLES, type KeyRole } from "../shared/types.ts";

export const KEY_NAME = /^[a-z0-9][a-z0-9._-]{0,49}$/;
const PROVIDER = /^[a-z0-9-]+$/;

export interface KeyRecord {
  name: string;
  role: KeyRole;
  /** agent: nur Issues dieser Provider (fehlt = alle). */
  providers?: string[];
  /** Autorname bzw. -präfix, als der dieser Schlüssel schreibt (Standard je Rolle). */
  author?: string;
  /** SHA-256 (hex) des Schlüssels – der Klartext wird nie gespeichert. */
  hash: string;
  createdAt: string;
}

/** Angemeldeter Schlüssel. author = Pflichtpräfix für Autornamen (admin: frei). */
export interface Principal {
  name: string;
  role: KeyRole;
  providers?: string[];
  author?: string;
}

export const hashKey = (key: string): string => createHash("sha256").update(key, "utf8").digest("hex");
export const generateKey = (): string => `ab_${randomBytes(24).toString("base64url")}`;

export function keysFile(dataDir: string): string {
  return path.join(dataDir, "keys.json");
}

const recordSchema = z.object({
  name: z.string().regex(KEY_NAME),
  role: z.enum(KEY_ROLES),
  providers: z.array(z.string().regex(PROVIDER)).min(1).optional(),
  author: z.string().min(1).max(100).optional(),
  hash: z.string().regex(/^[0-9a-f]{64}$/),
  createdAt: z.string(),
});

/** AB_KEYS: [{name, role, providers?, author?, key? | hash?}] */
const envKeySchema = z
  .object({
    name: z.string().regex(KEY_NAME),
    role: z.enum(KEY_ROLES),
    providers: z.array(z.string().regex(PROVIDER)).min(1).optional(),
    author: z.string().min(1).max(100).optional(),
    key: z.string().min(16).optional(),
    hash: z.string().regex(/^[0-9a-f]{64}$/).optional(),
  })
  .refine((k) => !!k.key !== !!k.hash, { message: "genau eins von key oder hash angeben" });
export type EnvKey = z.infer<typeof envKeySchema>;

export function parseEnvKeys(raw: string | undefined): EnvKey[] {
  if (!raw?.trim()) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error("AB_KEYS ist kein gültiges JSON (erwartet: [{\"name\":…,\"role\":…,\"hash\":…}])");
  }
  const r = z.array(envKeySchema).safeParse(data);
  if (!r.success) throw new Error(`AB_KEYS ungültig: ${r.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`);
  return r.data;
}

/** Schlüsseldatei lesen (fehlt → leer). Defekte Einträge werden übersprungen. */
export function readKeyFile(file: string): KeyRecord[] {
  let raw: string;
  try {
    raw = readFileSync(file, "utf8");
  } catch {
    return [];
  }
  const data = JSON.parse(raw) as { keys?: unknown[] };
  const out: KeyRecord[] = [];
  for (const k of data.keys ?? []) {
    const r = recordSchema.safeParse(k);
    if (r.success) out.push(r.data as KeyRecord);
  }
  return out;
}

export function writeKeyFile(file: string, keys: KeyRecord[]): void {
  mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, `${JSON.stringify({ keys }, null, 2)}\n`, { mode: 0o600 });
  renameSync(tmp, file);
}

/** Neuen Schlüssel anlegen; liefert den Klartext (nur dieses eine Mal sichtbar). */
export function createKey(
  file: string,
  input: { name: string; role: KeyRole; providers?: string[]; author?: string },
): { key: string; record: KeyRecord } {
  const name = input.name.trim().toLowerCase();
  if (!KEY_NAME.test(name)) throw new Error(`Ungültiger Name "${input.name}" (a-z 0-9 . _ -, max. 50 Zeichen)`);
  if (!(KEY_ROLES as readonly string[]).includes(input.role)) throw new Error(`Ungültige Rolle "${input.role}" (${KEY_ROLES.join("|")})`);
  const providers = input.providers?.map((p) => p.trim().toLowerCase()).filter(Boolean);
  for (const p of providers ?? []) if (!PROVIDER.test(p)) throw new Error(`Ungültiger Provider "${p}"`);
  if (providers?.length && input.role !== "agent") throw new Error("--providers gibt es nur für die Rolle agent");
  const keys = readKeyFile(file);
  if (keys.some((k) => k.name === name)) throw new Error(`Schlüssel "${name}" existiert bereits (erst widerrufen)`);
  const key = generateKey();
  const record: KeyRecord = { name, role: input.role, hash: hashKey(key), createdAt: new Date().toISOString() };
  if (providers?.length) record.providers = providers;
  if (input.author) record.author = input.author;
  writeKeyFile(file, [...keys, record]);
  return { key, record };
}

export function revokeKey(file: string, name: string): boolean {
  const keys = readKeyFile(file);
  const rest = keys.filter((k) => k.name !== name.toLowerCase());
  if (rest.length === keys.length) return false;
  writeKeyFile(file, rest);
  return true;
}

export interface AuthOptions {
  dataDir: string;
  /** Abwärtskompatibel: AB_API_KEY = admin-Schlüssel "admin". */
  apiKey?: string;
  envKeys?: EnvKey[];
  /** Autorname des Claude-Agenten (AB_AGENT_NAME). */
  agentName: string;
  /** Fehlversuche pro IP und Minute, danach 429 (Standard 10). */
  failLimit?: number;
  failWindowMs?: number;
}

interface Entry {
  principal: Principal;
  hash: Buffer;
}

/** Prüft Schlüssel (zeitkonstant), lädt keys.json bei Änderung neu und begrenzt Fehlversuche. */
export class Auth {
  private fileEntries: Entry[] = [];
  private fixed: Entry[] = [];
  private fileStamp = "";
  private fileExists = false;
  private fails = new Map<string, number[]>();
  readonly file: string;
  readonly failLimit: number;
  readonly failWindowMs: number;

  constructor(private opts: AuthOptions) {
    this.file = keysFile(opts.dataDir);
    this.failLimit = opts.failLimit ?? 10;
    this.failWindowMs = opts.failWindowMs ?? 60_000;
    if (opts.apiKey) this.fixed.push(this.entry({ name: "admin", role: "admin" }, hashKey(opts.apiKey)));
    for (const k of opts.envKeys ?? []) {
      const rec: Omit<KeyRecord, "hash" | "createdAt"> = { name: k.name, role: k.role };
      if (k.providers) rec.providers = k.providers;
      if (k.author) rec.author = k.author;
      this.fixed.push(this.entry(rec, k.hash ?? hashKey(k.key!)));
    }
    this.reload();
  }

  /** Standard-Autorpräfix je Rolle. */
  private entry(rec: Omit<KeyRecord, "hash" | "createdAt">, hash: string): Entry {
    const p: Principal = { name: rec.name, role: rec.role };
    if (rec.providers) p.providers = rec.providers;
    if (rec.role === "agent") {
      p.author = rec.author ?? (!rec.providers || rec.providers.includes("claude") ? this.opts.agentName : rec.name);
    } else if (rec.role === "program") {
      p.author = rec.author ?? `programm:${rec.name}`;
    }
    return { principal: p, hash: Buffer.from(hash, "hex") };
  }

  /** keys.json neu einlesen, wenn sich die Datei geändert hat (Widerruf wirkt ohne Neustart). */
  private reload(): void {
    let stamp = "";
    try {
      const st = statSync(this.file);
      stamp = `${st.mtimeMs}:${st.size}:${st.ino}`;
    } catch {
      stamp = "-";
    }
    if (stamp === this.fileStamp) return;
    this.fileStamp = stamp;
    this.fileExists = stamp !== "-";
    try {
      this.fileEntries = readKeyFile(this.file).map((k) => this.entry(k, k.hash));
    } catch (e) {
      console.error(`keys.json nicht lesbar: ${e instanceof Error ? e.message : String(e)}`);
      this.fileEntries = [];
    }
  }

  private all(): Entry[] {
    this.reload();
    return [...this.fixed, ...this.fileEntries];
  }

  /**
   * Ohne jeden Schlüssel ist der Server offen (nur localhost erlaubt). Existiert keys.json (auch leer, z. B. nach
   * dem Widerruf des letzten Schlüssels), bleibt die Prüfung an – ein Widerruf öffnet den Server nie.
   */
  get enabled(): boolean {
    return this.all().length > 0 || this.fileExists;
  }

  /** Schlüssel prüfen; vergleicht den Hash zeitkonstant gegen alle Einträge (ohne vorzeitigen Abbruch). */
  authenticate(token: string | undefined): Principal | undefined {
    const entries = this.all();
    if (!token) return undefined;
    const h = createHash("sha256").update(token, "utf8").digest();
    let found: Principal | undefined;
    for (const e of entries) {
      if (timingSafeEqual(h, e.hash) && !found) found = e.principal;
    }
    return found;
  }

  /** Autorpräfixe aller agent-Schlüssel (Store: deren Einträge wecken den Watcher nicht). */
  isAgentAuthor(name: string): boolean {
    const n = name.toLowerCase();
    // ohne Neuladen (wird pro Verlaufseintrag aufgerufen); authenticate() hält den Stand aktuell
    return [...this.fixed, ...this.fileEntries].some((e) => e.principal.role === "agent" && e.principal.author && authorMatches(n, e.principal.author));
  }

  // --- Fehlversuche ---

  /** Sekunden bis zum nächsten erlaubten Versuch (0 = nicht gesperrt). */
  blockedFor(ip: string, now = Date.now()): number {
    const list = (this.fails.get(ip) ?? []).filter((t) => now - t < this.failWindowMs);
    if (list.length) this.fails.set(ip, list);
    else this.fails.delete(ip);
    if (list.length < this.failLimit) return 0;
    return Math.max(1, Math.ceil((list[0]! + this.failWindowMs - now) / 1000));
  }

  recordFailure(ip: string, now = Date.now()): void {
    const list = this.fails.get(ip) ?? [];
    list.push(now);
    this.fails.set(ip, list.slice(-this.failLimit * 2));
    // Speicher begrenzen
    if (this.fails.size > 10_000) this.fails.clear();
  }
}

/** Name passt zum Präfix: exakt oder Präfix + Trennzeichen (":", "-", "_", "/", ".", "@") + Rest. */
export function authorMatches(name: string, prefix: string): boolean {
  const n = name.toLowerCase();
  const p = prefix.toLowerCase();
  return n === p || (n.startsWith(p) && /^[:\-_/.@]/.test(n.slice(p.length)));
}
