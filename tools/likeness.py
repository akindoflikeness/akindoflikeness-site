# Build the site face, "Likeness", from Redaction 35 (MCKL, SIL Open Font License 1.1).
#
# This is the Likeness Type Bench's starter recipe done headlessly, so the file the
# site loads is reproducible from a script rather than from a browser session:
#
#   width 0.96   every glyph 4 % narrower
#   weight +12   outlines pushed out by 12 units (of 1000) with round joins
#   x-height 1.06   lowercase 6 % taller above the baseline
#
# Slant, pixel grid, dropout and roughness are the bench's other knobs; the starter
# leaves them off and this script does not implement them. If you export a font from
# the bench with those on, drop its .otf next to this script and run
#   python3 tools/likeness.py --from-otf Likeness-Regular.otf
# to convert it to the woff2 the site uses.
#
# Needs: fontTools, shapely, brotli  (MSYS2: pacman -S mingw-w64-x86_64-python-fonttools
#        mingw-w64-x86_64-python-shapely mingw-w64-x86_64-python-brotli)
# Input: the original Redaction 35 TrueType file (see --base).

import argparse, math, os, sys, unicodedata, datetime
from fontTools.ttLib import TTFont, newTable
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.pens.basePen import decomposeQuadraticSegment
from fontTools.subset import Subsetter, Options
from shapely.geometry import Polygon, LineString, MultiPolygon
from shapely.ops import unary_union, polygonize
from shapely.geometry.polygon import orient
from shapely import affinity

HERE = os.path.dirname(os.path.abspath(__file__))
OUT_DIR = os.path.join(HERE, "..", "assets", "fonts")
FAMILY = "Likeness"
DESIGNER = "a kind of likeness"
XH = 470            # Redaction 35's x-height, the pivot for the x-height slider
STEP = 28           # flattening step, in font units, as in the bench


# ---------- outlines as the bench sees them ----------

def contours_of(glyph_set, name):
    """Glyph outline as a list of contours; each contour is a list of segments
    {'t': 'M'|'L'|'Q'|'C', 'p': (x, y), 'c': ..., 'c1': ..., 'c2': ...}."""
    pen = DecomposingRecordingPen(glyph_set)
    glyph_set[name].draw(pen)
    out, cur = [], None
    for op, args in pen.value:
        if op == "moveTo":
            cur = [{"t": "M", "p": args[0]}]; out.append(cur)
        elif op == "lineTo":
            cur.append({"t": "L", "p": args[0]})
        elif op == "qCurveTo":
            pts = list(args)
            if pts[-1] is None:            # all-off-curve contour; close it like opentype.js does
                pts[-1] = tuple((pts[0][i] + pts[-2][i]) / 2 for i in range(2))
            for c, p in decomposeQuadraticSegment(pts):
                cur.append({"t": "Q", "c": c, "p": p})
        elif op == "curveTo":
            cur.append({"t": "C", "c1": args[0], "c2": args[1], "p": args[2]})
        # closePath / endPath: contours are implicitly closed
    return [c for c in out if len(c) > 1]


def map_points(contours, f):
    out = []
    for c in contours:
        nc = []
        for s in c:
            o = {"t": s["t"], "p": f(s["p"])}
            if "c" in s: o["c"] = f(s["c"])
            if "c1" in s: o["c1"] = f(s["c1"]); o["c2"] = f(s["c2"])
            nc.append(o)
        out.append(nc)
    return out


