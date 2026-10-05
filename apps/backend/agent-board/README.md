# Agent Board – lokales Issue-Board für Claude

Ein kleines, lokales Issue-Board (ähnlich GitHub Issues), das Claude in einer Claude-Code-Sitzung abarbeiten kann. Du selbst und deine eigenen Programme legen Issues an, kommentieren und hängen Dateien an; Claude liest sie über MCP, antwortet, hängt Ergebnisse an, schließt erledigte Issues oder meldet sich bei dir, wenn es nicht weiterkommt. Eine schlanke Web-Oberfläche (fürs iPhone gemacht) zeigt alles an.

## Einsatzzweck

Das Projekt ist **kein API-Ersatz**. Es ist ein persönliches Entwicklungswerkzeug für eigene Projekte zu Hause: Du sitzt selbst in der Claude-Sitzung dabei und probierst aus, wie gut sich KI in deine eigenen Programme einbinden lässt – Prototyping mit Mensch in der Schleife. Es ist nicht für den Betrieb für Dritte und nicht für unbeaufsichtigte Automatisierung gedacht. Es gelten die Nutzungsbedingungen des jeweiligen KI-Anbieters.

## Architektur

```
  Deine Programme / Skripte          iPhone / Browser
  (REST, curl, openai-Paket)         (Web-Oberfläche  /)
            │                                │
            ▼                                ▼
  ┌──────────────────────────────────────────────────────┐
  │  Board-Server  src/server   127.0.0.1:4317           │
  │  REST /v1/issues … · Dateien /v1/files · SSE /v1/events │
  │  Long-Poll /v1/issues/:id/wait · /v1/agent/wait       │
  │  OpenAI-Adapter /v1/chat/completions                 │
  │  MCP über HTTP /mcp (Streamable HTTP, Bearer)        │
  │  JSON-Dateien in ./data (atomar, Mutex)              │
  └───────────▲───────────────────────────▲──────────────┘
              │ HTTP                      │ HTTP (Long-Poll)
  ┌───────────┴───────────┐   ┌───────────┴─────────────┐
  │ MCP-Server (stdio)    │   │ CLI-Watcher             │
  │ src/mcp – Tools für   │   │ npm run watch – endet,  │
  │ Claude                │   │ sobald es Neues gibt    │
  └───────────▲───────────┘   └───────────▲─────────────┘
              └──────── Claude Code ──────┘
                 (Watcher läuft per run_in_background)
```

**Datenmodell**

- **Issue** `{id (#1, #2 …), title, body, status, labels[], model, author, assignee?, claim?, createdAt, updatedAt, closedAt?, closedBy?, attachments[]}`; Status: `open` · `in_progress` · `needs_human` · `closed`; `model` = `"<provider>/<name>"` (Standard `claude/opus`; z. B. `claude/haiku`, `whisper/large-v3`, `ollama/qwen2.5vl`) plus abgeleitetes Feld `provider`; `claim` = Sperre `{agent, since, lastActivity}`
- **Verlauf**: Kommentare `{seq, issueId, author, body, createdAt, attachments[]}` und Ereignisse (Status, Labels, Zuweisung, Erwähnung, Bearbeitung) mit **globaler, monotoner `seq`** → Delta-Abfragen über `since`/`after`.
- **Dateien** unter `data/files/<sha256>` (Metadaten name, mime, size, ggf. width/height und `preview`), Limit `AB_MAX_FILE_MB` (Standard 25 MB). HEIC-Fotos und große Bilder bekommen eine abgeleitete JPEG-Vorschau (siehe „HEIC/Fotos“).

**Regeln**

- **Zuständigkeit nach Provider:** Issues mit `provider` `claude` bearbeitet Claude (Subagent mit dem Modellnamen nach dem Schrägstrich), alle anderen ihr eigener Worker (`runWorker`, siehe „Provider & eigene Worker“). Watcher, MCP-Listen und `issue_claim` sind standardmäßig auf `claude` beschränkt.
- `in_progress` durch Claude weist das Issue automatisch Claude zu. Als Agent zählt jeder Autor `claude` bzw. `claude:<x>`/`claude-<x>` (Subagenten, z. B. `claude:sonnet-7`) – deren Einträge wecken den Watcher nicht.
- Claude schließt nur mit Abschlusskommentar. **Du hast das letzte Wort:** Hast du (oder ein Programm) ein Issue wiedereröffnet, darf Claude es nicht mehr schließen (HTTP 409) und muss dich fragen.
- `needs_human` (oder eine `@nils`-Erwähnung) markiert ein Issue für dich. Es gibt keine Push-Mitteilungen: Wer etwas wissen will, fragt selbst über die API (Long-Poll `/v1/issues/:id/wait`, SSE `/v1/events`, Client `events`/`waitForReply`, Liste `?for=me`). Kommentierst du ein `needs_human`-Issue, geht es automatisch auf `open` zurück an Claude.
- Die Ansicht **„Für mich“** zeigt alle `needs_human`-Issues und unbeantwortete Erwähnungen.

## Start

Voraussetzung: Node 22 (z. B. via nvm).

