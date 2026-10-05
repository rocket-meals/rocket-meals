// Generischer Worker (runWorker im Client-Paket) und Beispiel examples/worker-echo (echter Prozess).
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { reverseText } from "../examples/worker-echo/src/echo.ts";
import { AgentBoardClient, model, runWorker } from "../client/src/index.ts";
import { runWatch } from "../src/cli/watch.ts";
import { RelayClient } from "../src/shared/client.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

const ADMIN = "admin-key-worker-test-123";
const ECHO = "echo-worker-key-0123456789";
const PROG = "programm-key-0123456789ab";
const DIR = path.resolve(import.meta.dirname, "../examples/worker-echo");
const bearer = (k: string) => ({ authorization: `Bearer ${k}` });

let srv: TestServer;
const procs: ChildProcess[] = [];
beforeEach(async () => {
  srv = await startTestServer({
    apiKey: ADMIN,
    keys: [
      { name: "echo-worker", role: "agent", providers: ["echo"], key: ECHO },
      { name: "app", role: "program", key: PROG },
    ],
  });
});
afterEach(async () => {
  for (const p of procs.splice(0)) if (p.exitCode === null) p.kill("SIGKILL");
  await srv.stop();
});

const until = async (cond: () => Promise<boolean>, ms = 8000) => {
  const end = Date.now() + ms;
  while (!(await cond())) {
    if (Date.now() > end) throw new Error("Zeitüberschreitung");
    await new Promise((r) => setTimeout(r, 50));
  }
};
const issue = async (id: number) => (await api(srv.url, "GET", `/v1/issues/${id}`, undefined, bearer(ADMIN))).json;

describe("runWorker", () => {
  it("übernimmt nur Issues des Providers, schließt mit Rückgabetext, Fehler → needs_human, parallel bis concurrency", async () => {
    const app = new AgentBoardClient({ baseUrl: srv.url, apiKey: PROG, user: "programm:app" });
    const claudeIssue = await app.createIssue({ title: "Für Claude", body: "nicht anfassen" });
    const otherModel = await app.createIssue({ title: "v2", body: "x", model: model("echo", "v2") });

    const ac = new AbortController();
    const seen: number[] = [];
    let active = 0;
    let maxActive = 0;
    const running = runWorker({
      baseUrl: srv.url,
      apiKey: ECHO,
      provider: "echo/v1",
      agent: "echo-worker",
      concurrency: 2,
      pollSec: 2,
      signal: ac.signal,
      handle: async (i, ctx) => {
        seen.push(i.id);
        active++;
        maxActive = Math.max(maxActive, active);
        try {
          await new Promise((r) => setTimeout(r, 300));
          if (i.body === "kaputt") throw new Error("Datei fehlt");
          if (i.body === "selbst") {
            await ctx.comment("Zwischenstand");
            await ctx.attach(new TextEncoder().encode("ergebnis"), { name: "out.txt" });
            await ctx.close("Fertig mit Anhang");
            return;
          }
          return `Echo: ${reverseText(i.body)}`;
        } finally {
          active--;
        }
      },
    });

    // Programm fragt und wartet auf die Antwort des Workers
    const answer = app.ask("Umdrehen", "Hallo Welt", { model: model("echo", "v1"), timeoutMs: 10_000 });
    const a2 = await app.createIssue({ title: "B", body: "selbst", model: model("echo", "v1") });
    const a3 = await app.createIssue({ title: "C", body: "kaputt", model: model("echo", "v1") });
    const r = await answer;
    expect(r.text).toBe("Echo: tleW ollaH");
    expect(r.comments[0]!.author).toBe("echo-worker");
    await until(async () => (await issue(a2.id)).issue.status === "closed" && (await issue(a3.id)).issue.status === "needs_human");

    const done = await issue(r.issue.id);
    expect(done.issue).toMatchObject({ status: "closed", closedBy: "echo-worker", provider: "echo" });
    const two = await issue(a2.id);
    expect(two.entries.filter((e: { type: string }) => e.type === "comment").map((e: { body: string }) => e.body)).toEqual([
      "Zwischenstand",
      "Datei: out.txt",
      "Fertig mit Anhang",
    ]);
    const three = await issue(a3.id);
    expect(JSON.stringify(three.entries)).toContain("Fehler im Worker echo-worker: Datei fehlt");
    expect((await app.listIssues({ forMe: true })).issues.map((i) => i.id)).toContain(a3.id);

    // fremder Provider und anderes echo-Modell bleiben unberührt
    expect((await issue(claudeIssue.id)).issue.status).toBe("open");
    expect((await issue(otherModel.id)).issue.status).toBe("open");
    expect(seen.sort()).toEqual([r.issue.id, a2.id, a3.id].sort());
    expect(maxActive).toBe(2);

    ac.abort();
    await running;
  });

  it("falscher Schlüssel beendet den Worker mit Fehler", async () => {
    await expect(
      runWorker({ baseUrl: srv.url, apiKey: "falsch", provider: "echo", agent: "echo-worker", handle: () => "x" }),
    ).rejects.toMatchObject({ status: 401 });
    // program-Schlüssel darf nicht claimen/warten
    await api(srv.url, "POST", "/v1/issues", { title: "e", model: "echo/v1" }, bearer(PROG));
    await expect(runWorker({ baseUrl: srv.url, apiKey: PROG, provider: "echo", agent: "programm:app", handle: () => "x" })).rejects.toMatchObject({
      status: 403,
    });
  });
});

