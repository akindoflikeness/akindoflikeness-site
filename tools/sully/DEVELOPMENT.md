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

## Completion checklist

- Every meaningful behaviour or deployment change must add or update the visible
  Log in index.html in the same change, as well as these development notes.
- Preview entries remain In the pot. Shipped requires production verification.
- Open the deployed Log and verify its entry and status before reporting completion.
- Figma-only proposals are design work, not implemented functionality.

## First implementation (approved for release 11 October 2026)

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
Initial release PR: https://github.com/akindoflikeness/akindoflikeness-site/pull/41

A daily 09:00 thread continuation is configured for bounded development work.
It is not a continuously running server; catalogue processing and CI run remotely.
No paid model or database service has been provisioned.

Library search and sorting are implemented. Next add manual queue reordering
with duplicate-reference and opt-in recovery checks. Keep
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

## Library sorting — 11 October 2026

- Inspected draft PR #41 at 6fe783c: Pages, both check jobs and the bounded
  metadata sampler passed; production main remains unchanged.
- Liked releases now offer Recently liked, Artist A–Z and Release A–Z ordering.
  Existing release grouping, within-release order and search remain intact.
  Sorting is a view choice for this visit, not a rewrite of portable library data.
- Local evidence: eight Node tests passed; the browser recovery suite passed
  with additional checks for all three sort orders, search combined with sorting,
  queueing the correct album/track after sorting, and unchanged saved records.
  Existing migration, full backup restore and paused queue recovery still pass.
  Desktop/phone layout checks passed and the phone screenshot was inspected.
- This is a small native control in the existing design system; a dedicated
  personal-library Figma state remains on the design coverage list.
- Next: manual queue move-up/move-down operations, preserving repeated entries,
  then verify their exact order survives opted-in paused recovery. Keep album
  queue semantics separate. Do not start shuffle/repeat in that same step.
- Deployment evidence: implementation 5c45733 passed both remote check jobs,
  Cloudflare Pages and the bounded metadata sampler. The browser suite also
  passed against the deployed branch URL, including the new sorting checks.
  Temporary local server and browser processes were stopped.

## Approved public release — 11 October 2026

The owner tested the preview and explicitly requested publication on the existing
live site, retaining the preview for later development. This approves the current
slice, not completion of all future milestones or the Neocities move.

- Tested implementation: 5c45733; ff15b93 changes only this evidence document.
- Rechecked GitHub evidence: both check jobs, Pages and the push metadata sampler
  succeeded for 5c45733 (the PR sampler is intentionally skipped).
- Release preparation makes the preview badge host-aware and updates the public
  Log and README; application behaviour otherwise remains the tested version.
- Keep slop/discovery-foundations and its Pages preview. PR #41 is the initial
  release; future continuation must inspect current branch changes and use a new
  draft PR when needed. Do not attempt to continue work through a merged PR.
- Future feature changes remain preview-only until separately approved for release.
- Next implementation remains manual queue reordering and paused recovery checks.

### Public verification

- PR #41 merged as 605bb9f after both release check jobs and the metadata sampler
  passed. Cloudflare production deployment 2d2ad1fa-5b4c-4fe0-a82a-93b2e363d493
  succeeded on 11 October 2026.
- The full browser regression passed at https://akindoflikeness.net/tools/slop/:
  migration, repeated playlist entries, exclusions, saved modes, backup restore,
  sorting, paused queue recovery and desktop/mobile overflow checks.
- Confirmed the live wordmark hides the preview badge and the retained branch
  URL shows it. Both expose the released library sorting control.
- Retained and advanced slop/discovery-foundations to the release merge. Future
  feature commits remain isolated from main. Updated the daily continuation to
  treat #41 as release history and open a new draft PR for later development.
- Browser checks used isolated temporary contexts and closed their processes.

## Genre directory and rotation — 11 October 2026 (preview only)

The owner requested a dense, overlapping directory and performant balanced
randomisation in preview. This takes priority over the queued queue-reordering step.

- 165 initial names across 14 editorial browsing families in genres.json; stable
  IDs, aliases, multiple parent routes, neighbours and explanations. GENRES.md
  explains editing, validation, sampling, privacy and incomplete coverage.
