#!/bin/bash
# =============================================================================
# Maestro Web Smoke Test Runner
# =============================================================================
# Usage (from apps/frontend/ or via `yarn maestro` in apps/frontend/app/):
#   ./run-maestro-web-test.sh
#
# Builds the Expo web app statically, serves it on http://localhost:8081/,
# generates Maestro YAML files from TypeScript, runs all tests, then shuts
# down the server automatically.
#
# Using a static export + serve (instead of `expo start --web`) avoids
# server-side rendering in Node.js, which causes `window is not defined`
# errors from libraries such as AsyncStorage.
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

# ── Build the web app ────────────────────────────────────────────────────────
echo "Building web app..."
(cd "$APP_DIR" && yarn export:web:dev)
echo "Build complete."
echo ""

# ── Start static file server on port 8081 ───────────────────────────────────
echo "Starting static server on http://localhost:8081/ ..."
npx --yes serve "$APP_DIR/dist" --listen 8081 --single &
SERVER_PID=$!

cleanup() {
    echo ""
    echo "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ── Wait for server to be ready ──────────────────────────────────────────────
echo "Waiting for http://localhost:8081/ ..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:8081/ > /dev/null 2>&1; then
        echo "Server is ready."
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo "ERROR: Server did not become ready in time."
        exit 1
    fi
    echo "  Waiting... ($i/30)"
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
