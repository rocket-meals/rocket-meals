#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_REPO_DIR="${ENV_REPO_DIR:-$REPO_DIR/../rocket-meals-env}"
ENV_NAME="${ENV_NAME:-}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

if [ -z "$ENV_NAME" ]; then
  echo "Fehler: ENV_NAME ist nicht gesetzt. Bitte die Umgebungsvariable ENV_NAME setzen (z.B. ENV_NAME=production)." >&2
  exit 1
fi

if [ ! -d "$ENV_REPO_DIR" ]; then
  echo "Fehler: Env-Repository nicht gefunden unter $ENV_REPO_DIR." >&2
  exit 1
fi

log "Starte geplantes Docker-Update in $REPO_DIR"
cd "$REPO_DIR"

log "Container werden gestoppt (docker compose down)"
docker compose down

log "Hole neue Änderungen (git fetch + reset)"
git fetch origin
BRANCH="$(git rev-parse --abbrev-ref HEAD)" || { log "Fehler: Aktuellen Branch konnte nicht ermittelt werden (detached HEAD?)" >&2; exit 1; }
git reset --hard "origin/$BRANCH"

log "Generiere .env aus $ENV_REPO_DIR für Umgebung '$ENV_NAME'"
cd "$ENV_REPO_DIR"
yarn generate --env "$ENV_NAME" --output "$REPO_DIR/.env"
cd "$REPO_DIR"

log "Baue Images neu (docker compose build)"
docker compose build

log "Starte Container im Hintergrund (docker compose up -d)"
docker compose up -d

log "Update erfolgreich abgeschlossen"