- Explore a name separately from adding it to the any-tag Archive search. Multiple
  branches can stay open. Complete families and A-Z expose all entries. Search
  shows matching names/aliases within family context; custom and observed source
  tags remain usable, including when the directory file fails to load.
- Four seeded starting names per family, family-order rotation, bounded device-local
  recent history, oldest-first fallback when saturated, stable tab reload and
  explicit reshuffle. No per-genre Archive or audio requests. Closed branches
  create children only on expansion. Genre rotation does not randomise recordings.
- Availability is unknown unless a tag appears in metadata loaded this session;
  even a seen tag is explicitly not a verification of playable recordings.
- Local evidence: all 12 Node tests passed; browser genre and existing library
  recovery suites passed. Checks cover overlapping selection, aliases, session
  stability, balanced quotas, no browsing-triggered Archive requests, custom tag
  transfer, denied storage, failed data fetch/retry and 320–1440px layout widths.
  Desktop and mobile screenshots inspected; reduced introductory bulk on phones.
- Figma still needs this new directory, expanded/overlapping detail, source-tag and
  responsive states captured. Shared visual components remain the existing design.
- Production remains at 605bb9f. Do not merge this feature without release approval.
- Next: resume manual queue reorder
  with repeated-entry and opted-in paused recovery checks. Broader taxonomy coverage
  and real listener evaluation remain ongoing work, not claimed complete here.

### Hosted preview evidence

- Draft PR #42: https://github.com/akindoflikeness/akindoflikeness-site/pull/42.
  Implementation commit 8e2857099657f9e4e8efb7cd8550c085f60a43d3.
- Both GitHub check jobs passed; the bounded push metadata sampler passed (the
  duplicate PR sampler is intentionally skipped). Cloudflare preview deployment
  e4f1c531-e24d-41fe-b986-0e54a18b5854 succeeded.
- Genre and existing library browser suites both passed against the deployed
  https://slop-discovery-foundations.akindoflikeness-site.pages.dev/tools/slop/.
- Verified remote main remains 605bb9f76ccb02bf58334e3b9274e4c2d102bd95.
  No merge or production deployment performed. Temporary browsers and local
  test server stopped. New Figma states remain documented in FIGMA-COVERAGE.md.
## Log correction and Figma genre revision — 11 October 2026

- Added the missing visible genre-directory Log entry in e42107a, marked In the
  pot; updated its legend to include deployed previews. The development notes had
  been updated without the user-facing Log. Added an explicit completion gate.
- Hosted checks, metadata sampler and Pages deployment passed for e42107a.
  Opened the deployed Log in a browser: new entry visible with preview status and
  no horizontal overflow at 390px. Browser closed afterward.
- Figma now contains editable desktop/phone genre browsing and detail proposals,
  reusable controls, limited prototype links and behaviour notes. See
  FIGMA-COVERAGE.md for exact nodes and validation. These layout changes have not
  been applied to the website. Original Figma screens remain available.
- Next UI step: implement the Figma revision in preview and test focus, scrolling,
  tag selection and playback together. Keep production unchanged.


## Genre Figma implementation and release approval — 11 October 2026

The owner explicitly approved publishing the Figma revision live. Implemented
the desktop and phone states from 79:1179–79:1182 with native controls, scoped
220px navigation on Genres, an independently scrolling directory/detail region,
pinned filter selection, and separate exploring and filter toggles. Existing
sidebar, player, local assets, colours and fonts are reused. Randomised content
and availability come from actual directory/session data, not mockup examples.

All 12 Node tests and all three browser suites passed locally. The new layout
suite verifies keyboard exploration and selection, Escape/Back focus restoration,
exact directory scroll restoration, shared overlapping state, selection removal
on phones and usable pinned controls at 320–1440px and short landscape sizes.
Desktop and phone directory/detail screenshots inspected. Preview/deployment
verification must precede merging PR #42; then verify production and update Log
to Shipped. Keep the development branch and preview available afterward.


### Genre revision: public release verified

- PR #42 merged as aa96e5ff1ce3440ee5405f7a9025fff6352a30d2 after both hosted
  checks and the sampler passed. Preview deployment 423f7e03 and production
  deployment 7f193f4e succeeded. The newer favicon commit was preserved.
