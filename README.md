# Quick Fiji News

## News fetching and caching

News is fetched on demand by the Next.js API routes; no database or persistent
storage is required. `/api/news` fetches all configured sources and returns the
combined headlines. Its response is cacheable at the Vercel edge for 30 minutes
with stale-while-revalidate for up to 5 minutes. Once the cached response
expires, the next request refreshes it; no work runs in the background when
there are no requests. The in-process source cache
also avoids repeatedly requesting the same feeds during a warm function
instance, but it is temporary and is not shared between instances.

`/api/news-stream` fetches sources and streams their headlines as they complete.
Individual source failures do not prevent successful sources from appearing.
Because there is no persistent store, the app does not retain a scheduled
snapshot or historical source-health data between requests.
