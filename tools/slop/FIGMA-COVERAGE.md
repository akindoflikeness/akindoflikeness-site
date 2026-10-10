# Figma integration and remaining design work

Source: https://www.figma.com/design/vkLYFKei7GBAjzke9cvcSt/Untitled
Checked 10 October 2026. Development preview only; production remains unchanged.

## Connected to working code

- Shared sidebar 9:31: one vertical navigation list, new Blend genre icon,
  artwork-only remaining space, fixed viewport above the player. Short desktop
  windows compact the rows; phones use the existing Menu control.
- Contextual search 16:1985: enclosed 56px bar, original exported search/submit
  assets, scoped Archive search plus real local liked-track, queue, Docs and Log
  filtering. About's bar explicitly searches the Archive.
- Discover 16:1345: Lora italic heading, compact introductory rhythm, genre pills,
  listening-path cards, real personal playlists when available. Empty libraries
  show real Archive collection routes. Illustrative recordings are not seeded
  into anyone's library. Recent releases remain labelled metadata discovery.
- Genres 16:1569: searchable starting vocabulary, persistent selection during
  filtering, removable selections, transfer to Search using any selected tag.
- Search 5:5833 / 16:1990: result surface, removable active genre filters and
  correct active navigation. Actual Archive artwork and metadata are retained.
- Liked 5:6016: album groups, artwork, release-level actions, compact track rows,
  local search and portable Save/Load. Playlist editing remains available in a
  disclosure above the liked albums.
- Queue 5:6210, release 5:6712, share 5:6964, Docs 5:6488, About 5:6621 and
  Log 5:6340 reuse the same font, palette, spacing, controls and persistent player.
  Native seek/volume controls remain functional; they are not flattened artwork.
- Lora regular/italic variable fonts are hosted locally, with the upstream OFL
  license. Source: https://github.com/google/fonts/tree/main/ofl/lora . No font CDN.

## Still needs designed states in Figma

1. **Personal library:** playlist creation/edit/reorder/delete/undo, repeated tracks,
   empty playlists and the playlist/liked navigation relationship. The current
   disclosure is a working adaptation, not an existing Figma screen.
2. **Discovery preferences:** saved modes, exclusions, diversity and a useful
   explanation of fewer visible results than catalogue matches. Include invalid
   input, empty and saved-success states.
3. **Recovery:** full-library Save/Load, merge/conflicting-name summaries, corrupt
   backups, storage unavailable/full, and opt-in paused queue recovery.
4. **Responsive layouts:** phone Menu open/closed, small-screen player, dense
   release/liked rows, long titles and short desktop artwork. The current file's
   desktop geometry has responsive code adaptations; dedicated phone frames are
   still needed to make that contract explicit.
5. **Sound discovery:** CLAP prompt/seed controls, processing/unavailable states,
   provenance and an honest metadata-only fallback. The illustrated CLAP section
   is not evidence of a working sound model. No fake sound-search control shipped.
6. **Later roadmap features:** follows, optional history, notes, saved releases,
   shuffle/repeat/reordering and exchange formats need designed interactions when
   their corresponding implementation milestone begins.

## Intentional adaptations

- Live Archive artwork replaces the file's explicitly illustrative abstract art.
- Current data, errors and empty states replace fabricated sample recordings.
- Search scope names remain explicit; a native select retains keyboard support.
- Preview indicator is a small wordmark badge rather than a layout-shifting banner.
- The 128px phone player preserves touch targets; desktop remains 95px.
- Main content can scroll; the listening sidebar cannot. New controls stay usable
  at 320px width instead of reproducing a clipped fixed-size desktop frame.

## Verification

Local Chromium/Edge: existing v1 library migration, full export/import, repeated
playlist entries, exclusions, saved modes and paused queue restoration pass.
Genre selection/filter/transfer and active Search navigation pass. All seven
main views checked at 1440×1024, 1366×768, 1024×600, 720×800, 390×844 and 320×640:
no horizontal overflow, no desktop sidebar scrolling, both Lora faces loaded,
no uncaught page errors. Screenshots inspected for Discover, Genres and Liked.
Archive availability varies independently; deterministic tests mock that service.
