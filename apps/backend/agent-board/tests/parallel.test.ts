// Parallelbetrieb: Modell je Issue, Übernahme/Sperre (claim), Watcher-Arbeitsliste, Web-Syntax.
import { execFile, spawn } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AgentBoardClient, AgentBoardError, Model, model } from "../client/src/index.ts";
import { runWatch } from "../src/cli/watch.ts";
import { createMcpServer } from "../src/mcp/server.ts";
import { mapModel } from "../src/server/openai.ts";
import { RelayClient } from "../src/shared/client.ts";
import { formatWaiting } from "../src/shared/format.ts";
import type { WaitingIssue } from "../src/shared/types.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

const root = path.resolve(import.meta.dirname, "..");
let srv: TestServer;
afterEach(async () => {
  await srv?.stop();
});

const post = (p: string, body: unknown) => api(srv.url, "POST", p, body);
const patch = (p: string, body: unknown) => api(srv.url, "PATCH", p, body);
const get = (p: string) => api(srv.url, "GET", p);

describe("Modell je Issue", () => {
  beforeEach(async () => {
    srv = await startTestServer();
  });

  it("REST: Standard claude/opus, Feld, Label-Übernahme (Feld hat Vorrang), PATCH, Validierung, multipart, alte Werte", async () => {
    expect((await post("/v1/issues", { title: "a", author: "nils" })).json).toMatchObject({ model: "claude/opus", provider: "claude" });
    // alter Wert ohne Provider → claude/<x>
    expect((await post("/v1/issues", { title: "b", author: "nils", model: "haiku" })).json.model).toBe("claude/haiku");
    // Label wird ins Feld übernommen und nicht als Label gespeichert (alte Kurzform)
    const c = (await post("/v1/issues", { title: "c", author: "nils", labels: ["bug", "Model:Sonnet"] })).json;
    expect(c).toMatchObject({ model: "claude/sonnet", labels: ["bug"] });
    // Feld schlägt Label
    expect((await post("/v1/issues", { title: "d", author: "nils", model: "claude/opus", labels: ["model:haiku"] })).json).toMatchObject({
      model: "claude/opus",
      labels: [],
    });
    // unbekanntes model:-Label (ohne Provider) bleibt normales Label; mit Provider → Feld
    expect((await post("/v1/issues", { title: "e", author: "nils", labels: ["model:gpt"] })).json).toMatchObject({
      model: "claude/opus",
      labels: ["model:gpt"],
    });
    expect((await post("/v1/issues", { title: "e2", author: "nils", labels: ["model:whisper/large-v3"] })).json).toMatchObject({
      model: "whisper/large-v3",
      provider: "whisper",
      labels: [],
    });
    expect((await post("/v1/issues", { title: "f", model: "fable" })).status).toBe(400);
    expect((await post("/v1/issues", { title: "f", model: "Whisper/Large V3" })).status).toBe(400);
    expect((await post("/v1/issues", { title: "g", model: "Ollama/qwen2.5vl" })).json).toMatchObject({ model: "ollama/qwen2.5vl", provider: "ollama" });

    const p = await patch("/v1/issues/1", { author: "nils", model: "claude/sonnet" });
    expect(p.json).toMatchObject({ model: "claude/sonnet", provider: "claude" });
    const { entries } = (await get("/v1/issues/1")).json;
    expect(entries.at(-1).event).toEqual({ kind: "edit", fields: ["model"] });
    // Label per PATCH → Feld
    expect((await patch("/v1/issues/1", { author: "nils", addLabels: ["model:haiku"] })).json).toMatchObject({ model: "claude/haiku", labels: [] });
    expect((await patch("/v1/issues/1", { author: "nils", model: "gpt" })).status).toBe(400);
    // Providerwechsel per PATCH
    expect((await patch("/v1/issues/1", { author: "nils", model: "whisper/large-v3" })).json).toMatchObject({ provider: "whisper" });

    const form = new FormData();
    form.set("title", "Formular");
    form.set("model", "haiku");
    const res = await fetch(`${srv.url}/v1/issues`, { method: "POST", body: form });
    expect(((await res.json()) as { model: string }).model).toBe("claude/haiku");
  });

  it("Client: createIssue/setModel/ask mit Model-Konstanten", async () => {
    const board = new AgentBoardClient({ baseUrl: srv.url, apiKey: "egal", user: "programm:t" });
    const i = await board.createIssue({ title: "x", model: Model.CLAUDE.SONNET });
    expect(i).toMatchObject({ model: "claude/sonnet", provider: "claude" });
    expect((await board.setModel(i.id, Model.CLAUDE.HAIKU)).model).toBe("claude/haiku");
    expect((await board.setModel(i.id, model("whisper", "large-v3"))).provider).toBe("whisper");
    setTimeout(() => void post("/v1/issues/2/comments", { body: "Antwort", author: "claude:haiku-2" }), 300);
    const r = await board.ask("Frage", "?", { model: Model.CLAUDE.HAIKU, timeoutMs: 5000, from: "claude" });
    expect(r.issue.model).toBe("claude/haiku");
    expect(r.text).toBe("Antwort");
  });

  it("OpenAI-Adapter bildet model auf claude/opus|sonnet|haiku ab, provider/name direkt", async () => {
    expect(mapModel("agent-board-haiku")).toBe("claude/haiku");
    expect(mapModel("claude-sonnet-5-5")).toBe("claude/sonnet");
    expect(mapModel("Agent-Board-OPUS")).toBe("claude/opus");
    expect(mapModel("gpt-4o")).toBe("claude/opus");
    expect(mapModel(undefined)).toBe("claude/opus");
    expect(mapModel("whisper/large-v3")).toBe("whisper/large-v3");
    expect(mapModel("claude/haiku")).toBe("claude/haiku");
    await srv.stop();
    srv = await startTestServer({ completionTimeoutSec: 0 });
    const r = await post("/v1/chat/completions", { model: "agent-board-haiku", messages: [{ role: "user", content: "schnell?" }] });
    expect(r.status).toBe(504);
    expect((await get(`/v1/issues/${r.json.issue_id}`)).json.issue.model).toBe("claude/haiku");
    const r2 = await post("/v1/chat/completions", { model: "irgendwas", messages: [{ role: "user", content: "x" }] });
    expect((await get(`/v1/issues/${r2.json.issue_id}`)).json.issue.model).toBe("claude/opus");
    const r3 = await post("/v1/chat/completions", { model: "whisper/large-v3", messages: [{ role: "user", content: "audio" }] });
    expect((await get(`/v1/issues/${r3.json.issue_id}`)).json.issue).toMatchObject({ model: "whisper/large-v3", provider: "whisper" });
  });
});

