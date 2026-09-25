#!/usr/bin/env python3
"""Build a self-contained copy of the site for previewing as a Claude artifact.

    python3 tools/preview.py [OUT_DIR]

Artifacts can only load images that are published with them, so the copy swaps the
archive.org covers and the bypomono pictures for local files, and links everything
relatively. Audio streams from archive.org and will not play in the preview.
"""
import os, re, shutil, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ALBUMS = "C:/Users/AKOL/Downloads/akol-albums"
BYPO = "C:/Users/AKOL/dev/bypomono/.github/readme"
SUN = "C:/Users/AKOL/Downloads/Transmutation-release/cover.png"

out = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "preview"))   # preview/ is git-ignored
if os.path.isdir(out):
    shutil.rmtree(out)
os.makedirs(os.path.join(out, "covers"))
subprocess.check_call([sys.executable, os.path.join(ROOT, "tools", "build.py"), "--out", out, "--relative"])

for f in ("player.js", "favicon.ico"):
    shutil.copy(os.path.join(ROOT, f), out)
shutil.copytree(os.path.join(ROOT, "assets"), os.path.join(out, "assets"))
# the face travels inside the stylesheet: the sandbox only trusts fonts it can see inline
import base64
woff2 = base64.b64encode(open(os.path.join(ROOT, "assets", "fonts", "Likeness-Regular.woff2"), "rb").read()).decode()
css = open(os.path.join(ROOT, "style.css"), encoding="utf-8").read()
css = css.replace('url("assets/fonts/Likeness-Regular.woff2")', f'url("data:font/woff2;base64,{woff2}")')
open(os.path.join(out, "style.css"), "w", encoding="utf-8", newline="\n").write(css)

swaps = {}
for slug in os.listdir(ALBUMS):
    src = os.path.join(ALBUMS, slug, "cover-web.jpg")
    if os.path.isfile(src):
        shutil.copy(src, os.path.join(out, "covers", slug + ".jpg"))
        swaps[f"https://archive.org/download/{slug}-akol/cover-web.jpg"] = f"covers/{slug}.jpg"
for name in ("hero.gif", "wordmark.svg"):
    shutil.copy(os.path.join(BYPO, name), os.path.join(out, "covers", name))
    swaps[f"https://raw.githubusercontent.com/wraithsys/bypomono/main/.github/readme/{name}"] = f"covers/{name}"
shutil.copy(SUN, os.path.join(out, "covers", "transmutation.png"))
swaps["https://archive.org/download/transmutation-akol/cover.png"] = "covers/transmutation.png"

for dirpath, _, files in os.walk(out):
    for f in files:
        if not f.endswith(".html"):
            continue
        p = os.path.join(dirpath, f)
        up = "../" if os.path.basename(dirpath) == "music" else ""
        s = open(p, encoding="utf-8").read()
        for url, local in swaps.items():
            s = s.replace(url, up + local)
        s = re.sub(r' onerror="[^"]*"', "", s)          # no fallback fetches in the sandbox
        if f == "index.html" and not up:
            s = s.replace("<title>AKOL</title>", "<title>akindoflikeness.net</title>", 1)
        open(p, "w", encoding="utf-8", newline="\n").write(s)
print("preview in", out)
