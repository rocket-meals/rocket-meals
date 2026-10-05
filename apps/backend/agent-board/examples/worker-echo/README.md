# worker-echo – Worker für einen eigenen Provider

Zeigt, wie ein eigener Dienst (z. B. Whisper, Ollama) Issues vom Agent Board abarbeitet – **ohne** Claude. Der Worker ist für das Modell `echo/v1` zuständig (Provider `echo`): Er wartet per Long-Poll auf offene Issues dieses Providers, übernimmt sie mit `claim` (Sperre), antwortet mit dem **umgedrehten Text** und schließt das Issue. Wirft die Verarbeitung einen Fehler, setzt `runWorker` das Issue auf `needs_human` (der Mensch sieht es unter „Für mich“).

Claude fasst diese Issues nicht an: Watcher und MCP-Tools filtern standardmäßig auf Provider `claude`, `issue_claim` lehnt fremde Provider ab.

```bash
# im agent-board-Ordner: agent-Schlüssel nur für Provider echo anlegen (wird EINMAL ausgegeben)
npm run key -- create --name echo-worker --role agent --providers echo

cd examples/worker-echo
npm install                       # bindet den Client per "file:../../client" ein
AB_URL=http://127.0.0.1:4317 AB_WORKER_KEY=<schlüssel> npm start
```

Issue für den Worker anlegen, z. B. per CLI oder Client:

```bash
npm run cli -- new "Bitte umdrehen" "Hallo Welt" --model echo/v1     # (im agent-board-Ordner)
```

```ts
import { AgentBoardClient, model } from "@nils/agent-board-client";
await board.ask("Echo", "Hallo Welt", { model: model("echo", "v1") }); // Antwort: „Echo (echo/v1): tleW ollaH“
```

- Kern: `runWorker({ baseUrl, apiKey, provider: "echo/v1", agent: "echo-worker", handle, concurrency })` aus `@nils/agent-board-client`.
- `handle(issue, ctx)`: Rückgabe-Text = Abschlusskommentar; `ctx.comment`, `ctx.attach`, `ctx.download`, `ctx.requestHuman`, `ctx.close`.
- Text `fehler` löst absichtlich einen Fehler aus (→ `needs_human`).
- Whisper: siehe Kommentar in `src/worker.ts` (Audio-Anhang laden, transkribieren, Transkript anhängen).
- Automatischer Test: `tests/worker-echo.test.ts` im Hauptprojekt.
