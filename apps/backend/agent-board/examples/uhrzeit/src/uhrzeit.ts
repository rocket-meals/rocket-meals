// Testprogramm: fragt das Agent Board nach Datum und Uhrzeit, wartet auf die Antwort,
// vergleicht sie mit der lokalen Uhr und schließt das Issue mit einem Dank.
// Start: AB_URL=http://127.0.0.1:4317 AB_API_KEY=… npm start   [-- --timeout <Sekunden>]
import { AgentBoardClient, AgentBoardError } from "@nils/agent-board-client";
import { checkAnswer } from "./zeit.ts";

const TOLERANCE_MIN = 5;

function fail(msg: string, code = 1): never {
  console.error(msg);
  process.exit(code);
}

const baseUrl = process.env.AB_URL;
const apiKey = process.env.AB_API_KEY;
if (!baseUrl || !apiKey) fail("Bitte AB_URL und AB_API_KEY setzen, z. B.\n  AB_URL=http://127.0.0.1:4317 AB_API_KEY=<key> npm start");

// Wartezeit: --timeout <s> oder UHRZEIT_TIMEOUT_SEC, Standard 10 min
const argIdx = process.argv.indexOf("--timeout");
const timeoutSec = Number(argIdx > 0 ? process.argv[argIdx + 1] : (process.env.UHRZEIT_TIMEOUT_SEC ?? 600));
if (!Number.isFinite(timeoutSec) || timeoutSec <= 0) fail("Ungültiges Timeout (Sekunden > 0 erwartet)");

const board = new AgentBoardClient({ baseUrl, apiKey, user: "programm:uhrzeit" });

// Strg+C: Warten abbrechen; zweites Strg+C beendet sofort
const ac = new AbortController();
process.on("SIGINT", () => {
  if (ac.signal.aborted) process.exit(130);
  ac.abort();
});

/** Issue mit Hinweis schließen, ohne den Abbruch zu blockieren (max. 5 s). */
async function closeQuietly(id: number, comment: string) {
  try {
    await Promise.race([board.close(id, comment), new Promise((r) => setTimeout(r, 5000))]);
  } catch {
    // egal – das Issue bleibt dann offen
  }
}

let issueId: number | undefined;
try {
  const issue = await board.createIssue({
    title: "Welcher Tag ist heute und wie spät ist es?",
    body: "Bitte antworte mit dem heutigen Datum (Wochentag, Tag, Monat, Jahr) und der aktuellen Uhrzeit im Format HH:MM (Ortszeit).",
    labels: ["test"],
  });
  issueId = issue.id;
  console.log(`Issue #${issue.id} angelegt – warte auf Antwort (max. ${Math.round(timeoutSec / 60 * 10) / 10} min, Strg+C bricht ab) …`);

  const reply = await board.waitForReply(issue.id, { afterSeq: issue.lastSeq, timeoutMs: timeoutSec * 1000, signal: ac.signal });
  const author = reply.comments[0]?.author ?? "?";
  console.log(`\nAntwort von ${author}:\n${reply.text}\n`);

  const c = checkAnswer(reply.text);
  if (c.found === undefined || c.deviationMin === undefined) {
    console.log(`Uhrzeit: keine Angabe im Format HH:MM gefunden (lokal ${c.local}).`);
  } else {
    const abs = Math.abs(c.deviationMin);
    const verdict = abs <= TOLERANCE_MIN ? "passt" : "weicht deutlich ab";
    console.log(`Uhrzeit: Antwort ${c.found}, lokal ${c.local} → Abweichung: ${c.deviationMin > 0 ? "+" : ""}${c.deviationMin} min (${verdict}, Toleranz ±${TOLERANCE_MIN} min)`);
  }
  console.log(`Datum: ${c.dateOk ? "passt zu heute" : "heutiges Datum nicht erkannt"}`);

  await board.close(issue.id, "Danke für die Antwort! (Programm „uhrzeit“)");
  console.log(`Issue #${issue.id} geschlossen.`);
} catch (e) {
  if (e instanceof AgentBoardError && e.code === "aborted") {
    if (issueId) await closeQuietly(issueId, "Programm „uhrzeit“ wurde abgebrochen – Antwort wird nicht mehr benötigt.");
    fail(`\nAbgebrochen${issueId ? ` – Issue #${issueId} geschlossen` : ""}.`, 130);
  }
  if (e instanceof AgentBoardError && e.code === "timeout") {
    if (issueId) await closeQuietly(issueId, `Keine Antwort innerhalb von ${timeoutSec} s – Programm „uhrzeit“ beendet.`);
    fail(`Keine Antwort innerhalb von ${timeoutSec} s${issueId ? ` – Issue #${issueId} geschlossen` : ""}.`, 2);
  }
  fail(`Fehler: ${e instanceof Error ? e.message : String(e)}`);
}
