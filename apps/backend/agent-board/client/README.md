# @nils/agent-board-client

TypeScript-Client für das lokale Agent Board (`agent-board`). Damit legen eigene Programme Issues an, hängen Dateien an, warten auf Claudes Antwort oder lesen alle Änderungen live mit.

- keine Laufzeit-Abhängigkeiten (globales `fetch`), läuft unter **Node ≥ 18** und im **Browser**
- ESM + Typdefinitionen (`dist/`), Typen gespiegelt aus dem Server-Datenmodell
- Long-Polls werden automatisch in 240-s-Stücke geteilt (Node-`fetch` bricht sonst nach 300 s ab)

## Einbinden in eigene Projekte

Das Paket wird **nicht veröffentlicht** (`npm publish` ist gesperrt). `dist/` liegt im Repo; nach Änderungen an `src/` im Ordner `client/` `npm run build` ausführen.

```bash
# 1) direkt aus dem Ordner (npm legt einen Symlink an – Änderungen sind sofort sichtbar)
npm i /Users/nbaumgartner/Desktop/agent-board/client

# 2) relativ in package.json
#    "dependencies": { "@nils/agent-board-client": "file:../agent-board/client" }

# 3) als Tarball (feste Version, z. B. für Docker-Builds anderer Projekte)
cd /Users/nbaumgartner/Desktop/agent-board/client && npm pack   # → nils-agent-board-client-1.0.0.tgz
npm i /pfad/zu/nils-agent-board-client-1.0.0.tgz
```

**Per git:** npm kann keine Unterordner eines Repos installieren. Entweder das Repo klonen und Variante 1/2 nutzen, oder mit pnpm (≥ 9): `pnpm add "git+ssh://git@<host>/<repo>.git#path:client"`.

## Schnellstart

```ts
import { AgentBoardClient, Model, model } from "@nils/agent-board-client";

const board = new AgentBoardClient({
  baseUrl: "http://127.0.0.1:4317",            // Pflicht
  apiKey: process.env.AB_PROGRAM_KEY ?? "lokal", // Pflicht; program-Schlüssel (npm run key -- create --name import --role program)
  user: "programm:import",                     // Autor; muss zum Schlüssel passen (program "import" → "programm:import[:…]")
  timeoutMs: 30_000,                           // für normale Anfragen
});

const r = await board.ask("Frage", "Ist die Spaltenbelegung plausibel?", { timeoutMs: 10 * 60_000, model: Model.CLAUDE.HAIKU });
console.log(r.text, r.attachments);
await board.createIssue({ title: "Diktat", attachments: [{ file: "./diktat.m4a" }], model: model("whisper", "large-v3") }); // eigener Provider
```

## Modelle

Jedes Issue hat `model = "<provider>/<name>"` und das abgeleitete Feld `provider`. Issues mit Provider `claude` bearbeitet Claude, andere Provider ihr eigener Worker (siehe `runWorker`).

```ts
export const Model = { CLAUDE: { OPUS: "claude/opus", SONNET: "claude/sonnet", HAIKU: "claude/haiku" } } as const;
export type ClaudeModel = (typeof Model.CLAUDE)[keyof typeof Model.CLAUDE];  // "claude/opus" | "claude/sonnet" | "claude/haiku"
export type ModelId = ClaudeModel | `${string}/${string}`;
export function model(provider: string, name: string): ModelId;              // model("ollama", "qwen2.5vl"); wirft bei ungültigen Zeichen
```

| Konstante | Wert | Modell |
|---|---|---|
| `Model.CLAUDE.OPUS` (Standard) | `claude/opus` | Claude Opus 5.5 |
| `Model.CLAUDE.SONNET` | `claude/sonnet` | Claude Sonnet 5.5 |
| `Model.CLAUDE.HAIKU` | `claude/haiku` | Claude Haiku 4.5 |

Erlaubt ist `^[a-z0-9-]+/[a-z0-9._-]+$`; der Server nimmt alte Werte (`opus`, `sonnet`, `haiku`, Label `model:haiku`) weiter an und speichert sie als `claude/<x>`. Weitere Helfer: `normalizeModel(raw)`, `providerOf(model)`, `MODEL_NAMES`, `DEFAULT_MODEL`.

**Warum kein TypeScript-`enum`?** `Model.CLAUDE.HAIKU` liest sich wie ein Enum, hat aber den Literaltyp `"claude/haiku"`: Strings und Konstanten sind frei austauschbar, eigene Provider passen in denselben Typ `ModelId`. Ein echtes `enum` wäre nominal (`"claude/haiku"` ist dann nicht dem Enum-Typ zuweisbar), erzeugt Laufzeitcode und ist mit Nodes Type-Stripping bzw. `erasableSyntaxOnly` nicht erlaubt – daher bewusst weggelassen.