```bash
npm install
npm start            # Board-Server auf http://127.0.0.1:4317 (Web-Oberfläche unter /)
```

**MCP in Claude Code einbinden:** Im Projektordner liegt `.mcp.json` – Claude Code fragt beim Öffnen des Ordners, ob der Server `agent-board` aktiviert werden soll. Der Schlüssel steht dort **nicht im Klartext**: Claude Code ersetzt `${AB_AGENT_KEY:-}` und `${AB_URL:-…}` beim Start aus der Umgebung (unterstützt in `command`, `args`, `env`, `url`, `headers`; ohne `:-` würde eine fehlende Variable als wörtlicher Text `${…}` übergeben). Also vor `claude` z. B. `export AB_AGENT_KEY=…` (Shell-Profil, Keychain, direnv – nicht in Chats/Prompts). Alternativ für andere Ordner:

```bash
claude mcp add agent-board -e AB_URL=http://127.0.0.1:4317 -e 'AB_AGENT_KEY=${AB_AGENT_KEY}' -- npx tsx /pfad/zu/agent-board/src/mcp/index.ts
```

Danach in Claude Code z. B.: „Arbeite das Board ab“ (oder MCP-Prompt `/relay`). `CLAUDE.md` beschreibt Claude den Ablauf.

### Konfiguration (Umgebungsvariablen)

| Variable | Standard | Bedeutung |
|---|---|---|
| `AB_HOST` / `AB_PORT` | `127.0.0.1` / `4317` | Bindung des Servers |
| `AB_DATA_DIR` | `./data` | Datenordner (auch Watcher-Cursor `data/.agent-cursor`) |
| `AB_API_KEY` | – | einzelner **admin**-Schlüssel (abwärtskompatibel); Schlüssel sind Pflicht, sobald nicht nur an localhost gebunden |
| `AB_KEYS` | – | weitere Schlüssel als JSON (z. B. Docker): `[{"name":"claude-mac","role":"agent","providers":["claude"],"hash":"<sha256>"}]` (`key` statt `hash` erlaubt) |
| `AB_AGENT_KEY` | – | Schlüssel für Claude (MCP stdio, Watcher; Vorrang vor `AB_API_KEY`) |
| `AB_AUTH_FAIL_LIMIT` | `10` | Fehlversuche pro IP und Minute, danach HTTP 429 |
| `AB_PROVIDER` | `claude` | Standard-Provider des MCP-Servers (Filter, `issue_claim`) |
| `AB_USER` | `nils` | dein Name (Erwähnungen `@nils`, „Für mich“) |
| `AB_AGENT_NAME` | `claude` | Autorname des Agenten (Server und MCP gleich setzen) |
| `AB_MAX_FILE_MB` | `25` | Größenlimit pro Datei |
| `AB_PUBLIC_URL` | – | Basis-URL für Download-Links im HTTP-MCP, z. B. `http://192.168.1.20:4317` |
| `AB_COMPLETION_TIMEOUT` | `600` | Wartezeit des OpenAI-Adapters in Sekunden |
| `AB_CLAIM_TTL_MIN` | `30` | Sperre (`claim`) läuft nach so vielen Minuten ohne Aktivität des Inhabers ab |
| `AB_URL` | `http://127.0.0.1:4317` | Server-Adresse für MCP-Server und CLI |
| `AB_IN_CONTAINER` | – | setzt das Docker-Image (Hinweistexte beim Start) |

### Vom iPhone aus (WLAN)

```bash
AB_HOST=0.0.0.0 AB_API_KEY=$(openssl rand -hex 16) AB_PUBLIC_URL=http://<mac-ip>:4317 npm start
```

Der Server zeigt die LAN-Adressen an. Auf dem iPhone die Adresse öffnen, einmal den API-Key eingeben (wird nur im Browser gespeichert), optional „Zum Home-Bildschirm“. Über „Datei/Foto“ lassen sich auch Fotos direkt aus der Kamera anhängen. Ohne `AB_API_KEY` verweigert der Server die Bindung an andere Adressen als localhost. Neues für dich zeigt die Ansicht „Für mich“.

## Schnittstellen

### REST (für Programme)

