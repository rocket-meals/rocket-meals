// Testprogramm examples/uhrzeit: echter Prozess gegen Testserver, „Claude“ antwortet über MCP/HTTP.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { checkAnswer, findTime } from "../examples/uhrzeit/src/zeit.ts";
import { api, startTestServer, type TestServer } from "./helpers.ts";

const KEY = "uhrzeit-test-key";
const DIR = path.resolve(import.meta.dirname, "../examples/uhrzeit");
type ToolResult = { content: { type: string; text?: string }[]; isError?: boolean };

let srv: TestServer;
const procs: ChildProcess[] = [];
const mcps: Client[] = [];

beforeEach(async () => {
  srv = await startTestServer({ apiKey: KEY });
});
afterEach(async () => {
  for (const p of procs.splice(0)) if (p.exitCode === null) p.kill("SIGKILL");
  for (const c of mcps.splice(0)) await c.close().catch(() => undefined);
  await srv.stop();
});

function runProgram(env: Record<string, string>, args: string[] = []) {
  if (!existsSync(path.join(DIR, "node_modules/@nils/agent-board-client"))) {
    throw new Error("examples/uhrzeit: zuerst `cd examples/uhrzeit && npm install` ausführen");
  }
  const child = spawn(process.execPath, ["--import", "tsx", "src/uhrzeit.ts", ...args], {
    cwd: DIR,
    env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  procs.push(child);
  let out = "";
  child.stdout!.on("data", (d) => (out += d));
  child.stderr!.on("data", (d) => (out += d));
  const exited = new Promise<number | null>((resolve) => child.on("exit", (code) => resolve(code)));
  const waitFor = async (re: RegExp, ms = 15_000) => {
    const end = Date.now() + ms;
    while (!re.test(out)) {
      if (Date.now() > end) throw new Error(`Ausgabe ${re} fehlt:\n${out}`);
      await new Promise((r) => setTimeout(r, 50));
    }
  };
  return { child, exited, waitFor, output: () => out };
}

async function agent(): Promise<(name: string, args?: Record<string, unknown>) => Promise<string>> {
  const client = new Client({ name: "claude-sim", version: "1.0.0" });
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${srv.url}/mcp`), { requestInit: { headers: { authorization: `Bearer ${KEY}` } } }),
  );
  mcps.push(client);
  return async (name, args = {}) => {
    const r = (await client.callTool({ name, arguments: args })) as ToolResult;
    const text = r.content.map((c) => c.text ?? "").join("\n");
    if (r.isError) throw new Error(`${name}: ${text}`);
    return text;
  };
}

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;

describe("examples/uhrzeit", () => {
  it("Zeitvergleich: findet HH:MM und rechnet über Mitternacht", () => {
    expect(findTime("Es ist 7:05 Uhr")?.text).toBe("07:05");
    expect(findTime("am 05.10.2026")).toBeUndefined();
    const now = new Date(2026, 9, 5, 23, 58);
    expect(checkAnswer("Montag, 5. Oktober 2026, 00:03 Uhr", now)).toMatchObject({ found: "00:03", deviationMin: 5, dateOk: true });
    const none = checkAnswer("keine Ahnung", now);
    expect(none.found).toBeUndefined();
    expect(none.dateOk).toBe(false);
  });

  it("fragt, erhält die Antwort über MCP, meldet die Abweichung und schließt mit Dank", async () => {
    const call = await agent();
    await call("inbox");
    const prog = runProgram({ AB_URL: srv.url, AB_API_KEY: KEY });
    await prog.waitFor(/Issue #1 angelegt/);

    // „Claude“: wartet auf Neues, liest, antwortet mit einer um 3 min abweichenden Uhrzeit
    expect(await call("wait_for_new", { timeoutSec: 10 })).toContain("#1");
    await call("issue_status", { issueId: 1, status: "in_progress" });
    expect(await call("issue_read", { issueId: 1 })).toContain("Welcher Tag ist heute");
    const t = new Date(Date.now() + 3 * 60_000);
    const today = new Date().toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    await call("comment_add", { issueId: 1, body: `Heute ist ${today}, es ist ${hhmm(t)} Uhr.` });

    expect(await prog.exited).toBe(0);
    const out = prog.output();
    expect(out).toContain("Antwort von claude:");
    expect(out).toMatch(/Abweichung: \+[23] min \(passt/);
    expect(out).toContain("Datum: passt zu heute");
    expect(out).toContain("Issue #1 geschlossen.");

    const { issue, entries } = (await api(srv.url, "GET", "/v1/issues/1", undefined, { authorization: `Bearer ${KEY}` })).json;
    expect(issue).toMatchObject({ status: "closed", author: "programm:uhrzeit", labels: ["test"], closedBy: "programm:uhrzeit" });
    expect(entries.some((e: { body?: string }) => e.body?.startsWith("Danke"))).toBe(true);
  });

  it("Strg+C bricht sauber ab und schließt das Issue mit Hinweis", async () => {
    const prog = runProgram({ AB_URL: srv.url, AB_API_KEY: KEY });
    await prog.waitFor(/Issue #1 angelegt/);
    await new Promise((r) => setTimeout(r, 300));
    prog.child.kill("SIGINT");
    expect(await prog.exited).toBe(130);
    expect(prog.output()).toContain("Abgebrochen – Issue #1 geschlossen");
    const { issue } = (await api(srv.url, "GET", "/v1/issues/1", undefined, { authorization: `Bearer ${KEY}` })).json;
    expect(issue.status).toBe("closed");
  });

  it("Zeitlimit und fehlende Umgebung", async () => {
    const prog = runProgram({ AB_URL: srv.url, AB_API_KEY: KEY }, ["--timeout", "1"]);
    expect(await prog.exited).toBe(2);
    expect(prog.output()).toContain("Keine Antwort innerhalb von 1 s");

    const noEnv = runProgram({});
    expect(await noEnv.exited).toBe(1);
    expect(noEnv.output()).toContain("AB_URL und AB_API_KEY");
  });
});
