#!/usr/bin/env bash
# Sichert das Docker-Volume agent-board-data als .tar.gz und behält die letzten 14 Sicherungen.
# Cron (täglich 3:15 Uhr):  15 3 * * *  $HOME/agent-board/deploy/backup.sh
set -euo pipefail
DEST="${BACKUP_DIR:-$HOME/backups/agent-board}"
mkdir -p "$DEST"
docker run --rm -v agent-board-data:/data:ro -v "$DEST":/backup alpine \
  tar czf "/backup/agent-board-$(date +%F).tar.gz" -C /data .
ls -1t "$DEST"/agent-board-*.tar.gz | tail -n +15 | xargs -r rm --
