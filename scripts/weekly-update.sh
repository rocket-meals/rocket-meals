#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_FILE="${BACKUP_FILE:-$REPO_DIR/../envCopy}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

log "Starte geplantes Docker-Update in $REPO_DIR"
cd "$REPO_DIR"

if [ ! -f .env ]; then
  echo "Fehler: .env wurde in $REPO_DIR nicht gefunden." >&2
  exit 1
fi

log "Container werden gestoppt (docker compose down)"
docker compose down

log "Sichere .env nach $BACKUP_FILE"
cp .env "$BACKUP_FILE"

log "Hole neue Änderungen (git pull --ff-only)"
git pull --ff-only

log "Stelle .env aus Backup wieder her"
cp "$BACKUP_FILE" .env

log "Baue Images neu (docker compose build)"
docker compose build

log "Starte Container im Hintergrund (docker compose up -d)"
docker compose up -d

log "Update erfolgreich abgeschlossen"
