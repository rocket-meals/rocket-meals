// Schlüssel mit Rollen: Berechtigungsmatrix, Autor-Prüfung, Widerruf, Rate-Limit, MCP über HTTP.
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, describe, expect, it } from "vitest";
import { AgentBoardClient } from "../client/src/index.ts";
import { hashKey, keysFile, parseEnvKeys } from "../src/server/keys.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

const ADMIN = "admin-schluessel-0123456789";
const AGENT = "agent-claude-0123456789abc";
const ECHO = "agent-echo-0123456789abcde";
const PROG = "programm-uhrzeit-012345678";
const OTHER = "programm-andere-0123456789";
const bearer = (k: string) => ({ authorization: `Bearer ${k}` });

let srv: TestServer;
const clients: Client[] = [];
afterEach(async () => {
  for (const c of clients.splice(0)) await c.close().catch(() => undefined);
  await srv?.stop();
});

async function start(extra: Parameters<typeof startTestServer>[0] = {}) {
  srv = await startTestServer({
    apiKey: ADMIN,
    keys: [
      { name: "claude-mac", role: "agent", providers: ["claude"], key: AGENT },
      { name: "echo-worker", role: "agent", providers: ["echo"], hash: hashKey(ECHO) },
      { name: "uhrzeit", role: "program", key: PROG },
      { name: "andere", role: "program", key: OTHER },
    ],
    ...extra,
  });
}
const as = (key: string) => ({
  get: (p: string) => api(srv.url, "GET", p, undefined, bearer(key)),
  post: (p: string, body: unknown) => api(srv.url, "POST", p, body, bearer(key)),
  patch: (p: string, body: unknown) => api(srv.url, "PATCH", p, body, bearer(key)),
});

function cli(args: string[], dataDir: string): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/cli/key.ts", ...args], {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: { ...process.env, AB_DATA_DIR: dataDir },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("Schlüssel: CLI und Speicherung", () => {
  it("create gibt den Schlüssel einmal aus, gespeichert wird nur der Hash; list; revoke wirkt ohne Neustart", async () => {
    srv = await startTestServer();
    expect(srv.auth.enabled).toBe(false);
    const c = await cli(["create", "--name", "claude-mac", "--role", "agent", "--providers", "claude"], srv.dataDir);
    expect(c.code).toBe(0);
    const key = c.stdout.trim();
    expect(key).toMatch(/^ab_[A-Za-z0-9_-]{32}$/);
    expect(c.stderr).toContain("nur JETZT");
    const file = await readFile(keysFile(srv.dataDir), "utf8");
    expect(file).not.toContain(key);
    expect(JSON.parse(file).keys[0]).toMatchObject({ name: "claude-mac", role: "agent", providers: ["claude"], hash: hashKey(key) });

    expect((await cli(["create", "--name", "claude-mac", "--role", "agent"], srv.dataDir)).code).toBe(1); // doppelt
    expect((await cli(["create", "--name", "x", "--role", "chef"], srv.dataDir)).code).toBe(1);
    expect((await cli(["create", "--name", "p", "--role", "program", "--author", "claude"], srv.dataDir)).stderr).toContain("nicht als claude");
    const list = await cli(["list"], srv.dataDir);
    expect(list.stdout).toMatch(/^claude-mac\tagent\t.*providers=claude/);
    expect(list.stdout).not.toContain(key);

    // Server lädt keys.json neu: jetzt mit Auth
    expect(srv.auth.enabled).toBe(true);
    expect((await api(srv.url, "GET", "/v1/issues")).status).toBe(401);
    const info = await api(srv.url, "GET", "/v1/info", undefined, bearer(key));
    expect(info.json).toMatchObject({ authOk: true, key: { name: "claude-mac", role: "agent", providers: ["claude"], author: "claude" } });

    expect((await cli(["revoke", "claude-mac"], srv.dataDir)).stdout).toContain("widerrufen");
    expect((await cli(["revoke", "claude-mac"], srv.dataDir)).code).toBe(1);
    // auch nach dem Widerruf des letzten Schlüssels bleibt die Prüfung an (leere keys.json ≠ offen)
    expect((await api(srv.url, "GET", "/v1/issues", undefined, bearer(key))).status).toBe(401);
    expect(srv.auth.enabled).toBe(true);
  }, 30_000);

  it("Widerruf sperrt einen laufenden Schlüssel sofort (andere Schlüssel bleiben gültig)", async () => {
    await start();
    const c = await cli(["create", "--name", "laptop", "--role", "program"], srv.dataDir);
    const key = c.stdout.trim();
    expect((await as(key).post("/v1/issues", { title: "a" })).json.author).toBe("programm:laptop");
    await cli(["revoke", "laptop"], srv.dataDir);
    expect((await as(key).get("/v1/issues")).status).toBe(401);
    expect((await as(ADMIN).get("/v1/issues")).status).toBe(200);
  }, 30_000);

  it("AB_KEYS: Validierung (key ODER hash, Rolle, Name)", () => {
    expect(parseEnvKeys("")).toEqual([]);
    expect(parseEnvKeys('[{"name":"a","role":"agent","hash":"' + hashKey("x".repeat(20)) + '"}]')).toHaveLength(1);
    expect(() => parseEnvKeys("{kaputt")).toThrow(/kein gültiges JSON/);
    expect(() => parseEnvKeys('[{"name":"a","role":"chef","key":"' + "x".repeat(20) + '"}]')).toThrow(/AB_KEYS ungültig/);
    expect(() => parseEnvKeys('[{"name":"a","role":"agent"}]')).toThrow(/key oder hash/);
  });
});

