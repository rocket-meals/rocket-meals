#!/usr/bin/env python3
"""Generate 3D room models from a parametric spec.

Outputs, per room, into ./out:
  <room>.obj + <room>.mtl   coloured mesh (metres, Y-up)
  <room>.stl                binary STL (metres, Y-up, no colours)
and one WebXR viewer that can be opened with a VR/MR headset.

Geometry is built from axis-aligned boxes and cylinders, so every
dimension below is a plain number in metres and easy to adjust.
"""

import json
import math
import os
import struct

OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")

# ceiling and near wall: kept in the closed export, dropped in the open one
TOP_SHELL = "top"


# --------------------------------------------------------------------------
# materials
# --------------------------------------------------------------------------

def rgb(hex_color):
    h = hex_color.lstrip("#")
    return tuple(int(h[i:i + 2], 16) / 255.0 for i in (0, 2, 4))


MATERIALS = {
    # shared
    "wall":         dict(color="#f2efe9", rough=0.95),
    "ceiling":      dict(color="#fbfaf8", rough=0.97),
    "light":        dict(color="#fff6e0", rough=0.4, emissive=1.0),
    "glass":        dict(color="#cfe4ec", rough=0.05, opacity=0.35),
    "sky":          dict(color="#e8f1fa", rough=1.0, emissive=1.0),
    "frame_white":  dict(color="#f7f6f3", rough=0.6),
    "black":        dict(color="#1b1b1d", rough=0.45),
    "chrome":       dict(color="#c3c7cb", rough=0.15, metal=0.9),
    "porcelain":    dict(color="#f7f7f5", rough=0.25),
    # kitchen
    "floor_wood_a": dict(color="#d6bd97", rough=0.75),
    "floor_wood_b": dict(color="#cbb088", rough=0.75),
    "cabinet":      dict(color="#f4f2ee", rough=0.55),
    "cabinet_edge": dict(color="#e6e3dd", rough=0.6),
    "worktop_oak":  dict(color="#cbab77", rough=0.5),
    "backsplash":   dict(color="#c2bcb4", rough=0.35),
    "toe_kick":     dict(color="#3a3a3c", rough=0.7),
    # bathroom
    "tile_floor":   dict(color="#43454a", rough=0.35),
    "tile_wall":    dict(color="#4c4e53", rough=0.4),
    "grout":        dict(color="#2c2d30", rough=0.8),
    "plaster":      dict(color="#e9e5dd", rough=0.95),
    "vanity_wood":  dict(color="#6b5540", rough=0.6),
    "mirror":       dict(color="#c8d2d8", rough=0.02, metal=1.0),
    "towel":        dict(color="#fafafa", rough=0.9),
    "basin_inner":  dict(color="#d9d9d4", rough=0.3),
}


# --------------------------------------------------------------------------
# room / primitives
# --------------------------------------------------------------------------

