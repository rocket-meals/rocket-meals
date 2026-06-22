#!/bin/bash
# =============================================================================
# Maestro Web Smoke Test Runner
# =============================================================================
# Usage (from apps/frontend/ or via `yarn maestro` in apps/frontend/app/):
#   ./run-maestro-web-test.sh
#
# Starts the Expo web dev server (`yarn web`) on http://localhost:8081/,
# generates Maestro YAML files from TypeScript, runs all tests, then shuts
# down the server automatically.
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"
GENERATED_DIR="$SCRIPT_DIR/maestro-tests/generated"
export PATH="$HOME/.maestro/bin:$PATH"

echo "=== Maestro Web Smoke Test ==="
echo ""

# ── Install Maestro CLI if not already available ────────────────────────────
if ! command -v maestro &> /dev/null; then
    echo "Maestro CLI not found – installing..."
    curl -fsSL "https://get.maestro.mobile.dev" | bash
    export PATH="$HOME/.maestro/bin:$PATH"
fi

if ! command -v maestro &> /dev/null; then
    echo "ERROR: Maestro CLI installation failed."
    echo "Install manually: curl -fsSL \"https://get.maestro.mobile.dev\" | bash"
    exit 1
fi

# ── Start Expo web dev server on port 8081 ───────────────────────────────────
echo "Starting Expo web dev server on http://localhost:8081/ ..."
# CI=true forces non-interactive mode in Expo (no terminal UI, no prompts)
(cd "$APP_DIR" && CI=true yarn web) &
SERVER_PID=$!

cleanup() {
    echo ""
    echo "Stopping Expo server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ── Wait for the dev server to be ready ─────────────────────────────────────
echo "Waiting for http://localhost:8081/ ..."
for i in $(seq 1 60); do
    if curl -sf http://localhost:8081/ > /dev/null 2>&1; then
        echo "Server is ready."
        break
    fi
    if [ "$i" -eq 60 ]; then
        echo "ERROR: Expo web server did not become ready in time."
        exit 1
    fi
    echo "  Waiting... ($i/60)"
    sleep 2
done
echo ""

# ── Generate YAML from TypeScript test definitions ───────────────────────────
echo "Generating Maestro YAML from TypeScript..."
(cd "$APP_DIR" && yarn maestro:generate)
echo ""

# ── Run Maestro tests ────────────────────────────────────────────────────────
echo "Running Maestro tests..."
echo ""

# shellcheck disable=SC2086
maestro test "$GENERATED_DIR" --platform web --headless "$@"
