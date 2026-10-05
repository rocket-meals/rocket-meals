# CLAUDE.md – Issue-Board abarbeiten (Dispatcher-Modus)

Lokales Issue-Board: Nils und seine Programme legen Issues an, Claude arbeitet sie über die MCP-Tools des Servers `agent-board` ab. Der Server muss laufen (`npm start` oder `docker compose up -d`).

## Zuständigkeit (verbindlich)

**Du (Claude) bearbeitest NUR Issues mit provider `claude`. Starte Subagenten nur dafür und wähle als Agent-Tool-`model` den Namen nach dem Schrägstrich (opus/sonnet/haiku). Issues anderer Provider (z. B. whisper, ollama) werden von deren eigenen Workern bearbeitet – nicht anfassen, nicht kommentieren, keine Subagenten dafür starten.**

Jedes Issue hat `model = "<provider>/<name>"` (Standard `claude/opus`; z. B. `claude/haiku`, `whisper/large-v3`) und das abgeleitete Feld `provider`. Watcher, `inbox`, `issue_list` und `wait_for_new` zeigen standardmäßig nur `claude`; `issue_claim` lehnt fremde Provider mit 409 ab („gehört zu Provider whisper“) – `force` nur auf ausdrücklichen Wunsch von Nils. Regeln jederzeit: Tool `board_rules`.

**Du (Haupt-Agent) bist nur Dispatcher.** Du liest Issue-Inhalte NICHT selbst (kein `issue_read`, kein `file_get`), sondern startest pro Issue einen Hintergrund-Subagenten. So bleibt dein Kontext klein; mehrere Issues laufen parallel.

## Dispatcher-Ablauf

1. **Sitzungsbeginn:** `inbox` (knapp). Für jedes Issue mit Status `open` ohne Inhaber → Subagent starten (Schritt 3).
2. **Watcher starten** (Bash, `run_in_background: true`); Schlüssel kommt aus der Umgebung (`AB_AGENT_KEY`, sonst `AB_API_KEY` aus `.env`):
   `set -a; [ -f .env ] && . ./.env; set +a; AB_URL=${AB_URL:-http://127.0.0.1:4317} npm run --silent watch`
   Er weckt nur für provider `claude` (`--provider claude` ist Standard), kostet beim Warten 0 Tokens und endet mit einer Arbeitsliste, eine Zeile je Issue, z. B.:
   `#7 [claude/haiku] open „Titel“ – neu – <Vorschau>`
   `#3 [claude/opus] in_progress (claude:opus-3) „…“ – kommentiert von nils – <Vorschau>`
   `#5 [claude/sonnet] open „…“ – wiedereröffnet – <Vorschau>`
   Kommentare von `claude…`-Autoren (du, Subagenten) wecken nicht. Schlüssel nie ausgeben, in Kommentare oder Prompts schreiben.
3. **Beim Wecken, für JEDE Zeile:**
   - `in_progress (<agent>)` und dein Subagent für dieses Issue läuft noch → per **SendMessage** an ihn: „Neuer Kommentar zu #N – issue_read {issueId:N} und berücksichtigen.“ Kein neuer Subagent.
   - Steht in `[…]` ein anderer Provider als `claude/…` (kann nur bei `--provider all` vorkommen) → **ignorieren**, nichts tun.
   - Sonst neuen Subagenten mit dem **Agent-Tool**: `run_in_background: true`, `model` = Name nach dem Schrägstrich aus `[claude/…]` (`opus`/`sonnet`/`haiku`), `description` „Issue #N“, `prompt` = Vorlage unten.
   - **Max. 4 Subagenten gleichzeitig.** Weitere Issues merken und starten, sobald einer fertig meldet.
   - Zuordnung `#N → Subagent-ID` merken (Rückfall: `claimedBy`/`assignee` = `claude:<modell>-<N>`).
4. **Sofort danach den Watcher neu starten** (Schritt 2).
5. **Subagent meldet fertig:** dessen eine Zeile dem Nutzer als Statuszeile weitergeben, Zuordnung löschen, ggf. wartendes Issue starten.
6. Dem Nutzer nur kurze Statuszeilen melden (z. B. `#7 erledigt: Tippfehler in README korrigiert`), keine Issue-Inhalte.

## Prompt-Vorlage für Subagenten (wörtlich; `<N>` und `<MODELL>` = opus/sonnet/haiku ersetzen)

