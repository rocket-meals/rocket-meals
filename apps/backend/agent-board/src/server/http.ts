// Kleine HTTP-Helfer ohne Framework.
import type { IncomingMessage, ServerResponse } from "node:http";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly extra: Record<string, unknown> = {},
    readonly headers: Record<string, string> = {},
  ) {
    super(message);
  }
}

export async function readRaw(req: IncomingMessage, limit: number): Promise<Buffer> {
  const declared = Number(req.headers["content-length"] ?? 0);
  if (declared > limit) throw new HttpError(413, `Request-Body zu groß (max. ${limit} B)`);
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > limit) throw new HttpError(413, `Request-Body zu groß (max. ${limit} B)`);
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

export async function readJson(req: IncomingMessage, limit = 5 * 1024 * 1024): Promise<unknown> {
  const buf = await readRaw(req, limit);
  if (buf.length === 0) return {};
  try {
    return JSON.parse(buf.toString("utf8"));
  } catch {
    throw new HttpError(400, "Ungültiges JSON");
  }
}

export function sendJson(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}): void {
  if (res.headersSent) {
    res.end();
    return;
  }
  const data = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(data),
    ...headers,
  });
  res.end(data);
}

/** Fehler im OpenAI-Stil, damit OpenAI-Clients sie sauber anzeigen. */
export function sendError(res: ServerResponse, err: HttpError): void {
  sendJson(res, err.status, { error: { message: err.message, type: errorType(err.status) }, ...err.extra }, err.headers);
}

function errorType(status: number): string {
  if (status === 401) return "authentication_error";
  if (status === 403) return "permission_error";
  if (status === 429) return "rate_limit_error";
  if (status === 404) return "not_found_error";
  if (status === 504) return "timeout";
  if (status >= 500) return "server_error";
  return "invalid_request_error";
}

/** Token aus Authorization-Header, X-Api-Key oder ?token= (für <img>/EventSource im Browser). */
export function extractToken(req: IncomingMessage, url: URL): string | undefined {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ")
    ? header.slice(7).trim()
    : String(req.headers["x-api-key"] ?? url.searchParams.get("token") ?? "");
  return token || undefined;
}

/** IP des Aufrufers (für das Rate-Limit bei Fehlversuchen). Hinter einem Proxy (AB_TRUST_PROXY=1, z. B. Traefik)
 *  zählt der letzte Eintrag in X-Forwarded-For – den setzt der Proxy selbst, der Client kann ihn nicht fälschen. */
export function clientIp(req: IncomingMessage): string {
  if (process.env.AB_TRUST_PROXY === "1") {
    const forwarded = String(req.headers["x-forwarded-for"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
    const last = forwarded[forwarded.length - 1];
    if (last) return last;
  }
  return req.socket.remoteAddress ?? "?";
}

/** Integer-Query-Parameter mit Grenzen. */
export function intParam(url: URL, name: string, def: number, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === "") return def;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new HttpError(400, `Parameter ${name} muss eine Zahl sein`);
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** AbortSignal, das bei Verbindungsabbruch des Clients feuert. */
export function disconnectSignal(req: IncomingMessage, res: ServerResponse): AbortSignal {
  const ac = new AbortController();
  res.on("close", () => {
    if (!res.writableEnded) ac.abort();
  });
  req.on("aborted", () => ac.abort());
  return ac.signal;
}

export function startSse(res: ServerResponse): void {
  res.writeHead(200, {
    "content-type": "text/event-stream; charset=utf-8",
    "cache-control": "no-cache, no-transform",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });
  res.flushHeaders();
}