describe("Berechtigungsmatrix", () => {
  it("program: nur eigene Issues; kein claim, keine Agenten-Routen, kein MCP", async () => {
    await start();
    const prog = as(PROG);
    const mine = await prog.post("/v1/issues", { title: "Meins", model: "claude/haiku" });
    expect(mine.status).toBe(201);
    expect(mine.json).toMatchObject({ author: "programm:uhrzeit", model: "claude/haiku" });
    const foreign = await as(OTHER).post("/v1/issues", { title: "Fremd" });
    const byAdmin = await as(ADMIN).post("/v1/issues", { title: "Admin", author: "nils" });
    expect(byAdmin.json.author).toBe("nils");

    expect((await prog.get("/v1/issues")).json.issues.map((i: { id: number }) => i.id)).toEqual([mine.json.id]);
    expect((await prog.get(`/v1/issues/${mine.json.id}`)).status).toBe(200);
    expect((await prog.get(`/v1/issues/${foreign.json.id}`)).status).toBe(403);
    expect((await prog.get(`/v1/issues/${byAdmin.json.id}`)).status).toBe(403);
    expect((await prog.post(`/v1/issues/${foreign.json.id}/comments`, { body: "x" })).status).toBe(403);
    expect((await prog.post(`/v1/issues/${mine.json.id}/comments`, { body: "Nachtrag" })).status).toBe(201);
    expect((await prog.post(`/v1/issues/${mine.json.id}/claim`, { agent: "programm:uhrzeit" })).status).toBe(403);
    expect((await prog.get("/v1/agent/inbox")).status).toBe(403);
    expect((await prog.get("/v1/agent/wait?timeout=0")).status).toBe(403);
    const closed = await prog.patch(`/v1/issues/${mine.json.id}`, { status: "closed" });
    expect(closed.json).toMatchObject({ status: "closed", closedBy: "programm:uhrzeit" });

    // Dateien: Upload ja; Download nur mit vollem sha256
    const up = await fetch(`${srv.url}/v1/files?name=a.txt`, { method: "POST", headers: { ...bearer(PROG), "content-type": "text/plain" }, body: "hallo" });
    const sha = ((await up.json()) as { sha256: string }).sha256;
    expect((await fetch(`${srv.url}/v1/files/${sha}`, { headers: bearer(PROG) })).status).toBe(200);
    expect((await fetch(`${srv.url}/v1/files/${sha.slice(0, 10)}`, { headers: bearer(PROG) })).status).toBe(403);
    expect((await prog.post(`/v1/issues`, { title: "x", attachments: [{ sha256: sha.slice(0, 10) }] })).status).toBe(403);

    // MCP nur für admin/agent
    const t = new StreamableHTTPClientTransport(new URL(`${srv.url}/mcp`), { requestInit: { headers: bearer(PROG) } });
    await expect(new Client({ name: "p", version: "1" }).connect(t)).rejects.toThrow();

    // Client-Paket: ask als Programm, Antwort kommt vom Agenten
    const board = new AgentBoardClient({ baseUrl: srv.url, apiKey: PROG, user: "programm:uhrzeit" });
    setTimeout(() => void as(AGENT).post("/v1/issues/4/comments", { body: "42", author: "claude:haiku-4" }), 300);
    const r = await board.ask("Frage", "?", { timeoutMs: 5000 });
    expect(r.text).toBe("42");
  });

  it("agent mit Provider-Liste: sieht/claimt nur eigene Provider; OpenAI-Adapter gesperrt", async () => {
    await start();
    const admin = as(ADMIN);
    await admin.post("/v1/issues", { title: "Code", author: "nils" });
    await admin.post("/v1/issues", { title: "Echo", author: "nils", model: "echo/v1" });
    const claude = as(AGENT);
    const echo = as(ECHO);

    expect((await claude.get("/v1/issues")).json.issues.map((i: { id: number }) => i.id)).toEqual([1]);
    expect((await claude.get("/v1/issues?provider=echo")).status).toBe(403);
    expect((await claude.get("/v1/issues/2")).status).toBe(403);
    expect((await claude.post("/v1/issues/2/claim", { agent: "claude:x", force: true })).status).toBe(403);
    expect((await claude.post("/v1/issues/2/comments", { body: "x" })).status).toBe(403);
    expect((await claude.get("/v1/agent/inbox")).json.items.map((i: { issueId: number }) => i.issueId)).toEqual([1]);
    expect((await claude.post("/v1/issues/1/claim", { agent: "claude:opus-1" })).status).toBe(200);
    expect((await claude.post("/v1/issues", { title: "neu", model: "echo/v1" })).status).toBe(403);
    expect((await claude.post("/v1/issues", { title: "neu", model: "claude/haiku" })).json.author).toBe("claude");
    expect((await claude.post("/v1/chat/completions", { messages: [{ role: "user", content: "x" }] })).status).toBe(403);

    expect((await echo.get("/v1/agent/wait?after=0&timeout=0")).json.waiting.map((w: { issueId: number }) => w.issueId)).toEqual([2]);
    expect((await echo.get("/v1/agent/inbox?provider=claude")).status).toBe(403);
    const ok = await echo.post("/v1/issues/2/claim", { agent: "echo-worker" });
    expect(ok.json).toMatchObject({ status: "in_progress", assignee: "echo-worker" });
    // Kommentare des Workers wecken den Agenten-Long-Poll nicht (agent-Schlüssel = Agent)
    const cur = (await admin.get("/health")).json.seq;
    await echo.post("/v1/issues/2/comments", { body: "läuft" });
    expect((await echo.get(`/v1/agent/wait?after=${cur}&timeout=0`)).json.changed).toBe(false);

    // admin darf alles
    expect((await admin.get("/v1/issues")).json.total).toBe(3);
    expect((await admin.post("/v1/issues/2/comments", { body: "Hinweis", author: "nils" })).status).toBe(201);
  });

  it("SSE: program sieht nur eigene, agent nur eigene Provider", async () => {
    await start();
    await as(PROG).post("/v1/issues", { title: "P" });
    await as(ADMIN).post("/v1/issues", { title: "C", author: "nils" });
    await as(ADMIN).post("/v1/issues", { title: "E", author: "nils", model: "echo/v1" });
    const titles = async (key: string) => {
      const ac = new AbortController();
      const res = await fetch(`${srv.url}/v1/events?after=0`, { headers: bearer(key), signal: ac.signal });
      const reader = res.body!.getReader();
      let buf = "";
      const end = Date.now() + 400;
      let pending = reader.read();
      while (Date.now() < end) {
        const r = await Promise.race([pending, new Promise<undefined>((ok) => setTimeout(() => ok(undefined), 100))]);
        if (r === undefined) continue; // Lesen läuft noch – dieselbe Anfrage weiter abwarten
        if (r.done) break;
        buf += new TextDecoder().decode(r.value);
        pending = reader.read();
      }
      ac.abort();
      return [...buf.matchAll(/^data: (.+)$/gm)].map((m) => JSON.parse(m[1]!).issue.title as string);
    };
    expect(await titles(PROG)).toEqual(["P"]);
    expect(await titles(AGENT)).toEqual(["P", "C"]); // P hat Standardmodell claude/opus
    expect(await titles(ECHO)).toEqual(["E"]);
    expect(await titles(ADMIN)).toEqual(["P", "C", "E"]);
  });
});