| Methode & Pfad | Zweck |
|---|---|
| `POST /v1/issues` | Issue anlegen – JSON `{title, body?, labels?, model?, author?, attachments?}` oder multipart (`title`, `body`, `labels`, `model`, `author`, `files`) |
| `GET /v1/issues?status=&label=&for=me&q=&since=&provider=` | Liste; `status`: `open`, `in_progress`, `needs_human`, `closed`, `active`, `all`; `provider`: `claude`, `whisper,ollama` oder `all` (Standard: alle sichtbaren) |
| `GET /v1/issues/:id` | Issue + kompletter Verlauf |
| `GET /v1/issues/:id/timeline?since=<seq>` | nur neue Einträge |
| `POST /v1/issues/:id/comments` | Kommentar `{body, author?, attachments?, status?, reason?}` (auch multipart) |
| `PATCH /v1/issues/:id` | `{author, status?, reason?, title?, body?, labels?, addLabels?, removeLabels?, assignee?, model?}` |
| `POST /v1/issues/:id/claim` | `{agent, provider?, force?}` → atomar `in_progress` + `assignee` + Sperre; **409**, wenn ein anderer Agent eine aktive Sperre hält, das Issue geschlossen ist oder (mit `provider`) zu einem anderen Provider gehört – außer `force` |
| `POST /v1/issues/:id/release` | `{agent, reason?}` → Sperre freigeben, `in_progress` → `open` (409 für Nicht-Inhaber) |
| `GET /v1/issues/:id/wait?after=&timeout=&notAuthor=&comments=1` | Long-Poll, bis neue (passende) Einträge da sind |
| `POST /v1/files` | Upload: Rohdaten (`?name=`, Body = Datei, auch bei `application/json`), JSON `{name, contentBase64}` oder multipart → `{sha256, name, mime, size, preview?}` |
| `GET /v1/files/:sha256` | Download des Originals (auch eindeutiger Präfix ≥ 8 Zeichen) |
| `GET /v1/files/:sha256/preview?max=2000` | Bild als JPEG/PNG, lange Kante ≤ `max`, EXIF-Drehung angewendet (HEIC, JPEG, PNG) |
| `POST/GET/DELETE /mcp` | MCP über Streamable HTTP (siehe „MCP über HTTP vs. stdio“) |
| `GET /v1/events?after=<seq>` | Server-Sent Events aller Änderungen |
| `GET /v1/labels`, `GET /v1/info`, `GET /health` | Hilfsrouten |
| `GET /v1/agent/inbox?after=&provider=` | kompakte Übersicht für Agenten |
| `GET /v1/agent/wait?after=&timeout=&issue=&provider=` | Long-Poll für Agenten/Worker: `{changed, cursor, waiting:[…]}` |

Anhänge in JSON: `{"sha256": "…"}` (vorher hochgeladen) oder inline `{"name": "a.txt", "contentBase64": "…"}`. `model` überall als `provider/name` (`^[a-z0-9-]+/[a-z0-9._-]+$`); alte Werte `opus|sonnet|haiku` werden zu `claude/<x>`. Mit Schlüsseln gelten die Rollen aus „Sicherheit & Schlüssel“ (403 `permission_error`, 429 nach Fehlversuchen).

### OpenAI-kompatibler Adapter (optional)

`POST /v1/chat/completions` legt die letzte user-Nachricht als Issue (Label `api`, Autor `programm:<user>`) an – oder als Kommentar, wenn per Header `X-Issue-Id` bzw. `metadata.issue_id` fortgesetzt wird – und wartet auf Claudes nächsten Kommentar. Die Antwort kommt im OpenAI-Format (`usage` mit Nullen, zusätzlich `issue_id`). Bei Timeout: HTTP 504 mit `issue_id`, später über `/v1/issues/:id/timeline` abrufbar. `stream: true` liefert SSE-Chunks (ein Chunk mit dem ganzen Text + `[DONE]`). `GET /v1/models` nennt `agent-board-opus`, `agent-board-sonnet`, `agent-board-haiku`; der `model`-Parameter wird aufs Issue-Modell abgebildet: `provider/name` (z. B. `whisper/large-v3`) direkt, sonst enthält „haiku“ → `claude/haiku`, „sonnet“ → `claude/sonnet`, sonst `claude/opus`. Mit Schlüsseln nur für admin/program; Autor bei program = aus dem Schlüssel.

Hinweis: Node-`fetch` bricht Anfragen ohne Antwort-Header nach 300 s ab. Für längere Wartezeiten `stream: true` nutzen (Header kommen sofort, Keepalives alle 15 s) oder den Long-Poll in Stücken wiederholen.

### MCP-Tools (Ausgaben bewusst knapp)

| Tool | Zweck |
|---|---|
| `inbox` | Zähler + offene Issues + Neues seit dem letzten Aufruf (eine Zeile pro Issue); `provider` Standard `claude` |
| `issue_list` | Filter nach Status/Label/„für mich“/Suche; `provider` Standard `claude` (`all` = alle) |
| `issue_read` | nur ungelesene Einträge anderer (Lesestand pro Issue), `fresh: true` wie erstes Lesen (für Subagenten), `full: true` für alles |
| `issue_create` | Issue anlegen (mit Labels, `model`, Dateien) |
| `issue_claim` | Issue mit Sperre übernehmen (`agent`, z. B. `claude:sonnet-7`); Fehler bei 409, auch für fremde Provider („gehört zu Provider whisper“) – außer `force: true` |
| `issue_release` | eigene Sperre freigeben (`in_progress` → `open`) |
| `comment_add` | Kommentar, optional mit Dateien (`path` oder Inhalt) und Status |
| `issue_status` | `in_progress` / `open` / `needs_human` / `closed` + Grund |
| `issue_label` | Labels hinzufügen/entfernen |
| `file_get` | Anhang laden: Text direkt, Bilder als Bild (HEIC/große Fotos als JPEG, `maxSize` Standard 2000 px), sonst lokaler Pfad |
| `file_attach` | Datei als Kommentar anhängen |
| `request_human` | `needs_human` + `@nils` + Grund (erscheint unter „Für mich“) |
| `wait_for_new` | Long-Poll im Tool (Fallback, wenn kein Hintergrund-Bash); liefert dieselbe Liste wie der Watcher; `provider` Standard `claude` |
| `board_rules` | verbindliche Regeln (Zuständigkeit nach Provider, Modellwahl, Abschluss, Sicherheit) |