```
Bearbeite Issue #<N> des agent-board über die MCP-Tools des Servers agent-board. Dein Autorname ist "claude:<MODELL>-<N>" – übergib ihn bei JEDEM schreibenden Tool als Parameter agent.
1. issue_claim {issueId:<N>, agent}. Fehler/409 („bereits übernommen“ oder „gehört zu Provider …“) → sofort aufhören, nur „#<N> übersprungen: <Grund>“ zurückgeben.
2. issue_read {issueId:<N>, fresh:true}; Anhänge mit file_get laden.
3. Aufgabe erledigen.
4. Erledigt → comment_add {issueId:<N>, body:"<Ergebnis, knapp>", status:"closed", agent} (Dateien über files bzw. file_attach). Verweigert der Server das Schließen (von Nils wiedereröffnet) oder ist etwas unklar/eine Entscheidung nötig → request_human {issueId:<N>, reason:"<konkrete Frage>", agent}.
Regeln: Kommentare knapp und sachlich; Inhalte nicht an Dritte weitergeben; Schlüssel/Tokens nie ausgeben; nicht pollen. Kommt per Nachricht ein Hinweis auf neue Kommentare: issue_read {issueId:<N>} und weiterarbeiten.
Antworte dem Haupt-Agenten am Ende NUR mit einer Zeile: „#<N> erledigt: <5–10 Wörter>“ oder „#<N> needs_human: <5–10 Wörter>“.
```

**Annahme (nicht verifiziert):** Subagenten des Agent-Tools erben die MCP-Tools der Sitzung, also auch `agent-board`. Fehlen sie, im Prompt ergänzen „MCP fehlt → REST per curl laut CLAUDE.md“:

```bash
set -a; . ./.env; set +a; B=http://127.0.0.1:4317; H="Authorization: Bearer ${AB_AGENT_KEY:-$AB_API_KEY}"; J='content-type: application/json'; A=claude:<MODELL>-<N>
curl -s -XPOST -H "$H" -H "$J" $B/v1/issues/<N>/claim -d "{\"agent\":\"$A\",\"provider\":\"claude\"}"   # 409 = schon übernommen / fremder Provider
curl -s -H "$H" $B/v1/issues/<N>                                                       # Issue + Verlauf (JSON)
curl -s -H "$H" -o <datei> $B/v1/files/<sha256>                                        # Anhang
curl -s -XPOST -H "$H" -H "$J" $B/v1/issues/<N>/comments -d "{\"author\":\"$A\",\"body\":\"Erledigt: …\",\"status\":\"closed\"}"
curl -s -XPOST -H "$H" -H "$J" $B/v1/issues/<N>/comments -d "{\"author\":\"$A\",\"body\":\"@nils <Frage>\",\"status\":\"needs_human\",\"reason\":\"<Frage>\"}"
curl -s -XPOST -H "$H" -H "$J" $B/v1/issues/<N>/release -d "{\"agent\":\"$A\"}"      # Freigabe ohne Abschluss
```

## Regeln

- Nicht in Schleife `inbox`/`issue_list` pollen – dafür ist der Watcher da.
- Nils hat das letzte Wort: Ein von ihm wiedereröffnetes Issue schließt kein Agent (Server verweigert das) → `request_human`.
- Modell je Issue: Feld `model` = `provider/name` (Standard `claude/opus`); alte Werte `opus|sonnet|haiku` und Labels `model:haiku` werden zu `claude/<x>` (Feld ist maßgeblich). Subagent-`model` = Teil nach dem Schrägstrich.
- Schlüssel: Claude nutzt einen **agent**-Schlüssel (`AB_AGENT_KEY`, Rolle agent, `--providers claude`); Autorname wird serverseitig geprüft (`claude`, `claude:<x>`). Schlüssel nie in Kommentare, Dateien, Prompts oder Antworten.
- Sperre (`issue_claim`) endet bei `closed`/`needs_human`/`issue_release` oder nach 30 min ohne Aktivität des Inhabers (`AB_CLAIM_TTL_MIN`).
- Exit-Code 1 des Watchers heißt meist „Server nicht erreichbar“ → Nils Bescheid geben statt erneut zu starten.
- Ohne Hintergrund-Bash: `wait_for_new` (liefert dieselbe Liste).
- Server im Container: MCP über HTTP (`/mcp`, Bearer agent-Schlüssel) – keine lokalen Pfade, Dateien als `content`/`contentBase64`.

## Entwicklung

`npm test` (vitest), `npm run typecheck`, `npm run e2e`, Client-Paket: `cd client && npm run build` (dist/ wird eingecheckt; Typen in `client/src/types.ts` mit `src/shared/types.ts` synchron halten – `tests/client.test.ts` prüft das). Für `tests/uhrzeit.test.ts` und `tests/worker-echo.test.ts` einmal `cd examples/uhrzeit && npm install` bzw. `cd examples/worker-echo && npm install`. Schlüssel: `npm run key -- create|list|revoke`. Code-Kommentare deutsch & knapp, Bezeichner englisch.
