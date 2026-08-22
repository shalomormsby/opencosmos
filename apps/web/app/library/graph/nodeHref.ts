/**
 * Constellation node id → destination.
 *
 * The id vocabulary is set by `scripts/knowledge/generate-constellation-graph.ts`
 * and is *not* uniform across tiers — verify against the generator before
 * changing anything here:
 *
 *   work       sources/buddhism-the-dhammapada              (no dir prefix, no .md)
 *   section    knowledge/sources/buddhism-the-dhammapada.md#1-choices  (repo-relative path)
 *   quote      knowledge/quotes/alan-watts.yaml#q_0139
 *   synthesis  wiki/entities/ada-lovelace                   (no .md)
 *   tradition  tradition/buddhism                           (synthesized)
 *   domain     domain/wisdom                                (synthesized)
 *
 * Traditions and domains are synthesized cluster centers — they have no page to
 * open, so they resolve to `{ kind: 'focus' }` and the graph frames the cluster
 * instead of navigating away. Synthesis (wiki) nodes do the same: `wiki/` is not
 * in BROWSABLE_DIRS, so there is no reader page to send them to yet.
 *
 * Quotes DO have a reader page now (`/library/quotes/{bucket}#{id}`), and route
 * there through the same `lib/corpus-href` translation CosmoChat uses for
 * `[quote: …]` — so a quote reached from the graph and a quote reached from a
 * citation land in exactly the same place.
 */

import type { Tier } from '@opencosmos/constellation'
import { docHref, quoteHref } from '@/lib/corpus-href'

export type NodeDestination =
  /** Navigate within the app (next/navigation router.push). */
  | { kind: 'route'; href: string }
  /** Open something off-site. */
  | { kind: 'external'; href: string }
  /** No destination; frame the node in the graph instead. */
  | { kind: 'focus' }

/** Traversal guard for anything that becomes a URL path. */
function isSafePath(p: string): boolean {
  return p.length > 0 && !p.includes('..') && !p.includes('//')
}

export function nodeHref(id: string, tier: Tier): NodeDestination {
  if (tier === 'tradition' || tier === 'domain') return { kind: 'focus' }

  const hash = id.indexOf('#')
  const path = hash === -1 ? id : id.slice(0, hash)
  const anchor = hash === -1 ? '' : id.slice(hash + 1)

  if (!isSafePath(path)) return { kind: 'focus' }

  if (tier === 'quote') {
    const href = quoteHref(id)
    return href ? { kind: 'route', href } : { kind: 'focus' }
  }

  // Synthesis nodes are wiki pages, and `wiki/` isn't browsable — sending them
  // to /library/wiki/... produced a 404. Frame the cluster instead, as the other
  // page-less tiers do, until a wiki reader route exists.
  if (tier === 'synthesis') return { kind: 'focus' }

  // Only the section tier carries a full repo-relative path; the other tiers
  // already use the `sources/x` shape, so normalize to a corpus path first and
  // let the shared translator handle the rest.
  const corpusPath = tier === 'section' ? path : `knowledge/${path}`
  const href = docHref(`${corpusPath}${anchor ? `#${anchor}` : ''}`)

  // The heading slug rides through as a fragment so the reader lands on the
  // passage rather than the top of a long work.
  return href ? { kind: 'route', href } : { kind: 'focus' }
}

/**
 * Reader context (`sessionStorage['cosmo_context'].doc_path`) is a repo-relative
 * markdown path; the work-tier node it corresponds to is not. Normalizing the
 * same way the generator does when it resolves wiki `synthesizes:` refs.
 */
export function nodeIdFromDocPath(docPath: string): string | null {
  if (typeof docPath !== 'string' || !isSafePath(docPath)) return null
  const normalized = docPath.trim().replace(/^knowledge\//, '').replace(/\.md$/, '')
  return normalized.split('/').filter(Boolean).length >= 2 ? normalized : null
}