class Room:
    """Collects axis-aligned primitives that make up one room."""

    def __init__(self, key, title, width, depth, height, eye=(0.0, 1.65, 0.0)):
        self.key = key
        self.title = title
        self.width = width          # x
        self.depth = depth          # z
        self.height = height        # y
        self.eye = eye              # start position for the viewer
        self.prims = []
        self.lights = []
        self.tag = None             # active tag, see TOP_SHELL

    # -- primitives --------------------------------------------------------

    def box(self, mat, x0, x1, y0, y1, z0, z1):
        """Box from two opposite corners (order-independent)."""
        x0, x1 = sorted((x0, x1))
        y0, y1 = sorted((y0, y1))
        z0, z1 = sorted((z0, z1))
        prim = {"t": "box", "m": mat,
                "c": [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2],
                "s": [x1 - x0, y1 - y0, z1 - z0]}
        if self.tag:
            prim["g"] = self.tag
        self.prims.append(prim)
        return self.prims[-1]

    def cyl(self, mat, center, radius, length, axis="y", seg=20):
        prim = {"t": "cyl", "m": mat, "c": list(center),
                "r": radius, "h": length, "a": axis, "seg": seg}
        if self.tag:
            prim["g"] = self.tag
        self.prims.append(prim)
        return self.prims[-1]

    def light(self, position, intensity=1.0, distance=0.0):
        self.lights.append({"p": list(position), "i": intensity, "d": distance})

    # -- composite helpers -------------------------------------------------

    def wall(self, mat, plane, at, thickness, u0, u1, y0, y1, openings=()):
        """A wall with rectangular openings (doors / windows).

        plane 'z': wall lies in the XY plane at z=`at`, u is x.
        plane 'x': wall lies in the ZY plane at x=`at`, u is z.
        `thickness` is positive to grow towards +axis, negative towards -axis.
        Each opening is (u_start, u_end, y_start, y_end).
        """
        a0, a1 = sorted((at, at + thickness))

        def slab(u_a, u_b, y_a, y_b):
            if u_b - u_a <= 1e-6 or y_b - y_a <= 1e-6:
                return
            if plane == "z":
                self.box(mat, u_a, u_b, y_a, y_b, a0, a1)
            else:
                self.box(mat, a0, a1, y_a, y_b, u_a, u_b)

        cursor = u0
        for (ou0, ou1, oy0, oy1) in sorted(openings):
            slab(cursor, ou0, y0, y1)          # pillar left of the opening
            slab(ou0, ou1, y0, oy0)            # below the opening
            slab(ou0, ou1, oy1, y1)            # above the opening
            cursor = ou1
        slab(cursor, u1, y0, y1)               # remaining pillar

    def opening(self, plane, at, thickness, u0, u1, y0, y1,
                lining="frame_white", glass="glass", t=0.03, frame=0.04):
        """Line a wall opening (reveal + glazing) instead of blocking it.

        Same plane convention as `wall`. The glazing sits in the middle of the
        wall, the visible frame stands slightly proud on the room side.
        """
        a0, a1 = sorted((at, at + thickness))
        mid = (a0 + a1) / 2
        inner = a0 if thickness > 0 else a1          # face towards the room
        proud = inner - 0.012 if thickness > 0 else inner + 0.012

        def slab(ua, ub, ya, yb, c0, c1, mat=lining):
            if plane == "z":
                self.box(mat, ua, ub, ya, yb, c0, c1)
            else:
                self.box(mat, c0, c1, ya, yb, ua, ub)

        slab(u0, u1, y0, y0 + t, a0, a1)             # sill
        slab(u0, u1, y1 - t, y1, a0, a1)             # head
        slab(u0, u0 + t, y0, y1, a0, a1)             # reveal side
        slab(u1 - t, u1, y0, y1, a0, a1)             # reveal side
        slab(u0 + t, u1 - t, y0 + t, y1 - t, mid - 0.008, mid + 0.008, glass)
        for (ua, ub, ya, yb) in ((u0, u1, y0, y0 + frame), (u0, u1, y1 - frame, y1),
                                 (u0, u0 + frame, y0, y1), (u1 - frame, u1, y0, y1)):
            slab(ua, ub, ya, yb, min(inner, proud), max(inner, proud))

    def tiles(self, mat, grout_mat, plane, at, depth, u0, u1, v0, v1,
              tile=0.6, gap=0.008):
        """A tiled surface: grout backing plus individual tile slabs.

        plane 'y' (floor/ceiling): u is x, v is z.
        plane 'z': u is x, v is y.   plane 'x': u is z, v is y.
        """
        b0, b1 = sorted((at, at + depth))

        def slab(u_a, u_b, v_a, v_b, m, c0, c1):
            if plane == "y":
                self.box(m, u_a, u_b, c0, c1, v_a, v_b)
            elif plane == "z":
                self.box(m, u_a, u_b, v_a, v_b, c0, c1)
            else:
                self.box(m, c0, c1, v_a, v_b, u_a, u_b)

        back = b0 if depth > 0 else b1
        slab(u0, u1, v0, v1, grout_mat, back, back + (0.006 if depth > 0 else -0.006))

        nu = max(1, int(math.ceil((u1 - u0) / tile)))
        nv = max(1, int(math.ceil((v1 - v0) / tile)))
        for i in range(nu):
            for j in range(nv):
                ua = u0 + i * tile + gap / 2
                ub = min(u0 + (i + 1) * tile - gap / 2, u1 - gap / 2)
                va = v0 + j * tile + gap / 2
                vb = min(v0 + (j + 1) * tile - gap / 2, v1 - gap / 2)
                if ub > ua and vb > va:
                    slab(ua, ub, va, vb, mat, b0, b1)

    def downlights(self, y, xs, zs, radius=0.05):
        for x in xs:
            for z in zs:
                self.cyl("light", (x, y - 0.012, z), radius, 0.024, "y", 16)

    def handle(self, orientation, x, y, z, length, gap=0.035, r=0.009):
        """Bar handle standing off a cabinet front, plus its two posts."""
        if orientation == "z":      # front faces +z, bar runs along x
            self.cyl("black", (x, y, z + gap), r, length, "x", 10)
            for dx in (-length / 2 + 0.02, length / 2 - 0.02):
                self.cyl("black", (x + dx, y, z + gap / 2), r * 0.7, gap, "z", 8)
        else:                       # front faces +x, bar runs along z
            self.cyl("black", (x + gap, y, z), r, length, "z", 10)
            for dz in (-length / 2 + 0.02, length / 2 - 0.02):
                self.cyl("black", (x + gap / 2, y, z + dz), r * 0.7, gap, "x", 8)


# --------------------------------------------------------------------------
# kitchen
# --------------------------------------------------------------------------

