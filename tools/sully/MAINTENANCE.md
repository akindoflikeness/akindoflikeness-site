# Maintaining Sully

Sully is a static Internet Archive player at tools/sully/ in the
akindoflikeness/akindoflikeness-site repository. The deployed route is
https://akindoflikeness.net/tools/sully/ and pushes to main publish through
Cloudflare Pages.

## Runtime map

- index.html contains the static shell, dialogs, navigation, Log, and Docs.
- app.js owns discovery, metadata, playback, queue, and device-local likes.
- slop-archive.js defines phrase-based, field-specific Archive search.
- slop-ui.css and icons/ implement the shared Figma layout.
- artwork.js owns artwork helpers.
- layout-rhythm.css owns the established compact layout.
- slop-slip.js defines the versioned exact-share protocol.
- slop-slip-ui.js adds the player and release sharing actions.
- slop-slip.css styles those sharing controls.
- embed.html and embed.js provide the quiet iframe player.
- slop-handbook.css styles the Log and Docs views.

There is no account, backend, or server-side library. Shared UI components
are bundled locally with React and Base UI; deployment serves the committed bundle. Archive metadata and file names are the authority for public labels and
audio URLs. Liked tracks are per-browser IndexedDB state in slop-library,
store saved.

## Sully Slip

A version one Slip looks like this:

    #v=1&r=archive-identifier&f=relative%2Ftrack.ogg&at=83

r is an Archive identifier. f is optional for a release-only Slip; when
present it must be a relative browser-playable mp3, ogg, m4a, flac, wav, or opus file. at is
an optional whole-second timestamp and only works with an exact file.

Do not use the location fragment for navigation. It belongs to Sully Slip.
Received track links prepare and seek the exact track but must not autoplay.
Listener-facing names come from Archive metadata, never URL text.

## Update procedure

1. Pull the current main state before editing.
2. State the user-visible outcome and the invariant that must survive it.
3. Trace the actual path: page markup, Archive metadata, player, queue,
   device state, and any URL contract.
4. Change the smallest appropriate layer. Keep unrelated clean-up separate.
5. Run focused checks:

       node --check tools/sully/app.js
       node --check tools/sully/slop-slip.js
       node --check tools/sully/slop-slip-ui.js
       node --check tools/sully/embed.js
       git diff --check

6. Serve the repository locally and use a real public Archive item. Check
   discovery, release opening, playback, a received Slip, and no-autoplay
   behaviour where relevant.
7. Update Docs when a lasting contract, data path, or handover fact changed.
   Append Log entries for meaningful behaviour, reliability, or deployment
   facts.
8. Commit and push the coupled static files to main. When changing app.js,
   update its cache suffix in index.html.
9. Verify the normal public route and a fresh cache-busted request. Only after
   the functional deployment is verified, make a second small source update
   that changes the Log entry from In progress to Shipped and records the
   verification date. Push and verify the public Log itself.

Keep credentials, access tokens, private host paths, and browser export data
out of this document and the public Log. Before a formal handover, add a
human contact route to the ledger in Docs.

## Name and compatibility

Sully was previously called Slop. The old /slop and /tools/slop/ routes redirect to /sully and /tools/sully/. Redirects preserve query strings and listening fragments. Keep the slop-library database, localStorage keys, broadcast channel, export format identifiers and v1 listening-link protocol unchanged: these preserve existing libraries and backups on the same origin. Internal slop-prefixed filenames and JavaScript APIs are retained for compatibility. New backup filenames use sully. Historical development notes and copyright attributions retain their original names.

## Artwork drawer

src/ui.jsx and artwork-drawer.css provide an independent overlay outside the sidebar. The player thumbnail toggles it; Close and Escape return focus to the thumbnail. Covered navigation is inert while open. The panel ends above the measured player height and keeps images uncropped. Track selection updates the artwork without forcing the drawer open. Run tests/artwork-drawer-browser.cjs for short-screen geometry, focus recovery and unchanged playback state.

## Archive request budget

List artwork must use `SlopArtwork.attach(img, id, files, true)` and native lazy loading. It must not fetch metadata or probe original cover files. Opened releases and player artwork may resolve originals; duplicate elements share the resolution promise. Failed resolutions are retained for the tab lifetime, not retried automatically. Run `node --test tools/sully/artwork.test.cjs`. See ARCHIVE-REQUEST-AUDIT.md for the 11 October investigation and its limits.

## Shared UI and copy

From tools/sully, run `npm ci` then `npm run build` after editing src/ui.jsx.
Commit ui.bundle.js, ui.bundle.js.LEGAL.txt and THIRD-PARTY-NOTICES.txt together.
CI rebuilds and rejects stale generated files. There are no runtime CDN dependencies.
Base UI owns dialog, drawer and popover focus, dismissal and positioning. The
bootstrap waits for mounted controls before loading the existing player modules.
Modal content stays mounted so forms and legacy event listeners survive reopening.
Use these shared components for new overlays instead of adding another custom implementation.
Native buttons, selects, inputs and details remain where they already work well.

Preserve the Figma layout and Archive metadata. Use title case for interface
headings and labels (Artists & Releases), sentence case for prose, and short,
actionable empty/error states. Do not rewrite artists' names or release titles.
Run tests/base-ui-browser.cjs for modal focus, dismissal and repeated opening,
plus the existing library, artwork, genre and Archive-failure browser suites.