## Worker für eigene Provider (`runWorker`)

```ts
import { runWorker } from "@nils/agent-board-client";

const ac = new AbortController();
process.once("SIGINT", () => ac.abort());
await runWorker({
  baseUrl: "http://127.0.0.1:4317",
  apiKey: process.env.AB_WORKER_KEY!,   // agent-Schlüssel: npm run key -- create --name whisper-worker --role agent --providers whisper
  provider: "whisper",                  // oder genaues Modell "whisper/large-v3"
  agent: "whisper-worker",              // Autorname (passend zum Schlüssel)
  concurrency: 2,
  signal: ac.signal,
  handle: async (issue, ctx) => {
    const audio = issue.attachments.find((a) => a.mime.startsWith("audio/"));
    if (!audio) return ctx.requestHuman("Keine Audio-Datei angehängt");
    const { data } = await ctx.download(audio.sha256);
    const text = await transcribe(data, issue.model.split("/")[1]!);       // eigener Dienst
    await ctx.attach(new TextEncoder().encode(text), { name: "transkript.txt" });
    return "Transkript anbei.";                                              // → Abschlusskommentar, Issue geschlossen
  },
});
```

Ablauf: offene Issues des Providers holen → `claim` (409 = schon übernommen/fremder Provider → überspringen) → `handle(issue, ctx)` → Rückgabetext schließt das Issue (ohne Rückgabe: „Erledigt.“). Wirft `handle`, setzt der Worker `needs_human` mit der Fehlermeldung. Gewartet wird per Long-Poll (`/v1/agent/wait?provider=…`, 0 Last beim Warten). `ctx`: `issue`, `entries`, `board`, `signal`, `comment`, `attach`, `download`, `requestHuman`, `close`. Falscher Schlüssel (401/403) beendet `runWorker` mit `AgentBoardError`. Vollständiges Beispiel: `examples/worker-echo/`.

## API

| Methode | Ergebnis | Zweck |
|---|---|---|
| `listIssues({ status?, label?, forMe?, q?, since?, limit?, provider? })` | `{ issues, total, cursor }` | Liste; `status`: `open` · `in_progress` · `needs_human` · `closed` · `active` · `all`; `provider`: z. B. `"claude"`, `"whisper,ollama"`, `"all"` |
| `getIssue(id)` | `{ issue, entries, cursor }` | Issue mit Verlauf |
| `createIssue({ title, body?, labels?, attachments?, assignee?, model? })` | `Issue` | Anhänge: `{ file, name?, mime? }` (wird hochgeladen) oder `{ sha256 }`; `model`: `Model.CLAUDE.OPUS` (Standard) · `Model.CLAUDE.SONNET` · `Model.CLAUDE.HAIKU` · `model("whisper", "large-v3")` |
| `comment(id, body, attachments?, { status?, reason? })` | `{ comment, issue }` | Kommentar, optional mit Statuswechsel |
| `setStatus(id, status, reason?)` | `Issue` | Statuswechsel |
| `setModel(id, model)` | `Issue` | Bearbeitungsmodell ändern |
| `claim(id, agent?, { provider?, force? })` / `release(id, agent?, reason?)` | `Issue` | Übernahme mit Sperre (nur agent-/admin-Schlüssel; 409, wenn ein anderer Agent aktiv ist oder – mit `provider` – das Issue einem anderen Provider gehört) / Freigabe; `agent` Standard = `user` |
| `agentWait(afterSeq, { timeoutSec?, provider?, signal? })` | `{ changed, cursor, waiting }` | Long-Poll für Agenten/Worker |
| `addLabels(id, labels)` / `removeLabels(id, labels)` | `Issue` | Labels |
| `close(id, comment?)` / `reopen(id)` | `Issue` | Schließen (optional mit Abschlusskommentar) / Wiedereröffnen |
| `requestHuman(id, reason)` | `{ comment, issue }` | `needs_human` + Grund (erscheint beim Menschen unter „Für mich“) |
| `uploadFile(file, name?, mime?)` | `Attachment` | `file`: `Blob`/`File`, `Uint8Array`, `ArrayBuffer` oder Pfad (nur Node) |
| `downloadFile(sha)` | `Uint8Array` | Original laden (sha256 oder Präfix ≥ 8 Zeichen; program-Schlüssel: nur voller sha256) |
| `downloadFileWithMeta(sha, { preview? })` | `{ data, mime, name }` | mit Typ/Name; `preview: true \| 1200` liefert JPEG-Vorschau (HEIC, große Fotos) |
| `fileUrl(sha, { download?, preview? })` | `string` | URL mit `?token=` (z. B. für `<img>`) |
| `waitForReply(id, { afterSeq?, timeoutMs?, signal?, from? })` | `Reply` | Long-Poll, bis ein anderer Autor (oder genau `from`) kommentiert |
| `ask(title, body, { labels?, model?, attachments?, timeoutMs?, signal?, from? })` | `Reply & { issue }` | `createIssue` + `waitForReply` |
| `events(onEvent, { signal?, after?, onError?, reconnectMs? })` | `Promise<void>` | SSE aller Änderungen, Auto-Reconnect, endet bei `signal.abort()` |
| `info()` / `health()` | `BoardInfo` / `boolean` | Server-Infos inkl. `key: { name, role, providers?, author? }` / erreichbar? |
| `runWorker({ baseUrl, apiKey, provider, agent, handle, concurrency?, signal? })` | `Promise<void>` | Worker-Schleife für eigene Provider (siehe oben) |

