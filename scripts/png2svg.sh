#!/usr/bin/env bash
# png2svg.sh — Convert PNG images to multi-color SVG using potrace (GPLv2)
#
# Dependencies:
#   - python3 with Pillow (pip install Pillow)
#   - potrace (apt install potrace)
#
# Usage:
#   ./scripts/png2svg.sh <input.png> [output.svg]
#   ./scripts/png2svg.sh <input_directory> [output_directory]
#
# Examples:
#   # Convert a single file:
#   ./scripts/png2svg.sh assets/hexagons/decor/marketplace00.png
#
#   # Convert an entire directory:
#   ./scripts/png2svg.sh assets/hexagons/decor/ assets/hexagons/decor_svg/
#
# The script quantises the PNG colours, traces each colour layer with potrace,
# and composites them into a single layered SVG.  Only free / open-source tools
# are used (Pillow — PIL-fork, potrace — GPLv2).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ---------------------------------------------------------------------------
# Defaults – tweak these if you want different quality / colour count.
# ---------------------------------------------------------------------------
MAX_COLORS="${MAX_COLORS:-64}"        # max number of colour clusters
POTRACE_OPTS="${POTRACE_OPTS:--t 4}"  # potrace turdsize (ignore specs < N px)
ALPHA_THRESHOLD="${ALPHA_THRESHOLD:-128}"  # pixels below this alpha are transparent

# ---------------------------------------------------------------------------
# Dependency checks
# ---------------------------------------------------------------------------
check_deps() {
  local missing=()
  command -v python3 >/dev/null 2>&1 || missing+=("python3")
  command -v potrace >/dev/null 2>&1 || missing+=("potrace")
  python3 -c "import PIL" 2>/dev/null || missing+=("Pillow (pip install Pillow)")

  if [ ${#missing[@]} -gt 0 ]; then
    echo "ERROR: Missing dependencies: ${missing[*]}" >&2
    exit 1
  fi
}

# ---------------------------------------------------------------------------
# convert_one  <input.png>  <output.svg>
# ---------------------------------------------------------------------------
convert_one() {
  local input="$1"
  local output="$2"

  echo "Converting: $input -> $output"

  python3 "${SCRIPT_DIR}/png2svg_helper.py" \
    --input "$input" \
    --output "$output" \
    --max-colors "$MAX_COLORS" \
    --alpha-threshold "$ALPHA_THRESHOLD" \
    --potrace-opts "$POTRACE_OPTS"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
check_deps

if [ $# -lt 1 ]; then
  echo "Usage: $0 <input.png|input_dir> [output.svg|output_dir]" >&2
  exit 1
fi

INPUT="$1"

if [ -f "$INPUT" ]; then
  # --- Single file mode ---
  OUTPUT="${2:-${INPUT%.png}.svg}"
  convert_one "$INPUT" "$OUTPUT"

elif [ -d "$INPUT" ]; then
  # --- Directory mode ---
  OUTPUT_DIR="${2:-${INPUT%/}_svg}"
  mkdir -p "$OUTPUT_DIR"

  shopt -s nullglob
  png_files=("$INPUT"/*.png)
  shopt -u nullglob

  if [ ${#png_files[@]} -eq 0 ]; then
    echo "No PNG files found in $INPUT" >&2
    exit 1
  fi

  echo "Converting ${#png_files[@]} PNG files from $INPUT to $OUTPUT_DIR ..."
  for f in "${png_files[@]}"; do
    base="$(basename "$f" .png)"
    convert_one "$f" "$OUTPUT_DIR/${base}.svg"
  done
  echo "Done. SVGs written to $OUTPUT_DIR"

else
  echo "ERROR: $INPUT is neither a file nor a directory." >&2
  exit 1
fi
