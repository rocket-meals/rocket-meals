// Zuständigkeit nach Provider: Watcher-Filter, MCP-Filter, claim-Ablehnung fremder Provider, Instruktionen.
import { spawn } from "node:child_process";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runWatch } from "../src/cli/watch.ts";
import { BOARD_RULES, PROVIDER_RULE, createMcpServer } from "../src/mcp/server.ts";
import { RelayClient } from "../src/shared/client.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

const RULE =
  "Du (Claude) bearbeitest NUR Issues mit provider `claude`. Starte Subagenten nur dafür und wähle als Agent-Tool-`model` den Namen nach dem Schrägstrich (opus/sonnet/haiku). Issues anderer Provider (z. B. whisper, ollama) werden von deren eigenen Workern bearbeitet – nicht anfassen, nicht kommentieren, keine Subagenten dafür starten.";

let srv: TestServer;
let mcp: Client;
type R = { content: { text?: string }[]; isError?: boolean };
const call = async (name: string, args: Record<string, unknown> = {}) => {
  const r = (await mcp.callTool({ name, arguments: args })) as R;
  return { text: r.content.map((c) => c.text ?? "").join("\n"), isError: !!r.isError };
};
const post = (p: string, body: unknown) => api(srv.url, "POST", p, body);

beforeEach(async () => {
  srv = await startTestServer();
  const server = createMcpServer({ client: new RelayClient({ baseUrl: srv.url }), agentName: "claude" });
  const [a, b] = InMemoryTransport.createLinkedPair();
  mcp = new Client({ name: "t", version: "1" });
  await Promise.all([server.connect(a), mcp.connect(b)]);
});
afterEach(async () => {
  await mcp.close();
  await srv.stop();
});

describe("Provider-Filter", () => {
  it("REST: ?provider= filtert Liste, inbox und agent/wait", async () => {
    await post("/v1/issues", { title: "C", author: "nils" });
    await post("/v1/issues", { title: "W", author: "nils", model: "whisper/large-v3" });
    await post("/v1/issues", { title: "O", author: "nils", model: "ollama/qwen2.5vl" });
    const ids = async (p: string) => (await api(srv.url, "GET", p)).json;
    expect((await ids("/v1/issues?provider=claude")).issues.map((i: { id: number }) => i.id)).toEqual([1]);
    expect((await ids("/v1/issues?provider=whisper,ollama")).total).toBe(2);
    expect((await ids("/v1/issues?provider=all")).total).toBe(3);
    expect((await ids("/v1/issues")).total).toBe(3);
    expect((await ids("/v1/agent/inbox?provider=whisper")).items.map((i: { issueId: number; provider: string }) => [i.issueId, i.provider])).toEqual([[2, "whisper"]]);
    expect((await ids("/v1/agent/inbox?provider=claude")).counts.open).toBe(1);
    expect((await ids("/v1/agent/wait?after=0&timeout=0&provider=claude")).waiting.map((w: { issueId: number }) => w.issueId)).toEqual([1]);
  });

  it("Watcher: weckt standardmäßig nur für claude; --provider whisper bzw. all", async () => {
    const client = new RelayClient({ baseUrl: srv.url });
    const cf = (n: string) => path.join(srv.dataDir, n);
    setTimeout(async () => {
      await post("/v1/issues", { title: "Transkribieren", author: "nils", model: "whisper/large-v3" });
      await new Promise((r) => setTimeout(r, 300));
      await post("/v1/issues", { title: "Für Claude", author: "nils", model: "claude/haiku" });
    }, 200);
    // Standard (claude): das whisper-Issue weckt nicht, erst das claude-Issue
    const r = await runWatch({ client, timeoutSec: 10, chunkSec: 2, cursorFile: cf("c1"), minWaitMs: 0 });
    expect(r.line).toBe("#2 [claude/haiku] open „Für Claude“ – neu");

    const w = await runWatch({ client, timeoutSec: 2, chunkSec: 1, cursorFile: cf("c2"), minWaitMs: 0, provider: "whisper" });
    expect(w.line).toBe("#1 [whisper/large-v3] open „Transkribieren“ – neu");
    const all = await runWatch({ client, timeoutSec: 2, chunkSec: 1, cursorFile: cf("c3"), minWaitMs: 0, provider: "all" });
    expect(all.line.split("\n")).toHaveLength(2);

    // Kommentar auf whisper-Issue weckt den claude-Watcher nicht
    await post("/v1/issues/1/comments", { body: "Datei anbei", author: "nils" });
    const none = await runWatch({ client, timeoutSec: 1, chunkSec: 1, cursorFile: cf("c1"), minWaitMs: 0, once: true });
    expect(none.line).toBe("Nichts Neues.");
  });

  it("CLI: watch --provider all und Standard-Cursor je Provider", async () => {
    await post("/v1/issues", { title: "W", author: "nils", model: "whisper/large-v3" });
    const run = (args: string[]) =>
      new Promise<string>((resolve) => {
        const child = spawn(process.execPath, ["--import", "tsx", "src/cli/index.ts", ...args], {
          cwd: path.resolve(import.meta.dirname, ".."),
          env: { ...process.env, AB_URL: srv.url, AB_DATA_DIR: srv.dataDir },
        });
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.on("close", () => resolve(out));
      });
    expect(await run(["watch", "--once", "--min-wait", "0"])).toBe("Nichts Neues.\n");
    expect(await run(["watch", "--once", "--min-wait", "0", "--provider", "all"])).toBe("#1 [whisper/large-v3] open „W“ – neu\n");
    expect(await run(["watch", "--once", "--min-wait", "0", "--provider", "whisper"])).toBe("#1 [whisper/large-v3] open „W“ – neu\n");
  }, 30_000);
});

