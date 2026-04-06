#!/usr/bin/env python3
"""
png2svg_helper.py — Convert a single PNG to a multi-colour SVG.

Strategy
--------
1.  Load the PNG with Pillow.
2.  Quantise it to at most *max_colors* colours (median-cut).
3.  For every unique colour, create a 1-bit PBM mask of that colour's pixels.
4.  Run **potrace** on each mask to obtain an SVG path.
5.  Combine all paths into one layered SVG, painting each path with its colour.

Only free / open-source software is used:
  - Pillow (MIT-like)  — image loading and quantisation
  - potrace (GPLv2)    — bitmap → vector tracing

Usage (called by png2svg.sh, but can also be used standalone):

    python3 png2svg_helper.py --input in.png --output out.svg
"""

from __future__ import annotations

import argparse
import io
import os
import re
import subprocess
import struct
import sys
import tempfile
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("ERROR: Pillow is not installed.  Run:  pip install Pillow")


# ── helpers ──────────────────────────────────────────────────────────────────

def rgba_hex(r: int, g: int, b: int) -> str:
    """Return a CSS hex colour string like '#a4f0c2'."""
    return f"#{r:02x}{g:02x}{b:02x}"


def make_pbm(mask_bytes: bytes, width: int, height: int) -> bytes:
    """Create a PBM (P4, packed-bit) binary image from a boolean mask.

    *mask_bytes* is a flat bytes object of length width*height where each
    byte is 0x00 (background) or 0xFF (foreground).
    """
    # PBM P4: each row is ceil(width/8) bytes, MSB first, 1 = black.
    row_bytes = (width + 7) // 8
    rows: list[bytes] = []
    for y in range(height):
        row_bits = bytearray(row_bytes)
        offset = y * width
        for x in range(width):
            if mask_bytes[offset + x]:
                row_bits[x >> 3] |= 0x80 >> (x & 7)
        rows.append(bytes(row_bits))
    header = f"P4\n{width} {height}\n".encode("ascii")
    return header + b"".join(rows)


def run_potrace(pbm_data: bytes, potrace_opts: str) -> str:
    """Run potrace on PBM data and return the SVG path data."""
    # potrace -s (SVG) reads from stdin, writes to stdout
    opts = potrace_opts.split() if potrace_opts.strip() else []
    result = subprocess.run(
        ["potrace", "-s", "--flat", *opts],
        input=pbm_data,
        capture_output=True,
    )
    if result.returncode != 0:
        raise RuntimeError(f"potrace failed: {result.stderr.decode()}")
    return result.stdout.decode("utf-8")


def extract_paths(svg_text: str) -> list[str]:
    """Pull out all <path d="…"/> data strings from potrace SVG output."""
    return re.findall(r'<path[^>]*\bd="([^"]+)"', svg_text)


# ── main conversion ─────────────────────────────────────────────────────────

def png_to_svg(
    input_path: str,
    output_path: str,
    max_colors: int = 64,
    alpha_threshold: int = 128,
    potrace_opts: str = "-t 4",
) -> None:
    img = Image.open(input_path).convert("RGBA")
    width, height = img.size

    # ── 1. Quantise ──────────────────────────────────────────────────────
    # We work on an opaque copy so that quantisation ignores alpha.
    opaque = Image.new("RGB", (width, height), (255, 255, 255))
    opaque.paste(img, mask=img.split()[3])  # paste using alpha channel as mask

    quantised = opaque.quantize(colors=max_colors, method=Image.Quantize.MEDIANCUT)
    palette_data = quantised.getpalette()  # flat list [r,g,b, r,g,b, …]
    if palette_data is None:
        raise RuntimeError("quantise returned no palette")

    quant_rgb = quantised.convert("RGB")
    quant_pixels = quant_rgb.load()
    alpha_channel = img.split()[3]
    alpha_pixels = alpha_channel.load()

    # ── 2. Collect unique visible colours ─────────────────────────────────
    colour_set: set[tuple[int, int, int]] = set()
    for y in range(height):
        for x in range(width):
            if alpha_pixels[x, y] >= alpha_threshold:
                colour_set.add(quant_pixels[x, y])

    colours = sorted(colour_set)  # deterministic order
    if not colours:
        # Fully transparent image — write an empty SVG.
        Path(output_path).write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}"/>\n'
        )
        return

    # ── 3. For each colour, build a mask, trace with potrace ─────────────
    layers: list[tuple[str, list[str]]] = []  # (hex_colour, [path_d, …])

    for colour in colours:
        # Build 1-bit mask
        mask = bytearray(width * height)
        for y in range(height):
            for x in range(width):
                if (
                    alpha_pixels[x, y] >= alpha_threshold
                    and quant_pixels[x, y] == colour
                ):
                    mask[y * width + x] = 0xFF

        pbm = make_pbm(bytes(mask), width, height)
        svg_out = run_potrace(pbm, potrace_opts)
        paths = extract_paths(svg_out)
        if paths:
            layers.append((rgba_hex(*colour), paths))

    # ── 4. Assemble final SVG ────────────────────────────────────────────
    lines: list[str] = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'version="1.1" width="{width}" height="{height}" '
        f'viewBox="0 0 {width} {height}">',
    ]

    # potrace outputs paths in a coordinate system where Y is flipped,
    # so we wrap everything in a transform.
    lines.append(f'<g transform="translate(0,{height}) scale(1,-1)">')

    for hex_colour, path_list in layers:
        for d in path_list:
            lines.append(
                f'  <path d="{d}" fill="{hex_colour}" stroke="none"/>'
            )

    lines.append("</g>")
    lines.append("</svg>")
    lines.append("")

    Path(output_path).write_text("\n".join(lines), encoding="utf-8")
    svg_size = os.path.getsize(output_path)
    png_size = os.path.getsize(input_path)
    print(f"  ✓ {os.path.basename(output_path)}  "
          f"({len(colours)} colours, {len(layers)} layers, "
          f"PNG {png_size//1024}KB → SVG {svg_size//1024}KB)")


# ── CLI ──────────────────────────────────────────────────────────────────────

def main() -> None:
    ap = argparse.ArgumentParser(description="Convert a PNG to a multi-colour SVG")
    ap.add_argument("--input", required=True, help="Input PNG file")
    ap.add_argument("--output", required=True, help="Output SVG file")
    ap.add_argument("--max-colors", type=int, default=64)
    ap.add_argument("--alpha-threshold", type=int, default=128)
    ap.add_argument("--potrace-opts", default="-t 4")
    args = ap.parse_args()

    png_to_svg(
        input_path=args.input,
        output_path=args.output,
        max_colors=args.max_colors,
        alpha_threshold=args.alpha_threshold,
        potrace_opts=args.potrace_opts,
    )


if __name__ == "__main__":
    main()
