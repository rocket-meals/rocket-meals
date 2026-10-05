// Beispiel-Worker für einen eigenen Provider: übernimmt Issues mit model "echo/v1" und antwortet mit dem
// umgedrehten Text. So würde z. B. ein Whisper-Dienst (model "whisper/large-v3") angebunden.
// Start: AB_URL=http://127.0.0.1:4317 AB_WORKER_KEY=<agent-Schlüssel, --providers echo> npm start
import { model, runWorker } from "@nils/agent-board-client";
import { reverseText } from "./echo.ts";

/** Modell, für das dieser Worker zuständig ist (Provider "echo", Name "v1"). */
export const ECHO_MODEL = model("echo", "v1");

const baseUrl = process.env.AB_URL;
const apiKey = process.env.AB_WORKER_KEY;
if (!baseUrl || !apiKey) {
  console.error(
    "Bitte AB_URL und AB_WORKER_KEY setzen. Schlüssel anlegen (im agent-board-Ordner):\n" +
      "  npm run key -- create --name echo-worker --role agent --providers echo",
  );
  process.exit(1);
}
const agent = process.env.AB_WORKER_NAME ?? "echo-worker";

const ac = new AbortController();
process.on("SIGINT", () => ac.abort());
process.on("SIGTERM", () => ac.abort());

console.log(`Worker ${agent} wartet auf Issues mit model ${ECHO_MODEL} (Strg+C beendet) …`);
try {
  await runWorker({
    baseUrl,
    apiKey,
    provider: ECHO_MODEL,
    agent,
    concurrency: 2,
    signal: ac.signal,
    log: (msg) => console.log(msg),
    handle: async (issue, ctx) => {
      // Text: letzter Kommentar eines anderen, sonst der Issue-Text (bzw. Titel)
      const last = ctx.entries.filter((e) => e.type === "comment" && e.author !== agent).at(-1);
      const input = (last?.body ?? issue.body) || issue.title;
      if (input.trim().toLowerCase() === "fehler") throw new Error("absichtlicher Fehler (Test)");

      // Hier würde ein Whisper-Worker die Audio-Datei transkribieren, etwa:
      //   const audio = issue.attachments.find((a) => a.mime.startsWith("audio/"));
      //   const { data } = await ctx.download(audio!.sha256);
      //   const text = await whisper.transcribe(data, { model: issue.model.split("/")[1] });
      //   await ctx.attach(new TextEncoder().encode(text), { name: "transkript.txt", comment: "Transkript" });
      const output = reverseText(input);
      return `Echo (${issue.model}): ${output}`; // Rückgabe = Abschlusskommentar, Issue wird geschlossen
    },
    onError: (e, issue) => console.error(`Fehler${issue ? ` bei #${issue.id}` : ""}: ${e instanceof Error ? e.message : String(e)}`),
  });
  console.log("Worker beendet.");
} catch (e) {
  console.error(`Abbruch: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(1);
}
