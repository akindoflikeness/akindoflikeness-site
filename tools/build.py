#!/usr/bin/env python3
"""Build akindoflikeness.net.

    python3 tools/build.py                 writes the site into the repo root
    python3 tools/build.py --out DIR       writes it somewhere else instead (tools/preview.py uses this)

What goes in:
    catalogue.json        every release: titles, dates, tracks, archive.org links, accent colour.
                          Made by Downloads/akol-albums/tools/export_catalogue.py; change things there.
    writeups/<slug>.txt   the words on a release page. Blank line between paragraphs, HTML allowed.
    pages/<name>.html     hand-written pages (blow your phase off, transmutation, terms, 404):
                          a few "key: value" lines, a line with ---, then the page's own HTML.
    tools/templates/      the chrome every page shares, the home page, a release page, the player.

What comes out:
    index.html            music: the latest release, then every other release
    music/<slug>.html     one page per release
    <name>.html           one per file in pages/
    sitemap.xml
Everything else at the root (style.css, player.js, fonts, favicon, _headers, _redirects, robots.txt)
is written by hand and left alone.
"""
import argparse, datetime, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES = os.path.join(ROOT, "tools", "templates")
SITE_URL = "https://akindoflikeness.net"
ARTIST = "a kind of likeness"
DEFAULT_ACCENT = "#a9c7d2"

ICON_PLAY = '<svg class="i-play" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5v11L13 8z"/></svg>'
ICON_PAUSE = '<svg class="i-pause" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 2.5h3.5v11H3.5zM9 2.5h3.5v11H9z"/></svg>'
ICON_EQ = '<span class="i-eq" aria-hidden="true"><i></i><i></i><i></i></span>'


def read(path):
    with open(path, encoding="utf-8") as f:
        return f.read()


def write(path, text):
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)


def tpl(name, **fields):
    s = read(os.path.join(TEMPLATES, name))
    for k, v in fields.items():
        s = s.replace("{{" + k + "}}", v)
    left = re.findall(r"{{(\w+)}}", s)
    if left:
        sys.exit(f"{name}: no value for {', '.join(sorted(set(left)))}")
    return s


esc = html.escape


def nice_date(iso):
    d = datetime.date.fromisoformat(iso)
    return f"{d.day} {d.strftime('%B %Y')}"


def mmss(s):
    s = round(s)
    return f"{s // 60}:{s % 60:02d}"


def running_time(s):
    s = round(s)
    h, m = s // 3600, (s % 3600) // 60
    return f"{h} h {m} min" if h else f"{m} min"


def megabytes(b):
    return f"{b / 1e6:.0f} MB"


def paragraphs(text):
    """Plain text with blank lines between paragraphs -> <p> elements. Inline HTML passes through."""
    paras = [p.strip() for p in re.split(r"\n\s*\n", text.strip()) if p.strip()]
    return "\n".join(f"<p>{p}</p>" for p in paras)


def indent(block, n):
    pad = " " * n
    return "\n".join(pad + line if line else line for line in block.split("\n"))


# ---------- pieces ----------

def cover_img(a, lazy=False):
    """The cover from archive.org: the 800 px web copy, or the original if that is missing."""
    web, orig = a["archive"]["cover_web"], a["archive"]["cover"]
    extra = ' loading="lazy" decoding="async"' if lazy else ' decoding="async"'
    return (f'<img src="{web}" alt="" width="800" height="800"{extra} '
            f'onerror="this.onerror=null;this.src=\'{orig}\'">')


def play_button(a, track=None, text=False):
    label = f"Play {a['title']}" if track is None else f"Play {a['tracks'][track]['title']}"
    attrs = f'data-play="{a["slug"]}"' + (f' data-track="{track}"' if track is not None else "")
    words = '<span class="l-play">Play</span><span class="l-pause">Pause</span>' if text else ""
    cls = "play play-text" if text else "play"
    return f'<button type="button" class="{cls}" {attrs} aria-label="{esc(label)}">{ICON_PLAY}{ICON_PAUSE}{ICON_EQ}{words}</button>'


def page_url(root, a):
    return f"{root}music/{a['slug']}.html"


