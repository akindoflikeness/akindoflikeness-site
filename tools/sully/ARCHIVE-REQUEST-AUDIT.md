# Archive access audit — 11 October 2026

No evidence collected establishes that Sully caused the reported interruption. This is not proof that every browser, Archive endpoint, or earlier request was healthy.

## Observed evidence

- Cloudflare production deployment 0e5810f succeeded. Pages reports uses_functions=false, and the account has no Worker scripts and the site zone has no Worker routes. Archive requests go directly from each listener's browser to Archive; there is no shared Cloudflare Archive proxy.
- Cloudflare hourly zone data returned through 15:00 UTC shows no 5xx statuses. The 15:00 bucket contained 872 requests, mainly 200/304. These count site traffic, not requests to Archive. They cannot establish Archive request volume or visitor totals.
- Direct, bounded checks of Archive's homepage, one metadata endpoint and a one-result search all returned HTTP 200. A Python request to our own site received 403, while the normal in-app browser loaded successfully; no security settings were changed.
- The existing user tab contained 30 search results and loaded recommendation artwork. A separate fresh browser tab loaded recommendations and opened the public release pandacd-6473-cafe-creme-part-one with 14 tracks. A later fresh load reproduced an 18-second timeout of the initial search. Immediately following this, direct requests to the exact search endpoint and to metadata/mutation-akol-v2 both returned HTTP 502 in under one second, outside Sully. This establishes an Archive-side response failure at that point, not a site-wide outage or its underlying cause. Audio streaming was not verified by this audit.
- Source inspection found no automatic search retry, polling loop or retry on audio errors. Failed searches require a user click. Artwork metadata is cached per tab with at most four concurrent fetches; timeouts are 12 seconds for artwork metadata and 18 seconds for app JSON requests.
- The optional catalogue-sample workflow is bounded to two searches and at most 12 metadata requests, with one-second spacing before metadata requests. It has no schedule and its push trigger is the discovery development branch, not main.

## Weaknesses found and addressed

Browsing covers previously fetched extra metadata and probed up to four candidate original cover files per visible item. Metadata concurrency was bounded, but original-image probes were not globally bounded and duplicate player/drawer images could repeat resolution work. That was avoidable amplification, not evidence of an outage cause.

Lists now use lazy Archive thumbnails only. Large cover resolution remains for opened releases and the player, and its promise is shared across duplicate elements and later tracks in that release. Timed-out probes are cancelled; unsuccessful results are cached for the tab lifetime. This eliminates extra metadata and original-image probes for a 30-cover list. Thumbnail requests themselves remain.

Error messages no longer assert that the app is working normally without evidence. The Discover home now displays the actual failure and a manual retry button; previously its detailed error was in the hidden search-results section.

## Verification and residual limits

Four isolated tests cover zero extra requests for 30 thumbnails, duplicate cover resolution, bounded failed probes/no automatic retry, and stale artwork not replacing the current release. Drawer and library browser regression suites passed locally. A separate browser test confirmed that a 503 is visible on Discover, makes no automatic retries or metadata requests, and issues exactly one new search on manual retry. The published artwork module matches the tested source and the published drawer regression passed.

No historical Archive response logs or Archive-side rate-limit records are available here. Cloudflare zone analytics cannot see browser requests to archive.org. Repeated manual searches, multiple tabs, and repeated release openings can still generate requests. The app has no global cross-tab rate limit or circuit breaker. A transient Archive outage, rate limit, browser-specific failure or application error at the earlier time remains unproven. Do not label this investigation as a guarantee that our code could not contribute.