Die **MCP-`instructions`** (beim Initialize, also bei jedem Verbindungsaufbau) beginnen mit der Zuständigkeitsregel, wörtlich: „Du (Claude) bearbeitest NUR Issues mit provider `claude`. Starte Subagenten nur dafür und wähle als Agent-Tool-`model` den Namen nach dem Schrägstrich (opus/sonnet/haiku). Issues anderer Provider (z. B. whisper, ollama) werden von deren eigenen Workern bearbeitet – nicht anfassen, nicht kommentieren, keine Subagenten dafür starten.“ Dieselbe Regel liefert `board_rules` und steht in `CLAUDE.md`.

Schreibende Tools (`comment_add`, `issue_status`, `request_human`, `file_attach`, `issue_create`, `issue_claim`, `issue_release`) haben einen optionalen Parameter `agent` (Autorname, muss mit `claude` beginnen, z. B. `claude:haiku-4`).

### CLI

```bash
npm run --silent watch             # wartet (max. 2 h) auf claude-Issues, endet mit Arbeitsliste (eine Zeile je Issue), Exit 0
npm run cli -- watch --provider all          # alle Provider (--provider whisper: nur diesen; eigener Cursor je Provider)
npm run cli -- watch --once        # nur einmal prüfen
npm run cli -- watch --json        # eine Zeile JSON {changed, cursor, issues:[…]}
npm run cli -- watch --min-wait 3000   # nach dem 1. Ereignis 3 s weiter sammeln (Standard 1500 ms)
npm run cli -- new "Titel" "Text" --label bug --model claude/haiku --file ./log.txt   # --model whisper/large-v3 usw.
npm run cli -- claim 3 --author claude:sonnet-3 | release 3 --author claude:sonnet-3
npm run cli -- comment 3 "Danke" --file ./foto.jpg
npm run cli -- close 3 | reopen 3
npm run cli -- list --for-me
npm run cli -- show 3
npm run cli -- ask "Frage an Claude" --model claude/sonnet   # über den OpenAI-Adapter
npm run key -- create --name claude-mac --role agent --providers claude   # Schlüssel (einmalige Ausgabe)
npm run key -- list | revoke <name>
```

## Beispiele

- `examples/program.ts` – Programm meldet einen Fehler als Issue mit Log-Datei und wartet auf die Antwort (Client-Paket)
- `examples/ask.ts` – Frage stellen, warten, Abbruch per Strg+C/AbortController (Client-Paket)
- `examples/events.ts` – alle Änderungen live per SSE mitlesen (Client-Paket)
- `examples/openai-client.ts` – offizielles `openai`-Paket mit `baseURL: http://127.0.0.1:4317/v1`, `apiKey` beliebig
- `examples/curl.sh` – alle wichtigen Aufrufe mit curl
- `examples/uhrzeit/` – eigenständiges Mini-Projekt: fragt Claude nach Datum/Uhrzeit, wartet auf die Antwort, vergleicht mit der lokalen Uhr und schließt das Issue (siehe dessen README)
- `examples/worker-echo/` – eigenständiger Worker für den Provider `echo/v1` (`runWorker`): antwortet mit dem umgedrehten Text; Vorlage z. B. für einen Whisper-Dienst

## Client-Paket

Unter `client/` liegt das npm-Paket **`@nils/agent-board-client`** für eigene Programme: ohne Laufzeit-Abhängigkeiten (globales `fetch`, Node ≥ 18 und Browser), ESM + Typdefinitionen, Typen aus dem Server-Datenmodell gespiegelt. Ausführliche Doku: [`client/README.md`](client/README.md).

```bash
# in einem anderen eigenen Projekt
npm i /Users/nbaumgartner/Desktop/agent-board/client
# oder in dessen package.json: "@nils/agent-board-client": "file:../agent-board/client"
```

```ts
import { AgentBoardClient, AgentBoardError, Model, model } from "@nils/agent-board-client";

const board = new AgentBoardClient({ baseUrl: "http://127.0.0.1:4317", apiKey: process.env.AB_PROGRAM_KEY ?? "lokal", user: "programm:import" });
const issue = await board.createIssue({ title: "Import fehlgeschlagen", labels: ["bug"], attachments: [{ file: "./import.log" }] });
const reply = await board.waitForReply(issue.id, { afterSeq: issue.lastSeq, timeoutMs: 30 * 60_000 }); // Long-Poll
console.log(reply.text, reply.attachments);
const r = await board.ask("Frage", "Passt das Mapping?", { timeoutMs: 600_000, model: Model.CLAUDE.HAIKU }); // createIssue + waitForReply
await board.createIssue({ title: "Diktat", attachments: [{ file: "./diktat.m4a" }], model: model("whisper", "large-v3") }); // eigener Provider
const ac = new AbortController();                                                            // ac.abort() beendet
await board.events((ev) => console.log(ev.issue.id, ev.issue.status), { signal: ac.signal }); // SSE mit Auto-Reconnect
```