- Public checks exposed a stale stylesheet URL during the initial deployment;
  cache-version correction 22d2065 passed preview tests. Concurrent main commits
  a5fc58b/d21846d renamed the app to Sully, moved it to tools/sully and already
  refreshed all coupled asset versions. Merge 9f040f5 preserves that complete
  update; its tree matches the renamed main before this Log-only follow-up.
- All three browser suites passed on https://akindoflikeness.net/tools/sully/:
  genre rotation, overlaps, denied storage, failed fetch recovery, keyboard and
  scroll restoration, pinned controls, 320–1440px/short landscape layouts, and
  existing library/queue recovery. Temporary browsers and local server closed.
- The visible genre entry is now marked Shipped. Preview remains at
  https://slop-discovery-foundations.akindoflikeness-site.pages.dev/tools/sully/.
- Resume bounded preview development from tools/sully. Future feature publication
  needs its own release approval; this approval covered the genre revision.

### Public cache verification after the Sully rename

- Release 5851308 deployed successfully. The custom domain still served the old
  Log because the zone's 600-second HTML cache exception named only /tools/slop.
- Extended that existing exception to /tools/sully, /tools/sully/ and
  /tools/sully/index.html (ruleset 81aed3017e0d452ca538233281d91c4d version 4).
  Existing cache behaviour for the rest of the site is preserved. A targeted
  three-URL purge alone had not resolved the stale response.
- A fresh browser verified the plain old URL redirects to Sully, the public Log
  shows Shipped, production hides the preview badge, and the retained preview
  displays its badge and working genre families. Browser closed afterward.
- When renaming this app again, carry forward the HTML cache exception as well
  as redirects and asset versions. Next work remains the preview continuation
  queue, with UI changes designed in Figma before implementation.

## 12 October: validate queue recovery before restoration (preview)

- Synced released main through 34677e2 into the continuing preview; preserved
  compact layout, artwork drawer and shared Base UI controls. Previous preview
  6d9cf51 passed Pages, recovery checks and the bounded metadata sampler.
- Before manual queue ordering, closed a recovery validation gap: unknown snapshot
  versions and oversized lists were silently ignored, and invalid positions were
  coerced. A shared validator now rejects the complete snapshot before assigning
  either queue and uses the existing recovery message. Null means no snapshot.
- Five personal-library Node tests pass, including duplicate ordering, the combined
  10,000-track boundary, invalid references, current track and playback positions.
  The local browser recovery suite passes, including damaged album data alongside
  a valid manual queue: neither partially restores and likes remain intact.
- No new UI controls; manual queue ordering still needs its Figma design before
  implementation. Keep shuffle/repeat out of that step. Production is unchanged.
- Updated visible Log as In the pot and refreshed both dependency URLs plus the
  bootstrap URL. Temporary local server and browser stopped after checks.
- Deployed evidence: 35c918e passed both hosted check runs, Pages and the bounded
  push sampler (PR sampler intentionally skipped). The full recovery browser
  suite also passed against the deployed preview. Opened its Log and verified
  the recovery entry is visible with IN THE POT status. Draft PR #43 tracks this
  preview-only work: https://github.com/akindoflikeness/akindoflikeness-site/pull/43.
## 12 October 2026 — full-width views

Removed the shared 1008px content cap and the separate 800px handbook cap.
All views now fill the available main column with the existing responsive gutters.
Paragraph-specific reading limits remain. Stylesheet cache keys updated.

Verified locally and on the public route: responsive density checks passed, including
full-width geometry for all views at 1440px, 1920px and 2880px. Mobile overflow
checks passed down to 320px. Refreshed stylesheet keys after CDN cache verification.

## 13 October: queue recovery opt-out across tabs (preview)

- Synced main through 3bb2273, preserving the full-width release and unrelated
  publication. Resolved adjacent Log and development-note additions by retaining
  both histories. PR #43 remains a draft; previous 74bcc70 checks all passed.
- Found that an already-open tab retained its recovery opt-in after another tab
  disabled it, and could recreate the deleted snapshot during queue changes or
  page close. Storage events now synchronise the checkbox and preference; every
  snapshot write also checks stored consent to cover delayed storage events.