def flatten(contours, step):
    """Curves to polylines, subdividing by length like the bench's flatten()."""
    polys = []
    for c in contours:
        pts = [c[0]["p"]]; last = c[0]["p"]
        for s in c[1:]:
            p = s["p"]
            if s["t"] == "L":
                n = max(1, math.ceil(math.dist(last, p) / step))
                pts += [(last[0] + (p[0] - last[0]) * k / n, last[1] + (p[1] - last[1]) * k / n) for k in range(1, n + 1)]
            elif s["t"] == "Q":
                cx, cy = s["c"]
                n = max(2, math.ceil((math.dist(last, s["c"]) + math.dist(s["c"], p)) / step))
                for k in range(1, n + 1):
                    t = k / n; u = 1 - t
                    pts.append((u * u * last[0] + 2 * u * t * cx + t * t * p[0], u * u * last[1] + 2 * u * t * cy + t * t * p[1]))
            else:
                c1, c2 = s["c1"], s["c2"]
                n = max(2, math.ceil((math.dist(last, c1) + math.dist(c1, c2) + math.dist(c2, p)) / step))
                for k in range(1, n + 1):
                    t = k / n; u = 1 - t
                    pts.append((u ** 3 * last[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t ** 3 * p[0],
                                u ** 3 * last[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t ** 3 * p[1]))
            last = p
        f = pts[0]
        n = max(1, math.ceil(math.dist(last, f) / step))
        pts += [(last[0] + (f[0] - last[0]) * k / n, last[1] + (f[1] - last[1]) * k / n) for k in range(1, n)]
        if math.dist(pts[-1], f) < 1e-6: pts.pop()
        if len(pts) > 2: polys.append(pts)
    return polys


# ---------- the weight slider: fill by non-zero winding, then offset ----------

def signed_area(ring):
    return 0.5 * sum(x0 * y1 - x1 * y0 for (x0, y0), (x1, y1) in zip(ring, ring[1:] + ring[:1]))


def nonzero_region(polys):
    """The filled area of a glyph under the non-zero winding rule (what a rasteriser
    draws), as a shapely (Multi)Polygon."""
    rings = [r for r in polys if abs(signed_area(r)) > 1e-6]
    if not rings: return None
    faces = list(polygonize(unary_union([LineString(r + r[:1]) for r in rings])))
    ring_polys = [(1 if signed_area(r) > 0 else -1, Polygon(r)) for r in rings]
    keep = []
    for face in faces:
        pt = face.representative_point()
        winding = sum(sign for sign, rp in ring_polys if rp.contains(pt))
        if winding != 0: keep.append(face)
    if not keep: return None
    return unary_union(keep)


def offset(polys, d):
    """Push the outline out by d units with round joins (Clipper jtRound in the bench,
    arc tolerance 1.2 u, which is about two segments per quarter turn at this radius),
    then shift right by d so the left side bearing stays put."""
    region = nonzero_region(polys)
    if region is None or region.is_empty: return []
    grown = region.buffer(d, quad_segs=2, join_style="round").simplify(0.4, preserve_topology=True)
    grown = affinity.translate(grown, xoff=d)
    parts = grown.geoms if isinstance(grown, MultiPolygon) else [grown]
    out = []
    for poly in parts:
        poly = orient(poly, sign=-1.0)              # TrueType: outer contours clockwise, holes anticlockwise
        out.append(list(poly.exterior.coords)[:-1])
        for hole in poly.interiors: out.append(list(hole.coords)[:-1])
    return out


# ---------- the recipe ----------

def variant(glyph_set, name, adv, lower, P):
    cs = contours_of(glyph_set, name)
    if P["xh"] != 1 and lower:
        k = P["xh"]
        cs = map_points(cs, lambda p: (p[0], p[1] if p[1] <= 0 else (p[1] * k if p[1] <= XH else p[1] + XH * (k - 1))))
    if P["width"] != 1:
        cs = map_points(cs, lambda p: (p[0] * P["width"], p[1])); adv *= P["width"]
    polys = flatten(cs, STEP) if cs else []
    if polys and P["weight"]:
        polys = offset(polys, P["weight"])
    if P["weight"]: adv += 2 * P["weight"]
    return polys, max(0, adv)


def build(base_path, P, out_dir, ttf=None):
    src = TTFont(base_path)
    glyph_set = src.getGlyphSet()
    cmap = src.getBestCmap()
    first_cp = {}
    for cp, g in cmap.items():
        if g not in first_cp or cp < first_cp[g]: first_cp[g] = cp
    hmtx = src["hmtx"]
    glyf = src["glyf"]
    order = src.getGlyphOrder()

    new_glyphs, new_metrics = {}, {}
    for name in order:
        cp = first_cp.get(name)
        lower = cp is not None and unicodedata.category(chr(cp)) == "Ll"
        polys, adv = variant(glyph_set, name, hmtx[name][0], lower, P)
        pen = TTGlyphPen(None)
        xmin = None
        for ring in polys:
            pts = [(round(x), round(y)) for x, y in ring]
            pen.moveTo(pts[0])
            for p in pts[1:]: pen.lineTo(p)
            pen.closePath()
            xs = [p[0] for p in pts]; xmin = min(xs) if xmin is None else min(xmin, min(xs))
        new_glyphs[name] = pen.glyph()
        new_metrics[name] = (round(adv), xmin if xmin is not None else 0)

    for name in order:
        glyf[name] = new_glyphs[name]
        hmtx[name] = new_metrics[name]

    # Layout tables belong to the old outlines; the bench drops them too. Hints as well.
    for t in ("GSUB", "GPOS", "GDEF", "BASE", "fpgm", "prep", "cvt ", "hdmx", "LTSH", "VDMX", "DSIG"):
        if t in src: del src[t]

    year = datetime.date.today().year
    desc = ("Modified from Redaction 35 by MCKL. width %s, weight %s, slant 0, x-height %s, grid 0, dropout 0, roughness 0."
            % (P["width"], P["weight"], P["xh"]))
    names = {
        0: "Copyright 2019 MCKL Inc. Modifications copyright %d %s." % (year, DESIGNER),
        1: FAMILY, 2: "Regular", 3: "1.000;%s;%s-Regular" % (DESIGNER.replace(" ", ""), FAMILY),
        4: FAMILY, 5: "Version 1.000", 6: FAMILY + "-Regular", 7: "", 8: DESIGNER, 9: DESIGNER,
        10: desc, 11: "https://akindoflikeness.net", 12: "https://akindoflikeness.net",
        13: "This Font Software is licensed under the SIL Open Font License, Version 1.1.",
        14: "https://openfontlicense.org",
    }
    name_table = newTable("name"); name_table.names = []
    for nid, text in names.items():
        if text: name_table.setName(text, nid, 3, 1, 0x409)
    src["name"] = name_table
    os2 = src["OS/2"]
    os2.sxHeight = round(XH * P["xh"]); os2.achVendID = b"AKOL"
    src["head"].fontRevision = 1.0

    # keep only what the site can reach: unicode-mapped glyphs
    sub = Subsetter(options=Options(layout_features=[], notdef_outline=True, glyph_names=True,
                                    name_IDs=list(names), recalc_bounds=True, recalc_average_width=True))
    sub.populate(unicodes=list(cmap))
    sub.subset(src)

    os.makedirs(out_dir, exist_ok=True)
    if ttf:
        src.save(ttf)
        print("wrote", ttf, os.path.getsize(ttf), "bytes")
    src.flavor = "woff2"
    woff2 = os.path.join(out_dir, FAMILY + "-Regular.woff2")
    src.save(woff2)
    print("wrote", woff2, os.path.getsize(woff2), "bytes;", len(src.getGlyphOrder()), "glyphs")
    return woff2


def convert_otf(path, out_dir):
    f = TTFont(path); f.flavor = "woff2"
    out = os.path.join(out_dir, FAMILY + "-Regular.woff2"); f.save(out)
    print("wrote", out, os.path.getsize(out), "bytes")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default=os.path.join(HERE, "Redaction35-Regular.ttf"), help="Redaction 35 TrueType file")
    ap.add_argument("--out", default=OUT_DIR)
    ap.add_argument("--width", type=float, default=0.96)
    ap.add_argument("--weight", type=float, default=12)
    ap.add_argument("--xh", type=float, default=1.06)
    ap.add_argument("--ttf", help="also write a TrueType copy here (for installing or inspecting)")
    ap.add_argument("--from-otf", help="skip the recipe; just convert a bench export to woff2")
    a = ap.parse_args()
    if a.from_otf: convert_otf(a.from_otf, a.out); sys.exit()
    build(a.base, {"width": a.width, "weight": a.weight, "xh": a.xh}, a.out, a.ttf)
