// End-to-End: echter Server-Prozess, MCP-Server über stdio, Watcher-CLI, openai-Paket.
// Ablauf: Programm legt Issue mit Datei an → Watcher weckt → „Claude“ (MCP) liest Datei, kommentiert mit Anhang,
// markiert needs_human → Nutzer antwortet und schließt. Zusätzlich: OpenAI-Adapter-Frage wird per MCP beantwortet.
import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import OpenAI from "openai";
import { AgentBoardClient, AgentBoardError, model } from "../client/src/index.ts";
import { RelayClient } from "../src/shared/client.ts";

const root = path.resolve(import.meta.dirname, "..");
const dataDir = await mkdtemp(path.join(tmpdir(), "ab-e2e-"));
const children: ChildProcess[] = [];
let failed = false;

function step(msg: string) {
  console.log(`✓ ${msg}`);
}
function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`Fehlgeschlagen: ${msg}`);
}

function tsx(script: string, args: string[], env: Record<string, string>): ChildProcess {
  const child = spawn(process.execPath, ["--import", "tsx", script, ...args], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  return child;
}

async function startServer(): Promise<string> {
  const child = tsx("src/server/index.ts", [], { AB_PORT: "0", AB_DATA_DIR: dataDir, AB_USER: "nils" });
  return new Promise((resolve, reject) => {
    let out = "";
    const timer = setTimeout(() => reject(new Error(`Server startet nicht: ${out}`)), 15_000);
    child.stdout!.on("data", (d) => {
      out += d;
      const m = /lauscht auf (http:\/\/\S+)/.exec(out);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]!);
      }
    });
    child.stderr!.on("data", (d) => (out += d));
    child.on("exit", (c) => reject(new Error(`Server beendet (${c}): ${out}`)));
  });
}

function watchOnce(url: string): Promise<string> {
  const child = tsx("src/cli/index.ts", ["watch", "--timeout", "30s"], { AB_URL: url, AB_DATA_DIR: dataDir });
  return new Promise((resolve, reject) => {
    let out = "";
    child.stdout!.on("data", (d) => (out += d));
    child.on("exit", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`Watcher Exit ${code}: ${out}`))));
  });
}

/** npm run key -- … (gibt bei create den Schlüssel auf stdout aus). */
function keyCli(args: string[]): Promise<string> {
  const child = tsx("src/cli/key.ts", args, { AB_DATA_DIR: dataDir });
  return new Promise((resolve, reject) => {
    let out = "";
    child.stdout!.on("data", (d) => (out += d));
    child.on("exit", (code) => (code === 0 ? resolve(out.trim()) : reject(new Error(`key ${args.join(" ")}: Exit ${code}`))));
  });
}

type ToolResult = { content: { type: string; text?: string; mimeType?: string }[]; isError?: boolean };