Methoden: `listIssues` (`provider`), `getIssue`, `createIssue` (`model`), `comment`, `setStatus`, `setModel`, `claim`/`release`, `agentWait`, `addLabels`/`removeLabels`, `close`, `reopen`, `requestHuman`, `uploadFile`, `downloadFile`, `waitForReply`, `ask`, `events`; dazu `runWorker`, `Model`, `model()`. Ein echtes TS-`enum` gibt es bewusst nicht (nominal, nicht mit Type-Stripping/`erasableSyntaxOnly` verträglich) – `Model.CLAUDE.HAIKU` hat den Literaltyp `"claude/haiku"`. Fehler sind `AgentBoardError` mit `status` und `code` (`timeout`, `aborted`, `authentication_error`, …). Das Paket wird nicht veröffentlicht; `client/dist` liegt im Repo, nach Änderungen `cd client && npm run build`.

## HEIC/Fotos

iPhone-Fotos (HEIC/HEIF – erkannt an Mime, Endung oder den Magic Bytes `ftypheic`/`heix`/`mif1`/`hevc` …) bleiben im Original erhalten; zusätzlich entsteht beim Upload eine **JPEG-Vorschau** (lange Kante max. 2000 px), die als eigene Datei im Feld `preview` des Anhangs verknüpft ist. Große JPEG/PNG-Fotos (> 2000 px) bekommen ebenfalls eine verkleinerte Vorschau; die EXIF-Drehung wird dabei angewendet.

- **Web-Oberfläche:** zeigt die Vorschau als Bild, Tippen öffnet bzw. lädt das Original (HEIC als Download).
- **MCP `file_get`:** liefert HEIC und große Fotos als verkleinertes JPEG (`maxSize`, Standard 2000 px – spart Tokens), aufrecht gedreht; `saveTo` speichert weiterhin das Original.
- **REST:** `GET /v1/files/<sha>/preview?max=1200` für beliebige Größen.
- **Technik:** Dekodierung rein per JS/WASM (`heic-decode` → libheif-js, `jpeg-js`, `pngjs`), keine nativen Module. `sharp` scheidet aus: dessen Prebuilds können HEVC-HEIC nicht dekodieren (libde265 fehlt, getestet). Vorschauen werden nacheinander berechnet (ein 12-MP-Foto braucht einige hundert ms bis wenige Sekunden). Schlägt die Umrechnung fehl, bleibt der Upload trotzdem gültig.

## Docker

```bash
cp .env.example .env          # Schlüssel setzen (Pflicht: AB_API_KEY = admin und/oder AB_KEYS), optional AB_PUBLIC_URL
docker compose up -d --build  # Board auf http://127.0.0.1:4317, Daten im Volume agent-board-data (/data)
docker compose logs -f agent-board
# weitere Schlüssel im Container (landen gehasht in /data/keys.json, Widerruf wirkt sofort):
docker compose exec agent-board node --import tsx src/cli/key.ts create --name claude-mac --role agent --providers claude
```

- **Image:** `node:22-alpine`, mehrstufig, nur Produktionsabhängigkeiten, läuft als Nutzer `node`, Laufzeit `tsx` (wie `npm start`), `HEALTHCHECK` auf `/health`, `EXPOSE 4317`, `VOLUME /data`.
- **Erreichbarkeit:** Standard-Port-Mapping `127.0.0.1:4317:4317` (nur dieser Rechner). Für das iPhone im WLAN in `docker-compose.yml` `"4317:4317"` eintragen und `AB_PUBLIC_URL=http://<mac-ip>:4317` setzen. Im Container lauscht der Server auf `0.0.0.0`, daher ist mindestens ein Schlüssel Pflicht (`AB_API_KEY`, `AB_KEYS` oder `/data/keys.json`; sonst bricht der Start mit Hinweis ab).
- **Watcher gegen den Container** (im Projektordner, Node nötig):
  ```bash
  AB_URL=http://127.0.0.1:4317 AB_AGENT_KEY=<agent-schlüssel> npm run --silent watch
  ```
  Der Cursor liegt lokal in `./data/.agent-cursor`. Ohne lokales Node nutzt Claude das Tool `wait_for_new`.

## MCP über HTTP vs. stdio

