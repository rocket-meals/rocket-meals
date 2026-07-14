#!/bin/bash
# =============================================================================
# Maestro Web Smoke Test Runner
# =============================================================================
# Usage:
#   yarn maestro              (from apps/frontend/app/)  – generates + runs tests
#   yarn maestro:runOnly      (from apps/frontend/app/)  – runs tests without regenerating
#   yarn maestro:mock         (from apps/frontend/app/)  – runs the mock-backend tests
#   ./run-maestro-web-test.sh [--skip-generate] [--mock]  (from apps/frontend/)
#
# Flags:
#   --skip-generate   Skip step 5 (YAML generation from TypeScript).
#                     Use when the generated files are already up-to-date.
#   --mock            Start the Directus GET mock backend
#                     (maestro-tests/src/mock-server/mockServer.ts) and start the
#                     Expo dev server with EXPO_PUBLIC_SERVER_URL pointing at it,
#                     so all app requests are answered with the shared fixtures
#                     from packages/common/src/testData. Only tests tagged
#                     "mock-backend" run in this mode; without --mock those
#                     tests are excluded (they would fail on real data).
#
# The script:
#   0. (--mock only) Starts the Directus GET mock backend
#   1. Starts the Expo web dev server in the background (output suppressed)
#   2. Waits until the server is reachable
#   3. Installs Maestro CLI if not already present
#   4. Cleans previously generated YAML files and screenshots
#   5. Generates YAML test files from TypeScript  (skipped with --skip-generate)
#   6. Runs all Maestro tests
#   7. Lists failed tests and screenshot paths (on failure)
#   8. Stops the dev server (and mock backend) on exit (success or failure)
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Parse flags
# ---------------------------------------------------------------------------
SKIP_GENERATE=false
MOCK_MODE=false
for arg in "$@"; do
    case "$arg" in
        --skip-generate)
            SKIP_GENERATE=true
            ;;
        --mock)
            MOCK_MODE=true
            ;;
    esac
done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$SCRIPT_DIR/maestro-tests/generated"
DEV_URL="http://localhost:8081/"
MOCK_SERVER_PORT="${MOCK_SERVER_PORT:-4030}"
MOCK_SERVER_URL="http://localhost:$MOCK_SERVER_PORT"
MOCK_BACKEND_TAG="mock-backend"
export PATH="$HOME/.maestro/bin:$PATH"

echo "=== Maestro Web Smoke Test ==="
echo ""

# ---------------------------------------------------------------------------
# 0. (--mock only) Start the Directus GET mock backend
# ---------------------------------------------------------------------------
MOCK_PID=""
if [ "$MOCK_MODE" = true ]; then
    echo "Starting Directus GET mock backend on $MOCK_SERVER_URL ..."
    (cd "$SCRIPT_DIR/app" && MOCK_SERVER_PORT="$MOCK_SERVER_PORT" yarn maestro:mock-server) > /dev/null 2>&1 &
    MOCK_PID=$!

    for i in $(seq 1 30); do
        if curl -sf "$MOCK_SERVER_URL/server/health" > /dev/null 2>&1; then
            echo "Mock backend is ready."
            break
        fi
        if [ "$i" -eq 30 ]; then
            echo "ERROR: Mock backend did not start within 30s."
            exit 1
        fi
        sleep 1
    done
    echo ""
fi

# ---------------------------------------------------------------------------
# 1. Start Expo web dev server in the background (output suppressed)
# ---------------------------------------------------------------------------
echo "Starting Expo web dev server..."
# Use the pinned "expo" dependency already installed in node_modules, instead of "npx expo"
# which can fetch and run an on-demand, unpinned package version.
# With --mock, EXPO_PUBLIC_SERVER_URL is inlined into the bundle by Metro and
# overrides the backend URL of every customer config (see app/config.ts).
if [ "$MOCK_MODE" = true ]; then
    (cd "$SCRIPT_DIR/app" && BROWSER=none EXPO_PUBLIC_SERVER_URL="$MOCK_SERVER_URL" yarn expo start --web --non-interactive) > /dev/null 2>&1 &
else
    (cd "$SCRIPT_DIR/app" && BROWSER=none yarn expo start --web --non-interactive) > /dev/null 2>&1 &
fi
WEB_PID=$!

