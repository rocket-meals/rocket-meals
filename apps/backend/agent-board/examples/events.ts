// Beispiel: alle Änderungen live mitlesen (SSE, baut die Verbindung bei Abbrüchen selbst wieder auf). Strg+C beendet.
// Start: npx tsx examples/events.ts
import { AgentBoardClient } from "../client/src/index.ts";

const board = new AgentBoardClient({ baseUrl: process.env.AB_URL ?? "http://127.0.0.1:4317", apiKey: process.env.AB_API_KEY ?? "lokal" });
const ac = new AbortController();
process.once("SIGINT", () => ac.abort());

await board.events(
  (ev) => {
    for (const e of ev.entries) {
      const what = e.type === "comment" ? `Kommentar: ${e.body?.slice(0, 80)}` : e.event?.kind;
      console.log(`#${ev.issue.id} [${ev.issue.status}] ${e.author} – ${what}`);
    }
  },
  { signal: ac.signal, onError: (err) => console.error(`Verbindung weg (${String(err)}), neuer Versuch …`) },
);
