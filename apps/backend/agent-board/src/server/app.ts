// HTTP-Server: REST für Issues/Kommentare/Dateien, Long-Poll, SSE, Agent-Endpunkte, OpenAI-Adapter, Web-Oberfläche.
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { Attachment, BoardEvent, BoardInfo, IssueStatus } from "../shared/types.ts";
import { ISSUE_STATUSES, normalizeModel, providerOf } from "../shared/types.ts";
import { StoreError } from "./errors.ts";
import { FileStore } from "./files.ts";
import { PREVIEW_MAX, isPreviewable } from "./image.ts";
import {
  HttpError,
  clientIp,
  disconnectSignal,
  extractToken,
  intParam,
  readJson,
  readRaw,
  sendError,
  sendJson,
  startSse,
} from "./http.ts";
import { handleCompletion, modelsResponse } from "./openai.ts";
import { type McpHttpHandler, createMcpHttpHandler } from "../mcp/http.ts";
import {
  type AttachmentInput,
  claimSchema,
  commentSchema,
  createIssueSchema,
  loginSchema,
  parseBody,
  patchIssueSchema,
  uploadJsonSchema,
} from "./schemas.ts";
import { Auth, type EnvKey, type Principal, authorMatches, parseEnvKeys } from "./keys.ts";
import { Store, type IssueFilter, type IssueScope } from "./store.ts";

export interface RelayConfig {
  host: string;
  port: number;
  dataDir: string;
  /** Abwärtskompatibel: einzelner admin-Schlüssel (AB_API_KEY). */
  apiKey?: string;
  /** Weitere Schlüssel aus AB_KEYS (JSON); dazu kommen die aus data/keys.json. */
  keys?: EnvKey[];
  /** Fehlversuche pro IP und Minute, danach 429 (Standard 10). */
  authFailLimit?: number;
  /** Mensch (Erwähnungen, „Für dich“). */
  user: string;
  /** Agent-Name (Autor der Antworten). */
  agent: string;
  /** Wartezeit des OpenAI-Adapters in Sekunden. */
  completionTimeoutSec: number;
  /** Obergrenze für Long-Poll-Timeouts in Sekunden. */
  maxWaitSec: number;
  maxFileBytes: number;
  /** Basis-URL für Download-Links im HTTP-MCP (z. B. http://192.168.1.20:4317). */
  publicUrl?: string;
  /** Ablauf einer Issue-Sperre (claim) ohne Aktivität in Minuten (Standard 30). */
  claimTtlMin?: number;
  /** Anmeldung der Web-Oberfläche mit Nutzername/Passwort (AB_LOGIN_USER/AB_LOGIN_PASSWORD, z. B. Directus-Admin). */
  login?: { user: string; password: string; key: string };
}

/** Schlüssel der Web-Anmeldung: aus Nutzer + Passwort abgeleitet, ändert sich mit dem Passwort (alte Sitzungen enden). */
export function loginKey(user: string, password: string): string {
  return `ab_web_${createHmac("sha256", password).update(`agent-board-web:${user.toLowerCase()}`).digest("base64url")}`;
}

