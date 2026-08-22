// Corpus path → library URL. Client-safe (no `fs`).
//
// Two namespaces meet here, and conflating them breaks things in opposite
// directions:
//
//   corpus path   knowledge/quotes/mary-oliver.yaml#q_0003
//                 what lives on disk, what Cosmo emits in [ref:]/[quote:]
//                 tokens, and what keys every Upstash chunk id. NEVER changes.
//
//   library URL   /library/quotes/mary-oliver#q_0003
//                 where a reader goes. Free to change.
//
// Three callers must agree on this translation — the chat renderer
// (`app/dialog/citations.tsx`), the constellation (`app/library/graph/nodeHref.ts`),
// and the index (`lib/library.ts`) — so it lives in exactly one place.
//
// Everything returns null rather than a best-effort URL: an unresolvable
// target should render as no link at all, never as a dead one.

/** The reader-facing base. Change this and every citation follows. */
export const LIBRARY_BASE = '/library'

const QUOTE_PREFIX = 'knowledge/quotes/'
const CORPUS_PREFIX = 'knowledge/'

/** A bucket becomes a filesystem path and a URL segment, so keep it strict. */
const BUCKET_RE = /^[a-z0-9-]+$/
const ANCHOR_RE = /^[A-Za-z0-9_-]+$/

function splitAnchor(ref: string): { path: string; anchor: string } {
  const hash = ref.indexOf('#')
  return hash === -1
    ? { path: ref, anchor: '' }
    : { path: ref.slice(0, hash), anchor: ref.slice(hash + 1) }
}

/**
 * `knowledge/quotes/mary-oliver.yaml#q_0003` → `/library/quotes/mary-oliver#q_0003`
 */
export function quoteHref(ref: string): string | null {
  const { path, anchor } = splitAnchor(ref)
  if (!path.startsWith(QUOTE_PREFIX) || path.includes('..')) return null
  const bucket = path.slice(QUOTE_PREFIX.length).replace(/\.yaml$/, '')
  if (!BUCKET_RE.test(bucket)) return null
  if (anchor && !ANCHOR_RE.test(anchor)) return null
  return `${LIBRARY_BASE}/quotes/${bucket}${anchor ? `#${anchor}` : ''}`
}

/** Build a quote URL from parts already known to be clean. */
export function quoteHrefFromParts(bucket: string, quoteId?: string): string {
  return `${LIBRARY_BASE}/quotes/${bucket}${quoteId ? `#${quoteId}` : ''}`
}

/**
 * `knowledge/sources/x.md#slug` → `/library/sources/x#slug`
 *
 * Requires at least two path segments below `knowledge/`, which is what
 * distinguishes a real document from a stray directory reference.
 */
export function docHref(ref: string): string | null {
  const { path, anchor } = splitAnchor(ref)
  if (!path.startsWith(CORPUS_PREFIX) || path.includes('..')) return null
  const inner = path.replace(/^knowledge\//, '').replace(/\.md$/, '')
  if (inner.split('/').filter(Boolean).length < 2) return null
  return `${LIBRARY_BASE}/${inner}${anchor ? `#${anchor}` : ''}`
}

/** Build a doc URL from slug parts (`['sources','x']`). */
export function docHrefFromSlug(slug: string[]): string {
  return `${LIBRARY_BASE}/${slug.join('/')}`
}

/**
 * `knowledge/quotes/mary-oliver.yaml` → `mary-oliver`, else null.
 *
 * The inverse direction: recovering a bucket from a corpus path. Used by the
 * chat route to tell a quote page apart from a markdown document when resolving
 * what the reader currently has open.
 */
export function quoteBucketFromDocPath(docPath: string): string | null {
  if (typeof docPath !== 'string') return null
  const { path } = splitAnchor(docPath.trim())
  if (!path.startsWith(QUOTE_PREFIX) || path.includes('..')) return null
  const bucket = path.slice(QUOTE_PREFIX.length).replace(/\.yaml$/, '')
  return BUCKET_RE.test(bucket) ? bucket : null
}
