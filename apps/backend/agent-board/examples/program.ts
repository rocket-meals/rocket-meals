// Beispiel: Programm meldet einen Fehler als Issue (mit Log-Datei) und wartet auf Claudes Antwort.
// Start: npx tsx examples/program.ts   (AB_URL / AB_API_KEY aus der Umgebung)
// In eigenen Projekten: import { AgentBoardClient } from "@nils/agent-board-client";
import { writeFile } from "node:fs/promises";
import { AgentBoardClient } from "../client/src/index.ts";

const board = new AgentBoardClient({
  baseUrl: process.env.AB_URL ?? "http://127.0.0.1:4317",
  apiKey: process.env.AB_API_KEY ?? "lokal", // Server ohne AB_API_KEY akzeptiert jeden Wert
  user: "programm:import",
});

// Simulierter Fehler mit Log
const logFile = "/tmp/ab-import.log";
await writeFile(logFile, "12:00:01 Start Import\n12:00:02 Zeile 42: Spalte 'preis' fehlt\n");

const issue = await board.createIssue({
  title: "Import schlägt fehl",
  body: "Der nächtliche Import bricht in Zeile 42 ab. Log anbei – was ist die Ursache?",
  labels: ["import", "bug"],
  attachments: [{ file: logFile }, { file: new TextEncoder().encode("name;preis\nApfel;1,20\n"), name: "beispiel.csv" }],
});
console.log(`Issue #${issue.id} angelegt – warte auf Antwort (max. 30 min) …`);

const reply = await board.waitForReply(issue.id, { afterSeq: issue.lastSeq, timeoutMs: 30 * 60_000 });
console.log(`${reply.comments[0]?.author}: ${reply.text}`);
for (const a of reply.attachments) {
  const data = await board.downloadFile(a.sha256);
  console.log(`  Anhang ${a.name} (${data.length} B)`);
}
