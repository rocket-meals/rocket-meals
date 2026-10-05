// Beispiel: Frage stellen und auf die Antwort warten – abbrechbar mit Strg+C (AbortController) und mit Zeitlimit.
// Start: npx tsx examples/ask.ts "Deine Frage"
import { AgentBoardClient, AgentBoardError } from "../client/src/index.ts";

const board = new AgentBoardClient({
  baseUrl: process.env.AB_URL ?? "http://127.0.0.1:4317",
  apiKey: process.env.AB_API_KEY ?? "lokal",
  user: "programm:frage",
});

const ac = new AbortController();
process.once("SIGINT", () => ac.abort());

const question = process.argv.slice(2).join(" ") || "Welche drei Punkte sollte ich beim Refactoring zuerst angehen?";
try {
  const r = await board.ask("Frage aus examples/ask.ts", question, { signal: ac.signal, timeoutMs: 15 * 60_000, labels: ["frage"] });
  console.log(`#${r.issueId} ${r.comments[0]?.author}:\n${r.text}`);
  await board.close(r.issueId, "Danke, beantwortet.");
} catch (e) {
  if (e instanceof AgentBoardError && e.code === "aborted") console.error("Abgebrochen – das Issue bleibt offen und kann später beantwortet werden.");
  else if (e instanceof AgentBoardError && e.code === "timeout") console.error("Keine Antwort innerhalb von 15 min.");
  else throw e;
}