def slim_catalogue(albums, root):
    """What player.js needs, nothing more."""
    out = []
    for a in albums:
        out.append({
            "slug": a["slug"], "title": a["title"], "year": a["year"], "accent": a.get("accent") or DEFAULT_ACCENT,
            "cover": a["archive"]["cover_web"], "page": page_url(root, a),
            "identifier": a["archive"]["identifier"], "download": a["archive"]["download"],
            "tracks": [{"title": t["title"], "flac": t["flac"], "seconds": t["seconds"]} for t in a["tracks"]],
        })
    return json.dumps({"artist": ARTIST, "albums": out}, ensure_ascii=False, separators=(",", ":"))


def head_extra(title, canonical=None, description=None, image=None, og_type="website", noindex=False):
    lines = [f'<meta property="og:title" content="{esc(title)}">', f'<meta property="og:type" content="{og_type}">']
    if canonical:
        lines.insert(0, f'<link rel="canonical" href="{canonical}">')
    if noindex:
        lines.insert(0, '<meta name="robots" content="noindex">')
    if description:
        lines.append(f'<meta name="description" content="{esc(description)}">')
        lines.append(f'<meta property="og:description" content="{esc(description)}">')
    if image:
        lines.append(f'<meta property="og:image" content="{image}">')
    return "\n".join("    " + l for l in lines)


def page(root, home, *, title, content, tail="", current=None, accent=None, theme=None, **head):
    body = []
    if theme:
        body.append(f'class="{theme}"')
    if accent:
        body.append(f'style="--accent: {accent}"')
    return tpl("base.html", title=esc(title), theme_color="#000000" if theme == "onebit" else "#090909",
               head_extra=head_extra(title, **head), root=root, home=home,
               body_attrs=(" " + " ".join(body)) if body else "",
               cur_music=' aria-current="page"' if current == "music" else "",
               cur_bypo=' aria-current="page"' if current == "bypo" else "",
               cur_pack=' aria-current="page"' if current == "pack" else "",
               content=content, tail=tail)


def writeup(a):
    p = os.path.join(ROOT, "writeups", a["slug"] + ".txt")
    return read(p) if os.path.exists(p) else (a.get("about") or "")


# ---------- pages ----------

def build_home(albums, root, home):
    latest, rest = albums[0], albums[1:]
    about = paragraphs(writeup(latest))
    first = about.split("</p>")[0] + "</p>" if about else ""
    records = []
    for a in rest:
        records.append(f'''            <div class="record" data-slug="{a['slug']}" style="--accent: {a.get('accent') or DEFAULT_ACCENT}">
              <a class="record-cover" href="{page_url(root, a)}">{cover_img(a, lazy=True)}</a>
              <div class="caption">
                {play_button(a)}
                <a class="record-title" href="{page_url(root, a)}">{esc(a['title'])}</a>
                <span class="year">{a['year']}</span>
              </div>
            </div>''')
    content = tpl("home.html",
                  latest_slug=latest["slug"], latest_accent=latest.get("accent") or DEFAULT_ACCENT,
                  latest_page=page_url(root, latest), latest_cover=cover_img(latest), latest_title=esc(latest["title"]),
                  latest_sub=f"{nice_date(latest['date'])} · {len(latest['tracks'])} tracks · {running_time(latest['total_seconds'])}",
                  latest_about=indent(f'<div class="latest-about">{first}</div>', 14) if first else "",
                  latest_play=play_button(latest, text=True), records="\n".join(records))
    tail = tpl("player.html", root=root, home=home, catalogue=slim_catalogue(albums, root))
    return page(root, home, title="AKOL", content=content, tail=tail, current="music",
                canonical=SITE_URL + "/", image=latest["archive"]["cover_web"],
                description=f"Music by {ARTIST}. Listen here, buy on Bandcamp, or download lossless from archive.org.")