describe("examples/worker-echo", () => {
  function start() {
    if (!existsSync(path.join(DIR, "node_modules/@nils/agent-board-client"))) {
      throw new Error("examples/worker-echo: zuerst `cd examples/worker-echo && npm install` ausführen");
    }
    const child = spawn(process.execPath, ["--import", "tsx", "src/worker.ts"], {
      cwd: DIR,
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", AB_URL: srv.url, AB_WORKER_KEY: ECHO },
      stdio: ["ignore", "pipe", "pipe"],
    });
    procs.push(child);
    let out = "";
    child.stdout!.on("data", (d) => (out += d));
    child.stderr!.on("data", (d) => (out += d));
    const exited = new Promise<number | null>((resolve) => child.on("exit", (c) => resolve(c)));
    return { child, exited, output: () => out };
  }

  it("Prozess beantwortet echo/v1-Issues mit umgedrehtem Text; Claude-Watcher wird nicht geweckt; Strg+C beendet", async () => {
    const w = start();
    await until(async () => w.output().includes("wartet auf Issues"), 15_000);
    const watcher = runWatch({ client: new RelayClient({ baseUrl: srv.url, apiKey: ADMIN }), timeoutSec: 2, chunkSec: 1, cursorFile: path.join(srv.dataDir, "c"), minWaitMs: 0 });

    const app = new AgentBoardClient({ baseUrl: srv.url, apiKey: PROG, user: "programm:app" });
    const r = await app.ask("Bitte umdrehen", "Grüße 👋🏽 aus Köln", { model: model("echo", "v1"), timeoutMs: 15_000 });
    expect(r.text).toBe(`Echo (echo/v1): ${reverseText("Grüße 👋🏽 aus Köln")}`);
    expect(r.text).toContain("nlöK sua 👋🏽 eßürG");
    expect((await issue(r.issue.id)).issue).toMatchObject({ status: "closed", closedBy: "echo-worker" });

    const bad = await app.createIssue({ title: "x", body: "fehler", model: model("echo", "v1") });
    await until(async () => (await issue(bad.id)).issue.status === "needs_human");

    expect((await watcher).line).toBe("Nichts Neues."); // nur echo-Issues → Claude bleibt schlafen

    w.child.kill("SIGINT");
    expect(await w.exited).toBe(0);
    expect(w.output()).toContain(`#${r.issue.id} übernommen (echo/v1)`);
    expect(w.output()).toContain("Worker beendet.");
  }, 30_000);

  it("ohne Umgebung: Hinweis auf npm run key", async () => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/worker.ts"], { cwd: DIR, env: { PATH: process.env.PATH ?? "" } });
    procs.push(child);
    let out = "";
    child.stderr.on("data", (d) => (out += d));
    expect(await new Promise((resolve) => child.on("exit", resolve))).toBe(1);
    expect(out).toContain("npm run key -- create --name echo-worker --role agent --providers echo");
  });
});