def build_kitchen():
    """L-shaped shaker kitchen: run along the back wall, tall units on the
    left, free-standing island with hob and suspended extractor."""
    W, D, H = 4.40, 4.90, 2.65          # room width / depth / height
    T = 0.10                            # wall thickness
    COUNTER_H = 0.90                    # top of the base cabinet carcass
    WORKTOP = 0.045                     # worktop thickness
    BASE_DEPTH = 0.62
    WALL_UNIT_DEPTH = 0.36
    WALL_UNIT_BOTTOM = 1.48
    WALL_UNIT_TOP = 2.32

    r = Room("kitchen", "Kueche", W, D, H, eye=(2.20, 1.65, 4.30))

    # ---- shell -----------------------------------------------------------
    for i in range(int(D / 0.20) + 1):          # plank floor
        z0, z1 = i * 0.20, min((i + 1) * 0.20 - 0.004, D)
        if z1 > z0:
            r.box("floor_wood_a" if i % 2 else "floor_wood_b", 0, W, -0.02, 0, z0, z1)
    r.tag = TOP_SHELL
    r.box("ceiling", -T, W + T, H, H + T, -T, D + T)
    r.tag = None

    r.wall("wall", "z", 0.0, -T, -T, W + T, 0, H)                    # back wall
    r.tag = TOP_SHELL
    r.wall("wall", "z", D, T, -T, W + T, 0, H)                       # front wall
    r.tag = None
    r.wall("wall", "x", W, T, -T, D + T, 0, H,                       # right + window
           openings=[(2.95, 3.95, 0.95, 2.30)])
    r.wall("wall", "x", 0.0, -T, -T, D + T, 0, H,                    # left + doorway
           openings=[(2.85, 3.80, 0.0, 2.05)])

    # window: reveal, frame and glazing
    r.opening("x", W, T, 2.95, 3.95, 0.95, 2.30)
    r.box("frame_white", W - 0.05, W + 0.01, 0.95, 2.30, 3.42, 3.48)      # mullion
    r.box("frame_white", W - 0.10, W + 0.01, 0.90, 0.95, 2.93, 3.97)      # sill board
    r.box("sky", W + 0.9, W + 0.95, -0.5, 3.4, 2.1, 4.8)                 # daylight

    # doorway with lining, small lit hallway behind it
    for (za, zb) in ((2.79, 2.85), (3.80, 3.86)):
        r.box("frame_white", -0.04, 0.02, 0.0, 2.11, za, zb)
    r.box("frame_white", -0.04, 0.02, 2.05, 2.11, 2.79, 3.86)
    r.box("frame_white", -T, 0.0, 0.0, 2.05, 2.79, 2.85)
    r.box("frame_white", -T, 0.0, 0.0, 2.05, 3.80, 3.86)
    r.box("frame_white", -T, 0.0, 2.05, 2.10, 2.79, 3.86)
    r.box("floor_wood_b", -1.30, 0.0, -0.02, 0.0, 2.60, 4.05)             # hallway
    r.box("wall", -1.40, -1.30, 0.0, H, 2.40, 4.20)

    # skirting + cornice
    r.box("frame_white", 0, W, 0, 0.08, 0, 0.02)
    r.box("frame_white", 0, W, 0, 0.08, D - 0.02, D)
    for x in (0.0, W - 0.02):
        r.box("frame_white", x, x + 0.02, 0, 0.08, 0, D)
    r.tag = TOP_SHELL
    for (x0, x1, z0, z1) in ((0, W, 0, 0.06), (0, W, D - 0.06, D),
                             (0, 0.06, 0, D), (W - 0.06, W, 0, D)):
        r.box("ceiling", x0, x1, H - 0.10, H, z0, z1)
    r.box("wall", -1.40, 0.0, H, H + 0.1, 2.40, 4.20)
    r.tag = None

    # ---- tall units, back left ------------------------------------------
    tx0, tx1 = 0.16, 1.40
    tz1 = 0.68
    r.box("toe_kick", tx0, tx1, 0, 0.10, 0.02, tz1 - 0.05)
    r.box("cabinet", tx0, tx1, 0.10, 2.32, 0.0, tz1)
    r.box("ceiling", tx0 - 0.05, tx1 + 0.05, 2.32, 2.46, 0.0, tz1 + 0.05)   # cornice
    for (y0, y1) in ((0.10, 0.88), (0.88, 1.52), (1.52, 2.32)):             # door gaps
        r.box("cabinet_edge", tx0, tx1, y1 - 0.012, y1, tz1 - 0.012, tz1)
    r.box("cabinet_edge", (tx0 + tx1) / 2 - 0.006, (tx0 + tx1) / 2 + 0.006,
          0.10, 2.32, tz1 - 0.012, tz1)
    # built-in oven
    r.box("black", tx0 + 0.06, tx1 - 0.06, 0.92, 1.52, tz1 - 0.02, tz1 + 0.015)
    r.box("chrome", tx0 + 0.10, tx1 - 0.10, 1.06, 1.14, tz1 + 0.015, tz1 + 0.05)
    r.box("frame_white", tx0 + 0.10, tx1 - 0.10, 1.18, 1.44, tz1 + 0.016, tz1 + 0.026)
    for y in (0.60, 1.80, 2.10):
        r.handle("z", (tx0 + tx1) / 2 - 0.30, y, tz1, 0.26)
        r.handle("z", (tx0 + tx1) / 2 + 0.30, y, tz1, 0.26)

    # ---- run along the back wall ----------------------------------------
    bx0, bx1 = 1.50, W - 0.10
    r.box("toe_kick", bx0, bx1, 0, 0.10, 0.02, BASE_DEPTH - 0.05)
    r.box("cabinet", bx0, bx1, 0.10, COUNTER_H, 0.0, BASE_DEPTH)
    # worktop, left open around the sink cut-out
    sx0, sx1, sz0, sz1 = 2.30, 3.05, 0.10, 0.54
    wt0, wt1 = COUNTER_H, COUNTER_H + WORKTOP
    r.box("worktop_oak", bx0 - 0.03, sx0, wt0, wt1, 0.0, BASE_DEPTH + 0.03)
    r.box("worktop_oak", sx1, bx1 + 0.02, wt0, wt1, 0.0, BASE_DEPTH + 0.03)
    r.box("worktop_oak", sx0, sx1, wt0, wt1, 0.0, sz0)
    r.box("worktop_oak", sx0, sx1, wt0, wt1, sz1, BASE_DEPTH + 0.03)
    r.tiles("backsplash", "backsplash", "z", 0.0, 0.022, bx0, bx1,
            COUNTER_H + WORKTOP, WALL_UNIT_BOTTOM, tile=0.62, gap=0.004)

    # drawers / doors in the base run
    xs = [bx0 + i * (bx1 - bx0) / 5 for i in range(6)]
    for i in range(5):
        cx = (xs[i] + xs[i + 1]) / 2
        wdt = (xs[i + 1] - xs[i]) - 0.06
        r.box("cabinet_edge", xs[i + 1] - 0.006, xs[i + 1] + 0.006,
              0.10, COUNTER_H, BASE_DEPTH - 0.012, BASE_DEPTH)
        if i in (0, 4):                                   # drawer stacks
            for y in (0.30, 0.58, 0.82):
                r.handle("z", cx, y, BASE_DEPTH, wdt * 0.55)
                r.box("cabinet_edge", xs[i] + 0.03, xs[i + 1] - 0.03,
                      y + 0.12, y + 0.13, BASE_DEPTH - 0.012, BASE_DEPTH)
        else:
            r.handle("z", cx, 0.80, BASE_DEPTH, wdt * 0.55)

    # sink + tap + hob strip
    r.box("black", sx0, sx1, COUNTER_H - 0.20, COUNTER_H - 0.16, sz0, sz1)    # basin floor
    for (ax0, ax1, az0, az1) in ((sx0, sx0 + 0.02, sz0, sz1), (sx1 - 0.02, sx1, sz0, sz1),
                                 (sx0, sx1, sz0, sz0 + 0.02), (sx0, sx1, sz1 - 0.02, sz1)):
        r.box("black", ax0, ax1, COUNTER_H - 0.20, wt1, az0, az1)          # basin sides
    r.cyl("chrome", (2.90, COUNTER_H - 0.185, 0.32), 0.035, 0.02, "y", 16)  # waste
    r.cyl("black", (2.44, COUNTER_H + 0.19, 0.16), 0.026, 0.36, "y", 14)
    r.cyl("black", (2.44, COUNTER_H + 0.37, 0.16), 0.030, 0.10, "y", 14)
    r.cyl("black", (2.44, COUNTER_H + 0.41, 0.26), 0.022, 0.22, "z", 12)
    r.box("black", 3.25, 3.95, COUNTER_H + WORKTOP - 0.004, COUNTER_H + WORKTOP + 0.006,
          0.08, 0.55)

    # wall units + cornice
    r.box("cabinet", bx0, bx1, WALL_UNIT_BOTTOM, WALL_UNIT_TOP, 0.0, WALL_UNIT_DEPTH)
    r.box("ceiling", bx0 - 0.05, bx1 + 0.05, WALL_UNIT_TOP, WALL_UNIT_TOP + 0.14,
          0.0, WALL_UNIT_DEPTH + 0.05)
    r.box("light", bx0 + 0.05, bx1 - 0.05, WALL_UNIT_BOTTOM - 0.015, WALL_UNIT_BOTTOM,
          0.04, WALL_UNIT_DEPTH - 0.04)      # under-cabinet lighting
    wxs = [bx0 + i * (bx1 - bx0) / 4 for i in range(5)]
    for i in range(4):
        r.box("cabinet_edge", wxs[i + 1] - 0.006, wxs[i + 1] + 0.006,
              WALL_UNIT_BOTTOM, WALL_UNIT_TOP, WALL_UNIT_DEPTH - 0.012, WALL_UNIT_DEPTH)
        cx = (wxs[i] + wxs[i + 1]) / 2
        for dx in (-0.16, 0.16):
            r.handle("z", cx + dx, WALL_UNIT_BOTTOM + 0.22, WALL_UNIT_DEPTH, 0.30)

    # ---- island ----------------------------------------------------------
    ix, iz = 2.05, 2.70
    iw, idp = 1.55, 1.02
    r.box("toe_kick", ix - iw / 2 + 0.05, ix + iw / 2 - 0.05, 0, 0.10,
          iz - idp / 2 + 0.05, iz + idp / 2 - 0.05)
    r.box("cabinet", ix - iw / 2, ix + iw / 2, 0.10, COUNTER_H,
          iz - idp / 2, iz + idp / 2)
    r.box("worktop_oak", ix - iw / 2 - 0.10, ix + iw / 2 + 0.16, COUNTER_H,
          COUNTER_H + 0.055, iz - idp / 2 - 0.10, iz + idp / 2 + 0.10)
    r.box("black", ix + 0.10, ix + 0.72, COUNTER_H + 0.050, COUNTER_H + 0.062,
          iz - 0.28, iz + 0.22)                       # induction hob
    r.box("black", ix - 0.10, ix + 0.02, COUNTER_H + 0.050, COUNTER_H + 0.060,
          iz - 0.10, iz + 0.16)                       # downdraft slot
    for dx in (-0.38, 0.38):                          # drawer fronts, front side
        for y in (0.26, 0.50, 0.74):
            r.handle("z", ix + dx, y, iz + idp / 2, 0.42)
            r.box("cabinet_edge", ix + dx - 0.36, ix + dx + 0.36, y + 0.115, y + 0.125,
                  iz + idp / 2 - 0.012, iz + idp / 2)
    r.box("cabinet_edge", ix - 0.006, ix + 0.006, 0.10, COUNTER_H,
          iz + idp / 2 - 0.012, iz + idp / 2)

    # ---- extractor hood over the island ----------------------------------
    hx, hz = ix + 0.30, iz - 0.05
    r.box("black", hx - 0.60, hx + 0.60, 1.70, 1.96, hz - 0.19, hz + 0.19)
    r.box("light", hx - 0.55, hx + 0.55, 1.79, 1.87, hz + 0.189, hz + 0.196)
    r.box("light", hx - 0.55, hx + 0.55, 1.79, 1.87, hz - 0.196, hz - 0.189)
    r.box("black", hx - 0.64, hx + 0.64, H - 0.06, H, hz - 0.23, hz + 0.23)
    for dx in (-0.55, 0.55):
        for dz in (-0.16, 0.16):
            r.cyl("chrome", (hx + dx, (1.96 + H - 0.06) / 2, hz + dz), 0.004,
                  H - 0.06 - 1.96, "y", 6)

    # ---- lighting --------------------------------------------------------
    r.tag = TOP_SHELL
    r.downlights(H, [0.55, 1.45, 2.35, 3.25, 4.00], [0.55, 1.50, 2.45, 3.40, 4.30])
    r.tag = None
    r.light((2.20, 2.45, 1.60), 0.55, 9.0)
    r.light((1.00, 2.45, 3.60), 0.35, 8.0)
    r.light((3.60, 1.90, 4.00), 0.30, 6.0)
    r.light((W - 0.35, 1.75, 3.45), 0.9, 7.0)          # daylight from the window
    r.light((-0.65, 1.80, 3.30), 0.35, 3.5)            # hallway behind the door
    return r