describe("Autor-Prüfung", () => {
  it("program kann nicht als claude oder nils schreiben; agent nur als claude…; admin frei", async () => {
    await start();
    const prog = as(PROG);
    expect((await prog.post("/v1/issues", { title: "x", author: "claude" })).status).toBe(403);
    expect((await prog.post("/v1/issues", { title: "x", author: "nils" })).status).toBe(403);
    const ok = await prog.post("/v1/issues", { title: "x", author: "programm:uhrzeit:lauf-2" });
    expect(ok.json.author).toBe("programm:uhrzeit:lauf-2");
    const r = await prog.post(`/v1/issues/${ok.json.id}/comments`, { body: "Ich bin Claude", author: "claude:opus-1" });
    expect(r.status).toBe(403);
    expect(r.json.error.message).toContain("programm:uhrzeit");
    expect((await prog.patch(`/v1/issues/${ok.json.id}`, { author: "nils", status: "closed" })).status).toBe(403);
    // OpenAI-Adapter: Autor aus dem Schlüssel (user-Feld wird ignoriert)
    const comp = await startTestServer({ apiKey: ADMIN, keys: [{ name: "uhrzeit", role: "program", key: PROG }], completionTimeoutSec: 0 });
    try {
      const c = await api(comp.url, "POST", "/v1/chat/completions", { user: "claude", messages: [{ role: "user", content: "hi" }] }, bearer(PROG));
      expect(c.status).toBe(504);
      expect((await api(comp.url, "GET", `/v1/issues/${c.json.issue_id}`, undefined, bearer(PROG))).json.issue.author).toBe("programm:uhrzeit");
    } finally {
      await comp.stop();
    }

    const agent = as(AGENT);
    expect((await agent.post(`/v1/issues/${ok.json.id}/comments`, { body: "x", author: "nils" })).status).toBe(403);
    await as(ADMIN).post("/v1/issues", { title: "C", author: "nils" });
    expect((await agent.post("/v1/issues/2/claim", { agent: "programm:x" })).status).toBe(403);
    expect((await agent.post("/v1/issues/2/claim", { agent: "claude:sonnet-2" })).status).toBe(200);
    expect((await agent.post("/v1/issues/2/comments", { body: "ok" })).json.comment.author).toBe("claude");
    expect((await as(ADMIN).post("/v1/issues/2/comments", { body: "frei", author: "wer-auch-immer" })).json.comment.author).toBe("wer-auch-immer");
  });
});

