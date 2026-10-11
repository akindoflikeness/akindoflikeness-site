# Maintaining the genre directory

The directory is an editable set of browsing routes, not an authoritative history
of music. Family membership and neighbours are editorial relationships, not
measured sound similarity. The initial 165 names are a starting vocabulary, not
complete cultural or geographical coverage. In particular, the broad regional
and dance traditions family needs further depth and review. Unclassified Archive
tags and custom names remain searchable without admission to this directory.

## Data and changes

Edit `genres.json` directly; no bundler or database is required. Every entry has:

- `id`: permanent lowercase hyphenated identifier. Keep it stable when renaming.
- `label`: visible name; `aliases`: alternative names for directory search.
- `tag`: exact Archive subject to search, or null for a navigation-only grouping.
  Aliases aid navigation; they are not silently added to Archive searches.
- `parents`: zero or more broader routes. Multiple parents are encouraged where
  useful. Parent links must not cycle. Every entry must be reachable from a family.
- `related`: neighbouring routes, distinct from parentage. Add both directions
  for mutual relationships; these are deliberately not inferred automatically.
- `note`: explain the editorial choice, uncertainty, or source. Prefer a specific
  reason or verifiable reference when revising the initial broad groupings.

Add top-level entry IDs to `families`. Roots can be genre tags or purely navigational
groups. The validator catches missing IDs, duplicate IDs/names, repeated edges,
cycles and unreachable entries. Run `node --test tools/sully/genre-directory.test.cjs`
before committing, then inspect desktop and phone previews. `genre-ui.js` owns the
interface; `genre-directory.js` validates and indexes the graph and samples names.

## Rotation contract, version 1

All families are displayed. Each receives up to **four** descendant starting names,
regardless of family size. A seeded Fisher–Yates shuffle varies family order and
candidate order. Previously unshown candidates take priority; if history covers
the pool, least recently displayed names take priority. A name already selected
for another family is deprioritised, with duplication allowed when required to
fill a small pool. Equal family quotas are an editorial balancing choice, not a
claim of equal probability for every genre or neutral representation of music.

The seed and history input reproduce a display with the same directory version.
The most recent 200 genre IDs live in localStorage (`slop-genre-rotation-v1`).
sessionStorage (`slop-genre-session-v1`) retains seed, input and ordering for reloads
in the same tab. Navigating, selecting, expanding and listening do not rotate it.
Reshuffle deliberately changes it. Search temporarily shows matches in context;
clearing search restores the same selection. Complete families and A–Z ignore
rotation. Forget history removes local recent IDs without changing the current
view. Blocked, corrupt or full storage falls back to working in memory.

Indexes are prepared once after the one small JSON fetch. No per-genre catalogue
request or audio fetch is made. Closed branches have no child DOM until expanded.
History is bounded, and source tags observed in this session are capped at 300;
the source-tag panel displays at most 100 matches (search narrows them).

Only tags observed in metadata from loaded results or liked references receive
the 'seen' dot. This never verifies playable audio or estimates catalogue coverage.
Absence of a dot means unknown, not unavailable. These observations stay in memory.
Selecting a parent searches that exact tag, not all its descendants. Up to 20
selected tags use the existing any-tag Archive search. Selection is session UI,
separate from the portable library. A–Z, source-tag access and data-load failure
must remain usable without randomisation.

Recording randomisation is separate and is not implemented by this directory.
Archive search continues its existing relevance/date ordering; rotating genre
names does not make that underlying catalogue sample random or comprehensive.

## Design and handoff

The preview retains Sully's Lora typography, shared sidebar and player. Figma still
needs the new atlas, overlap detail, expanded branches, source-tag and phone states
if the design file is to describe this implementation. Do not replace working
keyboard controls with flattened illustration. Test with blocked storage, failed
directory loading, overlapping selection, long names and narrow screens.
