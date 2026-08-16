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
 * instead of navigating away. Quotes live in yaml with no reader page, so they
 * link to the record on GitHub, matching how CosmoChat renders `[quote: …]`.
 */

import type { Tier } from '@opencosmos/constellation'

const GITHUB_BLOB = 'https://github.com/shalomormsby/opencosmos/blob/main'

export type NodeDestination =
  /** Navigate within the app (next/navigation router.push). */
  | { kind: 'route'; href: string }
  /** Open the raw source on GitHub — quotes have no page of their own. */
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
    if (!path.startsWith('knowledge/quotes/')) return { kind: 'focus' }
    return { kind: 'external', href: `${GITHUB_BLOB}/${path}${anchor ? `#${anchor}` : ''}` }
  }

  // Sections are the one tier carrying a full repo-relative path; reduce it to
  // the same `sources/x` shape the other tiers already use.
  const docPath = tier === 'section'
    ? path.replace(/^knowledge\//, '').replace(/\.md$/, '')
    : path

  if (docPath.split('/').filter(Boolean).length < 2) return { kind: 'focus' }

  // The heading slug rides through as a fragment so the reader lands on the
  // passage rather than the top of a long work.
  return { kind: 'route', href: `/knowledge/${docPath}${anchor ? `#${anchor}` : ''}` }
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