/** Zeitkonstanter Vergleich beliebig langer Zeichenketten (über SHA-256). */
function sameSecret(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

export function configFromEnv(env: NodeJS.ProcessEnv = process.env): RelayConfig {
  const cfg: RelayConfig = {
    host: env.AB_HOST || "127.0.0.1",
    port: Number(env.AB_PORT ?? 4317),
    dataDir: env.AB_DATA_DIR || "./data",
    user: env.AB_USER || "nils",
    agent: env.AB_AGENT_NAME || "claude",
    completionTimeoutSec: Number(env.AB_COMPLETION_TIMEOUT || 600),
    maxWaitSec: 600,
    maxFileBytes: Math.round(Number(env.AB_MAX_FILE_MB || 25) * 1024 * 1024),
  };
  if (env.AB_API_KEY) cfg.apiKey = env.AB_API_KEY;
  const keys = parseEnvKeys(env.AB_KEYS);
  if (keys.length) cfg.keys = keys;
  if (env.AB_AUTH_FAIL_LIMIT) cfg.authFailLimit = Number(env.AB_AUTH_FAIL_LIMIT);
  if (env.AB_PUBLIC_URL) cfg.publicUrl = env.AB_PUBLIC_URL;
  if (env.AB_CLAIM_TTL_MIN) cfg.claimTtlMin = Number(env.AB_CLAIM_TTL_MIN);
  if (env.AB_LOGIN_USER && env.AB_LOGIN_PASSWORD) {
    // Web-Anmeldung liefert diesen admin-Schlüssel („web“) zurück
    const key = loginKey(env.AB_LOGIN_USER, env.AB_LOGIN_PASSWORD);
    cfg.login = { user: env.AB_LOGIN_USER, password: env.AB_LOGIN_PASSWORD, key };
    cfg.keys = [...(cfg.keys ?? []), { name: "web", role: "admin", key }];
  }
  return cfg;
}

export function isLoopback(host: string): boolean {
  return host === "127.0.0.1" || host === "::1" || host === "localhost";
}

export interface RelayServer {
  server: Server;
  store: Store;
  auth: Auth;
  files: FileStore;
  mcp: McpHttpHandler;
  url: string;
  close(): Promise<void>;
}

type Handler = (ctx: Ctx) => Promise<void> | void;
interface Ctx {
  req: IncomingMessage;
  res: ServerResponse;
  url: URL;
  params: Record<string, string>;
  /** Angemeldeter Schlüssel (ohne konfigurierte Schlüssel: lokaler admin). */
  p: Principal;
}
interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: Handler;
  public?: boolean;
}

function route(method: string, path: string, handler: Handler, isPublic = false): Route {
  const keys: string[] = [];
  const pattern = new RegExp(
    `^${path.replace(/:(\w+)/g, (_, k: string) => {
      keys.push(k);
      return "([^/]+)";
    })}/?$`,
  );
  return { method, pattern, keys, handler, public: isPublic };
}

const WEB_DIR = new URL("../web/", import.meta.url);
const STATIC: Record<string, [string, string]> = {
  "/": ["index.html", "text/html; charset=utf-8"],
  "/index.html": ["index.html", "text/html; charset=utf-8"],
  "/app.js": ["app.js", "text/javascript; charset=utf-8"],
  "/manifest.webmanifest": ["manifest.webmanifest", "application/manifest+json"],
  "/icon.svg": ["icon.svg", "image/svg+xml"],
};
const INLINE_MIME = /^(image\/(png|jpeg|gif|webp|heic|heif|avif)|application\/pdf|text\/plain)$/;

