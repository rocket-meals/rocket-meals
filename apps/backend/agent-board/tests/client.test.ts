// Client-Paket (client/) gegen einen echten Server auf Port 0.
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, expectTypeOf, it } from "vitest";
import * as C from "../client/src/index.ts";
import { AgentBoardClient, AgentBoardError } from "../client/src/index.ts";
import { startRelayServer } from "../src/server/app.ts";
import type * as S from "../src/shared/types.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

let srv: TestServer;
let board: AgentBoardClient;
const claude = (p: string, body?: unknown) => api(srv.url, body === undefined ? "GET" : "POST", p, body);

beforeEach(async () => {
  srv = await startTestServer();
  board = new AgentBoardClient({ baseUrl: `${srv.url}/v1`, apiKey: "egal", user: "programm:test" });
});
afterEach(async () => srv.stop());

describe("AgentBoardClient", () => {
  it("Typen entsprechen dem Server-Datenmodell", () => {
    expectTypeOf<C.Issue>().toEqualTypeOf<S.Issue>();
    expectTypeOf<C.Entry>().toEqualTypeOf<S.Entry>();
    expectTypeOf<C.Attachment>().toEqualTypeOf<S.Attachment>();
    expectTypeOf<C.IssueEvent>().toEqualTypeOf<S.IssueEvent>();
    expectTypeOf<C.BoardEvent>().toEqualTypeOf<S.BoardEvent>();
    expect(C.ISSUE_STATUSES).toEqual(["open", "in_progress", "needs_human", "closed"]);
  });

  it("verlangt baseUrl und apiKey", () => {
    expect(() => new AgentBoardClient({} as C.AgentBoardClientOptions)).toThrow(/baseUrl/);
    expect(() => new AgentBoardClient({ baseUrl: "http://x" } as C.AgentBoardClientOptions)).toThrow(/apiKey/);
    try {
      new AgentBoardClient({ baseUrl: "localhost:4317", apiKey: "k" });
    } catch (e) {
      expect(e).toBeInstanceOf(AgentBoardError);
      expect((e as AgentBoardError).code).toBe("config_error");
    }
    expect(board.baseUrl).toBe(srv.url);
  });

  it("Issue mit Dateien (Bytes, Blob, Pfad), Kommentare, Labels, Status", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "ab-client-"));
    const logPath = path.join(dir, "import.log");
    await writeFile(logPath, "Zeile 3: Fehler\n");
    try {
      const issue = await board.createIssue({
        title: "Import fehlgeschlagen",
        body: "Siehe Log",
        labels: ["import"],
        attachments: [
          { file: logPath },
          { file: new TextEncoder().encode("a;b\n1;2\n"), name: "daten.csv" },
          { file: new Blob(["{}"], { type: "application/json" }), name: "cfg.json" },
        ],
      });
      expect(issue).toMatchObject({ id: 1, author: "programm:test", labels: ["import"], status: "open" });
      expect(issue.attachments.map((a) => [a.name, a.mime])).toEqual([
        ["import.log", "text/plain"],
        ["daten.csv", "text/csv"],
        ["cfg.json", "application/json"],
      ]);
      expect(new TextDecoder().decode(await board.downloadFile(issue.attachments[0]!.sha256))).toBe("Zeile 3: Fehler\n");

      const up = await board.uploadFile(new Uint8Array([1, 2, 3]), "x.bin");
      const c = await board.comment(1, "Nachtrag", [{ sha256: up.sha256 }]);
      expect(c.comment).toMatchObject({ author: "programm:test", body: "Nachtrag" });
      expect(c.comment.attachments?.[0]?.name).toBe("x.bin");

      expect((await board.addLabels(1, ["dringend"])).labels).toEqual(["import", "dringend"]);
      expect((await board.removeLabels(1, ["import"])).labels).toEqual(["dringend"]);
      expect((await board.setStatus(1, "in_progress")).status).toBe("in_progress");
      const closed = await board.close(1, "Erledigt");
      expect(closed).toMatchObject({ status: "closed", closedBy: "programm:test" });
      expect((await board.reopen(1)).status).toBe("open");

      const list = await board.listIssues({ status: "active", label: "dringend" });
      expect(list.total).toBe(1);
      const detail = await board.getIssue(1);
      expect(detail.entries.some((e) => e.body === "Erledigt")).toBe(true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("requestHuman setzt needs_human mit Grund (für den Menschen sichtbar unter „Für mich“)", async () => {
    await board.createIssue({ title: "Backup" });
    const r = await board.requestHuman(1, "Ziel nicht erreichbar");
    expect(r.issue.status).toBe("needs_human");
    expect(r.comment.body).toBe("Ziel nicht erreichbar");
    expect((await board.listIssues({ forMe: true })).total).toBe(1);
  });

  it("ask: legt Issue an und wartet auf Claudes Antwort (eigene Kommentare zählen nicht)", async () => {
    setTimeout(async () => {
      await claude("/v1/issues/1/comments", { body: "eigener Nachtrag", author: "programm:test" });
      await claude("/v1/issues/1/comments", {
        body: "Antwort: 42",
        author: "claude",
        attachments: [{ name: "r.txt", contentBase64: Buffer.from("ok").toString("base64") }],
      });
    }, 200);
    const r = await board.ask("Frage", "Was ist die Antwort?", { timeoutMs: 10_000, labels: ["api"] });
    expect(r.issue.labels).toEqual(["api"]);
    expect(r.text).toBe("Antwort: 42");
    expect(r.attachments.map((a) => a.name)).toEqual(["r.txt"]);
    expect(r.comments[0]!.author).toBe("claude");
  });

  it("waitForReply: from-Filter, Timeout und Abbruch per AbortController", async () => {
    const issue = await board.createIssue({ title: "Warten" });
    setTimeout(() => void claude(`/v1/issues/${issue.id}/comments`, { body: "von nils", author: "nils" }), 100);
    setTimeout(() => void claude(`/v1/issues/${issue.id}/comments`, { body: "von claude", author: "claude" }), 400);
    const r = await board.waitForReply(issue.id, { from: "claude", timeoutMs: 10_000 });
    expect(r.text).toBe("von claude");

    const t0 = Date.now();
    await expect(board.waitForReply(issue.id, { afterSeq: r.cursor, timeoutMs: 1200 })).rejects.toMatchObject({ code: "timeout" });
    expect(Date.now() - t0).toBeLessThan(5000);

    const ac = new AbortController();
    setTimeout(() => ac.abort(), 150);
    await expect(board.waitForReply(issue.id, { afterSeq: r.cursor, signal: ac.signal })).rejects.toMatchObject({ code: "aborted" });
  });

  it("Fehler als AgentBoardError mit status/code", async () => {
    await expect(board.getIssue(99)).rejects.toMatchObject({ status: 404, code: "not_found_error" });
    const keyed = await startTestServer({ apiKey: "richtig" });
    try {
      const bad = new AgentBoardClient({ baseUrl: keyed.url, apiKey: "falsch" });
      await expect(bad.listIssues()).rejects.toMatchObject({ status: 401, code: "authentication_error" });
      const ok = new AgentBoardClient({ baseUrl: keyed.url, apiKey: "richtig" });
      expect((await ok.listIssues()).total).toBe(0);
    } finally {
      await keyed.stop();
    }
    const down = new AgentBoardClient({ baseUrl: "http://127.0.0.1:9", apiKey: "x" });
    await expect(down.listIssues()).rejects.toMatchObject({ status: 0, code: "network_error" });
    expect(await down.health()).toBe(false);
  });

  it("events: SSE mit Auto-Reconnect nach Server-Neustart", async () => {
    const seen: string[] = [];
    const ac = new AbortController();
    const until = (n: number) =>
      new Promise<void>((resolve, reject) => {
        const t0 = Date.now();
        const check = () => (seen.length >= n ? resolve() : Date.now() - t0 > 8000 ? reject(new Error(`nur ${seen.length}`)) : setTimeout(check, 30));
        check();
      });
    const running = board.events((ev) => void seen.push(ev.issue.title), { signal: ac.signal, reconnectMs: 100 });
    await new Promise((r) => setTimeout(r, 200));
    await board.createIssue({ title: "Eins" });
    await until(1);

    // Server neu starten (gleicher Port, gleiche Daten)
    const port = Number(new URL(srv.url).port);
    await srv.close();
    const again = await startRelayServer({
      host: "127.0.0.1",
      port,
      dataDir: srv.dataDir,
      user: "nils",
      agent: "claude",
      completionTimeoutSec: 5,
      maxWaitSec: 600,
      maxFileBytes: 1024 * 1024,
      });
    try {
      await new Promise((r) => setTimeout(r, 400));
      await board.createIssue({ title: "Zwei" });
      await until(2);
      expect(seen).toEqual(["Eins", "Zwei"]);
      ac.abort();
      await running;
    } finally {
      await again.close();
    }
  });
});