| | stdio (`src/mcp/index.ts`) | HTTP (`/mcp` im Board-Server) |
|---|---|---|
| Einbinden | `.mcp.json` bzw. `claude mcp add agent-board -e AB_URL=… -e 'AB_AGENT_KEY=${AB_AGENT_KEY}' -- npx tsx …/src/mcp/index.ts` | `claude mcp add --transport http --scope project agent-board https://…/mcp --header 'Authorization: Bearer ${AB_AGENT_KEY}'` (siehe unten) |
| Voraussetzung | Node + Projektordner auf dem Rechner von Claude Code | nur der laufende Server (z. B. Docker-Container) |
| Tools | alle 14 | dieselben 14 (gemeinsame Definitionen in `src/mcp/server.ts`) |
| Lesestand (`inbox`, `issue_read`) | pro Prozess | pro MCP-Sitzung (`mcp-session-id`; inaktive Sitzungen nach 24 h verworfen) |
| Dateien | `path`/`saveTo` = lokale Pfade | keine lokalen Pfade: Dateien als `content`/`contentBase64`; Binärdateien liefert `file_get` als Download-Link |
| Auth | `AB_AGENT_KEY` (sonst `AB_API_KEY`) in der Umgebung | Bearer-Header mit agent-Schlüssel; die Tools laufen mit genau dessen Rechten (Provider-Beschränkung, Autorname); eine MCP-Sitzung ist an den Schlüssel gebunden, der sie eröffnet hat (fremder Schlüssel mit derselben `mcp-session-id` → 403) |

Empfehlung: Läuft das Board lokal per `npm start`, ist stdio am bequemsten (Datei-Pfade funktionieren). Läuft es im Container oder auf einem anderen Rechner, HTTP verwenden.

**HTTP-MCP ohne Klartext-Schlüssel:** Die einfachen Anführungszeichen sind wichtig – so landet `${AB_AGENT_KEY}` wörtlich in `.mcp.json` (Projekt-Scope) und Claude Code setzt den Wert erst beim Verbinden aus der Umgebung ein. Mit doppelten Anführungszeichen würde die Shell den Schlüssel schon beim `add` einsetzen und ihn im Klartext speichern.

```bash
claude mcp add --transport http --scope project agent-board https://board.example.ts.net/mcp --header 'Authorization: Bearer ${AB_AGENT_KEY}'
```

## Parallel arbeiten mit Subagenten & Modellwahl

Mehrere `claude`-Issues werden parallel von Claude-Subagenten bearbeitet; die Haupt-Sitzung bleibt schlank und ist nur **Dispatcher** (Protokoll und wörtliche Prompt-Vorlage: [`CLAUDE.md`](CLAUDE.md)).

```
 Nils / Programme ──► Board-Server ◄──────────────────────────────┐
   (Issue + model)        │ /v1/agent/wait                        │ MCP: issue_claim, issue_read,
                          ▼                                       │ file_get, comment_add, request_human
               ┌─────────────────────┐   Arbeitsliste             │ (Autor claude:<modell>-<N>)
               │ Watcher (Hintergrund│── #7 [claude/haiku] open „…“ – neu – …
               │ -Bash, 0 Tokens)    │   #8 [claude/opus]  open „…“ – neu – …
               └─────────┬───────────┘                            │
                         ▼ weckt                                  │
               ┌─────────────────────┐  Agent-Tool, run_in_background, model = Name nach „claude/“
               │ Haupt-Agent         │──────┬──────────────┬──────┘
               │ (Dispatcher, liest  │      ▼              ▼
               │  keine Inhalte)     │  Subagent #7    Subagent #8     (max. 4 gleichzeitig)
               └─────────▲───────────┘  Haiku 4.5      Opus 5.5
                         │ je 1 Zeile: „#7 erledigt: …“ / „#8 needs_human: …“
                         └────────────────────────────────
   Neuer Kommentar zu #8, während Subagent #8 läuft → SendMessage an ihn statt neuem Subagenten.
```

**Modell je Issue** – Feld `model` (`provider/name`):

| Wert | Client-Konstante | Modell | Wann |
|---|---|---|---|
| `claude/opus` (Standard) | `Model.CLAUDE.OPUS` | Claude Opus 5.5 | Schweres: Architektur, knifflige Fehler, mehrstufige Änderungen |
| `claude/sonnet` | `Model.CLAUDE.SONNET` | Claude Sonnet 5.5 | Mittelweg: normale Programmieraufgaben, Reviews |
| `claude/haiku` | `Model.CLAUDE.HAIKU` | Claude Haiku 4.5 | Routine: Formatieren, kleine Fixes, Zusammenfassungen – am schnellsten und günstigsten |
| `whisper/large-v3`, `ollama/qwen2.5vl`, … | `model("whisper", "large-v3")` | eigener Worker | nicht Claude – siehe „Provider & eigene Worker“ |

Setzen: REST/Client/MCP-Feld `model`, CLI `--model`, Web-Oberfläche (Auswahl Claude Opus 5.5 / Sonnet 5.5 / Haiku 4.5 oder „Anderer Provider…“ mit Freitext `provider/name`; Chip im Issue zum Ändern), OpenAI-Adapter über den `model`-Parameter – oder Label `model:haiku` / `model:whisper/large-v3`. **Das Feld ist maßgeblich:** Ein `model:<x>`-Label wird beim Anlegen (und bei Label-Änderungen) ins Feld übernommen und nicht als Label gespeichert; wird beim Anlegen sowohl Feld als auch Label angegeben, gewinnt das Feld. Unbekannte Werte (`model:gpt`) bleiben normale Labels. **Abwärtskompatibel:** alte Werte `opus|sonnet|haiku` (Eingaben und gespeicherte Issues beim Laden) werden zu `claude/<x>`.