# --------------------------------------------------------------------------
# bathroom
# --------------------------------------------------------------------------

def build_bathroom():
    """Bathroom with large dark format tiles, corner bath on the left wall,
    floating double vanity with mirror and soffit on the right."""
    W, D, H = 2.70, 4.30, 2.50
    T = 0.10
    TILE = 0.02                          # tile thickness on the walls
    WAINSCOT = 1.15                      # tile height on the plastered walls

    r = Room("bathroom", "Badezimmer", W, D, H, eye=(1.35, 1.65, 3.80))

    # ---- shell -----------------------------------------------------------
    r.tiles("tile_floor", "grout", "y", 0.0, 0.022, 0, W, 0, D, tile=0.60)
    r.tag = TOP_SHELL
    r.box("ceiling", -T, W + T, H, H + T, -T, D + T)
    r.tag = None

    r.wall("plaster", "z", 0.0, -T, -T, W + T, 0, H,
           openings=[(0.55, 1.15, 1.15, 2.05), (1.45, 1.85, 1.15, 2.05)])
    r.tag = TOP_SHELL
    r.wall("plaster", "z", D, T, -T, W + T, 0, H)
    r.tag = None
    r.wall("plaster", "x", 0.0, -T, -T, D + T, 0, H)
    r.wall("plaster", "x", W, T, -T, D + T, 0, H)

    # tiling: right wall floor to ceiling, left + back wall as wainscot
    r.tiles("tile_wall", "grout", "x", W, -TILE, 0, D, 0, H, tile=0.60)
    r.tiles("tile_wall", "grout", "x", 0.0, TILE, 0, D, 0, WAINSCOT, tile=0.60)
    r.tiles("tile_wall", "grout", "z", 0.0, TILE, 0, W, 0, WAINSCOT, tile=0.60)
    r.tag = TOP_SHELL
    r.tiles("tile_wall", "grout", "z", D, -TILE, 0, W, 0, WAINSCOT, tile=0.60)
    r.tag = None

    # windows: reveals, frames, glazing
    for (wx0, wx1) in ((0.55, 1.15), (1.45, 1.85)):
        r.opening("z", 0.0, -T, wx0, wx1, 1.15, 2.05)
        r.box("frame_white", wx0 - 0.04, wx1 + 0.04, 1.11, 1.15, -0.10, 0.06)   # sill
    r.box("sky", -0.4, W + 0.4, 0.2, 3.2, -0.95, -0.90)                       # daylight

    # ---- bath tub on the left wall ---------------------------------------
    bx0, bx1 = 0.04, 0.84
    bz0, bz1 = 1.00, 2.80
    TUB_H, RIM = 0.58, 0.07
    r.box("porcelain", bx0, bx1, 0.0, 0.14, bz0, bz1)                 # basin floor
    r.box("porcelain", bx0, bx0 + RIM, 0.14, TUB_H, bz0, bz1)         # wall side
    r.box("porcelain", bx1 - RIM, bx1, 0.14, TUB_H, bz0, bz1)         # room side
    r.box("porcelain", bx0, bx1, 0.14, TUB_H, bz0, bz0 + RIM)         # head end
    r.box("porcelain", bx0, bx1, 0.14, TUB_H, bz1 - RIM, bz1)         # foot end
    for (cx, cz, rad) in ((bx1 - 0.24, bz1 - 0.24, 0.24),
                          (bx0 + 0.24, bz1 - 0.24, 0.24),
                          (bx1 - 0.12, bz0 + 0.12, 0.12)):
        r.cyl("porcelain", (cx, TUB_H / 2, cz), rad, TUB_H, "y", 24)
    r.box("porcelain", bx0, bx1, 0.0, 0.06, bz0 - 0.02, bz1 + 0.02)   # plinth shadow

    # bath filler + hand shower on the wall above the tub
    r.cyl("chrome", (0.10, 0.78, 1.62), 0.028, 0.14, "x", 14)
    r.cyl("chrome", (0.24, 0.78, 1.62), 0.020, 0.16, "z", 12)
    r.cyl("chrome", (0.09, 0.95, 1.34), 0.030, 0.12, "x", 14)
    r.cyl("chrome", (0.16, 0.86, 1.34), 0.014, 0.24, "y", 10)
    r.cyl("chrome", (0.16, 0.72, 1.34), 0.022, 0.10, "y", 12)

    # ---- vanity wall on the right ----------------------------------------
    vx0, vx1 = 2.14, W - TILE            # cabinet depth
    vz0, vz1 = 1.15, 2.80                # cabinet length
    r.box("vanity_wood", vx0, vx1, 0.55, 0.92, vz0, vz1)
    r.box("vanity_wood", vx0 - 0.02, vx1, 0.92, 0.96, vz0 - 0.02, vz1 + 0.02)  # top
    for (za, zb) in ((vz0 + 0.02, (vz0 + vz1) / 2 - 0.01),
                     ((vz0 + vz1) / 2 + 0.01, vz1 - 0.02)):
        for (ya, yb) in ((0.57, 0.73), (0.75, 0.90)):
            r.box("vanity_wood", vx0 - 0.012, vx0, ya, yb, za, zb)
    r.handle("x", vx0 - 0.05, 0.735, (vz0 + vz1) / 2, 0.34)

    for zc in (1.62, 2.34):              # vessel basins + taps
        r.cyl("porcelain", (2.42, 1.03, zc), 0.215, 0.145, "y", 28)
        r.cyl("basin_inner", (2.42, 1.105, zc), 0.180, 0.012, "y", 28)
        r.cyl("chrome", (2.63, 1.06, zc), 0.024, 0.22, "y", 14)
        r.cyl("chrome", (2.56, 1.16, zc), 0.019, 0.15, "x", 12)
        r.box("chrome", 2.60, 2.66, 1.17, 1.20, zc - 0.02, zc + 0.06)

    # mirror with a white frame, plus the soffit above it
    r.box("mirror", W - TILE - 0.012, W - TILE, 1.28, 2.06, 0.95, 2.95)
    for (za, zb) in ((0.92, 0.95), (2.95, 2.98)):
        r.box("frame_white", W - TILE - 0.03, W - TILE, 1.25, 2.09, za, zb)
    r.box("frame_white", W - TILE - 0.03, W - TILE, 1.25, 1.28, 0.92, 2.98)
    r.box("plaster", 2.10, W, 2.06, H, 0.80, 3.10)                    # soffit
    r.box("plaster", 2.10, W, 0.0, H, 3.10, 3.34)                     # return pillar
    r.box("light", 2.16, W - 0.04, 2.045, 2.06, 0.86, 3.04)           # mirror light

    # towel rail with towel
    r.cyl("black", (2.11, 0.86, 2.92), 0.012, 0.30, "z", 10)
    r.box("towel", 2.06, 2.12, 0.42, 0.88, 2.80, 3.02)

    # ---- lighting --------------------------------------------------------
    r.tag = TOP_SHELL
    r.downlights(H, [0.62, 1.55], [0.65, 1.45, 2.25, 3.05, 3.75], radius=0.045)
    r.downlights(H, [2.36], [0.65, 1.45, 2.25], radius=0.045)
    r.tag = None
    r.light((1.30, 2.35, 1.20), 0.5, 8.0)
    r.light((1.30, 2.35, 3.20), 0.4, 8.0)
    r.light((2.35, 2.00, 1.95), 0.35, 4.0)
    r.light((1.10, 1.80, 0.55), 0.8, 6.0)             # daylight from the windows
    return r


