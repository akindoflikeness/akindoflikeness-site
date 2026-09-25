# akindoflikeness.net

Static site on Cloudflare Pages: music, blow your phase off, transmutation.
Nothing is hosted twice. Covers and audio come from archive.org, the instrument's
pictures from the bypomono repo on GitHub; this repo holds words, the stylesheet,
one script for the player and the typeface.

## Where things are

| you want to change              | edit                                   | then run                    |
|---------------------------------|----------------------------------------|-----------------------------|
| the words on a release page     | `writeups/<slug>.txt`                  | `python3 tools/build.py`    |
| a release's tracks, date, colour| `catalogue.py` in `Downloads/akol-albums/tools`, then `export_catalogue.py` there (it writes `catalogue.json` here too) | `python3 tools/build.py` |
| blow your phase off, transmutation, terms, 404 | `pages/<name>.html` (a few `key: value` lines, `---`, then HTML) | `python3 tools/build.py` |
| the sidebar, the page frame     | `tools/templates/base.html`            | `python3 tools/build.py`    |
| the look                        | `style.css`                            | nothing                     |
| the player                      | `player.js`                            | nothing                     |

`index.html`, `music/*.html`, the four hand-written pages and `sitemap.xml` are
built files; the build overwrites them.

## Adding a release

1. Organise, encode and upload it with the scripts in `Downloads/akol-albums/tools`
   (`README.md` there walks through it). Give it an `accent` in `catalogue.py`: one
   colour from the cover, used for the playing track, the progress line and text selection.
2. `powershell -File tools/cover_web.ps1` and `sh tools/upload_covers.sh` there put the
   800 px `cover-web.jpg` on the archive.org item. The site shows that copy.
3. `python3 export_catalogue.py` there, then `python3 tools/build.py` here.
4. Write `writeups/<slug>.txt` whenever you like and build again.

## The typeface

Likeness is Redaction 35 (MCKL, SIL Open Font License) reshaped: 4 % narrower, a little
heavier, a taller lowercase. `tools/likeness.py` makes it from `tools/Redaction35-Regular.ttf`
and writes `assets/fonts/Likeness-Regular.woff2`; the licence is `assets/fonts/OFL.txt`.
The Likeness Type Bench artifact has the same knobs with sliders; a font exported from it
becomes the site's with `python3 tools/likeness.py --from-otf Likeness-Regular.otf`.

## Preview

`python3 tools/preview.py` builds a copy in `preview/` (git-ignored) with covers as local
files, for publishing as a Claude artifact. Audio does not play there; it does on the site.
