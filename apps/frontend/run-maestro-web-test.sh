#!/bin/bash
# =============================================================================
# Maestro Web Smoke Test Runner
# =============================================================================
# Usage:
#   yarn maestro              (from apps/frontend/app/)  – generates + runs tests
#   yarn maestro:runOnly      (from apps/frontend/app/)  – runs tests without regenerating
#   ./run-maestro-web-test.sh [--skip-generate] [--screen-size WxH]  (from apps/frontend/)
#
# Flags:
#   --skip-generate   Skip step 5 (YAML generation from TypeScript).
#                     Use when the generated files are already up-to-date.
#   --screen-size     Browser viewport (Web only), e.g. --screen-size 430x932 for
#                     iPhone-format store screenshots. The screens-test flows already
#                     request the deviceMock=iphone status bar, so a phone-sized run
#                     produces app-store-ready captures of every screen.
#   --store-screenshots
#                     Store-photo mode: runs headless at a phone-layout viewport with
#                     the App-Store 6.7" aspect ratio, then upscales every screen-*.png
#                     to the exact 1290x2796 App Store size (via sips). Maestro can't
#                     set a deviceScaleFactor like the old puppeteer screenshotGenerator
#                     could, so native-DPI capture isn't possible - capture at the
#                     largest width that still renders the phone layout and scale up.
#
# The script:
#   1. Starts the Expo web dev server in the background (output suppressed)
#   2. Waits until the server is reachable
#   3. Installs Maestro CLI if not already present
#   4. Cleans previously generated YAML files and screenshots
#   5. Generates YAML test files from TypeScript  (skipped with --skip-generate)
#   6. Runs all Maestro tests
#   7. Lists failed tests and screenshot paths (on failure)
#   8. Stops the dev server on exit (success or failure)
# =============================================================================

set -e

# ---------------------------------------------------------------------------
# Parse flags
# ---------------------------------------------------------------------------
SKIP_GENERATE=false
SCREEN_SIZE=""
STORE_SCREENSHOTS=false
EXPECT_SCREEN_SIZE=false
for arg in "$@"; do
    if [ "$EXPECT_SCREEN_SIZE" = true ]; then
        SCREEN_SIZE="$arg"
        EXPECT_SCREEN_SIZE=false
        continue
    fi
    case "$arg" in
        --skip-generate)
            SKIP_GENERATE=true
            ;;
        # (Web only) browser viewport, e.g. --screen-size 430x932 for iPhone-format
        # store screenshots (combined with the deviceMock=iphone status bar the
        # screens-test flows already request).
        --screen-size)
            EXPECT_SCREEN_SIZE=true
            ;;
        --screen-size=*)
            SCREEN_SIZE="${arg#--screen-size=}"
            ;;
        --store-screenshots)
            STORE_SCREENSHOTS=true
            ;;
    esac
done

# Store-photo mode: 640 CSS px is the widest viewport that still renders the phone
# layout; 1530 window height compensates Chrome's ~143px headless window chrome so the
# capture comes out at 640x1387 - exactly the App-Store 6.7" aspect ratio (1290:2796).
if [ "$STORE_SCREENSHOTS" = true ]; then
    SCREEN_SIZE="640x1530"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GENERATED_DIR="$SCRIPT_DIR/maestro-tests/generated"
DEV_URL="http://localhost:8081/"
export PATH="$HOME/.maestro/bin:$PATH"

echo "=== Maestro Web Smoke Test ==="
echo ""

# ---------------------------------------------------------------------------
# 1. Start Expo web dev server in the background (output suppressed)
# ---------------------------------------------------------------------------
echo "Starting Expo web dev server..."
(cd "$SCRIPT_DIR/app" && BROWSER=none npx expo start --web --non-interactive) > /dev/null 2>&1 &
WEB_PID=$!

# Stop the dev server (and any child processes) when the script exits
cleanup() {
    echo ""
    echo "Stopping Expo web dev server (PID $WEB_PID)..."
    kill "$WEB_PID" 2>/dev/null || true
    pkill -P "$WEB_PID" 2>/dev/null || true
    wait "$WEB_PID" 2>/dev/null || true
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
    curl -fsSL "https://get.maestro.mobile.dev" | bash
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
    if [ "$STORE_SCREENSHOTS" = true ]; then
        # Give async content (e.g. food images) time to load before each screenshot
        (cd "$SCRIPT_DIR/app" && MAESTRO_SCREENS_SETTLE_MS=6000 yarn maestro:generate)
    else
        (cd "$SCRIPT_DIR/app" && yarn maestro:generate)
    fi
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
if [ "$STORE_SCREENSHOTS" = true ]; then
    # --screen-size only takes effect in headless mode
    maestro test "$GENERATED_DIR" --platform web --headless --screen-size "$SCREEN_SIZE" --include-tags screens --debug-output "$MAESTRO_DEBUG_DIR"
elif [ -n "$SCREEN_SIZE" ]; then
    maestro test "$GENERATED_DIR" --platform web --headless --screen-size "$SCREEN_SIZE" --debug-output "$MAESTRO_DEBUG_DIR"
else
    maestro test "$GENERATED_DIR" --platform web --debug-output "$MAESTRO_DEBUG_DIR"
fi
MAESTRO_EXIT_CODE=$?

# Upscale the captures to the exact App Store 6.7" size (1290x2796)
if [ "$STORE_SCREENSHOTS" = true ] && [ "$MAESTRO_EXIT_CODE" -eq 0 ]; then
    echo ""
    echo "Scaling store screenshots to 1290x2796..."
    STORE_DIR="$SCRIPT_DIR/store-screenshots"
    mkdir -p "$STORE_DIR"
    for png in "$SCRIPT_DIR"/screen-*.png "$SCRIPT_DIR"/app/screen-*.png; do
        [ -f "$png" ] || continue
        target="$STORE_DIR/$(basename "$png")"
        if command -v sips &> /dev/null; then
            sips -z 2796 1290 "$png" --out "$target" > /dev/null
        elif command -v convert &> /dev/null; then
            convert "$png" -resize '1290x2796!' "$target"
        else
            echo "WARNING: neither sips nor ImageMagick found - copying unscaled"
            cp "$png" "$target"
        fi
        echo "  📱 $target"
    done
fi
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
