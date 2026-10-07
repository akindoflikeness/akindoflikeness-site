slop
====
A buildless, MIT-licensed discovery interface and player for Internet Archive audio.

Serve index.html, layout-rhythm.css, app.js, artwork.js and LICENSE.txt together. No install, account or backend is required.

Browsing and search query the Archive audio index directly, 30 releases at a time. The ‹ page › control moves through result pages, beginning at 0 in the interface. Genre and collection filters narrow that index. Discovery keeps its newest-indexed Archive order; related shelves use Archive download count. There is no fixed starter catalogue. More like this searches for shared metadata tags, not audio similarity.

Opening a release fetches its complete playable track list from Archive metadata. Audio streams directly from archive.org. Larger cover artwork loads as cards come into view; Archive thumbnails remain the fallback. Availability depends on the source uploads and Archive service.

Hearts keep liked-track references in IndexedDB (slop-library). Save/load uses the slop-saved-tracks version 1 JSON format. Loading adds new tracks without removing existing likes. Files contain references and metadata, not audio. Clearing browser data removes local likes. Each site origin has a separate library.

Clicking an album cover starts its first track and fills From this album with the remaining tracks. Up next contains manually added tracks and takes priority. Playing another album replaces only the album queue. Both queues and playback history last for this tab session.

APIs: https://archive.org/advancedsearch.php ; https://archive.org/metadata/{identifier} ; https://archive.org/download/{identifier}/{file}

The interface is MIT licensed. Music and artwork retain their own rights; see each original release.