# --------------------------------------------------------------------------
# tessellation
# --------------------------------------------------------------------------

def mesh_box(p):
    cx, cy, cz = p["c"]
    sx, sy, sz = (v / 2 for v in p["s"])
    v = [(cx - sx, cy - sy, cz - sz), (cx + sx, cy - sy, cz - sz),
         (cx + sx, cy + sy, cz - sz), (cx - sx, cy + sy, cz - sz),
         (cx - sx, cy - sy, cz + sz), (cx + sx, cy - sy, cz + sz),
         (cx + sx, cy + sy, cz + sz), (cx - sx, cy + sy, cz + sz)]
    f = [(4, 5, 6, 7), (1, 0, 3, 2), (0, 4, 7, 3),
         (5, 1, 2, 6), (3, 7, 6, 2), (0, 1, 5, 4)]
    return v, f


def mesh_cyl(p):
    cx, cy, cz = p["c"]
    rad, half, seg, axis = p["r"], p["h"] / 2, max(6, p["seg"]), p["a"]

    def point(offset, ang):
        u, w = rad * math.cos(ang), rad * math.sin(ang)
        if axis == "y":
            return (cx + u, cy + offset, cz + w)
        if axis == "x":
            return (cx + offset, cy + u, cz + w)
        return (cx + u, cy + w, cz + offset)

    verts, faces = [], []
    for i in range(seg):
        ang = 2 * math.pi * i / seg
        verts.append(point(-half, ang))
        verts.append(point(+half, ang))
    if axis == "y":
        caps = [(cx, cy - half, cz), (cx, cy + half, cz)]
    elif axis == "x":
        caps = [(cx - half, cy, cz), (cx + half, cy, cz)]
    else:
        caps = [(cx, cy, cz - half), (cx, cy, cz + half)]
    lo, hi = len(verts), len(verts) + 1
    verts.extend(caps)
    for i in range(seg):
        a, b = 2 * i, 2 * ((i + 1) % seg)
        faces.append((a, b, b + 1, a + 1))       # side
        faces.append((lo, b, a))                 # bottom cap
        faces.append((hi, a + 1, b + 1))         # top cap
    return verts, faces