**Sperre gegen Doppelbearbeitung:** `issue_claim` / `POST /v1/issues/:id/claim {agent}` setzt atomar `in_progress`, `assignee` und `claim`; ein zweiter Agent bekommt 409. Die Sperre endet bei `closed`, `needs_human`, `issue_release`, jedem Statuswechsel weg von `in_progress` oder nach `AB_CLAIM_TTL_MIN` (30) Minuten ohne Einträge des Inhabers. Der Watcher zeigt aktive Sperren als `in_progress (claude:sonnet-8)`.

**Kosten/Latenz:** Ein Subagent spart Kontext im Haupt-Agenten (der sieht nur eine Zeile je Issue statt Issue-Text, Anhänge und Arbeitsschritte) und erlaubt Parallelität. Dafür kostet jeder Subagent etwas Start-Overhead (eigener Systemprompt, MCP-Tool-Definitionen, `issue_claim`/`issue_read`). Für winzige Routine-Issues lohnt daher `haiku`; mehrere gleichzeitig angelegte Issues landen dank `--min-wait` in einem Weckruf.

## Provider & eigene Worker

Issues anderer Provider (z. B. `whisper/large-v3` für Audio-Transkription, `ollama/qwen2.5vl` für ein lokales Bildmodell) bearbeitet **nicht Claude**, sondern ein eigener Worker – ein kleines Programm mit dem Client-Paket:

```ts
import { runWorker } from "@nils/agent-board-client";
await runWorker({
  baseUrl, apiKey: process.env.AB_WORKER_KEY!,       // agent-Schlüssel mit --providers whisper
  provider: "whisper", agent: "whisper-worker", concurrency: 1,
  handle: async (issue, ctx) => {                     // ctx: comment, attach, download, requestHuman, close
    const audio = issue.attachments.find((a) => a.mime.startsWith("audio/"))!;
    const text = await transcribe((await ctx.download(audio.sha256)).data);
    await ctx.attach(new TextEncoder().encode(text), { name: "transkript.txt" });
    return "Transkript anbei.";                       // schließt das Issue; Fehler → needs_human
  },
});
```

Der Worker wartet per Long-Poll auf offene Issues seines Providers, übernimmt sie mit `claim` (Sperre), ruft `handle` auf und schließt bzw. setzt bei Fehlern `needs_human`. Lauffähiges Beispiel: `examples/worker-echo/` (Provider `echo/v1`, antwortet mit dem umgedrehten Text). Claude bekommt von solchen Issues nichts mit: Der Watcher weckt nur für `claude` (`--provider claude` ist Standard), `inbox`/`issue_list`/`wait_for_new` filtern auf `claude`, `issue_claim` lehnt fremde Provider ab, und ein agent-Schlüssel mit `--providers claude` sieht sie serverseitig gar nicht.

## Token-Spar-Strategie: Wie Claude Neues mitbekommt

| Variante | Kosten beim Warten | Reaktionszeit | Bewertung |
|---|---|---|---|
| Pollen per Tool (`inbox` alle x Minuten) | jede Abfrage kostet einen Tool-Aufruf samt Kontext; dazu Wartelogik im Gespräch | Intervall | ungeeignet |
| Long-Poll-Tool `wait_for_new` | ein Tool-Aufruf pro Wartefenster (max. 10 min); Sitzung ist währenddessen blockiert | sofort | brauchbarer Fallback |
| **Hintergrund-Watcher** `npm run --silent watch` mit `run_in_background` | **0 Tokens** während des Wartens; beim Wecken nur eine kurze Liste (eine Zeile je Issue) | sofort | **empfohlen** |

Der Watcher blockiert per Long-Poll auf `/v1/agent/wait` (in Stücken von 240 s, insgesamt bis 2 h), merkt sich den Stand in `data/.agent-cursor` und beendet sich mit einer kompakten Arbeitsliste (eine Zeile je Issue), sobald es neue Issues, Kommentare von anderen als Claude oder eine Wiedereröffnung gibt. Claude Code meldet das Ende eines Hintergrundprozesses automatisch – Claude wird also geweckt, ohne zwischendurch etwas zu verbrauchen. Danach liefern `inbox` und `issue_read` nur Deltas.

## Sicherheit & Schlüssel

**Rollen.** Statt eines einzigen Schlüssels gibt es benannte Schlüssel mit Rolle; der Server leitet daraus Rechte **und den Autornamen** ab (ein Programm kann also nicht als „claude“ oder „nils“ schreiben):