- Live queues stay independent. Enabling elsewhere does not immediately overwrite
  the snapshot. Legacy keys remain unchanged. Clearing localStorage also disables
  recovery in other tabs. No new interface controls or Figma changes are needed.
- Local browser suite passed with two-tab disable, deliberately stale in-memory
  consent, preserved live order, reload without recovery, and storage-clear plus
  pagehide checks. Existing damaged snapshot, backup and library checks pass.
  Syntax and whitespace checks pass; temporary server and browser stopped.
- Visible Log entry is In the pot. Refreshed personal-ui and bootstrap URLs.
  Next: Figma queue ordering controls, then duplicate-reference and paused recovery
  ordering checks. Shuffle/repeat remain separate; production unchanged.
- Deployed evidence: 615f9ab passed both hosted checks, Pages and the bounded
  push sampler; duplicate PR sampler skipped as intended. The browser recovery
  suite passed on the deployed preview, including the new cross-tab scenarios.
  Its visible Log entry was opened and verified as IN THE POT. PR #43 updated;
  all temporary browsers closed. No production changes or new services.

## 14 October: remote Firefox and WebKit recovery gate (preview)

- Previous d12dae6 checks and Pages passed. Synced main through 58bd05a without
  changing production. Draft PR #43 remains the recovery work under review.
- Added the milestone's missing Firefox/WebKit recovery gate. The existing real
  browser suite now accepts an explicit engine; Chromium remains the default.
  The new remote job runs Firefox then WebKit sequentially under a ten-minute
  limit and stops its temporary server. No local browser downloads or services.
- Coverage is the same backup, migration, repeated references, malformed snapshot,
  cross-tab opt-out, paused recovery and responsive library flow used in Chromium.
  This exercises engines on Linux, not actual Safari/iOS hardware certification.
- Syntax check passes. Hosted results pending; the Log entry remains In the pot.
  No application script changes, so no asset version refresh is necessary.
- Next remains Figma queue ordering controls, followed by exact duplicate ordering
  and paused-recovery checks. Keep shuffle/repeat separate.
- Hosted evidence: a78291d passed both Firefox/WebKit jobs, both existing Chromium
  checks, Pages and the bounded push sampler. The duplicate PR sampler was skipped.
  Opened the deployed preview Log and verified its browser-check entry is visible
  as IN THE POT. Temporary browser closed. Recovery now has three-engine evidence;
  hardware-specific mobile validation remains a later release gate.

## 15 October: reconcile released discovery filters with recovery preview

- Previous a8db01d passed Pages, Chromium and both remote recovery-engine checks.
- Main 22a3243 adds released discovery filtering. Merged it into preview and
  resolved bootstrap conflicts explicitly: music-filter-1 for Archive/app,
  recovery-validation-1 for the personal library, recovery-consent-1 for recovery.
  A new recovery-music-1 bootstrap URL prevents a cached loader dropping either.
- Retained both release and preview Log entries, adding the integration note.
  Focused Archive/personal tests and bootstrap syntax pass. Production unchanged.
- This run is bounded release integration, not new queue UI. Next remains Figma
  queue ordering controls and duplicate-order recovery checks. Hosted and deployed
  integration verification pending below.
- Integration evidence: 4f08841 passed all hosted Chromium, Firefox/WebKit checks,
  Pages and the bounded push sampler. Deployed preview library recovery suite
  passed; opened Log confirmed both histories and the 15 Oct integration note,
  with the new bootstrap URL loaded. Temporary browsers closed. No user decision
  or new production milestone; routine integration only.

## 16 October: storage-quota recovery regression gate (preview)

- Read continuation queue and confirmed 329743f hosted checks all passed; no new
  main changes. Native Figma canvas editing (use_figma) is absent from the current
  tool inventory, so queue-control design cannot be completed in this run. Do not
  substitute a code-backed Figma app or claim the controls have been designed.
- Added a focused storage-failure scenario to the existing three-engine recovery
  suite: fail only snapshot writes with QuotaExceededError, check old snapshot
  removal, live duplicate sequence and likes preservation, one warning per failure
  episode, then restore writes and reload the exact sequence paused.
- This tests existing recovery behaviour rather than adding controls. No runtime
  asset changes or cache-version changes needed. Visible Log added as In the pot.
