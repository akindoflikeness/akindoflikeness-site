#!/usr/bin/env python3
"""Build akindoflikeness.net.

    python3 tools/build.py                 writes the site into the repo root
    python3 tools/build.py --out DIR       writes it somewhere else instead (tools/preview.py uses this)

What goes in:
    catalogue.json        every release: titles, dates, tracks, archive.org links, accent colour.
                          Made by Downloads/akol-albums/tools/export_catalogue.py; change things there.
    prose/<slug>.txt      title, blank line, prose. Shared by Writing and release pages.
    pages/<name>.html     hand-written pages (blow your phase off, transmutation, terms, 404):
                          a few "key: value" lines, a line with ---, then the page's own HTML.
    tools/templates/      the chrome every page shares, the home page, a release page, the player.

What comes out:
    index.html            introduction
    music.html            the latest release, then every other release
    music/<slug>.html     one page per release
    <name>.html           one per file in pages/
    sitemap.xml
Everything else at the root (style.css, player.js, fonts, favicon, _headers, _redirects, robots.txt)
is written by hand and left alone.
"""
import argparse, datetime, html, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATES = os.path.join(ROOT, "tools", "templates")
SITE_URL = "https://akindoflikeness.net"
ARTIST = "a kind of likeness"
DEFAULT_ACCENT = "#a82b43"

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
            "covers": [a["archive"]["cover_web"], a["archive"]["cover"]], "page": page_url(root, a),
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
    cat = json.loads(read(os.path.join(ROOT, "catalogue.json")))
    available = [a for a in cat["albums"] if a.get("available") and a.get("tracks")]
    available.sort(key=lambda a: a["date"], reverse=True)
    tail += tpl("player.html", root=root, home=home, catalogue=slim_catalogue(available, "/"))
    return tpl("base.html", title=esc(title), theme_color="#000000" if theme == "onebit" else "#090909",
               head_extra=head_extra(title, **head), root=root, home=home,
               body_attrs=(" " + " ".join(body)) if body else "",
               cur_home=' aria-current="page"' if current == "home" else "",
               cur_music=' aria-current="page"' if current == "music" else "",
               cur_bypo=' aria-current="page"' if current == "bypo" else "",
               cur_writing=' aria-current="page"' if current == "writing" else '',
               cur_pack=' aria-current="page"' if current == "pack" else "",
               content=content, tail=tail)


def writeup(a):
    p = os.path.join(ROOT, "prose", a["slug"] + ".txt")
    return esc(prose_document(p)[1]) if os.path.exists(p) else ""


def prose_document(path):
    """A title, a blank line, then plain prose. No publishing fields in the document."""
    text = read(path).lstrip("\ufeff").strip()
    title, separator, body = text.partition("\n")
    if not title.strip() or not separator or not body.strip():
        raise ValueError(f"{path}: supply a title, a blank line and prose")
    if body.splitlines()[0].strip():
        raise ValueError(f"{path}: leave a blank line after the title")
    return title.strip(), body.strip()


def prose_date(slug):
    result = subprocess.run(
        ["git", "log", "--follow", "--diff-filter=A", "--format=%cs", "--", f"prose/{slug}.txt"],
        cwd=ROOT, capture_output=True, text=True, check=True)
    return result.stdout.strip().splitlines()[-1] if result.stdout.strip() else datetime.date.today().isoformat()


# ---------- pages ----------

def home_gallery(root):
    """Ordered local images, with optional native animation and captions."""
    def asset(path):
        if not path.startswith("assets/") or ".." in path.split("/") or "\\" in path:
            raise ValueError(f"Gallery images must use paths within assets/: {path}")
        if not os.path.isfile(os.path.join(ROOT, path)):
            raise ValueError(f"Missing gallery image: {path}")
        return esc(root + path)

    figures = []
    for item in json.loads(read(os.path.join(ROOT, "index-images.json"))):
        width, height = int(item["width"]), int(item["height"])
        if width <= 0 or height <= 0:
            raise ValueError("Gallery image dimensions must be positive")
        image = (f'<img src="{asset(item["src"])}" alt="{esc(item["alt"])}" '
                 f'width="{width}" height="{height}" loading="lazy" decoding="async">')
        if item.get("animated"):
            image = (f'<picture><source media="(prefers-reduced-motion: no-preference)" '
                     f'srcset="{asset(item["animated"])}">{image}</picture>')
        caption = f'<figcaption>{esc(item["caption"])}</figcaption>' if item.get("caption") else ""
        figures.append(f'          <figure class="content-image">{image}{caption}</figure>')
    if not figures:
        return ""
    return '        <section class="home-gallery" aria-label="Images and characters">\n' + "\n".join(figures) + '\n        </section>'


