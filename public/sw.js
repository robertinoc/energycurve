/**
 * Offline support, scoped to what Gig Mode actually needs.
 *
 * A booth has no wifi worth trusting. Gig Mode is opened at the start of a slot
 * and used for the next two hours, so the failure to design against is not "the
 * page loads slowly" — it is "the phone locked, the DJ woke it, the tab had been
 * evicted, and now there is no signal to reload it".
 *
 * Two strategies, chosen per request type for a specific reason:
 *
 * - **`/_next/static/*` → cache-first.** These filenames contain a content hash,
 *   so a given URL's bytes can never change. Cache-first is therefore not a
 *   staleness trade-off at all; it is free. This is what makes the whole thing
 *   safe.
 * - **Navigations → network-first, cache as fallback.** A document *can* change,
 *   so the network wins whenever it answers. The cached copy is only reached when
 *   the network fails, which is exactly the booth case.
 *
 * Deliberately narrow: it does not touch API routes, POSTs, or anything under
 * /api. Serving a stale answer to a request that changes data would be a worse
 * bug than any it fixes.
 */

// Bumping this name is how an old cache is retired — the activate handler deletes
// every cache that isn't the current one.
const CACHE = "energycurve-gig-v1"

/** Only these navigations are worth keeping offline. */
function isGigNavigation(url) {
  return /^\/dashboard\/playlists\/[^/]+\/gig\/?$/.test(url.pathname)
}

function isHashedAsset(url) {
  return url.pathname.startsWith("/_next/static/")
}

self.addEventListener("install", (event) => {
  // Take over as soon as installed rather than waiting for every old tab to
  // close: a DJ who reloads to get offline support shouldn't have to hunt for a
  // stale tab first.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names.filter((name) => name !== CACHE).map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener("fetch", (event) => {
  const { request } = event

  // Anything that isn't a plain read is none of this worker's business.
  if (request.method !== "GET") {
    return
  }

  const url = new URL(request.url)

  // Same-origin only. A cross-origin response here would be opaque anyway.
  if (url.origin !== self.location.origin) {
    return
  }

  if (isHashedAsset(url)) {
    event.respondWith(cacheFirst(request))
    return
  }

  if (request.mode === "navigate" && isGigNavigation(url)) {
    event.respondWith(networkFirst(request))
  }
})

async function cacheFirst(request) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(request)
  if (hit) {
    return hit
  }

  const response = await fetch(request)
  if (response.ok) {
    // Cloned before returning: a Response body can only be read once, and the
    // page is the one that needs to read it.
    void cache.put(request, response.clone())
  }
  return response
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) {
      void cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    const hit = await cache.match(request)
    if (hit) {
      return hit
    }
    throw error
  }
}