describe("Übernahme / Sperre", () => {
  it("claim setzt in_progress + assignee, 409 für andere, atomar bei gleichzeitigen Claims", async () => {
    srv = await startTestServer();
    await post("/v1/issues", { title: "A", author: "nils" });
    const ok = await post("/v1/issues/1/claim", { agent: "claude:sonnet-1" });
    expect(ok.status).toBe(200);
    expect(ok.json).toMatchObject({ status: "in_progress", assignee: "claude:sonnet-1", claim: { agent: "claude:sonnet-1" } });
    // derselbe Agent erneuert
    expect((await post("/v1/issues/1/claim", { agent: "claude:sonnet-1" })).status).toBe(200);
    const busy = await post("/v1/issues/1/claim", { agent: "claude:haiku-9" });
    expect(busy.status).toBe(409);
    expect(busy.json.error.message).toContain("claude:sonnet-1");
    // auch in_progress per Status durch einen anderen Agenten wird abgewiesen
    expect((await patch("/v1/issues/1", { author: "claude:x", status: "in_progress" })).status).toBe(409);

    await post("/v1/issues", { title: "B", author: "nils" });
    const results = await Promise.all(["claude:a", "claude:b", "claude:c"].map((agent) => post("/v1/issues/2/claim", { agent })));
    expect(results.map((r) => r.status).sort()).toEqual([200, 409, 409]);

    expect((await post("/v1/issues/9/claim", { agent: "claude:a" })).status).toBe(404);
    expect((await post("/v1/issues/1/claim", {})).status).toBe(400);
  });

  it("Freigabe: release (nur Inhaber), closed, needs_human; geschlossene Issues nicht übernehmbar", async () => {
    srv = await startTestServer();
    await post("/v1/issues", { title: "A", author: "nils" });
    await post("/v1/issues/1/claim", { agent: "claude:s-1" });
    expect((await post("/v1/issues/1/release", { agent: "claude:other" })).status).toBe(409);
    const rel = await post("/v1/issues/1/release", { agent: "claude:s-1" });
    expect(rel.json).toMatchObject({ status: "open" });
    expect(rel.json.claim).toBeUndefined();
    expect(rel.json.assignee).toBeUndefined();

    await post("/v1/issues/1/claim", { agent: "claude:s-1" });
    await post("/v1/issues/1/comments", { author: "claude:s-1", body: "Frage?", status: "needs_human", reason: "Frage?" });
    expect((await get("/v1/issues/1")).json.issue.claim).toBeUndefined();
    expect((await post("/v1/issues/1/claim", { agent: "claude:h-2" })).status).toBe(200);
    await post("/v1/issues/1/comments", { author: "claude:h-2", body: "Fertig.", status: "closed" });
    const closed = (await get("/v1/issues/1")).json.issue;
    expect(closed).toMatchObject({ status: "closed", closedBy: "claude:h-2" });
    expect(closed.claim).toBeUndefined();
    expect((await post("/v1/issues/1/claim", { agent: "claude:x" })).status).toBe(409);
  });

  it("Sperre läuft ohne Aktivität ab; Aktivität des Inhabers verlängert sie", async () => {
    srv = await startTestServer({ claimTtlMin: 0.01 }); // 600 ms
    await post("/v1/issues", { title: "A", author: "nils" });
    await post("/v1/issues/1/claim", { agent: "claude:a" });
    await new Promise((r) => setTimeout(r, 400));
    await post("/v1/issues/1/comments", { author: "claude:a", body: "arbeite noch" });
    await new Promise((r) => setTimeout(r, 400));
    expect((await post("/v1/issues/1/claim", { agent: "claude:b" })).status).toBe(409); // 800 ms nach claim, 400 nach Aktivität
    await new Promise((r) => setTimeout(r, 400));
    const take = await post("/v1/issues/1/claim", { agent: "claude:b" });
    expect(take.status).toBe(200);
    expect(take.json).toMatchObject({ assignee: "claude:b", claim: { agent: "claude:b" } });
  });

  it("Client claim/release mit AgentBoardError 409", async () => {
    srv = await startTestServer();
    const a = new AgentBoardClient({ baseUrl: srv.url, apiKey: "k", user: "claude:sonnet-1" });
    const b = new AgentBoardClient({ baseUrl: srv.url, apiKey: "k", user: "programm:x" });
    await b.createIssue({ title: "A" });
    expect((await a.claim(1)).assignee).toBe("claude:sonnet-1");
    const err = await b.claim(1, "claude:haiku-2").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AgentBoardError);
    expect((err as AgentBoardError).status).toBe(409);
    expect((await a.release(1)).status).toBe("open");
  });

  it("MCP: issue_create mit model, issue_claim/issue_release, agent-Präfix, Subagent-Kommentare wecken nicht", async () => {
    srv = await startTestServer();
    const server = createMcpServer({ client: new RelayClient({ baseUrl: srv.url }), agentName: "claude" });
    const [x, y] = InMemoryTransport.createLinkedPair();
    const mcp = new Client({ name: "t", version: "1" });
    await Promise.all([server.connect(x), mcp.connect(y)]);
    type R = { content: { text?: string }[]; isError?: boolean };
    const call = async (name: string, args: Record<string, unknown>) => {
      const r = (await mcp.callTool({ name, arguments: args })) as R;
      return { text: r.content.map((c) => c.text ?? "").join("\n"), isError: !!r.isError };
    };
    try {
      expect((await call("issue_create", { title: "Routine", model: "haiku" })).text).toBe("OK #1 [claude/haiku]");
      await post("/v1/issues", { title: "Von Nils", body: "Bitte prüfen", author: "nils", model: "sonnet" });
      expect((await call("issue_claim", { issueId: 2, agent: "claude:sonnet-2" })).text).toBe(
        "OK #2 [claude/sonnet] übernommen von claude:sonnet-2 – weiter mit issue_read",
      );
      const busy = await call("issue_claim", { issueId: 2, agent: "claude:opus-2" });
      expect(busy.isError).toBe(true);
      expect(busy.text).toContain("409");
      const bad = await call("comment_add", { issueId: 2, body: "x", agent: "gpt" });
      expect(bad.isError).toBe(true);
      expect(bad.text).toContain('beginnen');

      const cursor = (await get("/health")).json.seq;
      expect((await call("comment_add", { issueId: 2, body: "Zwischenstand", agent: "claude:sonnet-2" })).isError).toBe(false);
      expect((await get(`/v1/agent/wait?after=${cursor}&timeout=0`)).json.changed).toBe(false);
      // fresh: Subagent sieht Titel/Text erneut, Kommentare anderer Subagenten bleiben sichtbar
      const fresh = (await call("issue_read", { issueId: 2, fresh: true })).text;
      expect(fresh).toContain("Bitte prüfen");
      expect(fresh).toContain("claude:sonnet-2: Zwischenstand");
      expect(fresh).not.toContain("zugewiesen");

      expect((await call("issue_release", { issueId: 2, agent: "claude:sonnet-2" })).text).toBe("OK #2 freigegeben → open");
      const inbox = (await call("inbox", {})).text;
      expect(inbox).toContain("#2 [claude/sonnet] open „Von Nils“");
      await call("issue_claim", { issueId: 2, agent: "claude:sonnet-2" });
      expect((await call("inbox", {})).text).not.toContain("#2"); // nichts Neues seit letztem inbox
      expect((await call("issue_list", {})).text).toContain("#2 [claude/sonnet] in_progress „Von Nils“ von nils, 1 Komm., → claude:sonnet-2");
    } finally {
      await mcp.close();
    }
  });
});

