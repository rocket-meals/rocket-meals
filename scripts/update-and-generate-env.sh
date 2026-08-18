#!/usr/bin/env bash

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_REPO_DIR="${REPO_DIR}/../rocket-meals-envs"
ENV_NAME="${1:-}"

log() {
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

AVAILABLE_ENVS=("studi-futter" "swosy" "test")

# Auto-detect ENV_NAME via customer-config.sh when not provided as argument.
# customer-config.sh uses GITHUB_REPOSITORY; derive it from the git remote URL if unset.
if [[ -z "$ENV_NAME" ]]; then
  if [[ -z "${GITHUB_REPOSITORY:-}" ]]; then
    REMOTE_URL="$(git -C "$REPO_DIR" remote get-url origin 2>/dev/null || true)"
    # Normalize both https and ssh remote URLs to "owner/repo"
    GITHUB_REPOSITORY="$(echo "$REMOTE_URL" | sed -E 's#(https://github\.com/|git@github\.com:)##; s#\.git$##')"
    export GITHUB_REPOSITORY
  fi
  log "Erkenne Umgebung anhand von GITHUB_REPOSITORY='$GITHUB_REPOSITORY'"
  ENV_NAME="$(GITHUB_REPOSITORY="$GITHUB_REPOSITORY" bash "$REPO_DIR/scripts/customer-config.sh" | grep '^CUSTOMER=' | cut -d= -f2)"
  if [[ -z "$ENV_NAME" ]]; then
    echo "Fehler: Umgebungsname konnte nicht automatisch erkannt werden." >&2
    echo "Bitte als Argument übergeben: $0 <env-name>" >&2
    echo "Verfügbare Umgebungen: ${AVAILABLE_ENVS[*]}" >&2
    exit 1
  fi
  log "Automatisch erkannte Umgebung: '$ENV_NAME'"
fi

VALID=false
for env in "${AVAILABLE_ENVS[@]}"; do
  if [[ "$env" == "$ENV_NAME" ]]; then
    VALID=true
    break
  fi
done

if [[ "$VALID" != "true" ]]; then
  echo "Fehler: Ungültige Umgebung '$ENV_NAME'." >&2
  echo "Verfügbare Umgebungen: ${AVAILABLE_ENVS[*]}" >&2
  exit 1
fi

log "Starte Update und Env-Generierung in $REPO_DIR (Umgebung: $ENV_NAME)"
cd "$REPO_DIR"

if [[ -f "$REPO_DIR/.env" ]]; then
  log "Container werden gestoppt (docker compose down)"
  docker compose down
else
  log "Keine .env Datei vorhanden – docker compose down wird übersprungen (Ersteinrichtung?)"
fi

log "Hole neue Änderungen (git fetch + reset)"
git fetch origin
BRANCH="$(git rev-parse --abbrev-ref HEAD)" || { log "Fehler: Aktuellen Branch konnte nicht ermittelt werden (detached HEAD?)" >&2; exit 1; }
git reset --hard "origin/$BRANCH"

# --- Env-Datei generieren ---
if [[ ! -d "$ENV_REPO_DIR" ]]; then
  echo "Fehler: Verzeichnis '$ENV_REPO_DIR' wurde nicht gefunden." >&2
  echo "Bitte stelle sicher, dass das Repository 'rocket-meals-envs' im übergeordneten Ordner liegt." >&2
  exit 1
fi

log "Aktualisiere rocket-meals-envs Repository"
git -C "$ENV_REPO_DIR" stash || true
git -C "$ENV_REPO_DIR" pull || { log "Fehler: Aktualisierung von rocket-meals-envs fehlgeschlagen" >&2; exit 1; }
git -C "$ENV_REPO_DIR" stash pop || true

log "Generiere .env für Umgebung '$ENV_NAME'"
(cd "$ENV_REPO_DIR" && yarn generate --env "$ENV_NAME" --output "$REPO_DIR/.env")

if [[ ! -f "$REPO_DIR/.env" ]]; then
  echo "Fehler: .env wurde nach der Generierung nicht gefunden." >&2
  exit 1
fi

log ".env erfolgreich generiert"

# Schutz der im Backend gepflegten Dashboards/Panels (siehe docs/DASHBOARD_SYNC_PROTECTION.md).
# Standard: Änderungen im Backend werden erkannt und NICHT überschrieben. Der Workflow
# "Deploy Backend (Manual)" kann die Variable mit Force-Override auf true setzen.
export DIRECTUS_SYNC_FORCE_OVERWRITE_PROTECTED_COLLECTIONS="${DIRECTUS_SYNC_FORCE_OVERWRITE_PROTECTED_COLLECTIONS:-false}"
if [[ "$DIRECTUS_SYNC_FORCE_OVERWRITE_PROTECTED_COLLECTIONS" == "true" ]]; then
  log "ACHTUNG: Force-Override aktiv - im Backend geänderte Dashboards/Panels werden mit dem Repository-Stand überschrieben"
fi

log "Baue Images neu (docker compose build)"
docker compose build

log "Starte Container im Hintergrund (docker compose up -d) – erster Start"
docker compose up -d

log "Stoppe Container (docker compose down) – Neustart damit Apple Client Secret korrekt geladen wird"
docker compose down

log "Starte Container im Hintergrund (docker compose up -d) – zweiter Start"
docker compose up -d

log "Update und Env-Generierung erfolgreich abgeschlossen"
