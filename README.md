# akindoflikeness.net

Static site on Cloudflare Pages: music, blow your phase off, transmutation.
The Music page randomly features one album on each load, with a prose excerpt
of up to 129 characters; the remaining albums appear in the gallery. The selection
runs in `music-feature.js` each time the Music page is opened.
The footer player is shared by every page. Swup 4.10.0 (vendored under
`assets/vendor/`, MIT licence included) replaces the main content and navigation
while retaining the audio element. `site-navigation.js` refreshes page components,
theme, metadata and playing indicators. Normal links still work without JavaScript.
Playback continues during internal navigation, including browser back/forward;
full reloads and links opened in a new tab start separate documents.

The player follows album track order automatically, with previous/next controls.
Volume remains saved between visits.

## Where things are

To edit Writing, open a file in `prose/`. The first line is its title, followed by
a blank line and the prose. Blank lines separate paragraphs. These are plain text
documents: no HTML, dates, excerpts or other publishing fields. Album notes use
the same document on their release page. The title controls the Writing heading;
album names in the music catalogue stay in `catalogue.json`.

Save, commit and push to `main` as usual. The **Publish prose** GitHub Action builds
the pages and commits them automatically; Cloudflare Pages publishes that commit.
There is no manual build step for prose edits. To add a piece, add
`prose/your-piece.txt` with the same title-and-prose format. Its filename sets the
URL, its first commit supplies its date, and its first paragraph supplies its
excerpt. Existing publication dates and related links remain outside the documents.
Keep the filename when changing a title so existing links continue to work.

| you want to change              | edit                                   | then run                    |
|---------------------------------|----------------------------------------|-----------------------------|
| Writing title or prose / release notes | `prose/<slug>.txt`             | commit and push to `main`   |
| the index introduction         | `writeups/index.txt`                   | `python3 tools/build.py`    |
| a release's tracks, date, colour| `catalogue.py` in `Music/akol-albums/tools`, then `export_catalogue.py` there (it writes `catalogue.json` here too) | `python3 tools/build.py` |
| blow your phase off, transmutation, terms, 404 | `pages/<name>.html` (a few `key: value` lines, `---`, then HTML) | `python3 tools/build.py` |
| the sidebar, the page frame     | `tools/templates/base.html`            | `python3 tools/build.py`    |
| the look                        | `style.css`                            | nothing                     |
| the player                      | `player.js`                            | nothing                     |

`index.html`, `music.html`, `music/*.html`, the four hand-written pages and `sitemap.xml` are
built files; the build overwrites them.

## Adding a release

The tools browser is built from `tools.json`. Add an entry with a name, GIF, still
image, dimensions, alt text, GitHub URL and detail-page URL, then rebuild. Left and
right navigation enables automatically when there is more than one tool. Instrument
images currently live in `assets/instruments/`; the still image is used for reduced
motion. Writing documents live in `prose/*.txt`; `writing.json` only preserves
existing essay dates. The index lists newest pieces first.
Album notes also appear automatically in Writing, labelled with the release date.
Albums without prose are omitted. Related
reading links are listed by slug in `writing-links.json`; essay pages link back to
listening, and release pages link to their writing. The original connection notes
are in `drafts/prose.md` under “Links noticed (for later)”.

1. Organise, encode and upload it with the scripts in `Music/akol-albums/tools`
   (`README.md` there walks through it). Give it an `accent` in `catalogue.py`: one
   colour from the cover, used for the playing track, the progress line and text selection.
2. `powershell -File tools/cover_web.ps1` and `sh tools/upload_covers.sh` there put the
   800 px `cover-web.jpg` on the archive.org item. The site shows that copy.
3. `python3 export_catalogue.py` there, then `python3 tools/build.py` here.
4. Write `prose/<slug>.txt` (title, blank line, prose) whenever you like and push.

Mutation uses the fresh Archive.org item `mutation-akol-v2`: the original item's
delivery server returned HTTP 500 for covers and audio. All seven FLAC masters
and seven MP3s were copied with matching checksums, along with the updated cover.
The site uses the same cover and streaming URL patterns as every other release.
Its `archive_identifier` in the source catalogue and the cover upload scripts
retain this item when exporting or uploading again.

## The typeface

Likeness is Redaction 35 (MCKL, SIL Open Font License) reshaped: 4 % narrower, a little
heavier, a taller lowercase. `tools/likeness.py` makes it from `tools/Redaction35-Regular.ttf`
and writes `assets/fonts/Likeness-Regular.woff2`; the licence is `assets/fonts/OFL.txt`.
The Likeness Type Bench artifact has the same knobs with sliders; a font exported from it
becomes the site's with `python3 tools/likeness.py --from-otf Likeness-Regular.otf`.

## Preview

The index uses the background-removed Pathologic-style portrait in `assets/pathologic-portrait-transparent.png`.
The PS2 assets remain available for later use; `avatar.js` is not loaded.
Images share the `.content-image` figure style, which preserves their proportions
and supports optional captions. Page-specific classes handle placement separately.
For new images, supply descriptive alt text and intrinsic width/height to reserve
space; use `loading="lazy"` for images below the fold. For animation, follow the
`<picture>` pattern with a still fallback and an animated source limited to
`(prefers-reduced-motion: no-preference)`.
The original integration notes and a separate style study remain in `drafts/avatar/`.

`index-images.json` holds the ordered gallery beneath the introduction. It is currently
empty while the artwork is being revised; image files are retained locally. Files live in
`assets/gallery/`. An empty list hides the gallery entirely. Each entry has `src`
(a still image path under `assets/`), `alt`, `width`, and `height`. Optional `caption`
and `animated` (also under `assets/`) add a caption or native animation. Rebuild with
`python3 tools/build.py`. For example:

```json
{
  "src": "assets/ps2-avatar-still.webp",
  "animated": "assets/ps2-avatar-animated.webp",
  "alt": "A character in a cap",
  "width": 512,
  "height": 512
}
```

Use the incoming artwork rather than duplicating the portrait. The gallery is a single
row of small images with space between them, scaling down together on narrow screens.
It preserves image proportions and loads images lazily. Animated entries use the still version for
reduced motion. No carousel, image viewer, or extra JavaScript is needed.

`python3 tools/preview.py` builds a copy in `preview/` (git-ignored) with covers as local
files, for publishing as a Claude artifact. Audio does not play there; it does on the site.