function issueIdParam(raw: string): number {
  const id = Number(raw.replace(/^#/, ""));
  if (!Number.isInteger(id) || id < 1) throw new HttpError(400, `Ungültige Issue-ID: ${raw}`);
  return id;
}

/** Ohne konfigurierte Schlüssel (nur localhost): alles erlaubt, Autor frei. */
const OPEN: Principal = { name: "local", role: "admin" };
const FULL_SHA = /^[0-9a-f]{64}$/;

export async function startRelayServer(cfg: RelayConfig): Promise<RelayServer> {
  const authOpts: ConstructorParameters<typeof Auth>[0] = { dataDir: cfg.dataDir, agentName: cfg.agent };
  if (cfg.apiKey) authOpts.apiKey = cfg.apiKey;
  if (cfg.keys) authOpts.envKeys = cfg.keys;
  if (cfg.authFailLimit) authOpts.failLimit = cfg.authFailLimit;
  const auth = new Auth(authOpts);
  const store = await Store.open({
    dataDir: cfg.dataDir,
    agent: cfg.agent,
    user: cfg.user,
    claimTtlMs: Math.round((cfg.claimTtlMin ?? 30) * 60_000),
    isExtraAgent: (n) => auth.isAgentAuthor(n),
  });
  const files = await FileStore.open(cfg.dataDir, cfg.maxFileBytes);
  const sseClients = new Set<ServerResponse>();

  // MCP über HTTP: Tools rufen per Loopback den eigenen Server auf
  let selfUrl = "";
  const mcpOpts: Parameters<typeof createMcpHttpHandler>[0] = { selfUrl: () => selfUrl, agent: cfg.agent };
  if (cfg.publicUrl) mcpOpts.publicUrl = cfg.publicUrl;
  const mcp = createMcpHttpHandler(mcpOpts);

  const multipartLimit = cfg.maxFileBytes * 4 + 1024 * 1024;
  const jsonLimit = Math.ceil(cfg.maxFileBytes * 1.4) + 1024 * 1024; // base64-Overhead

  const issueOr404 = (raw: string) => {
    const id = issueIdParam(raw);
    if (!store.getIssue(id)) throw new HttpError(404, `Issue #${id} nicht gefunden`);
    return id;
  };

  // --- Berechtigungen ---
  const denied = (p: Principal, what: string) => new HttpError(403, `Schlüssel „${p.name}“ (Rolle ${p.role}) darf ${what} nicht`);
  const requireRole = (p: Principal, what: string, ...roles: Principal["role"][]) => {
    if (!roles.includes(p.role)) throw denied(p, what);
  };

  /** Sichtbereich: program → eigene Issues; agent mit Providern → nur diese; ?provider=a,b|all schränkt weiter ein. */
  function scopeFor(p: Principal, requested?: string | null): IssueScope {
    const scope: IssueScope = {};
    if (p.role === "program") scope.owner = p.name;
    let wanted =
      requested && requested.trim().toLowerCase() !== "all"
        ? requested.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean)
        : undefined;
    if (p.providers) {
      const bad = wanted?.filter((w) => !p.providers!.includes(w)) ?? [];
      if (bad.length) throw new HttpError(403, `Schlüssel „${p.name}“ ist nur für Provider ${p.providers.join(", ")} freigegeben (nicht ${bad.join(", ")})`);
      wanted ??= p.providers;
    }
    if (wanted) scope.providers = wanted;
    return scope;
  }

  /** Issue-ID prüfen und Sichtbarkeit für den Schlüssel sicherstellen. */
  function issueFor(p: Principal, raw: string): number {
    const id = issueOr404(raw);
    if (!store.inScope(id, scopeFor(p))) {
      const i = store.getIssue(id)!;
      throw new HttpError(
        403,
        p.role === "program"
          ? `Issue #${id} gehört nicht zu Schlüssel „${p.name}“`
          : `Issue #${id} gehört zu Provider ${i.provider} – Schlüssel „${p.name}“ ist nur für ${p.providers?.join(", ")} freigegeben`,
      );
    }
    return id;
  }

  /** Autorname aus dem Schlüssel ableiten bzw. prüfen (admin: frei). */
  function authorFor(p: Principal, requested: string | undefined, fallback: string): string {
    if (p.role === "admin" || !p.author) return requested ?? fallback;
    if (!requested) return p.author;
    if (authorMatches(requested, p.author)) return requested;
    throw new HttpError(403, `Schlüssel „${p.name}“ (Rolle ${p.role}) schreibt nur als „${p.author}“ bzw. „${p.author}:…“, nicht als „${requested}“`);
  }

  /** agent-Schlüssel mit Provider-Liste: Modell muss zu einem erlaubten Provider gehören. */
  function checkModelProvider(p: Principal, model: string | undefined) {
    if (!p.providers) return;
    const provider = providerOf(normalizeModel(model) ?? "claude/opus");
    if (!p.providers.includes(provider)) {
      throw new HttpError(403, `Schlüssel „${p.name}“ ist nur für Provider ${p.providers.join(", ")} freigegeben (nicht ${provider})`);
    }
  }

  /** Programme dürfen Dateien nur über den vollständigen sha256 ansprechen (kein Präfix-Raten). */
  function checkFileRef(p: Principal, ref: string) {
    if (p.role === "program" && !FULL_SHA.test(ref)) throw new HttpError(403, "Programme brauchen den vollständigen sha256 (64 Zeichen)");
  }
  const waitSec = (url: URL, def: number) => intParam(url, "timeout", def, 0, cfg.maxWaitSec);

  async function resolveAttachments(p: Principal, list: AttachmentInput[] | undefined): Promise<Attachment[]> {
    const out: Attachment[] = [];
    for (const a of list ?? []) {
      if ("sha256" in a) {
        checkFileRef(p, a.sha256);
        out.push(files.attachment(a));
      }
      else out.push(await files.put(Buffer.from(a.contentBase64, "base64"), a.name, a.mime));
    }
    return out;
  }

  /** Body lesen: JSON oder multipart/form-data (Felder + Dateien „files“). */
  async function readForm(req: IncomingMessage): Promise<{ fields: Record<string, unknown>; uploads: Attachment[] }> {
    const type = req.headers["content-type"] ?? "";
    if (!type.startsWith("multipart/form-data")) return { fields: (await readJson(req, jsonLimit)) as Record<string, unknown>, uploads: [] };
    const buf = await readRaw(req, multipartLimit);
    const form = await new Request("http://local/", { method: "POST", headers: { "content-type": type }, body: buf }).formData();
    const fields: Record<string, unknown> = {};
    const uploads: Attachment[] = [];
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        if (key === "labels") fields.labels = value.split(",").map((s) => s.trim()).filter(Boolean);
        else fields[key] = value;
      } else {
        uploads.push(await files.put(Buffer.from(await value.arrayBuffer()), value.name || "datei", value.type));
      }
    }
    return { fields, uploads };
  }

  const routes: Route[] = [
    route("GET", "/health", ({ res }) => sendJson(res, 200, { ok: true, seq: store.currentSeq }), true),

    route(
      "GET",
      "/v1/info",
      ({ req, res, url }) => {
        const info: Partial<BoardInfo> & { authOk?: boolean; login?: boolean } = { authRequired: auth.enabled, login: !!cfg.login };
        let p: Principal | undefined = auth.enabled ? undefined : OPEN;
        const token = extractToken(req, url);
        if (!p && token && !auth.blockedFor(clientIp(req))) {
          p = auth.authenticate(token);
          if (!p) auth.recordFailure(clientIp(req));
        }
        if (p) {
          Object.assign(info, { user: store.user, agent: store.agent, maxFileBytes: cfg.maxFileBytes, authOk: true });
          if (auth.enabled) {
            const key: NonNullable<BoardInfo["key"]> = { name: p.name, role: p.role };
            if (p.providers) key.providers = p.providers;
            if (p.author) key.author = p.author;
            info.key = key;
          }
        }
        sendJson(res, 200, info);
      },
      true,
    ),

    // Web-Anmeldung mit Nutzername/Passwort → admin-Schlüssel „web“
    route(
      "POST",
      "/v1/login",
      async ({ req, res }) => {
        if (!cfg.login) throw new HttpError(404, "Anmeldung mit Passwort ist nicht eingerichtet");
        const ip = clientIp(req);
        const wait = auth.blockedFor(ip);
        if (wait) throw new HttpError(429, `Zu viele Fehlversuche – in ${wait} s erneut versuchen`, {}, { "retry-after": String(wait) });
        const body = parseBody(loginSchema, await readJson(req, 64 * 1024));
        // beide Vergleiche immer ausführen (keine Rückschlüsse über den Nutzernamen)
        const userOk = sameSecret(body.username.trim().toLowerCase(), cfg.login.user.toLowerCase());
        const passwordOk = sameSecret(body.password, cfg.login.password);
        if (!userOk || !passwordOk) {
          auth.recordFailure(ip);
          throw new HttpError(401, "Nutzername oder Passwort falsch");
        }
        sendJson(res, 200, { token: cfg.login.key });
      },
      true,
    ),

    // --- Dateien ---
    route("POST", "/v1/files", async ({ req, res, url }) => {
      const type = req.headers["content-type"] ?? "";
      if (type.startsWith("multipart/form-data")) {
        const { uploads } = await readForm(req);
        if (!uploads.length) throw new HttpError(400, "Keine Datei im Formular");
        sendJson(res, 201, { files: uploads });
      } else if (type.startsWith("application/json") && !url.searchParams.has("name")) {
        // JSON {name, contentBase64}; mit ?name= ist der Body die Datei selbst (z. B. eine .json-Datei)
        const body = parseBody(uploadJsonSchema, await readJson(req, jsonLimit));
        sendJson(res, 201, await files.put(Buffer.from(body.contentBase64, "base64"), body.name, body.mime));
      } else {
        // Rohdaten: Name über ?name= oder X-File-Name
        const name = url.searchParams.get("name") ?? decodeURIComponent(String(req.headers["x-file-name"] ?? "datei"));
        const data = await readRaw(req, cfg.maxFileBytes);
        sendJson(res, 201, await files.put(data, name, type || undefined));
      }
    }),

    route("GET", "/v1/files/:ref", ({ req, res, url, params, p }) => {
      checkFileRef(p, params.ref!);
      const meta = files.resolve(params.ref!);
      const name = url.searchParams.get("name") ?? meta.name;
      const inline = INLINE_MIME.test(meta.mime) && url.searchParams.get("download") !== "1";
      res.writeHead(200, {
        "content-type": meta.mime.startsWith("text/") ? `${meta.mime}; charset=utf-8` : meta.mime,
        "content-length": meta.size,
        "content-disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox; default-src 'none'; img-src 'self'; style-src 'unsafe-inline'",
        "cache-control": "private, max-age=31536000, immutable",
      });
      if (req.method === "HEAD") return void res.end();
      createReadStream(files.pathOf(meta.sha256)).pipe(res);
    }),

    // Vorschau: HEIC/große Fotos als JPEG (max. lange Kante ?max=, Standard 2000), EXIF-Drehung angewendet
    route("GET", "/v1/files/:ref/preview", async ({ req, res, url, params, p: who }) => {
      checkFileRef(who, params.ref!);
      const meta = files.resolve(params.ref!);
      if (!isPreviewable(meta.mime)) throw new HttpError(415, `Keine Vorschau für ${meta.mime}`);
      const p = await files.previewFor(meta, intParam(url, "max", PREVIEW_MAX, 32, 8000));
      const base = meta.name.replace(/\.[^.]+$/, "");
      res.writeHead(200, {
        "content-type": p.mime,
        "content-length": p.data.length,
        "content-disposition": `inline; filename*=UTF-8''${encodeURIComponent(`${base}.${p.mime === "image/png" ? "png" : "jpg"}`)}`,
        "x-image-width": String(p.width),
        "x-image-height": String(p.height),
        "x-original-mime": meta.mime,
        "x-content-type-options": "nosniff",
        "content-security-policy": "sandbox; default-src 'none'",
        "cache-control": "private, max-age=86400",
      });
      res.end(req.method === "HEAD" ? undefined : p.data);
    }),

    // --- Issues ---
    route("POST", "/v1/issues", async ({ req, res, p }) => {
      const { fields, uploads } = await readForm(req);
      const body = parseBody(createIssueSchema, fields);
      const author = authorFor(p, body.author, "api");
      checkModelProvider(p, body.model);
      const attachments = [...(await resolveAttachments(p, body.attachments)), ...uploads];
      const input: Parameters<Store["createIssue"]>[0] = { title: body.title, author, attachments };
      if (auth.enabled) input.owner = p.name;
      if (body.body !== undefined) input.body = body.body;
      if (body.labels) input.labels = body.labels;
      if (body.model) input.model = body.model;
      if (body.assignee) input.assignee = body.assignee;
      sendJson(res, 201, (await store.createIssue(input)).issue);
    }),

    route("GET", "/v1/issues", ({ res, url, p }) => {
      const s = url.searchParams;
      const filter: IssueFilter = scopeFor(p, s.get("provider"));
      const status = s.get("status");
      if (status) {
        if (status !== "active" && status !== "all" && !ISSUE_STATUSES.includes(status as IssueStatus)) {
          throw new HttpError(400, `Ungültiger Status: ${status}`);
        }
        filter.status = status as IssueFilter["status"];
      }
      if (s.get("label")) filter.label = s.get("label")!;
      if (s.get("for") === "me") filter.forUser = true;
      if (s.get("q")) filter.q = s.get("q")!;
      if (s.has("since")) filter.since = intParam(url, "since", 0);
      const limit = intParam(url, "limit", 100, 1, 500);
      const all = store.listIssues(filter);
      sendJson(res, 200, { issues: all.slice(0, limit), total: all.length, cursor: store.currentSeq });
    }),

    route("GET", "/v1/labels", ({ res, p }) => {
      const counts = new Map<string, number>();
      for (const i of store.listIssues({ ...scopeFor(p), status: "all" })) for (const l of i.labels) counts.set(l, (counts.get(l) ?? 0) + 1);
      sendJson(res, 200, { labels: [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count) });
    }),

    route("GET", "/v1/issues/:id", ({ res, params, p }) => {
      const id = issueFor(p, params.id!);
      sendJson(res, 200, { issue: store.getIssue(id), entries: store.getEntries(id), cursor: store.currentSeq });
    }),

    route("PATCH", "/v1/issues/:id", async ({ req, res, params, p }) => {
      const id = issueFor(p, params.id!);
      const body = parseBody(patchIssueSchema, await readJson(req));
      const { author, ...rest } = body;
      if (rest.model) checkModelProvider(p, rest.model);
      const input: Parameters<Store["updateIssue"]>[1] = { actor: authorFor(p, author, "api") };
      for (const [k, v] of Object.entries(rest)) if (v !== undefined) (input as unknown as Record<string, unknown>)[k] = v;
      sendJson(res, 200, (await store.updateIssue(id, input)).issue);
    }),

    // Übernahme mit Sperre gegen Doppelbearbeitung (409, wenn ein anderer Agent aktiv daran arbeitet)
    route("POST", "/v1/issues/:id/claim", async ({ req, res, params, p }) => {
      requireRole(p, "Issues übernehmen (claim)", "admin", "agent");
      const id = issueFor(p, params.id!);
      const body = parseBody(claimSchema, await readJson(req));
      const opts: { provider?: string; force?: boolean } = {};
      if (body.provider) opts.provider = body.provider;
      if (body.force) opts.force = true;
      sendJson(res, 200, (await store.claimIssue(id, authorFor(p, body.agent, body.agent), opts)).issue);
    }),

    route("POST", "/v1/issues/:id/release", async ({ req, res, params, p }) => {
      requireRole(p, "Issues freigeben (release)", "admin", "agent");
      const id = issueFor(p, params.id!);
      const body = parseBody(claimSchema, await readJson(req));
      sendJson(res, 200, (await store.releaseIssue(id, authorFor(p, body.agent, body.agent), body.reason)).issue);
    }),

    route("GET", "/v1/issues/:id/timeline", ({ res, url, params, p }) => {
      const id = issueFor(p, params.id!);
      sendJson(res, 200, { entries: store.getEntries(id, intParam(url, "since", 0)), cursor: store.currentSeq });
    }),

    route("POST", "/v1/issues/:id/comments", async ({ req, res, params, p }) => {
      const id = issueFor(p, params.id!);
      const { fields, uploads } = await readForm(req);
      const body = parseBody(commentSchema, fields);
      const author = authorFor(p, body.author, "api");
      const attachments = [...(await resolveAttachments(p, body.attachments)), ...uploads];
      const input: Parameters<Store["addComment"]>[1] = { author, body: body.body, attachments };
      if (body.status) input.status = body.status;
      if (body.reason) input.reason = body.reason;
      const r = await store.addComment(id, input);
      sendJson(res, 201, { comment: r.comment, issue: r.issue });
    }),

    // Long-Poll für Programme: neue Einträge in einem Issue
    route("GET", "/v1/issues/:id/wait", async ({ req, res, url, params, p }) => {
      const id = issueFor(p, params.id!);
      const after = intParam(url, "after", store.currentSeq);
      const filter: Parameters<Store["issueState"]>[2] = {};
      if (url.searchParams.get("notAuthor")) filter.notAuthor = url.searchParams.get("notAuthor")!;
      if (url.searchParams.get("author")) filter.author = url.searchParams.get("author")!;
      if (url.searchParams.get("comments") === "1") filter.commentsOnly = true;
      const signal = disconnectSignal(req, res);
      const check = () => {
        const s = store.issueState(id, after, filter);
        return s.changed ? s : undefined;
      };
      const found = await store.waitFor(check, waitSec(url, 30) * 1000, signal);
      if (signal.aborted) return;
      sendJson(res, 200, found ?? store.issueState(id, after, filter));
    }),

    // SSE-Stream aller Änderungen
    route("GET", "/v1/events", ({ req, res, url, p }) => {
      const scope = scopeFor(p, url.searchParams.get("provider"));
      const lastId = req.headers["last-event-id"];
      const after = intParam(url, "after", typeof lastId === "string" ? Number(lastId) || 0 : store.currentSeq);
      startSse(res);
      sseClients.add(res);
      const write = (ev: BoardEvent) => {
        if (store.inScope(ev.issue.id, scope)) res.write(`id: ${ev.seq}\nevent: issue\ndata: ${JSON.stringify(ev)}\n\n`);
      };
      res.write(`: verbunden, cursor ${store.currentSeq}\n\n`);
      // verpasste Einträge gruppiert pro Issue nachliefern
      const missed = new Map<number, BoardEvent>();
      for (const e of store.entriesAfter(after)) {
        const ev = missed.get(e.issueId) ?? { type: "issue" as const, seq: 0, issue: store.getIssue(e.issueId)!, entries: [] };
        ev.entries.push(e);
        ev.seq = e.seq;
        missed.set(e.issueId, ev);
      }
      for (const ev of [...missed.values()].sort((a, b) => a.seq - b.seq)) write(ev);
      store.events.on("event", write);
      const ping = setInterval(() => res.write(": ping\n\n"), 15_000);
      res.on("close", () => {
        clearInterval(ping);
        store.events.off("event", write);
        sseClients.delete(res);
      });
    }),

    // --- Agent ---
    route("GET", "/v1/agent/inbox", ({ res, url, p }) => {
      requireRole(p, "den Agenten-Posteingang lesen", "admin", "agent");
      const scope = scopeFor(p, url.searchParams.get("provider"));
      sendJson(res, 200, store.inbox(intParam(url, "after", 0), intParam(url, "limit", 30, 1, 200), scope));
    }),

    route("GET", "/v1/agent/wait", async ({ req, res, url, p }) => {
      requireRole(p, "auf Agenten-Arbeit warten", "admin", "agent");
      const scope = scopeFor(p, url.searchParams.get("provider"));
      const after = intParam(url, "after", store.currentSeq);
      const rawIssue = url.searchParams.get("issue");
      const issueId = rawIssue ? issueIdParam(rawIssue) : undefined;
      const signal = disconnectSignal(req, res);
      const check = () => {
        const s = store.agentState(after, issueId, scope);
        return s.changed ? s : undefined;
      };
      const found = await store.waitFor(check, waitSec(url, 300) * 1000, signal);
      if (signal.aborted) return;
      sendJson(res, 200, found ?? store.agentState(after, issueId, scope));
    }),

    // --- OpenAI-Adapter ---
    route("GET", "/v1/models", ({ res }) => sendJson(res, 200, modelsResponse())),
    route("POST", "/v1/chat/completions", async ({ req, res, p }) => {
      requireRole(p, "den OpenAI-Adapter nutzen", "admin", "program");
      const opts: Parameters<typeof handleCompletion>[4] = {
        timeoutSec: cfg.completionTimeoutSec,
        checkIssue: (raw) => issueFor(p, raw),
        checkModel: (m) => checkModelProvider(p, m),
      };
      if (p.role === "program" && p.author) opts.author = p.author;
      if (auth.enabled) opts.owner = p.name;
      await handleCompletion(store, req, res, await readJson(req), opts);
    }),
  ];

  async function serveStatic(pathname: string, res: ServerResponse): Promise<boolean> {
    const hit = STATIC[pathname];
    if (!hit) return false;
    const data = await readFile(new URL(hit[0], WEB_DIR));
    res.writeHead(200, {
      "content-type": hit[1],
      "cache-control": "no-cache",
      "x-content-type-options": "nosniff",
      "content-security-policy":
        "default-src 'self'; img-src 'self' blob: data:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'",
    });
    res.end(data);
    return true;
  }

  /** Schlüssel prüfen: 429 nach zu vielen Fehlversuchen dieser IP, 401 bei falschem/fehlendem Schlüssel. */
  function authenticate(req: IncomingMessage, url: URL): { p: Principal; token?: string } {
    if (!auth.enabled) return { p: OPEN };
    const ip = clientIp(req);
    const wait = auth.blockedFor(ip);
    if (wait) throw new HttpError(429, `Zu viele Fehlversuche – in ${wait} s erneut versuchen`, {}, { "retry-after": String(wait) });
    const token = extractToken(req, url);
    const p = auth.authenticate(token);
    if (!p) {
      if (token) auth.recordFailure(ip);
      throw new HttpError(401, "Ungültiger oder fehlender Schlüssel (Authorization: Bearer …)");
    }
    return token ? { p, token } : { p };
  }

  const server = createServer(async (req, res) => {
    try {
      const url = new URL(req.url ?? "/", "http://localhost");
      if (req.method === "GET" && (await serveStatic(url.pathname, res))) return;
      if (url.pathname === "/mcp") {
        const { p, token } = authenticate(req, url);
        requireRole(p, "MCP nutzen", "admin", "agent");
        const body = req.method === "POST" ? await readJson(req, jsonLimit) : undefined;
        await mcp.handle(req, res, body, token ? { principal: p, token } : { principal: p });
        return;
      }
      const method = req.method === "HEAD" ? "GET" : req.method;
      let pathMatched = false;
      for (const r of routes) {
        const m = r.pattern.exec(url.pathname);
        if (!m) continue;
        pathMatched = true;
        if (r.method !== method) continue;
        const p = r.public ? OPEN : authenticate(req, url).p;
        const params: Record<string, string> = {};
        r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1]!)));
        await r.handler({ req, res, url, params, p });
        return;
      }
      throw new HttpError(pathMatched ? 405 : 404, pathMatched ? "Methode nicht erlaubt" : "Route nicht gefunden");
    } catch (e) {
      if (e instanceof HttpError) sendError(res, e);
      else if (e instanceof StoreError) sendError(res, new HttpError(e.status, e.message));
      else {
        console.error(e);
        sendError(res, new HttpError(500, "Interner Fehler"));
      }
    }
  });
  // Long-Polls dürfen lange dauern
  server.requestTimeout = 0;
  server.headersTimeout = 60_000;
  server.keepAliveTimeout = 5_000;

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(cfg.port, cfg.host, () => resolve());
  });
  const addr = server.address() as AddressInfo;
  const host = addr.family === "IPv6" ? `[${addr.address}]` : addr.address;
  const loop = addr.address === "0.0.0.0" ? "127.0.0.1" : addr.address === "::" ? "[::1]" : host;
  selfUrl = `http://${loop}:${addr.port}`;

  return {
    server,
    store,
    auth,
    files,
    mcp,
    url: `http://${host}:${addr.port}`,
    close: () =>
      new Promise<void>((resolve) => {
        void mcp.close();
        for (const res of sseClients) res.end();
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