# Stop the dev server, the mock backend and any child processes on exit
cleanup() {
    echo ""
    echo "Stopping Expo web dev server (PID $WEB_PID)..."
    kill "$WEB_PID" 2>/dev/null || true
    pkill -P "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
    if [ -n "$MOCK_PID" ]; then
        echo "Stopping mock backend (PID $MOCK_PID)..."
        kill "$MOCK_PID" 2>/dev/null || true
        pkill -P "$MOCK_PID" 2>/dev/null || true
        wait "$MOCK_PID" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# 2. Wait until the dev server is reachable
# ---------------------------------------------------------------------------
echo "Waiting for dev server at $DEV_URL ..."
MAX_WAIT=120
for i in $(seq 1 $MAX_WAIT); do
    if curl -sf "$DEV_URL" > /dev/null 2>&1; then
        echo "Server is ready."
        break
    fi
    if [ "$i" -eq "$MAX_WAIT" ]; then
        echo "ERROR: Dev server did not start within ${MAX_WAIT}s."
        exit 1
    fi
    echo "  Waiting... ($i/${MAX_WAIT}s)"
    sleep 1
done
echo ""

# ---------------------------------------------------------------------------
# 3. Install Maestro CLI if not already installed
# ---------------------------------------------------------------------------
if ! command -v maestro &> /dev/null; then
    echo "Maestro CLI not found – installing..."
    # Download to a file first (instead of piping straight into bash) so the installer can be
    # sanity-checked before it is executed, and pin the transport to TLS.
    MAESTRO_INSTALLER="$(mktemp)"
    curl -fsSL --proto '=https' --tlsv1.2 -o "$MAESTRO_INSTALLER" "https://get.maestro.mobile.dev"
    [ -s "$MAESTRO_INSTALLER" ] || { echo "ERROR: Downloaded Maestro installer is empty."; exit 1; }
    head -n1 "$MAESTRO_INSTALLER" | grep -q '^#!' || { echo "ERROR: Downloaded Maestro installer does not look like a shell script."; exit 1; }
    bash "$MAESTRO_INSTALLER"
    rm -f "$MAESTRO_INSTALLER"
    export PATH="$HOME/.maestro/bin:$PATH"
fi

if ! command -v maestro &> /dev/null; then
    echo "ERROR: Maestro CLI installation failed."
    echo "Install manually: curl -fsSL \"https://get.maestro.mobile.dev\" | bash"
    exit 1
fi

# ---------------------------------------------------------------------------
# 4. Clean previously generated YAML files and screenshots
# ---------------------------------------------------------------------------
echo "Cleaning previously generated YAML files..."
find "$GENERATED_DIR" -maxdepth 1 -type f -name "*.yaml" -delete
echo "Cleaning previous Maestro screenshots..."
find "$HOME/.maestro/tests" -type f -name "*.png" -delete 2>/dev/null || true
echo ""

# ---------------------------------------------------------------------------
# 5. Generate YAML test files from TypeScript
# ---------------------------------------------------------------------------
if [ "$SKIP_GENERATE" = true ]; then
    echo "Skipping YAML generation (--skip-generate flag set)."
else
    echo "Generating YAML test files from TypeScript..."
    (cd "$SCRIPT_DIR/app" && yarn maestro:generate)
fi
echo ""

# ---------------------------------------------------------------------------
# 6. Run Maestro tests
# ---------------------------------------------------------------------------
MAESTRO_DEBUG_DIR="/tmp/maestro-debug-$$"
mkdir -p "$MAESTRO_DEBUG_DIR"

echo "Running Maestro tests..."
echo ""
set +e
if [ "$MOCK_MODE" = true ]; then
    # Only run tests that are designed for the deterministic mock backend.
    maestro test "$GENERATED_DIR" --platform web --include-tags "$MOCK_BACKEND_TAG" --debug-output "$MAESTRO_DEBUG_DIR"
else
    # Exclude mock-backend tests: they assert fixture data that the real backend does not serve.
    maestro test "$GENERATED_DIR" --platform web --exclude-tags "$MOCK_BACKEND_TAG" --debug-output "$MAESTRO_DEBUG_DIR"
fi
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
    echo "=== Failure Reasons ==="
    FOUND_ERRORS=false
    # Search for error/failure messages in Maestro debug log files
    while IFS= read -r -d '' logfile; do
        ERRORS=$(grep -iE "(FAILED|ERROR|Exception|Element not found|No element|Timeout|assert|tapOn)" "$logfile" 2>/dev/null | grep -v "^#" | head -20)
        if [ -n "$ERRORS" ]; then
            echo ""
            echo "  📄 $(basename "$logfile"):"
            echo "$ERRORS" | sed 's/^/    /'
            FOUND_ERRORS=true
        fi
    done < <(find "$MAESTRO_DEBUG_DIR" "$HOME/.maestro/tests" -type f \( -name "*.log" -o -name "*.txt" -o -name "*.xml" \) -print0 2>/dev/null)
    if [ "$FOUND_ERRORS" = false ]; then
        echo "  (no detailed error logs found in $MAESTRO_DEBUG_DIR)"
    fi
    echo ""
    exit "$MAESTRO_EXIT_CODE"
fi