try {
  const url = await startServer();
  step(`Server läuft auf ${url}`);
  const program = new RelayClient({ baseUrl: url });

  const mcp = new Client({ name: "e2e-claude", version: "1.0.0" });
  await mcp.connect(
    new StdioClientTransport({
      command: process.execPath,
      args: ["--import", "tsx", "src/mcp/index.ts"],
      cwd: root,
      env: { ...process.env, AB_URL: url, AB_DATA_DIR: dataDir } as Record<string, string>,
      stderr: "ignore",
    }),
  );
  const call = async (name: string, args: Record<string, unknown> = {}) => {
    const r = (await mcp.callTool({ name, arguments: args })) as ToolResult;
    const text = r.content.map((c) => c.text ?? `[${c.type}]`).join("\n");
    assert(!r.isError, `${name}: ${text}`);
    console.log(`  ${name} → ${text.split("\n").join("\n    ")}`);
    return { r, text };
  };
  step("MCP-Server (stdio) verbunden");
  await call("inbox");

  // 1) Watcher starten, Programm legt Issue mit Datei an
  const woke = watchOnce(url);
  await new Promise((r) => setTimeout(r, 1000));
  const issue = await program.createIssue({
    title: "Import schlägt fehl",
    body: "Siehe Log im Anhang.",
    author: "programm:import",
    labels: ["import"],
    attachments: [{ name: "import.log", contentBase64: Buffer.from("Zeile 42: Spalte 'preis' fehlt\n").toString("base64") }],
  });
  const line = await woke;
  assert(line === `#${issue.id} [claude/opus] open „Import schlägt fehl“ – neu – Siehe Log im Anhang.`, `Watcher-Zeile: ${line}`);
  step(`Watcher geweckt: ${line}`);

  // 2) Claude: inbox → übernehmen → lesen → Datei holen → Kommentar mit Anhang → needs_human
  const inbox = await call("inbox");
  assert(inbox.text.includes(`#${issue.id} [claude/opus] open`), "inbox zeigt Issue");
  await call("issue_status", { issueId: issue.id, status: "in_progress" });
  const read = await call("issue_read", { issueId: issue.id });
  const fileId = /id ([0-9a-f]{12})/.exec(read.text)?.[1];
  assert(fileId, "Anhang-ID in issue_read");
  const file = await call("file_get", { id: fileId });
  assert(file.text.includes("Spalte 'preis' fehlt"), "Dateiinhalt gelesen");
  const patch = path.join(dataDir, "mapping.json");
  await writeFile(patch, JSON.stringify({ preis: "price_eur" }));
  await call("comment_add", { issueId: issue.id, body: "Vorschlag für das Spalten-Mapping anbei.", files: [{ path: patch }] });
  await call("request_human", { issueId: issue.id, reason: "Soll ich das Mapping so übernehmen?" });
  step("Claude-Simulation: Datei gelesen, Anhang kommentiert, needs_human gesetzt");

  // 3) Nutzer sieht „Für dich“, lädt den Anhang, antwortet und schließt
  const forMe = await program.listIssues({ forMe: true });
  assert(forMe.total === 1 && forMe.issues[0]!.status === "needs_human", "Für-dich-Ansicht");
  const { entries } = await program.getIssue(issue.id);
  const att = entries.flatMap((e) => e.attachments ?? []).find((a) => a.name === "mapping.json");
  assert(att, "Anhang von Claude vorhanden");
  const dl = await program.download(att.sha256);
  assert(dl.data.toString() === JSON.stringify({ preis: "price_eur" }), "Anhang-Download");
  await program.comment(issue.id, { author: "nils", body: "Passt, danke!" });
  const closed = await program.patchIssue(issue.id, { author: "nils", status: "closed" });
  assert(closed.status === "closed" && closed.closedBy === "nils", "Nutzer schließt");
  step("Nutzer: Anhang geladen, geantwortet, geschlossen");

  // 4) OpenAI-Adapter: Frage per openai-Paket, Antwort über MCP
  const openai = new OpenAI({ baseURL: `${url}/v1`, apiKey: "egal" });
  const answerer = (async () => {
    const w = await call("wait_for_new", { timeoutSec: 30 });
    const id = Number(/#(\d+)/.exec(w.text)?.[1]);
    await call("issue_read", { issueId: id });
    await call("comment_add", { issueId: id, body: "42" });
  })();
  const completion = await openai.chat.completions.create({
    model: "agent-board",
    user: "e2e",
    messages: [{ role: "user", content: "Was ist die Antwort auf alles?" }],
  });
  await answerer;
  assert(completion.choices[0]!.message.content === "42", `OpenAI-Antwort: ${completion.choices[0]!.message.content}`);
  step(`OpenAI-Client erhielt Antwort: ${completion.choices[0]!.message.content}`);

  // 5) MCP über HTTP (/mcp) + Client-Paket: Programm fragt per ask(), „Claude“ antwortet über HTTP-MCP
  const httpMcp = new Client({ name: "e2e-http", version: "1.0.0" });
  await httpMcp.connect(new StreamableHTTPClientTransport(new URL(`${url}/mcp`)));
  const stdioTools = (await mcp.listTools()).tools.map((t) => t.name).sort().join(",");
  const httpTools = (await httpMcp.listTools()).tools.map((t) => t.name).sort().join(",");
  assert(stdioTools === httpTools, `gleiche Tools über HTTP: ${httpTools}`);
  step(`MCP über HTTP verbunden (${httpTools.split(",").length} Tools wie stdio)`);
  await httpMcp.callTool({ name: "inbox", arguments: {} }); // setzt den Warte-Cursor dieser Sitzung
  const boardClient = new AgentBoardClient({ baseUrl: url, apiKey: "lokal", user: "programm:e2e" });
  const httpAnswer = (async () => {
    const r = (await httpMcp.callTool({ name: "wait_for_new", arguments: { timeoutSec: 30 } })) as ToolResult;
    const id = Number(/#(\d+)/.exec(r.content[0]?.text ?? "")?.[1]);
    await httpMcp.callTool({ name: "comment_add", arguments: { issueId: id, body: "Antwort über HTTP-MCP" } });
  })();
  const asked = await boardClient.ask("Client-Frage", "Hörst du mich?", { timeoutMs: 30_000 });
  await httpAnswer;
  assert(asked.text === "Antwort über HTTP-MCP", `Client-Antwort: ${asked.text}`);
  step(`Client-Paket: ask() → „${asked.text}“`);
  await httpMcp.close();

  // 6) Parallelbetrieb: zwei Issues mit Modell → ein Weckruf mit Liste; Subagenten übernehmen per issue_claim (Sperre)
  const woke2 = watchOnce(url);
  await new Promise((r) => setTimeout(r, 1000));
  const routine = await program.createIssue({ title: "Routine", body: "Format prüfen", author: "nils", model: "haiku" });
  const hard = await program.createIssue({ title: "Schwer", author: "nils", labels: ["model:sonnet"] });
  // (enthält auch die noch offenen Issues aus 4/5, deren Anlage der Watcher seit Schritt 1 nicht gemeldet hat)
  const list = (await woke2).split("\n");
  assert(
    list.includes(`#${routine.id} [claude/haiku] open „Routine“ – neu – Format prüfen`) && list.includes(`#${hard.id} [claude/sonnet] open „Schwer“ – neu`),
    `Watcher-Liste: ${list.join(" | ")}`,
  );
  step(`Watcher-Liste mit ${list.length} Issues in einem Weckruf`);
  const sub = `claude:haiku-${routine.id}`;
  await call("issue_claim", { issueId: routine.id, agent: sub });
  const dup = (await mcp.callTool({ name: "issue_claim", arguments: { issueId: routine.id, agent: "claude:opus-x" } })) as ToolResult;
  assert(dup.isError && (dup.content[0]?.text ?? "").includes("409"), "zweite Übernahme wird abgewiesen");
  await call("issue_read", { issueId: routine.id, fresh: true });
  await call("comment_add", { issueId: routine.id, body: "Format ok.", status: "closed", agent: sub });
  const done = (await program.getIssue(routine.id)).issue;
  assert(done.status === "closed" && done.closedBy === sub && !done.claim, "Subagent schließt, Sperre frei");
  step("Subagent: issue_claim (409 für zweiten), Kommentar + Schließen als claude:haiku-N");

  // 7) Provider: whisper-Issue lehnt issue_claim ab; danach Schlüssel mit Rollen + Worker für Provider echo
  const audio = await program.createIssue({ title: "Diktat", author: "nils", model: "whisper/large-v3" });
  const foreign = (await mcp.callTool({ name: "issue_claim", arguments: { issueId: audio.id, agent: "claude:opus-x" } })) as ToolResult;
  assert(foreign.isError && (foreign.content[0]?.text ?? "").includes("gehört zu Provider whisper"), "fremder Provider abgelehnt");
  step("issue_claim lehnt whisper-Issue ab (409 gehört zu Provider whisper)");

  const workerKey = await keyCli(["create", "--name", "echo-worker", "--role", "agent", "--providers", "echo"]);
  const appKey = await keyCli(["create", "--name", "e2e-app", "--role", "program"]);
  assert((await keyCli(["list"])).includes("echo-worker\tagent"), "key list");
  const anon = await new RelayClient({ baseUrl: url, apiKey: "" }).listIssues().then(
    () => 200,
    (e: { status: number }) => e.status,
  );
  assert(anon === 401, `ohne Schlüssel jetzt 401 (war ${anon})`);
  const app = new AgentBoardClient({ baseUrl: url, apiKey: appKey, user: "programm:e2e-app" });
  const own = await app.createIssue({ title: "Nur meins" });
  const noClaim = await app.claim(own.id).catch((e: unknown) => e);
  assert(noClaim instanceof AgentBoardError && noClaim.status === 403, "program darf nicht claimen");
  const impostor = await new AgentBoardClient({ baseUrl: url, apiKey: appKey, user: "claude" }).comment(own.id, "x").catch((e: unknown) => e);
  assert(impostor instanceof AgentBoardError && impostor.status === 403, "program kann nicht als claude schreiben");
  assert((await app.listIssues()).total === 1, "program sieht nur eigene Issues");
  step("Schlüssel (npm run key): program nur eigene Issues, kein claim, Autor geprüft");

  const echoDir = path.join(root, "examples/worker-echo");
  if (existsSync(path.join(echoDir, "node_modules/@nils/agent-board-client"))) {
    const worker = spawn(process.execPath, ["--import", "tsx", "src/worker.ts"], {
      cwd: echoDir,
      env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "", AB_URL: url, AB_WORKER_KEY: workerKey },
      stdio: ["ignore", "pipe", "pipe"],
    });
    children.push(worker);
    const echoed = await app.ask("Umdrehen", "Agent Board", { model: model("echo", "v1"), timeoutMs: 20_000 });
    assert(echoed.text === "Echo (echo/v1): draoB tnegA", `Worker-Antwort: ${echoed.text}`);
    step(`examples/worker-echo: „${echoed.text}“`);
  } else {
    console.log("  (examples/worker-echo nicht installiert – cd examples/worker-echo && npm install)");
  }

  await mcp.close();
  console.log("\nE2E erfolgreich.");
} catch (e) {
  failed = true;
  console.error(e instanceof Error ? e.message : e);
} finally {
  for (const c of children) if (c.exitCode === null) c.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 300));
  for (const c of children) if (c.exitCode === null) c.kill("SIGKILL");
  await rm(dataDir, { recursive: true, force: true });
  process.exit(failed ? 1 : 0);
}
