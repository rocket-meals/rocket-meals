import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMcpServer } from "../src/mcp/server.ts";
import { RelayClient } from "../src/shared/client.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

let srv: TestServer;
let client: Client;
let work: string;

type ToolResult = { content: { type: string; text?: string; data?: string; mimeType?: string }[]; isError?: boolean };
const call = async (name: string, args: Record<string, unknown> = {}) => (await client.callTool({ name, arguments: args })) as ToolResult;
const txt = (r: ToolResult) => r.content.map((c) => c.text ?? "").join("\n");

beforeEach(async () => {
  srv = await startTestServer();
  work = await mkdtemp(path.join(tmpdir(), "ab-mcp-"));
  const server = createMcpServer({ client: new RelayClient({ baseUrl: srv.url }), agentName: "claude", downloadDir: work });
  const [a, b] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "1.0.0" });
  await Promise.all([server.connect(a), client.connect(b)]);
});
afterEach(async () => {
  await client.close();
  await srv.stop();
  await rm(work, { recursive: true, force: true });
});

describe("MCP-Tools", () => {
  it("listet Tools, liefert instructions und Prompt", async () => {
    const tools = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(tools).toEqual(
      ["board_rules", "comment_add", "file_attach", "file_get", "inbox", "issue_claim", "issue_create", "issue_label", "issue_list", "issue_read", "issue_release", "issue_status", "request_human", "wait_for_new"].sort(),
    );
    expect(client.getInstructions()).toContain("npm run --silent watch");
    const p = await client.getPrompt({ name: "relay" });
    expect(JSON.stringify(p.messages)).toContain("inbox");
  });

  it("inbox → issue_status → issue_read → comment_add → issue_status closed (knappe Ausgaben)", async () => {
    await api(srv.url, "POST", "/v1/issues", { title: "Bitte README prüfen", body: "Tippfehler?", author: "nils", labels: ["docs"] });
    const inbox = txt(await call("inbox"));
    expect(inbox).toContain("#1 [claude/opus] open „Bitte README prüfen“ [docs] +1: Tippfehler?");
    expect(inbox.split("\n")).toHaveLength(2);
    expect(txt(await call("inbox"))).not.toContain("+1"); // seit letztem Aufruf nichts Neues

    expect(txt(await call("issue_status", { issueId: 1, status: "in_progress" }))).toBe("OK #1 → in_progress (claude)");
    const first = txt(await call("issue_read", { issueId: 1 }));
    expect(first).toContain("Tippfehler?");
    expect(first).toContain("von nils");
    expect(first).not.toContain("hat das Issue eröffnet");
    expect(first).not.toContain("in_progress (");
    expect(first).not.toContain("Status open → in_progress"); // eigene Einträge ausgeblendet
  });

  it("liest nur Neues und versteckt eigene Einträge", async () => {
    await api(srv.url, "POST", "/v1/issues", { title: "T", author: "nils" });
    await call("issue_read", { issueId: 1 });
    expect(txt(await call("comment_add", { issueId: 1, body: "Antwort" }))).toMatch(/^OK #\d+ → open$/);
    expect(txt(await call("issue_read", { issueId: 1 }))).toContain("nichts Neues");
    await api(srv.url, "POST", "/v1/issues/1/comments", { body: "Rückfrage", author: "nils" });
    const r = txt(await call("issue_read", { issueId: 1 }));
    expect(r).toContain("1 neu");
    expect(r).toContain("nils: Rückfrage");
    expect(r).not.toContain("Antwort");
    expect(txt(await call("issue_read", { issueId: 1, full: true }))).toContain("claude: Antwort");
  });

  it("Dateien: Programm-Anhang lesen (Text/Bild/Pfad), eigene Datei anhängen", async () => {
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    await api(srv.url, "POST", "/v1/issues", {
      title: "Log ansehen",
      author: "programm:ci",
      attachments: [
        { name: "build.log", contentBase64: Buffer.from("ERROR: x fehlt").toString("base64") },
        { name: "shot.png", contentBase64: png.toString("base64") },
        { name: "daten.bin", contentBase64: Buffer.from([1, 2, 3]).toString("base64") },
      ],
    });
    const read = txt(await call("issue_read", { issueId: 1 }));
    const ids = [...read.matchAll(/id ([0-9a-f]{12})/g)].map((m) => m[1]!);
    expect(ids).toHaveLength(3);
    expect(txt(await call("file_get", { id: ids[0]! }))).toContain("ERROR: x fehlt");
    const img = await call("file_get", { id: ids[1]! });
    expect(img.content[1]).toMatchObject({ type: "image", mimeType: "image/png" });
    const bin = txt(await call("file_get", { id: ids[2]! }));
    expect(bin).toMatch(/^Gespeichert: /);
    expect([...(await readFile(bin.slice(13).split(" (")[0]!))]).toEqual([1, 2, 3]);

    const local = path.join(work, "fix.patch");
    await writeFile(local, "--- a\n+++ b\n");
    expect(txt(await call("file_attach", { issueId: 1, path: local, comment: "Patch anbei" }))).toMatch(/fix\.patch id [0-9a-f]{12}/);
    const c = txt(await call("comment_add", { issueId: 1, body: "Notiz", files: [{ name: "n.md", content: "# Hi" }] }));
    expect(c).toContain("(1 Anhang)");
    const { entries } = (await api(srv.url, "GET", "/v1/issues/1")).json;
    expect(entries.filter((e: { attachments?: unknown[] }) => e.attachments?.length)).toHaveLength(2);
  });

  it("request_human setzt needs_human mit @Erwähnung; Schließen-Regeln greifen", async () => {
    await api(srv.url, "POST", "/v1/issues", { title: "Unklar", author: "nils" });
    expect(txt(await call("request_human", { issueId: 1, reason: "Welche Variante?" }))).toBe("OK #1 → needs_human, @nils erwähnt");
    const { entries } = (await api(srv.url, "GET", "/v1/issues/1")).json;
    expect(entries.some((e: { event?: { kind: string; user?: string } }) => e.event?.kind === "mention" && e.event.user === "nils")).toBe(true);
    expect((await api(srv.url, "GET", "/v1/issues?for=me")).json.total).toBe(1);

    const noReason = await call("issue_status", { issueId: 1, status: "closed" });
    expect(noReason.isError).toBe(true);
    expect(txt(await call("issue_status", { issueId: 1, status: "closed", reason: "Erledigt: Variante A" }))).toBe("OK #1 → closed");
    await api(srv.url, "PATCH", "/v1/issues/1", { author: "nils", status: "open" });
    const again = await call("issue_status", { issueId: 1, status: "closed", reason: "nochmal" });
    expect(again.isError).toBe(true);
    expect(txt(again)).toContain("wiedereröffnet");
  });

  it("issue_create, issue_label, issue_list", async () => {
    expect(txt(await call("issue_create", { title: "Idee", body: "Cache einbauen", labels: ["idee"] }))).toBe("OK #1 [claude/opus]");
    expect(txt(await call("issue_label", { issueId: 1, add: ["perf"], remove: ["idee"] }))).toBe("OK #1 [perf]");
    expect(txt(await call("issue_list", {}))).toBe("#1 [claude/opus] open „Idee“ [perf] von claude, 0 Komm.");
    expect(txt(await call("issue_list", { status: "closed" }))).toBe("Keine Issues.");
  });

  it("wait_for_new blockiert bis Neues kommt bzw. bis Timeout", async () => {
    await call("inbox");
    setTimeout(() => void api(srv.url, "POST", "/v1/issues", { title: "Neu!", author: "nils" }), 200);
    const r = txt(await call("wait_for_new", { timeoutSec: 10 }));
    expect(r).toBe("#1 [claude/opus] open „Neu!“ – neu\nWeiter: je Issue einen Subagenten (CLAUDE.md) oder issue_claim / issue_read.");
    expect(txt(await call("wait_for_new", { timeoutSec: 1 }))).toBe("Nichts Neues (1s).");
  });
});
