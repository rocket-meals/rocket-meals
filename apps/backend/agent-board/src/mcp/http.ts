// MCP über Streamable HTTP (/mcp im Board-Server): gleiche Tools wie stdio, eine MCP-Sitzung pro Client
// mit eigenem Lesestand. Die Tools sprechen per Loopback-HTTP mit dem eigenen Server (RelayClient).
import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import type { Principal } from "../server/keys.ts";
import { RelayClient } from "../shared/client.ts";
import { CLAUDE_PROVIDER } from "../shared/types.ts";
import { createMcpServer } from "./server.ts";

export interface McpHttpOptions {
  /** Loopback-Adresse des eigenen Servers (erst nach listen bekannt). */
  selfUrl: () => string;
  /** Autorname des Claude-Agenten (für admin-Schlüssel bzw. ohne Schlüssel). */
  agent: string;
  /** Basis-URL für Download-Links; sonst aus dem Host-Header. */
  publicUrl?: string;
  /** Inaktive Sitzungen nach dieser Zeit schließen (Standard 24 h). */
  idleMs?: number;
}

interface Session {
  transport: StreamableHTTPServerTransport;
  lastSeen: number;
  /** Schlüssel, mit dem die Sitzung eröffnet wurde – nur dieser darf sie weiter nutzen. */
  keyName: string;
}

/** Aufrufer einer MCP-Anfrage: geprüfter Schlüssel + Klartext (für die Loopback-Aufrufe mit denselben Rechten). */
export interface McpCaller {
  principal: Principal;
  token?: string;
}

export interface McpHttpHandler {
  handle(req: IncomingMessage, res: ServerResponse, body: unknown, caller: McpCaller): Promise<void>;
  readonly sessionCount: number;
  close(): Promise<void>;
}

function rpcError(res: ServerResponse, status: number, message: string): void {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }));
}

export function createMcpHttpHandler(opts: McpHttpOptions): McpHttpHandler {
  const sessions = new Map<string, Session>();
  const idleMs = opts.idleMs ?? 24 * 3600_000;
  const sweep = setInterval(() => {
    const limit = Date.now() - idleMs;
    for (const s of sessions.values()) if (s.lastSeen < limit) void s.transport.close();
  }, 10 * 60_000);
  sweep.unref();

  return {
    get sessionCount() {
      return sessions.size;
    },

    async handle(req, res, body, caller) {
      const sid = req.headers["mcp-session-id"];
      if (typeof sid === "string" && sid) {
        const s = sessions.get(sid);
        if (!s) return rpcError(res, 404, "MCP-Sitzung unbekannt oder abgelaufen – neu verbinden");
        // Sitzungs-ID allein reicht nicht: fremde Schlüssel dürfen keine Sitzung übernehmen
        if (s.keyName !== caller.principal.name) return rpcError(res, 403, "MCP-Sitzung gehört zu einem anderen Schlüssel");
        s.lastSeen = Date.now();
        await s.transport.handleRequest(req, res, body);
        return;
      }
      if (req.method !== "POST" || !isInitializeRequest(body)) {
        return rpcError(res, 400, "Keine gültige MCP-Sitzung (mcp-session-id fehlt)");
      }
      const transport: StreamableHTTPServerTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => void sessions.set(id, { transport, lastSeen: Date.now(), keyName: caller.principal.name }),
      });
      transport.onclose = () => {
        if (transport.sessionId) sessions.delete(transport.sessionId);
      };
      const publicUrl = opts.publicUrl ?? `http://${req.headers.host ?? "127.0.0.1:4317"}`;
      // Tools rufen den Server mit dem Schlüssel des Aufrufers auf → gleiche Rechte wie per REST
      const clientOpts: ConstructorParameters<typeof RelayClient>[0] = { baseUrl: opts.selfUrl(), apiKey: caller.token ?? "" };
      const p = caller.principal;
      const provider = !p.providers || p.providers.includes(CLAUDE_PROVIDER) ? CLAUDE_PROVIDER : p.providers[0]!;
      const server = createMcpServer({
        client: new RelayClient(clientOpts),
        agentName: p.role === "agent" && p.author ? p.author : opts.agent,
        provider,
        remote: { publicUrl },
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, body);
    },

    async close() {
      clearInterval(sweep);
      await Promise.allSettled([...sessions.values()].map((s) => s.transport.close()));
      sessions.clear();
    },
  };
}