`Reply` = `{ issueId, text, attachments, comments, cursor }` – `cursor` als `afterSeq` für die nächste Runde verwenden.

### Fehler

Alle Fehler sind `AgentBoardError` mit `status` (HTTP-Status, `0` ohne Antwort) und `code`:

| code | Bedeutung |
|---|---|
| `authentication_error` | falscher/fehlender Schlüssel (401) |
| `permission_error` | Schlüssel darf das nicht (403): fremdes Issue, falsche Rolle/Provider, Autorname passt nicht |
| `rate_limit_error` | zu viele Fehlversuche von dieser IP (429, `Retry-After`) |
| `not_found_error` | Issue/Datei gibt es nicht (404) |
| `invalid_request_error` | ungültige Eingabe, z. B. Statusregel verletzt (400/409/413) |
| `timeout` | `timeoutMs` abgelaufen (Anfrage oder `waitForReply`) |
| `aborted` | per `AbortSignal` abgebrochen |
| `network_error` | Server nicht erreichbar |
| `config_error` | `baseUrl`/`apiKey` fehlen, Pfad im Browser |

## Beispiele

### Programm meldet einen Fehler als Issue (mit Log-Datei)

```ts
try {
  await runImport();
} catch (err) {
  const issue = await board.createIssue({
    title: `Import fehlgeschlagen: ${(err as Error).message}`,
    body: "Bitte Ursache ansehen. Log anbei.",
    labels: ["import", "bug"],
    attachments: [{ file: "./logs/import.log" }, { file: new TextEncoder().encode(String((err as Error).stack)), name: "stack.txt" }],
  });
  console.error(`Gemeldet als #${issue.id}`);
}
```

### Programm fragt und wartet auf die Antwort

```ts
const issue = await board.createIssue({ title: "Mapping prüfen", body: "Passt preis → price_eur?", attachments: [{ file: "./mapping.json" }] });
const reply = await board.waitForReply(issue.id, { afterSeq: issue.lastSeq, from: "claude", timeoutMs: 30 * 60_000 });
console.log(reply.text);
for (const a of reply.attachments) await writeFile(a.name, await board.downloadFile(a.sha256));
await board.close(issue.id, "Übernommen, danke.");
```

### Abbruch per AbortController

```ts
const ac = new AbortController();
process.once("SIGINT", () => ac.abort());          // Strg+C
setTimeout(() => ac.abort(), 5 * 60_000);           // oder eigenes Zeitlimit

try {
  const r = await board.ask("Frage", "…", { signal: ac.signal });
  console.log(r.text);
} catch (e) {
  if (e instanceof AgentBoardError && e.code === "aborted") console.log("abgebrochen – Issue bleibt offen");
  else throw e;
}
```

### Live mitlesen (SSE)

```ts
const ac = new AbortController();
await board.events((ev) => console.log(`#${ev.issue.id} ${ev.issue.status}`, ev.entries.length), { signal: ac.signal });
```

### Im Browser

```ts
const board = new AgentBoardClient({ baseUrl: "http://192.168.1.20:4317", apiKey: key, user: "web:tool" });
const att = await board.uploadFile(input.files[0]);    // File aus <input type="file">
img.src = board.fileUrl(att.sha256, { preview: true }); // HEIC → JPEG-Vorschau
```

Hinweis: Der Board-Server setzt keine CORS-Header – im Browser also nur von der gleichen Herkunft (z. B. Seiten, die der Server selbst ausliefert) oder über einen Proxy.

## Entwicklung

```bash
npm run build       # tsc → dist/ (ESM + .d.ts)
npm run typecheck
```

Tests laufen im Hauptprojekt (`npx vitest run tests/client.test.ts`) gegen einen echten Server auf Port 0.
