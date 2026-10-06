Slop
==========
A buildless, MIT-licensed music discovery prototype.

Serve this directory with any static web server. No install or build step.
Search: https://archive.org/advancedsearch.php
Release metadata: https://archive.org/metadata/{identifier}
Audio: https://archive.org/download/{identifier}/{file}
Artwork: https://archive.org/services/img/{identifier}

Start with a fixed shelf of 30 releases and 59 checked MP3 sample tracks in catalogue.json. Release information loads from that local file; audio and artwork still come directly from the Archive. Choose Search the Archive for the existing live search, including Netlabels, Clinical Archives and Live Music Archive. Genre trails and More like this use metadata tags, not audio analysis. Recommendations shuffle ties and try to avoid consecutive creators. No backend, account, model, telemetry or build dependencies are required.

Hearts save source references and display metadata in IndexedDB (slop-library, saved store). Changes are committed before the UI reports a save. The Saved view offers JSON export and additive import with a preview. The prototype format is slop-saved-tracks version 1; it is deliberately smaller than the proposed full-library format in the research. Import validates references, merges exact item/file pairs, and leaves existing saves unchanged. Files never contain audio or credentials. Clearing browser data/private browsing can remove this local copy: keep an exported backup. Different site origins have separate local libraries.

The queue and playback history exist only for this tab/session. Play next puts a track at the front; previous-track, seeking, volume and playback errors remain available. A normal internet connection is required for audio. Source availability may change after the recorded link-check date. No offline audio is promised.

Serve index.html, app.js, catalogue.json, README.txt and LICENSE.txt together. No install or build step. The repository's scripts/prepare-catalogue.mjs is a manual maintenance utility, not a scheduled task; it checks a selected set of releases and MP3 HEAD responses. Do not run it to launch the app.

Existing project investigated: https://github.com/essicolo/dustic
This prototype uses the Archive APIs directly rather than importing a larger application. Dustic may provide a future reusable foundation for a richer player.