describe("Rate-Limit & Abwärtskompatibilität", () => {
  it("nach N Fehlversuchen pro IP 429 (auch mit richtigem Schlüssel), Retry-After", async () => {
    await start({ authFailLimit: 3 });
    for (let i = 0; i < 3; i++) expect((await api(srv.url, "GET", "/v1/issues", undefined, bearer(`falsch-${i}`))).status).toBe(401);
    const blocked = await api(srv.url, "GET", "/v1/issues", undefined, bearer(ADMIN));
    expect(blocked.status).toBe(429);
    expect(blocked.json.error.type).toBe("rate_limit_error");
    expect(Number(blocked.headers.get("retry-after"))).toBeGreaterThan(0);
    // ohne Schlüssel zählt nicht als Rateversuch; /health bleibt offen
    expect((await api(srv.url, "GET", "/health")).status).toBe(200);
  });

  it("Rate-Limit greift nach 10 Fehlversuchen/min (Standard)", async () => {
    await start();
    expect(srv.auth.failLimit).toBe(10);
    for (let i = 0; i < 10; i++) await api(srv.url, "GET", "/v1/issues", undefined, bearer("x"));
    expect((await api(srv.url, "GET", "/v1/issues", undefined, bearer(AGENT))).status).toBe(429);
    // Sperre hängt an der IP und läuft ab
    expect(srv.auth.blockedFor("127.0.0.1", Date.now() + 61_000)).toBe(0);
  });

  it("AB_API_KEY bleibt admin-Schlüssel (Web-Oberfläche, Autor frei)", async () => {
    srv = await startTestServer({ apiKey: "nur-ein-key" });
    const info = await api(srv.url, "GET", "/v1/info?token=nur-ein-key");
    expect(info.json).toMatchObject({ authOk: true, key: { name: "admin", role: "admin" } });
    expect((await api(srv.url, "POST", "/v1/issues", { title: "t", author: "nils" }, bearer("nur-ein-key"))).json.author).toBe("nils");
  });
});

