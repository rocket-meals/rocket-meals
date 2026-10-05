#!/usr/bin/env bash
# Beispiele mit curl. Optional: export AB_API_KEY=… (dann Header Authorization setzen).
set -euo pipefail
URL=${AB_URL:-http://127.0.0.1:4317}
AUTH=()
[[ -n "${AB_API_KEY:-}" ]] && AUTH=(-H "Authorization: Bearer $AB_API_KEY")

# Issue anlegen (JSON)
curl -s "${AUTH[@]}" -H 'content-type: application/json' \
  -d '{"title":"Backup prüfen","body":"Lief das Backup heute Nacht?","author":"programm:cron","labels":["ops"]}' \
  "$URL/v1/issues"; echo

# Issue mit Datei (multipart; mehrere -F files=@… möglich)
echo "Fehler in Zeile 3" > /tmp/ab-beispiel.log
curl -s "${AUTH[@]}" -F title="Log ansehen" -F author="programm:cron" -F labels="ops,log" \
  -F files=@/tmp/ab-beispiel.log "$URL/v1/issues"; echo

# Kommentar, Liste, Long-Poll auf Antwort (max. 60 s)
curl -s "${AUTH[@]}" -H 'content-type: application/json' -d '{"body":"Noch ein Hinweis","author":"programm:cron"}' "$URL/v1/issues/1/comments"; echo
curl -s "${AUTH[@]}" "$URL/v1/issues?status=active"; echo
curl -s "${AUTH[@]}" "$URL/v1/issues/1/wait?after=0&timeout=60&notAuthor=programm:cron&comments=1"; echo

# Nutzer um Hilfe bitten (needs_human + Erwähnung)
curl -s "${AUTH[@]}" -X PATCH -H 'content-type: application/json' \
  -d '{"author":"programm:cron","status":"needs_human","reason":"Backup-Ziel nicht erreichbar"}' "$URL/v1/issues/1"; echo

# OpenAI-kompatibel (wartet bis zur Antwort oder 504 nach AB_COMPLETION_TIMEOUT)
curl -s "${AUTH[@]}" -H 'content-type: application/json' \
  -d '{"model":"agent-board","messages":[{"role":"user","content":"Hallo Claude?"}]}' \
  "$URL/v1/chat/completions"; echo