describe("MCP: Zuständigkeit", () => {
  it("inbox, issue_list, wait_for_new zeigen standardmäßig nur provider claude", async () => {
    await post("/v1/issues", { title: "Audio", author: "nils", model: "whisper/large-v3" });
    await post("/v1/issues", { title: "Code", author: "nils", model: "claude/sonnet" });
    const inbox = (await call("inbox")).text;
    expect(inbox).toContain("#2 [claude/sonnet] open „Code“");
    expect(inbox).not.toContain("Audio");
    expect(inbox.startsWith("1 offen")).toBe(true);
    expect((await call("issue_list")).text).toBe("#2 [claude/sonnet] open „Code“ von nils, 0 Komm.");
    expect((await call("issue_list", { provider: "whisper" })).text).toContain("#1 [whisper/large-v3]");
    expect((await call("issue_list", { provider: "all" })).text.split("\n")).toHaveLength(2);

    setTimeout(async () => {
      await post("/v1/issues", { title: "Noch Audio", author: "nils", model: "whisper/large-v3" });
      await new Promise((r) => setTimeout(r, 300));
      await post("/v1/issues", { title: "Noch Code", author: "nils" });
    }, 200);
    const w = (await call("wait_for_new", { timeoutSec: 10 })).text;
    expect(w.split("\n")[0]).toBe("#4 [claude/opus] open „Noch Code“ – neu");
    expect(w).not.toContain("Noch Audio");
  });

  it("issue_claim lehnt fremde Provider ab (409 „gehört zu Provider whisper“), außer mit force", async () => {
    await post("/v1/issues", { title: "Audio", author: "nils", model: "whisper/large-v3" });
    const r = await call("issue_claim", { issueId: 1, agent: "claude:opus-1" });
    expect(r.isError).toBe(true);
    expect(r.text).toContain("409");
    expect(r.text).toContain("gehört zu Provider whisper");
    expect((await api(srv.url, "GET", "/v1/issues/1")).json.issue.status).toBe("open");
    const forced = await call("issue_claim", { issueId: 1, agent: "claude:opus-1", force: true });
    expect(forced.text).toBe("OK #1 [whisper/large-v3] übernommen von claude:opus-1 – weiter mit issue_read");

    // REST: provider im claim-Body
    await post("/v1/issues", { title: "Code", author: "nils" });
    expect((await post("/v1/issues/2/claim", { agent: "whisper-worker", provider: "whisper" })).status).toBe(409);
    expect((await post("/v1/issues/2/claim", { agent: "claude:x", provider: "claude" })).status).toBe(200);
  });

  it("instructions (Initialize) und board_rules enthalten die Provider-Regel wörtlich", async () => {
    expect(PROVIDER_RULE).toBe(RULE);
    expect(mcp.getInstructions()).toContain(RULE);
    const rules = (await call("board_rules")).text;
    expect(rules).toBe(BOARD_RULES);
    expect(rules).toContain(RULE);
    expect(rules).toMatch(/Schlüssel/);
  });
});