def build_home(albums, root, home):
    content = tpl("home.html", root=root, gallery=home_gallery(root),
                  introduction=indent(paragraphs(read(os.path.join(ROOT, "writeups", "index.txt"))), 12))
    return page(root, home, title="AKOL", content=content, current="home",
                canonical=SITE_URL + "/",
                description="Music and art by a kind of likeness. I learn by making them.")


def build_music(albums, root, home):
    records, features = [], []
    for a in albums:
        records.append(f'''<div class="record" data-slug="{a['slug']}" style="--accent: {a.get('accent') or DEFAULT_ACCENT}">
              <a class="record-cover" href="{page_url(root, a)}">{cover_img(a, lazy=True)}</a>
              <div class="caption">{play_button(a)}<a class="record-title" href="{page_url(root, a)}">{esc(a['title'])}</a><span class="year">{a['year']}</span></div>
            </div>''')
        text = html.unescape(re.sub(r"<[^>]+>", "", writeup(a))).strip()
        text = " ".join(text.split())
        excerpt = text[:128].rsplit(" ", 1)[0] + "…" if len(text) > 129 else text
        features.append(tpl("music.html", latest_slug=a["slug"], latest_accent=a.get("accent") or DEFAULT_ACCENT,
                            latest_page=page_url(root, a), latest_cover=cover_img(a), latest_title=esc(a["title"]),
                            latest_sub=f"{nice_date(a['date'])} · {len(a['tracks'])} tracks · {running_time(a['total_seconds'])}",
                            latest_about=esc(excerpt), latest_play=play_button(a, text=True)))
    content = '<article class="music"><div id="featured-album">' + features[0] + '</div>'
    content += '<div class="records" aria-label="Albums">' + "".join(records) + '</div></article>'
    content += "".join(f'<template class="featured-option">{feature}</template>' for feature in features)
    tail = ""
    return page(root, home, title="Music — AKOL", content=content, tail=tail, current="music",
                canonical=SITE_URL + "/music",
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
    neighbours.append(f'            <a href="{root}music.html"><span class="fine">everything</span>music</a>')
    if writeup(a).strip():
        neighbours.append(f'<a href="{root}writing/{a["slug"]}.html"><span class="fine">album notes</span>Writing →</a>')
    about = paragraphs(linked_album_prose(a, root))
    content = tpl("release.html", slug=a["slug"], cover=cover_img(a), title=esc(a["title"]),
                  sub=f"{ARTIST} · {nice_date(a['date'])}",
                  about=indent(f'<section class="release-about" aria-labelledby="about-title">\n'
                               f'  <h2 class="about-title" id="about-title">About</h2>\n'
                               f'  <blockquote class="prose prose-quote">\n{about}\n  </blockquote>\n</section>', 10) if about else "",
                  play=play_button(a, text=True), bandcamp=a["bandcamp"], tracks="\n".join(rows),
                  zip=zip_url, size=size, archive=a["archive"]["details"], formats=", ".join(formats),
                  neighbours="\n".join(neighbours))
    tail = ""
    desc = f"{a['title']} ({a['year']}) by {ARTIST}: {len(a['tracks'])} tracks, {running_time(a['total_seconds'])}."
    return page(root, home, title=f"{a['title']} — AKOL", content=content, tail=tail, current="music",
                accent=a.get("accent"), canonical=f"{SITE_URL}/music/{a['slug']}", og_type="music.album",
                image=a["archive"]["cover_web"], description=desc)


def linked_album_prose(album, root):
    text = writeup(album)
    # Link explicit album references without changing the author's wording.
    references = {"the past in progress": "the-past-in-progress", "rotting.": "rotting", "i miss the rain": "i-miss-the-rain"}
    for title, slug in references.items():
        if slug != album["slug"]:
            text = re.sub(re.escape(title), lambda match: f'<a href="{root}writing/{slug}.html">{match[0]}</a>', text, flags=re.IGNORECASE)
    return text


def essay_navigation(root, entry):
    links = [f'<a href="{root}writing.html">← Writing</a>']
    if entry.get("album"):
        links.append(f'<a href="{root}music/{entry["album"]}.html">Listen to {esc(entry["title"])} →</a>')
    if entry["slug"] == "on-ai":
        links.append(f'<a href="{root}blow-your-phase-off.html">Blow Your Phase Off →</a>')
    related = json.loads(read(os.path.join(ROOT, "writing-links.json")))
    titles = {item["slug"]: item["title"] for item in writing_entries()}
    for slug in related.get(entry["slug"], []):
        if slug in titles:
            links.append(f'<a href="{root}writing/{slug}.html"><span class="fine">related writing</span>{esc(titles[slug])} →</a>')
    return '<nav class="essay-nav" aria-label="More to explore">' + ''.join(links) + '</nav>'


def writing_entries():
    metadata = {entry["slug"]: entry for entry in json.loads(read(os.path.join(ROOT, "writing.json")))}
    cat = json.loads(read(os.path.join(ROOT, "catalogue.json")))
    albums = {a["slug"]: a for a in cat["albums"] if a.get("available")}
    entries = []
    for filename in sorted(os.listdir(os.path.join(ROOT, "prose"))):
        if not filename.endswith(".txt"):
            continue
        slug = filename[:-4]
        title, text = prose_document(os.path.join(ROOT, "prose", filename))
        first = re.split(r"\n\s*\n", text)[0]
        excerpt = " ".join(first.split())
        if len(excerpt) > 220:
            excerpt = excerpt[:220].rsplit(" ", 1)[0] + "…"
        album = albums.get(slug)
        date = album["date"] if album else metadata.get(slug, {}).get("date") or prose_date(slug)
        entry = dict(slug=slug, title=title, date=date, excerpt=excerpt)
        if album:
            entry["album"] = slug
        entries.append(entry)
    return sorted(entries, key=lambda entry: entry["date"], reverse=True)


def build_writing(root, home, entries):
    items = []
    for entry in entries:
        items.append(f'''<li class="writing-entry">
          <h2><a href="{root}writing/{esc(entry['slug'])}.html">{esc(entry['title'])}</a></h2>
          <time class="fine" datetime="{esc(entry['date'])}">{('Released ' if entry.get('album') else '')}{nice_date(entry['date'])}</time>
          <p class="writing-excerpt">{esc(entry['excerpt'])}</p>
        </li>''')
    content = '<section class="detail writing-index"><h1 class="intro-title">Writing</h1><ul class="writing-list">' + ''.join(items) + '</ul></section>'
    return page(root, home, title="Writing", content=content, current="writing",
                canonical=SITE_URL + "/writing", description="Writing by a kind of likeness.")


def build_essay(root, home, entry):
    if entry.get("album"):
        cat = json.loads(read(os.path.join(ROOT, "catalogue.json")))
        album = next(album for album in cat["albums"] if album["slug"] == entry["album"])
        prose = paragraphs(linked_album_prose(album, root))
    else:
        prose = paragraphs(esc(prose_document(os.path.join(ROOT, "prose", entry["slug"] + ".txt"))[1]))
    content = f'''<article class="detail essay">
      <header class="essay-header">
        <h1 class="intro-title">{esc(entry['title'])}</h1>
        <time class="fine" datetime="{esc(entry['date'])}">{('Released ' if entry.get('album') else '')}{nice_date(entry['date'])}</time>
      </header>
      <div class="prose essay-prose">{prose}</div>
      {essay_navigation(root, entry)}
    </article>'''
    return page(root, home, title=entry["title"], content=content, current="writing",
                canonical=SITE_URL + "/writing/" + entry["slug"], description=entry["excerpt"], og_type="article")


def build_collection(root, home, name):
    is_tools = name == "tools"
    noun = "tool" if is_tools else "sample pack"
    entries = json.loads(read(os.path.join(ROOT, name + ".json")))
    cards = []
    for i, item in enumerate(entries):
        def url(value):
            return root + value.lstrip("/") if value.startswith("/") else value
        github = f'<a href="{esc(item["github"])}">GitHub</a>' if item.get("github") else ''
        subtitle = f'<p class="fine card-subtitle">{esc(item["subtitle"])}</p>' if item.get("subtitle") else ''
        description = f'<p class="card-description">{esc(item["description"])}</p>' if item.get("description") else ''
        label = "About" if is_tools else "Select"
        cards.append(f'''<article class="tool-card"{(' hidden' if i else '')}>
          <figure class="tool-media"><picture>
            <source srcset="{esc(url(item['image']))}" media="(prefers-reduced-motion: no-preference)">
            <img src="{esc(url(item['still']))}" alt="{esc(item['alt'])}" width="{item['width']}" height="{item['height']}">
          </picture></figure>
          <h2>{esc(item['name'])}</h2>
          {subtitle}{description}
          <div class="tool-actions">{github}<a href="{esc(url(item['page']))}">{label}</a></div>
        </article>''')
    disabled = ' disabled' if len(cards) < 2 else ''
    content = f'''<section class="detail tools-browser" aria-labelledby="tools-title">
      <h1 class="intro-title" id="tools-title">{name.title()}</h1>
      <div class="tool-browser-frame">
        <button class="tool-arrow" data-direction="-1" aria-label="Previous {noun}"{disabled}>←</button>
        <div class="tool-cards">{''.join(cards)}</div>
        <button class="tool-arrow" data-direction="1" aria-label="Next {noun}"{disabled}>→</button>
      </div>
      <p class="tool-position fine" aria-live="polite" aria-atomic="true">{('1 / ' + str(len(cards))) if cards else 'No entries yet'}</p>
    </section>'''
    content = chr(10).join(line.rstrip() for line in content.splitlines())
    return page(root, home, title=name, content=content, current="bypo" if is_tools else "pack",
                theme="onebit" if is_tools else None, accent=None if is_tools else "#c9953d",
                canonical=SITE_URL + "/" + name, description="Instruments and tools by AKOL." if is_tools else "Sample packs by AKOL.",
                tail="")


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
    urls = [(SITE_URL + "/", "1.0"), (SITE_URL + "/music", "0.9")] + [(f"{SITE_URL}/music/{a['slug']}", "0.8") for a in albums]
    urls += [(f"{SITE_URL}/samples", "0.9"), (f"{SITE_URL}/tools", "0.9"), (f"{SITE_URL}/writing", "0.8"), (f"{SITE_URL}/blow-your-phase-off", "0.9"), (f"{SITE_URL}/transmutation", "0.9")]
    urls += [(SITE_URL + "/nzbt", "0.8"), (SITE_URL + "/nzbt-research", "0.8")]
    urls += [(SITE_URL + "/writing/" + entry["slug"], "0.8") for entry in writing_entries()]
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
    write(os.path.join(out, "music.html"), build_music(albums, root, home))
    root, home = links(1)
    for a in albums:
        write(os.path.join(out, "music", a["slug"] + ".html"), build_release(a, albums, root, home))
    root, home = links(0)
    pages = [f for f in sorted(os.listdir(os.path.join(ROOT, "pages"))) if f.endswith(".html")]
    for f in pages:
        write(os.path.join(out, f), build_hand_page(f[:-5], root, home))
    entries = writing_entries()
    write(os.path.join(out, "writing.html"), build_writing(root, home, entries))
    essay_root, essay_home = links(1)
    for entry in entries:
        write(os.path.join(out, "writing", entry["slug"] + ".html"), build_essay(essay_root, essay_home, entry))
    write(os.path.join(out, "samples.html"), build_collection(root, home, "samples"))
    write(os.path.join(out, "tools.html"), build_collection(root, home, "tools"))
    write(os.path.join(out, "sitemap.xml"), build_sitemap(albums))
    print(f"built {len(albums)} releases, {len(pages)} pages, sitemap -> {out}")


if __name__ == "__main__":
    main()