| Rolle | Für | Darf | Autor |
|---|---|---|---|
| `admin` | dich: Web-Oberfläche, CLI | alles | frei (z. B. `nils`) |
| `agent` | Claude (MCP, Watcher), Worker anderer Provider | lesen, `claim`/`release`, kommentieren, Status, Labels, Dateien, Issues anlegen; mit `--providers` nur Issues dieser Provider (alles andere: 403, auch mit `force`) | `claude` bzw. `claude:<x>` (ohne `claude` in `--providers`: `<name>`/`<name>:<x>`), änderbar per `--author` |
| `program` | eigene Programme | eigene Issues anlegen/lesen/kommentieren/schließen, Dateien hochladen, OpenAI-Adapter; sieht nur eigene Issues; **kein** `claim`, keine Agenten-Routen, kein MCP; Dateien nur per vollem sha256 | `programm:<name>` bzw. `programm:<name>:<x>` |

**Ablauf:**

```bash
npm run key -- create --name nils-web   --role admin                       # für Browser/CLI
npm run key -- create --name claude-mac --role agent --providers claude    # für Claude Code
npm run key -- create --name uhrzeit    --role program                     # je Programm einer
npm run key -- list                    # Name, Rolle, Datum, Hash-Präfix – nie der Schlüssel
npm run key -- revoke claude-mac       # wirkt sofort, ohne Neustart
```

- `create` gibt den Schlüssel (`ab_…`, 192 Bit) **genau einmal** aus; gespeichert wird nur sein SHA-256 in `data/keys.json` (Dateirechte 600). Geprüft wird zeitkonstant gegen alle Hashes. Der Server liest `keys.json` bei Änderungen neu ein; auch nach dem Widerruf des letzten Schlüssels bleibt die Prüfung aktiv.
- Docker ohne CLI: `AB_KEYS` (JSON, besser mit `hash` statt `key`). `AB_API_KEY` bleibt als admin-Schlüssel „admin“ gültig.
- **Fehlversuche:** Nach 10 falschen Schlüsseln pro IP und Minute (`AB_AUTH_FAIL_LIMIT`) antwortet der Server 60 s lang mit **429** (`Retry-After`), auch für richtige Schlüssel.
- MCP über HTTP nutzt für jede Sitzung den Schlüssel des Aufrufers; eine Sitzung lässt sich nicht mit einem anderen Schlüssel weiterverwenden.

**Regeln für den Umgang:**

- Schlüssel **nie in Prompts, Chats, Issues, Kommentare, Commits oder Screenshots** schreiben – nur per Umgebungsvariable bzw. Secret-Speicher (Shell-Profil, Keychain, direnv, Docker-Secret). `.mcp.json` enthält nur `${AB_AGENT_KEY}`.
- Claude bekommt nur einen **agent**-Schlüssel mit `--providers claude`, nie den admin-Schlüssel. Achtung: Claude Code liest Dateien im Projektordner – liegt der admin-Schlüssel in `.env`, kann eine Sitzung ihn sehen. Für echte Trennung den admin-Schlüssel nur im Browser/Passwortmanager halten und in `.env` höchstens `AB_AGENT_KEY`.
- **Zugriff von außen** (z. B. Claude-Code-Cloud-Sitzung, Handy unterwegs): nie den Port ins Internet freigeben, sondern nur über einen **HTTPS-Tunnel** wie Tailscale (`tailscale serve`/Funnel) oder Cloudflare Tunnel (mit Access-Regel), und dort ausschließlich einen **agent-Schlüssel mit Provider-Beschränkung** verwenden (eigener Schlüssel je Zugang, z. B. `claude-cloud`).
- Schlüssel **rotieren**: neuen anlegen, Clients umstellen, alten per `revoke` widerrufen; bei Verdacht sofort widerrufen.

**Weiteres:**

- Standardmäßig nur an `127.0.0.1` gebunden; andere Bindungen nur mit Schlüssel (Bearer-Header, `X-Api-Key` oder `?token=` für Bilder/SSE im Browser).
- Hochgeladene Dateien werden mit `nosniff` und `Content-Security-Policy: sandbox` ausgeliefert; nur Bilder, PDF und Klartext inline, alles andere als Download.
- Kein TLS im Server selbst: im WLAN nur in vertrauenswürdigen Netzen, von außen nur per HTTPS-Tunnel.
- Der Server sendet nichts nach außen (keine Mitteilungen/Webhooks); Programme holen sich Änderungen selbst per API.
- Daten liegen als JSON im Klartext unter `./data` (in `.gitignore`), im Container im Volume `/data`.

## Entwicklung & Tests

```bash
npm run typecheck   # tsc --noEmit (strict)
npm test            # vitest: Store, REST, Dateien, Auth/Schlüsselrollen, Long-Poll, SSE, Web, OpenAI-Adapter, MCP (stdio + HTTP), CLI, Bilder/HEIC,
                    #         Client-Paket, Modelle/Migration, Provider-Filter, runWorker, examples/uhrzeit + examples/worker-echo
npm run e2e         # echter Server + MCP über stdio und HTTP + Watcher + openai-Paket + Client-Paket + Schlüssel + examples/worker-echo
cd client && npm run build   # Client-Paket nach client/dist bauen
cd examples/worker-echo && npm install   # einmalig für die Worker-Tests (ebenso examples/uhrzeit)
```
