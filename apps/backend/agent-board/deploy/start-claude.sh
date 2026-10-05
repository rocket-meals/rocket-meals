#!/usr/bin/env bash
# Startet die Claude-Code-Sitzung für das Agent Board in tmux (Sitzung „board“).
# Wird vom systemd-User-Dienst agent-board-claude.service beim Booten aufgerufen.
set -euo pipefail

BOARD_DIR="${BOARD_DIR:-$HOME/agent-board}"
SESSION="${SESSION:-board}"

# Agent-Schlüssel (Rolle agent, nur Provider claude) – nie im Repo, nur hier
# shellcheck disable=SC1091
[ -f "$HOME/.config/agent-board/agent.env" ] && . "$HOME/.config/agent-board/agent.env"
export AB_URL="${AB_URL:-http://127.0.0.1:4317}"
export PATH="$HOME/.local/bin:$PATH"

# Läuft schon? Dann nichts tun
tmux has-session -t "$SESSION" 2>/dev/null && exit 0

# Kurz warten, bis das Board antwortet (Docker startet ggf. noch)
for _ in $(seq 1 60); do
  curl -fsS "$AB_URL/health" >/dev/null 2>&1 && break
  sleep 2
done

tmux new-session -d -s "$SESSION" -c "$BOARD_DIR" \
  "claude --remote-control 'Sitzungsstart: Halte dich an CLAUDE.md – inbox prüfen, dann den Watcher im Hintergrund starten und Issues per Subagenten abarbeiten.'"