def build_release(a, albums, root, home):
    i = albums.index(a)
    rows = []
    for n, t in enumerate(a["tracks"]):
        rows.append(f'''            <li class="track" data-slug="{a['slug']}" data-track="{n}">
              {play_button(a, n)}
              <span class="n">{n + 1:02d}</span>
              <span class="t">{esc(t['title'])}</span>
              <span class="d">{mmss(t['seconds'])}</span>
            </li>''')
    formats = []
    for t in a["tracks"]:
        f = f"{t['bit_depth']}-bit / {t['sample_rate'] / 1000:g} kHz"
        if f not in formats:
            formats.append(f)
    size = megabytes(sum(t.get("flac_bytes", 0) for t in a["tracks"]))
    zip_url = f"https://archive.org/compress/{a['archive']['identifier']}/formats=Flac,PNG,JPEG,Text&file=/{a['slug']}.zip"
    neighbours = []
    if i + 1 < len(albums):
        b = albums[i + 1]
        neighbours.append(f'            <a href="{page_url(root, b)}"><span class="fine">before this</span>{esc(b["title"])}</a>')
    if i > 0:
        b = albums[i - 1]
        neighbours.append(f'            <a href="{page_url(root, b)}"><span class="fine">after this</span>{esc(b["title"])}</a>')
    neighbours.append(f'            <a href="{home}"><span class="fine">everything</span>music</a>')
    about = paragraphs(writeup(a))
    content = tpl("release.html", slug=a["slug"], cover=cover_img(a), title=esc(a["title"]),
                  sub=f"{ARTIST} · {nice_date(a['date'])}",
                  about=indent(f'<div class="release-about">\n{about}\n</div>', 14) if about else "",
                  play=play_button(a, text=True), bandcamp=a["bandcamp"], tracks="\n".join(rows),
                  zip=zip_url, size=size, archive=a["archive"]["details"], formats=", ".join(formats),
                  neighbours="\n".join(neighbours))
    tail = tpl("player.html", root=root, home=home, catalogue=slim_catalogue(albums, root))
    desc = f"{a['title']} ({a['year']}) by {ARTIST}: {len(a['tracks'])} tracks, {running_time(a['total_seconds'])}."
    return page(root, home, title=f"{a['title']} — AKOL", content=content, tail=tail, current="music",
                accent=a.get("accent"), canonical=f"{SITE_URL}/music/{a['slug']}", og_type="music.album",
                image=a["archive"]["cover_web"], description=desc)


def build_hand_page(name, root, home):
    src = read(os.path.join(ROOT, "pages", name + ".html"))
    head, _, body = src.partition("\n---\n")
    meta = {}
    for line in head.splitlines():
        k, _, v = line.partition(":")
        if k.strip():
            meta[k.strip()] = v.strip()
    body = indent(body.strip(), 8)
    if root != "/":                       # previews link relatively
        body = body.replace('href="/"', f'href="{home}"').replace('href="/', f'href="{root}"').replace('src="/', f'src="{root}"')
    return page(root, home, title=meta.get("title", name), content=body, current=meta.get("current"),
                accent=meta.get("accent"), theme=meta.get("theme"), canonical=meta.get("canonical"),
                description=meta.get("description"), image=meta.get("image"),
                noindex=meta.get("noindex", "").lower() in ("yes", "true"))


def build_sitemap(albums):
    urls = [(SITE_URL + "/", "1.0")] + [(f"{SITE_URL}/music/{a['slug']}", "0.8") for a in albums]
    urls += [(f"{SITE_URL}/blow-your-phase-off", "0.9"), (f"{SITE_URL}/transmutation", "0.9")]
    items = "\n".join(f"  <url>\n    <loc>{u}</loc>\n    <changefreq>monthly</changefreq>\n    <priority>{p}</priority>\n  </url>" for u, p in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{items}\n</urlset>\n'


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=ROOT, help="where to write (default: the repo)")
    ap.add_argument("--relative", action="store_true", help="link assets relatively instead of from / (for previews)")
    args = ap.parse_args()
    out = os.path.abspath(args.out)

    cat = json.load(open(os.path.join(ROOT, "catalogue.json"), encoding="utf-8"))
    albums = [a for a in cat["albums"] if a.get("available") and a.get("tracks")]
    albums.sort(key=lambda a: a["date"], reverse=True)

    def links(depth):
        if args.relative:
            up = "../" * depth
            return up, up + "index.html"
        return "/", "/"

    root, home = links(0)
    write(os.path.join(out, "index.html"), build_home(albums, root, home))
    root, home = links(1)
    for a in albums:
        write(os.path.join(out, "music", a["slug"] + ".html"), build_release(a, albums, root, home))
    root, home = links(0)
    pages = [f for f in sorted(os.listdir(os.path.join(ROOT, "pages"))) if f.endswith(".html")]
    for f in pages:
        write(os.path.join(out, f), build_hand_page(f[:-5], root, home))
    write(os.path.join(out, "sitemap.xml"), build_sitemap(albums))
    print(f"built {len(albums)} releases, {len(pages)} pages, sitemap -> {out}")


if __name__ == "__main__":
    main()
