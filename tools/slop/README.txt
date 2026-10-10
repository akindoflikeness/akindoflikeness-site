DEVELOPMENT PREVIEW: see DEVELOPMENT.md for current scope and evidence.

slop
====
A buildless, MIT-licensed discovery interface and player for Internet Archive audio.

Serve the entire tools/slop directory together, including the icons directory, stylesheets, Slop Slip scripts and slop-archive.js. No install, account or backend is required.

Browsing and search query the Archive audio index directly, 30 releases at a time. The ‹ page › control moves through result pages, beginning at 0 in the interface. Genre and collection filters narrow that index. Browsing keeps its newest-indexed Archive order; text searches match phrases in artist names and release titles, with dedicated Artist, Release title and Tags choices and relevance ordering. Related shelves use Archive download count. There is no fixed starter catalogue. More like this searches for shared metadata tags, not audio similarity.

Opening a release fetches its complete playable track list from Archive metadata. Audio streams directly from archive.org. Larger cover artwork loads as cards come into view; Archive thumbnails remain the fallback. Availability depends on the source uploads and Archive service.

Hearts keep liked-track references in IndexedDB (slop-library). Complete-library save/load uses slop-library version 2, with playlists, saved metadata modes and local exclusions. Existing slop-saved-tracks version 1 files still import. Loading adds new tracks without removing existing likes. Files contain references and metadata, not audio. Clearing browser data removes local likes. Each site origin has a separate library.

Clicking an album cover starts its first track and fills From this album with the remaining tracks. Up next contains manually added tracks and takes priority. Playing another album replaces only the album queue. Queue and position recovery can be enabled explicitly; a recovered session stays paused. Playback history is not retained.

APIs: https://archive.org/advancedsearch.php ; https://archive.org/metadata/{identifier} ; https://archive.org/download/{identifier}/{file}

Slop Slip shares an exact public Archive release or track in a versioned URL
fragment. Received track links prepare the selected track and optional timestamp
but never autoplay. The Log and Docs tabs keep an append-only engineering diary
and the keeper-facing manual in the app; see MAINTENANCE.md for the full source
map and deployment procedure.

The interface is MIT licensed. Music and artwork retain their own rights; see each original release.