def mesh(prim):
    return mesh_box(prim) if prim["t"] == "box" else mesh_cyl(prim)


def normal(a, b, c):
    ux, uy, uz = (b[0] - a[0], b[1] - a[1], b[2] - a[2])
    vx, vy, vz = (c[0] - a[0], c[1] - a[1], c[2] - a[2])
    nx, ny, nz = (uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx)
    length = math.sqrt(nx * nx + ny * ny + nz * nz) or 1.0
    return (nx / length, ny / length, nz / length)


# --------------------------------------------------------------------------
# exporters
# --------------------------------------------------------------------------

def write_obj(room, path, skip_tags=()):
    mtl_name = os.path.basename(path).replace(".obj", ".mtl")
    lines = ["# %s - generated by build_rooms.py (units: metres, Y up)" % room.title,
             "mtllib %s" % mtl_name]
    v_off = n_off = 1
    used = []
    counts = {}
    for prim in room.prims:
        if prim.get("g") in skip_tags:
            continue
        verts, faces = mesh(prim)
        mat = prim["m"]
        counts[mat] = counts.get(mat, 0) + 1
        lines.append("o %s_%03d" % (mat, counts[mat]))
        lines.append("usemtl %s" % mat)
        if mat not in used:
            used.append(mat)
        for (x, y, z) in verts:
            lines.append("v %.5f %.5f %.5f" % (x, y, z))
        normals = [normal(verts[f[0]], verts[f[1]], verts[f[2]]) for f in faces]
        for (nx, ny, nz) in normals:
            lines.append("vn %.5f %.5f %.5f" % (nx, ny, nz))
        for i, face in enumerate(faces):
            idx = " ".join("%d//%d" % (v_off + k, n_off + i) for k in face)
            lines.append("f %s" % idx)
        v_off += len(verts)
        n_off += len(faces)
    with open(path, "w", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")

    mtl = ["# materials for %s" % room.title]
    for key in used:
        spec = MATERIALS[key]
        cr, cg, cb = rgb(spec["color"])
        shine = int(4 + (1.0 - spec.get("rough", 0.6)) * 220)
        mtl += ["", "newmtl %s" % key,
                "Ka %.4f %.4f %.4f" % (cr * 0.25, cg * 0.25, cb * 0.25),
                "Kd %.4f %.4f %.4f" % (cr, cg, cb),
                "Ks %.4f %.4f %.4f" % tuple([1.0 - spec.get("rough", 0.6)] * 3),
                "Ns %d" % shine,
                "d %.3f" % spec.get("opacity", 1.0),
                "illum 2"]
        if spec.get("emissive"):
            mtl.append("Ke %.4f %.4f %.4f" % (cr, cg, cb))
    with open(os.path.join(os.path.dirname(path), mtl_name), "w",
              encoding="utf-8") as fh:
        fh.write("\n".join(mtl) + "\n")


def write_stl(room, path, scale=1.0, skip_tags=()):
    tris = []
    for prim in room.prims:
        if prim.get("g") in skip_tags:
            continue
        verts, faces = mesh(prim)
        for face in faces:
            for k in range(1, len(face) - 1):
                a, b, c = verts[face[0]], verts[face[k]], verts[face[k + 1]]
                tris.append((normal(a, b, c), a, b, c))
    header = ("binary STL - %s - generated by build_rooms.py" % room.title)
    with open(path, "wb") as fh:
        fh.write(header.encode("ascii")[:80].ljust(80, b" "))
        fh.write(struct.pack("<I", len(tris)))
        for (n, a, b, c) in tris:
            fh.write(struct.pack("<3f", *n))
            for point in (a, b, c):
                fh.write(struct.pack("<3f", *[v * scale for v in point]))
            fh.write(struct.pack("<H", 0))
    return len(tris)


def scene_json(rooms):
    return json.dumps({
        "materials": {k: dict(color=v["color"], rough=v.get("rough", 0.6),
                              metal=v.get("metal", 0.0),
                              opacity=v.get("opacity", 1.0),
                              emissive=v.get("emissive", 0.0))
                      for k, v in MATERIALS.items()},
        "rooms": [dict(key=r.key, title=r.title,
                       size=[r.width, r.height, r.depth], eye=list(r.eye),
                       prims=r.prims, lights=r.lights) for r in rooms],
    }, separators=(",", ":"))


def write_viewer(rooms, template_path, standalone_path, fragment_path):
    with open(template_path, encoding="utf-8") as fh:
        fragment = fh.read().replace("__SCENE_JSON__", scene_json(rooms))
    with open(fragment_path, "w", encoding="utf-8") as fh:
        fh.write(fragment)
    standalone = (
        '<!doctype html>\n<html lang="de">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        '<style>*{box-sizing:border-box}body{margin:0}</style>\n'
        "</head>\n<body>\n" + fragment + "\n</body>\n</html>\n"
    )
    with open(standalone_path, "w", encoding="utf-8") as fh:
        fh.write(standalone)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    rooms = [build_kitchen(), build_bathroom()]
    for room in rooms:
        # closed = the complete room, open = without ceiling and near wall so
        # the model can be inspected from outside in any standard 3D viewer
        for suffix, skip in (("", ()), ("_open", (TOP_SHELL,))):
            obj_path = os.path.join(OUT_DIR, room.key + suffix + ".obj")
            stl_path = os.path.join(OUT_DIR, room.key + suffix + ".stl")
            write_obj(room, obj_path, skip_tags=skip)
            tris = write_stl(room, stl_path, skip_tags=skip)
            parts = len([p for p in room.prims if p.get("g") not in skip])
            print("%-14s %4d parts  %6d triangles  %6.1f kB obj  %6.1f kB stl"
                  % (room.key + suffix, parts, tris,
                     os.path.getsize(obj_path) / 1024, os.path.getsize(stl_path) / 1024))
    here = os.path.dirname(os.path.abspath(__file__))
    write_viewer(rooms,
                 os.path.join(here, "viewer_template.html"),
                 os.path.join(OUT_DIR, "viewer.html"),
                 os.path.join(OUT_DIR, "viewer_artifact.html"))
    print("viewer     %.1f kB -> out/viewer.html"
          % (os.path.getsize(os.path.join(OUT_DIR, "viewer.html")) / 1024))


if __name__ == "__main__":
    main()