function runCli(args: string[], env: Record<string, string>): Promise<{ code: number | null; stdout: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/cli/index.ts", ...args], { cwd: root, env: { ...process.env, ...env } });
    let stdout = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.on("close", (code) => resolve({ code, stdout }));
  });
}

describe("Watcher-Arbeitsliste", () => {
  beforeEach(async () => {
    srv = await startTestServer();
  });

  it("sammelt mehrere gleichzeitig angelegte Issues in einem Weckruf (eine Zeile je Issue)", async () => {
    const client = new RelayClient({ baseUrl: srv.url });
    const cursorFile = path.join(srv.dataDir, "c");
    setTimeout(async () => {
      await post("/v1/issues", { title: "Eins", body: "Text eins", author: "nils", model: "haiku" });
      await new Promise((r) => setTimeout(r, 200));
      await post("/v1/issues", { title: "Zwei", author: "programm:x", labels: ["model:sonnet"] });
      await new Promise((r) => setTimeout(r, 200));
      await post("/v1/issues", { title: "Drei", body: "y".repeat(200), author: "nils" });
    }, 300);
    const r = await runWatch({ client, timeoutSec: 10, chunkSec: 5, cursorFile, minWaitMs: 1000 });
    expect(r.line.split("\n")).toEqual([
      "#1 [claude/haiku] open „Eins“ – neu – Text eins",
      "#2 [claude/sonnet] open „Zwei“ – neu",
      `#3 [claude/opus] open „Drei“ – neu – ${"y".repeat(79)}…`,
    ]);

    // Kommentar eines Menschen auf ein übernommenes Issue; Subagent-Kommentare wecken nicht
    await post("/v1/issues/1/claim", { agent: "claude:haiku-1" });
    await post("/v1/issues/1/comments", { body: "Arbeite dran", author: "claude:haiku-1" });
    expect((await runWatch({ client, timeoutSec: 1, chunkSec: 1, cursorFile, minWaitMs: 0, once: true })).line).toBe("Nichts Neues.");
    await post("/v1/issues/1/comments", { body: "Bitte auch die Tests", author: "nils" });
    await post("/v1/issues/2/comments", { body: "Nachtrag", author: "programm:x" });
    await post("/v1/issues/2/comments", { body: "noch einer", author: "nils" });
    const r2 = await runWatch({ client, timeoutSec: 5, chunkSec: 1, cursorFile, minWaitMs: 0 });
    expect(r2.line).toBe(
      [
        "#1 [claude/haiku] in_progress (claude:haiku-1) „Eins“ – kommentiert von nils – Bitte auch die Tests",
        "#2 [claude/sonnet] open „Zwei“ – kommentiert von programm:x, nils – noch einer",
      ].join("\n"),
    );

    // Wiedereröffnung
    await post("/v1/issues/3/comments", { body: "Erledigt", author: "claude:opus-3", status: "closed" });
    await patch("/v1/issues/3", { author: "nils", status: "open" });
    expect((await runWatch({ client, timeoutSec: 5, chunkSec: 1, cursorFile, minWaitMs: 0 })).line).toMatch(
      /^#3 \[claude\/opus\] open „Drei“ – wiedereröffnet – y+…$/,
    );
  }, 20_000);

  it("CLI --json: eine Zeile JSON; --min-wait; Begrenzung auf 20 Zeilen", async () => {
    const env = { AB_URL: srv.url, AB_DATA_DIR: srv.dataDir };
    const p = runCli(["watch", "--json", "--min-wait", "800", "--timeout", "20s"], env);
    setTimeout(async () => {
      await post("/v1/issues", { title: "J1", author: "nils" });
      await post("/v1/issues", { title: "J2", author: "nils", model: "haiku" });
    }, 1500);
    const r = await p;
    expect(r.code).toBe(0);
    expect(r.stdout.trim().split("\n")).toHaveLength(1);
    const j = JSON.parse(r.stdout) as { changed: boolean; cursor: number; issues: WaitingIssue[] };
    expect(j.changed).toBe(true);
    expect(j.issues.map((i) => [i.issueId, i.model, i.provider, i.opened])).toEqual([
      [1, "claude/opus", "claude", true],
      [2, "claude/haiku", "claude", true],
    ]);
    const none = await runCli(["watch", "--json", "--once"], env);
    expect(JSON.parse(none.stdout)).toEqual({ changed: false, cursor: j.cursor, issues: [] });

    const many: WaitingIssue[] = Array.from({ length: 25 }, (_, i) => ({
      issueId: i + 1,
      title: `T${i + 1}`,
      status: "open",
      model: "claude/opus",
      provider: "claude",
      newEntries: 1,
      opened: true,
      comments: 0,
      commentAuthors: [],
      reopened: false,
      preview: "",
    }));
    const lines = formatWaiting(many).split("\n");
    expect(lines).toHaveLength(21);
    expect(lines[20]).toBe("… und 5 weitere");
  }, 30_000);
});

describe("Web-Oberfläche", () => {
  it("app.js ist syntaktisch gültig und enthält die Modellwahl", async () => {
    await promisify(execFile)(process.execPath, ["--check", path.join(root, "src/web/app.js")]);
    srv = await startTestServer();
    const js = await (await fetch(`${srv.url}/app.js`)).text();
    expect(js).toContain("Opus 5.5");
    expect(js).toContain("Haiku 4.5");
    expect(js).not.toMatch(/fable/i);
  });
});