- Syntax passes; remote and deployed evidence pending. Next remains native Figma
  queue-control design when canvas editing is available; no owner action needed.
- Verified 26b8bf8: both hosted Chromium and Firefox/WebKit jobs passed, along
  with Pages and the bounded push sampler. Deployed preview recovery suite passed
  the quota scenario; opened Log verified the new entry as In the pot. Temporary
  browsers closed. This confirms existing behaviour; no new production milestone.

## 17 October: editable queue ordering proposal

- Native canvas editing returned. Used figma-use and figma-generate-design to
  inspect existing Queue 5:6210, local action component 80:1199, Lora and colour
  variables. No Code Connect files found. Existing screens/components retained.
- New focused ordering proposal: board 106:1703, desktop panel 106:1704, phone
  panel 106:1741, behaviour notes 106:1778. Uses editable text, auto-layout and
  quiet-action component instances with existing colour variables. These are
  focused content panels, not complete application screens or working controls.
- First/last disabled states, duplicate occurrences, 44px buttons, compact desktop
  rows, phone stacking and independent album order documented. Search disables
  reordering until cleared; native keyboard actions retain occurrence focus and
  announce new position. Existing play/next/remove actions remain in implementation.
- Inspected final screenshot after auto-layout and density corrections. No blank
  image placeholders or flattened UI. No new components or runtime asset changes.
- e41cc43 remote checks passed before work; production and application behaviour
  unchanged. Added visible design-only Log entry. Next: implement this proposal in
  preview, with exact duplicate-order, focus, filtered view and recovery checks.
- Pages deployed 360f3e9; opened preview Log and verified the design-only wording
  and proposal link. Chromium checks and sampler passed; Firefox/WebKit runs were
  still in progress at this observation (no runtime changes in this slice).
  Temporary verification browser closed. PR #43 remains preview-only.

## 18 October: manual queue ordering in preview

- Implemented the focused Figma ordering actions from 106:1708 (design context
  and screenshot retrieved with figma-design-to-code). Existing play/save/next/
  remove controls and shared shell remain; on phones ordering wraps underneath.
- Moves by occurrence index, preserving repeats, current playback and album queue.
  Boundaries and filtered queues use aria-disabled with guarded handlers so the
  focused action remains reachable after a move to the boundary. A polite status
  announces the new position. Shared queue-change events trigger opt-in recovery.
- Local library suite passed: duplicate occurrence moved once, keyboard/focus,
  boundary guard, filtered click guard, album/current preservation, exact paused
  reload order, and no overflow at 1440/390/320px. Phone screenshot inspected.
  Temporary browser/server stopped. No model or catalogue processing locally.
- Added queue-order.js/css and refreshed bootstrap URL. Visible Log marks the
  implementation In the pot; historical design entry remains dated 17 October.
- Next: review deployed three-engine results, then advance remaining library
  milestone (saved releases / exchange) separately from shuffle/repeat. Production
  release requires separate approval; PR #43 remains draft.
- Verified aa4eecf: all hosted Chromium/Firefox/WebKit checks, Pages and sampler
  passed. Deployed preview recovery suite passed and its ordering Log entry was
  opened and verified In the pot. PR #43 title/body updated to the complete scope.
  All temporary processes stopped. Production unchanged.

## 19 October: queue search ignores action labels (preview)

- Confirmed 76cdd6e checks passed, synced main through 45568cc, preserving unrelated
  essay publication. Found the new Move controls were included in queue search:
  a search for Move returned all three unrelated tracks in the deployed preview.
- Added a failing browser regression (3 matches instead of 0), then scoped queue
  search to the existing trackCopy title/artist text. Artist matching remains
  covered. No new controls or layout changes; ordering guards remain intact.
- Refreshed design-ui and bootstrap versions, added visible preview Log entry.
  Syntax passes; hosted/deployed fixed-result verification follows. Production
  unchanged. Next: saved releases/exchange slice from the library milestone.
- Fixed-result evidence: 0692bed passed all hosted Chromium/Firefox/WebKit checks,
  Pages and bounded sampler. The previously failing deployed regression now passes,
  including artist matching, and the visible Log was verified In the pot. All
  temporary browsers closed. Routine preview correction; no release decision.
