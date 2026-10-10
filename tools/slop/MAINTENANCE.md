# Maintaining Slop

Slop is a buildless static Internet Archive player at tools/slop/ in the
wraithsys/akindoflikeness-site repository. The deployed route is
https://akindoflikeness.net/tools/slop/ and pushes to main publish through
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

There is no account, backend, server-side library, or build step for this
tool. Archive metadata and file names are the authority for public labels and
audio URLs. Liked tracks are per-browser IndexedDB state in slop-library,
store saved.

## Slop Slip

A version one Slip looks like this:

    #v=1&r=archive-identifier&f=relative%2Ftrack.ogg&at=83

r is an Archive identifier. f is optional for a release-only Slip; when
present it must be a relative browser-playable mp3, ogg, m4a, flac, wav, or opus file. at is
an optional whole-second timestamp and only works with an exact file.

Do not use the location fragment for navigation. It belongs to Slop Slip.
Received track links prepare and seek the exact track but must not autoplay.
Listener-facing names come from Archive metadata, never URL text.

## Update procedure

1. Pull the current main state before editing.
2. State the user-visible outcome and the invariant that must survive it.
3. Trace the actual path: page markup, Archive metadata, player, queue,
   device state, and any URL contract.
4. Change the smallest appropriate layer. Keep unrelated clean-up separate.
5. Run focused checks:

       node --check tools/slop/app.js
       node --check tools/slop/slop-slip.js
       node --check tools/slop/slop-slip-ui.js
       node --check tools/slop/embed.js
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
   that changes the Log entry from In the pot to Shipped and records the
   verification date. Push and verify the public Log itself.

Keep credentials, access tokens, private host paths, and browser export data
out of this document and the public Log. Before a formal handover, add a
human contact route to the ledger in Docs.
