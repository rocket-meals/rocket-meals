#!/bin/bash
# =============================================================================
# Maestro Web Smoke Test Runner
# =============================================================================
# Usage (from apps/frontend/ or via `yarn maestro` in apps/frontend/app/):
#   ./run-maestro-web-test.sh
#
# In CI (CI=true, set automatically by GitHub Actions), --headless is added.
#
# Individual steps (from apps/frontend/app/):
#   yarn deploy:local     # build + serve on http://localhost:3000/rocket-meals
#   yarn maestro:generate # compile TS tests → maestro-tests/generated/*.yaml
#   yarn maestro          # full flow: build, serve, generate YAMLs, run tests
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$SCRIPT_DIR/app"
GENERATED_DIR="$SCRIPT_DIR/maestro-tests/generated"
SERVE_DIR="$APP_DIR/serveDist"
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
mkdir -p "$SERVE_DIR/rocket-meals"
cp -r "$APP_DIR/dist/"* "$SERVE_DIR/rocket-meals/"
echo "Build complete."
echo ""

# ── Start static file server on port 3000 ───────────────────────────────────
echo "Starting serve on http://localhost:3000/ ..."
"$APP_DIR/node_modules/.bin/serve" "$SERVE_DIR" &
SERVER_PID=$!

cleanup() {
    echo ""
    echo "Stopping server (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
}
trap cleanup EXIT

# ── Wait for server to be ready ──────────────────────────────────────────────
echo "Waiting for http://localhost:3000/rocket-meals/ ..."
for i in $(seq 1 30); do
    if curl -sf http://localhost:3000/rocket-meals/ > /dev/null 2>&1; then
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

MAESTRO_FLAGS="--platform web"

# In CI (GitHub Actions sets CI=true), run headless
if [ -n "$CI" ]; then
    MAESTRO_FLAGS="$MAESTRO_FLAGS --headless"
fi

# shellcheck disable=SC2086
maestro test "$GENERATED_DIR" $MAESTRO_FLAGS "$@"
