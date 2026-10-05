import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { runWatch } from "../src/cli/watch.ts";
import { RelayClient } from "../src/shared/client.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

let srv: TestServer;
beforeEach(async () => {
  srv = await startTestServer();
});
afterEach(async () => {
  await srv.stop();
});

function runCli(args: string[], env: Record<string, string>): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["--import", "tsx", "src/cli/index.ts", ...args], {
      cwd: path.resolve(import.meta.dirname, ".."),
      env: { ...process.env, ...env },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}

describe("CLI-Watcher", () => {
  it("beendet sich bei neuem Issue mit genau einer Zeile und schreibt die Cursor-Datei", async () => {
    const cursorFile = path.join(srv.dataDir, ".agent-cursor");
    const p = runCli(["watch", "--timeout", "20s"], { AB_URL: srv.url, AB_DATA_DIR: srv.dataDir });
    setTimeout(() => void api(srv.url, "POST", "/v1/issues", { title: "Hilfe", author: "nils" }), 1500);
    const r = await p;
    expect(r.code).toBe(0);
    expect(r.stdout).toBe("#1 [claude/opus] open „Hilfe“ – neu\n");
    expect((await readFile(cursorFile, "utf8")).trim()).toBe("1");

    // Zweiter Lauf: Cursor greift, eigene Antwort weckt nicht, Kommentar des Nutzers schon
    const p2 = runCli(["watch", "--timeout", "20s"], { AB_URL: srv.url, AB_DATA_DIR: srv.dataDir });
    setTimeout(async () => {
      await api(srv.url, "POST", "/v1/issues/1/comments", { body: "mach ich", author: "claude" });
      await api(srv.url, "POST", "/v1/issues/1/comments", { body: "danke", author: "nils" });
    }, 1500);
    const r2 = await p2;
    expect(r2.stdout).toBe("#1 [claude/opus] open „Hilfe“ – kommentiert von nils – danke\n");
    expect((await readFile(cursorFile, "utf8")).trim()).toBe("3");
  }, 30_000);

  it("--once ohne Neues: Nichts Neues, Exit 0", async () => {
    const r = await runCli(["watch", "--once", "--cursor-file", path.join(srv.dataDir, "c")], { AB_URL: srv.url });
    expect(r).toMatchObject({ code: 0, stdout: "Nichts Neues.\n" });
  }, 20_000);

  it("Server nicht erreichbar → Exit 1 mit Hinweis", async () => {
    const r = await runCli(["watch", "--cursor-file", path.join(srv.dataDir, "c")], { AB_URL: "http://127.0.0.1:1" });
    expect(r.code).toBe(1);
    expect(r.stdout).toMatch(/^Server nicht erreichbar/);
  }, 20_000);

  it("runWatch stückelt Long-Polls und läuft über mehrere Timeouts", async () => {
    const client = new RelayClient({ baseUrl: srv.url });
    setTimeout(() => void api(srv.url, "POST", "/v1/issues", { title: "spät", author: "nils" }), 2500);
    const r = await runWatch({ client, timeoutSec: 10, chunkSec: 1, cursorFile: path.join(srv.dataDir, "c2") });
    expect(r).toMatchObject({ code: 0, line: "#1 [claude/opus] open „spät“ – neu" });
    const t = await runWatch({ client, timeoutSec: 1, chunkSec: 1, cursorFile: path.join(srv.dataDir, "c2") });
    expect(t).toMatchObject({ code: 0, line: "Nichts Neues." });
  });

  it("new/comment/list/show/close", async () => {
    const env = { AB_URL: srv.url, AB_USER: "nils" };
    expect((await runCli(["new", "Per CLI", "Text", "--label", "cli"], env)).stdout).toBe("#1 angelegt\n");
    expect((await runCli(["comment", "1", "Noch was"], env)).stdout).toMatch(/^#1 \[open\] Kommentar #\d+/);
    expect((await runCli(["list"], env)).stdout).toContain("#1 [claude/opus] open „Per CLI“ [cli] von nils, 1 Komm.");
    expect((await runCli(["show", "1"], env)).stdout).toContain("nils: Noch was");
    expect((await runCli(["close", "1"], env)).stdout).toContain("#1 [claude/opus] closed");
  }, 30_000);
});
