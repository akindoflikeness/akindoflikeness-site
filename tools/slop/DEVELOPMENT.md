# Slop development programme

Started 10 October 2026. Development branch: `slop/discovery-foundations`.
Production stays on main. Neocities is the intended independent home once the
functional and recovery gates pass. Do not move the public site prematurely.

## Operating agreement

- Choose routine engineering details without asking the owner repeatedly.
- No compulsory listener account, uploaded library, telemetry or artist-specific promotion.
- Keep local work to editing, small deterministic tests and one temporary browser.
- Run bounded catalogue jobs and CI on standard GitHub-hosted Linux runners.
- No local model downloads, background audio processing or persistent dev server.
- Do not provision paid services, GPU jobs or new spending without a concrete cost decision.
- Report completed milestones, meaningful failures or genuinely blocked decisions.
- Each continuation reads this file and the open branch, performs one bounded unit
  of work, updates evidence and remaining work, and stops temporary processes.

## First implementation (development only)

- Existing likes migrate without deletion from IndexedDB version 1 to 2.
- Playlists support creation, rename, repeated entries, ordering, removal, queueing
  and undoing a playlist deletion.
- `slop-library` version 2 exports likes, playlists, saved metadata modes and
  exclusions. Original `slop-saved-tracks` version 1 files still import.
- Import validates before writing, uses one transaction for both stores and
  preserves conflicting playlists/modes as additional copies. Existing policy
  wins during merge; a clean restore uses the imported policy.
- Unavailable recordings remain references; importing never requires the source
  to be online. Library export excludes queue/position and credentials.
- Optional queue recovery records the current queue and position on this origin,
  and restores paused. It is off by default, clears its snapshot when disabled,
  and an incoming Slip takes precedence. Last active tab wins for this snapshot.
- Metadata discovery can exclude exact credited artist names locally, spread each
  returned page across artists, and save named searches. Catalogue totals remain
  distinct from locally visible results. Filters do not imply verified identities.
- Media Session transport controls are a progressive enhancement.
- Native IndexedDB is retained to keep this migration small. Dexie remains an
  option when richer relationships justify it, not a prerequisite for recovery.

## Milestones and acceptance gates

1. **Recoverable library and player.** Finish search/sort within the library,
   saved releases, queue reordering/shuffle/repeat, JSPF/XSPF exchange, notes and
   optional local history/follows. Verify multi-tab updates, quota failure,
   invalid imports, deletion/merge semantics and full export/clear/restore.
   Test Firefox/WebKit as well as Chromium in remote CI. Review mobile screenshots.
2. **Useful metadata discovery.** Turn the bounded remote catalogue sample into
   an incremental static catalogue with eligibility rules, stable references,
   provenance, refresh budgets and unavailable-track reporting. Broaden the
   sample beyond popularity before judging recommendations. Introduce a provider
   adapter for Archive and static catalogue candidates. Add multiple seeds,
   saved plan validation, explanations and deterministic local diversification.
   Explicit exclusions must never relax silently. Record a metadata baseline.
3. **Sound experiment.** Select a rights-reviewed sample, pin a permitted CLAP
   checkpoint/revision and preprocessing, measure transfer/compute costs remotely,
   and write versioned feature manifests. No audio is approved for analysis by
   the metadata sampler. Evaluate blinded prompts and held-out creators against
   the metadata baseline. Optional LM translates to validated editable controls;
   it never fabricates vectors or identity. Model absence must remain explicit.
4. **Independent release.** Verify portable libraries on a new origin, hosting
   limits, security headers, error fallback and keyboard/mobile flows. Publish a
   reversible Neocities release. Keep catalogue/feature providers replaceable.
   PostgreSQL/pgvector enter only when static indexing becomes unwieldy; document
   an export path and monthly cost ceiling before provisioning.

The complete 6 October research remains the design reference. Its proposed
library v1 example was never the shipping format; the implemented v2 format is
deliberately smaller and must not be mistaken for that proposal's full schema.
No CLAP, PostgreSQL, pgvector or semantic sound-search service is running yet.

## Checks

`node --test tools/slop/slop-archive.test.cjs tools/slop/slop-personal.test.cjs`

Serve the repository and run `tools/slop/tests/library-browser.cjs` with Playwright.
Set `SLOP_TEST_URL`, `SLOP_PLAYWRIGHT` and optionally `SLOP_BROWSER_CHANNEL` as needed.
The browser regression uses deterministic Archive responses to isolate recovery
and filtering; real Archive playback remains a separate release smoke check.

CI is limited to ten minutes per job and cancels superseded branch runs. The
metadata experiment requests at most twelve items, one metadata request per
second, eighteen-second timeouts, no audio download, and one-day artifact retention.
The sample is operator evidence, not yet a production catalogue.

## Continuation queue

First-slice evidence on 10 October: eight Node tests passed; browser checks passed
locally and against the isolated Pages preview, including v1 migration, repeat
entries, local exclusions, full export/fresh-browser restore and paused queue
recovery. Desktop and phone layouts were visually inspected. Both GitHub CI runs
for d06ef17 passed. The first remote sample returned six netlabel items and 273
tracks with zero audio bytes; it exposed an overly narrow mediatype restriction
for etree, corrected to accept both audio and etree and fail if either collection
returns no items. The corrected 2384f91 run passed both CI checks and collected twelve items with 427 track references, zero failures and zero audio bytes. The latest preview serves that implementation.

Preview: https://slop-discovery-foundations.akindoflikeness-site.pages.dev/tools/slop/
Draft PR: https://github.com/akindoflikeness/akindoflikeness-site/pull/41

A daily 09:00 thread continuation is configured for bounded development work.
It is not a continuously running server; catalogue processing and CI run remotely.
No paid model or database service has been provisioned.

Next add library search/sort and queue operations with recovery checks. Keep
development separate until the milestone is coherent. Do not label previews
Shipped in the public Log or merge simply because automated tests pass.

## Figma integration — 10 October 2026

The development UI now uses locally hosted Lora, enclosed contextual search,
working genre multiselection, album-grouped liked tracks with local search,
queue filtering, correct active navigation and a compact phone player.
New playlist controls live in a disclosure, preserving the album-first library.
Read FIGMA-COVERAGE.md before further UI work: it records source node IDs,
intentional live-data adaptations and the missing design states. Do not copy
illustrative CLAP results or claim that metadata search uses an audio model.
Keep new screens aligned to those shared components and retain one-column nav.
