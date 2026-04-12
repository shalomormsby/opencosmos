/**
 * Web Worker: fetches and parses the full knowledge graph JSON off the main thread.
 *
 * A 2,500-node, 10,000-edge payload is 2.5–3MB uncompressed.
 * Brotli (automatic on Vercel) reduces wire size to ~350KB, but
 * `await response.json()` on a 3MB string still blocks the main thread for
 * 50–200ms — visible jank at the exact moment the page mounts.
 *
 * Fix: fetch and parse in this worker; postMessage plain objects back.
 * Main thread builds Graphology from already-parsed data — zero parse cost on UI thread.
 *
 * IMPORTANT: terminate via useEffect cleanup, NOT inside onmessage.
 * Binding termination to onmessage leaks the worker on early unmount.
 */

self.onmessage = async (e: MessageEvent<{ origin: string }>) => {
  try {
    const origin = e.data?.origin ?? self.location.origin
    const res  = await fetch(`${origin}/api/knowledge/graph`)

    if (!res.ok) {
      self.postMessage({ error: `Graph API returned ${res.status}` })
      return
    }

    const text = await res.text()
    const data = JSON.parse(text)   // heavy parse — off main thread
    self.postMessage({ data })
  } catch (err) {
    self.postMessage({ error: (err as Error).message })
  }
}
