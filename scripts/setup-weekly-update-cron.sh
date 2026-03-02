#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEFAULT_SCHEDULE="0 20 * * 6"
SCHEDULE="${CRON_SCHEDULE:-$DEFAULT_SCHEDULE}"
LOG_FILE="${CRON_LOG_FILE:-$REPO_DIR/logs/weekly-update.log}"
JOB_CMD="${CRON_JOB_COMMAND:-$REPO_DIR/scripts/weekly-update.sh >> $LOG_FILE 2>&1}"
MARKER="# rocket-meals-weekly-update"
CRON_LINE="$SCHEDULE $JOB_CMD $MARKER"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

if ! command -v crontab >/dev/null 2>&1; then
  echo "Fehler: crontab ist nicht installiert oder nicht im PATH verfügbar." >&2
  exit 1
fi

if [ ! -x "$REPO_DIR/scripts/weekly-update.sh" ]; then
  echo "Fehler: $REPO_DIR/scripts/weekly-update.sh ist nicht ausführbar oder fehlt." >&2
  exit 1
fi

mkdir -p "$(dirname "$LOG_FILE")"

existing_crontab="$(mktemp)"
updated_crontab="$(mktemp)"
cleanup() {
  rm -f "$existing_crontab" "$updated_crontab"
}
trap cleanup EXIT

if crontab -l >"$existing_crontab" 2>/dev/null; then
  log "Bestehende Crontab wurde gelesen"
else
  : >"$existing_crontab"
  log "Keine bestehende Crontab gefunden – es wird eine neue angelegt"
fi

grep -Fv "$MARKER" "$existing_crontab" >"$updated_crontab" || true
printf '%s\n' "$CRON_LINE" >>"$updated_crontab"

crontab "$updated_crontab"
log "Cronjob wurde erstellt/aktualisiert: $CRON_LINE"