describe("MCP über HTTP mit Schlüsseln", () => {
  async function connect(key: string) {
    const transport = new StreamableHTTPClientTransport(new URL(`${srv.url}/mcp`), { requestInit: { headers: bearer(key) } });
    const client = new Client({ name: "k", version: "1" });
    await client.connect(transport);
    clients.push(client);
    return { client, transport };
  }
  const txt = async (c: Client, name: string, args: Record<string, unknown> = {}) => {
    const r = (await c.callTool({ name, arguments: args })) as { content: { text?: string }[]; isError?: boolean };
    return { text: r.content.map((x) => x.text ?? "").join("\n"), isError: !!r.isError };
  };

  it("Tools laufen mit den Rechten des Schlüssels; Sitzung lässt sich nicht mit fremdem Schlüssel nutzen", async () => {
    await start();
    await as(ADMIN).post("/v1/issues", { title: "Code", author: "nils" });
    await as(ADMIN).post("/v1/issues", { title: "Echo", author: "nils", model: "echo/v1" });
    const { client, transport } = await connect(AGENT);
    expect(client.getInstructions()).toContain("NUR Issues mit provider `claude`");
    expect((await txt(client, "issue_list", { provider: "echo" })).text).toContain("403"); // Schlüssel nur für claude
    expect((await txt(client, "issue_list", { provider: "all" })).text).not.toContain("Echo"); // all = alle erlaubten
    expect((await txt(client, "issue_list")).text).toBe("#1 [claude/opus] open „Code“ von nils, 0 Komm.");
    expect((await txt(client, "issue_claim", { issueId: 2, force: true })).isError).toBe(true);
    expect((await txt(client, "comment_add", { issueId: 1, body: "x", agent: "nils" })).isError).toBe(true);
    expect((await txt(client, "comment_add", { issueId: 1, body: "Hallo", agent: "claude:opus-1" })).isError).toBe(false);

    // gleiche Sitzungs-ID mit anderem (gültigem) Schlüssel → 403
    const sid = transport.sessionId!;
    const hijack = await fetch(`${srv.url}/mcp`, {
      method: "POST",
      headers: { ...bearer(ECHO), "content-type": "application/json", accept: "application/json, text/event-stream", "mcp-session-id": sid },
      body: JSON.stringify({ jsonrpc: "2.0", id: 9, method: "tools/list" }),
    });
    expect(hijack.status).toBe(403);
    // falscher Schlüssel → 401
    const bad = await fetch(`${srv.url}/mcp`, { method: "POST", headers: { ...bearer("falsch"), "mcp-session-id": sid }, body: "{}" });
    expect(bad.status).toBe(401);
  });
});
