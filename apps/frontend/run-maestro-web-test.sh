#!/bin/bash
# =============================================================================
# Maestro Web Smoke Test Runner
# =============================================================================
# Usage:
#   yarn maestro          (from apps/frontend/app/)
#   ./run-maestro-web-test.sh  (from apps/frontend/)
#
# The script:
#   1. Exports the Expo web app with base URL = root (no /rocket-meals prefix)
#   2. Serves the exported files with a static python3 server
#   3. Installs Maestro CLI if not already present
#   4. Generates YAML test files from TypeScript
#   5. Runs all Maestro tests
#   6. Lists failed tests and screenshot paths (on failure)
#   7. Stops the static server on exit (success or failure)
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$SCRIPT_DIR/maestro-tests/generated"
DEV_URL="http://localhost:8081/"
WEBROOT="/tmp/maestro-webroot-$$"
export PATH="$HOME/.maestro/bin:$PATH"

echo "=== Maestro Web Smoke Test ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Export the Expo web app (EXPO_WEB_BASE_URL= overrides baseUrl to root so
#    the app is served at http://localhost:8081/ without the /rocket-meals prefix)
# ---------------------------------------------------------------------------
echo "Exporting Expo web app (this may take a minute)..."
EXPO_EXPORT_LOG="/tmp/expo-export-$$.log"
if ! (cd "$SCRIPT_DIR/app" && yarn export:web:dev) > "$EXPO_EXPORT_LOG" 2>&1; then
    echo "ERROR: Expo web export failed. See log:"
    cat "$EXPO_EXPORT_LOG"
    rm -f "$EXPO_EXPORT_LOG"
    exit 1
fi
echo "Export complete."
rm -f "$EXPO_EXPORT_LOG"
echo ""

# ---------------------------------------------------------------------------
# 2. Serve the exported web app with a static file server
# ---------------------------------------------------------------------------
echo "Starting static web server at $DEV_URL ..."
mkdir -p "$WEBROOT"
cp -r "$SCRIPT_DIR/app/dist/"* "$WEBROOT/"
python3 -m http.server 8081 --directory "$WEBROOT" > /dev/null 2>&1 &
WEB_PID=$!

# Stop the server and clean up when the script exits
cleanup() {
    echo ""
    echo "Stopping static web server (PID $WEB_PID)..."
    kill "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
    rm -rf "$WEBROOT"
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# 3. Wait until the static server is reachable
# ---------------------------------------------------------------------------
MAX_WAIT=30
for i in $(seq 1 $MAX_WAIT); do
    if curl -sf "$DEV_URL" > /dev/null 2>&1; then
        echo "Server is ready."
        break
    fi
    if [ "$i" -eq "$MAX_WAIT" ]; then
        echo "ERROR: Static server did not start within ${MAX_WAIT}s."
        exit 1
    fi
    echo "  Waiting... ($i/${MAX_WAIT}s)"
    sleep 1
done
echo ""

# ---------------------------------------------------------------------------
# 4. Install Maestro CLI if not already installed
# ---------------------------------------------------------------------------
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

# ---------------------------------------------------------------------------
# 5. Generate YAML test files from TypeScript
# ---------------------------------------------------------------------------
echo "Generating YAML test files from TypeScript..."
(cd "$SCRIPT_DIR/app" && yarn maestro:generate)
echo ""

# ---------------------------------------------------------------------------
# 6. Run Maestro tests
# ---------------------------------------------------------------------------
MAESTRO_DEBUG_DIR="/tmp/maestro-debug-$$"
mkdir -p "$MAESTRO_DEBUG_DIR"

echo "Running Maestro tests..."
echo ""
set +e
maestro test "$GENERATED_DIR" --platform web --debug-output "$MAESTRO_DEBUG_DIR"
MAESTRO_EXIT_CODE=$?
set -e

# ---------------------------------------------------------------------------
# 7. Report failed tests and screenshot paths
# ---------------------------------------------------------------------------
if [ "$MAESTRO_EXIT_CODE" -ne 0 ]; then
    echo ""
    echo "=== Failed Tests & Screenshots ==="
    FOUND_SCREENSHOTS=false
    while IFS= read -r -d '' png; do
        echo "  📸 $png"
        FOUND_SCREENSHOTS=true
    done < <(find "$MAESTRO_DEBUG_DIR" "$HOME/.maestro/tests" -type f -name "*.png" -print0 2>/dev/null)
    if [ "$FOUND_SCREENSHOTS" = false ]; then
        echo "  (no screenshots found)"
    fi
    echo ""
    exit "$MAESTRO_EXIT_CODE"
fi
