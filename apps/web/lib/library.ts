import { getAllDocs, type KnowledgeDocMeta } from './knowledge'
import { getQuoteBuckets, getQuoteBucket, type QuoteBucket } from './quotes'
import { docHrefFromSlug, quoteHrefFromParts } from './corpus-href'

/**
 * The one browsable index. Documents and quotes are different *shapes*, not
 * different *places* — this composes both readers into a single item list so
 * one search and one set of filters cover the whole corpus.
 *
 * Before this existed, quotes had their own route and their own browser, so
 * searching "einstein" on the library returned nothing while 11 Einstein
 * quotes sat one URL away. The tiles differ; the architecture shouldn't.
 *
 * Deliberately a NEW aggregator rather than an extension of getAllDocs():
 * that function's other consumer is generateStaticParams() for the [...slug]
 * catch-all, and feeding it quote pseudo-docs would pre-render /library/quotes/*
 * through the catch-all, where getDoc() returns null → notFound(), colliding
 * with the real static quotes routes.
 */

export type LibraryItemKind = 'doc' | 'quote'

export type LibraryItem = {
  kind: LibraryItemKind
  /** Stable key and destination. */
  href: string
  title: string
  /** Footer label key — resolved through CATEGORY_LABELS. */
  category: string
  /** Type-pill key — resolved through ROLE_LABELS. */
  role: string
  /** The shared facet across both kinds. See note on tradition vs domain below. */
  facet: string | null
  badges: string[]
  subtitle: string | null
  blurb: string | null
  /**
   * Searchable text that ISN'T already visible on the card — tags, era, quote
   * keywords and categories.
   *
   * The full haystack is assembled in the browser from this plus title,
   * subtitle, blurb, facet and category. Shipping a pre-joined haystack instead
   * would send every summary and author name twice, once to render and once to
   * search, across 288 cards. Quote *text* is excluded entirely — see
   * `getQuoteSearchIndex()`.
   */
  terms: string
  /** Quote items only: the bucket segment, for merging Tier 2 matches. */
  bucket?: string
}

/**
 * Placeholder frontmatter leaks into the corpus (`<primary domain or cross>`,
 * `cross  # or the primary domain (buddhism, …)`). Those must never become
 * filter pills.
 */
function isRealFacet(v: string | null | undefined): v is string {
  if (!v) return false
  const s = v.trim()
  return s.length > 0 && s.length <= 40 && !s.includes('<') && !s.includes('#')
}

/** Lowercase so "Buddhism" and "buddhism" don't become two pills. */
function normalizeFacet(v: string | null | undefined): string | null {
  return isRealFacet(v) ? v.trim().toLowerCase() : null
}

function joinHaystack(parts: (string | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ').toLowerCase()
}

/**
 * Cards clamp to three lines, so anything past roughly this length is shipped
 * to 288 cards and never seen. Trimmed server-side rather than by CSS alone.
 */
const BLURB_MAX = 200

function clampBlurb(s: string): string {
  if (s.length <= BLURB_MAX) return s
  // Break on a word so the ellipsis doesn't land mid-word.
  const cut = s.slice(0, BLURB_MAX)
  const lastSpace = cut.lastIndexOf(' ')
  return `${cut.slice(0, lastSpace > 120 ? lastSpace : BLURB_MAX).trimEnd()}…`
}

function docToItem(doc: KnowledgeDocMeta): LibraryItem {
  // `tradition` (91/110 docs) rather than `domain` (25/110, and partly template
  // junk) — it is also the only vocabulary quotes share, which is what lets one
  // facet filter span both kinds.
  const facet = normalizeFacet(doc.tradition) ?? normalizeFacet(doc.domain)

  return {
    kind: 'doc',
    href: docHrefFromSlug(doc.slug),
    title: doc.title,
    category: doc.category,
    role: doc.role || 'source',
    facet,
    badges: [facet, doc.format].filter(isRealFacet),
    subtitle: doc.author ?? null,
    blurb: doc.summary ? clampBlurb(doc.summary) : null,
    // Only what the card doesn't already show. Title, summary and author are
    // searched client-side from the fields they're rendered from.
    terms: joinHaystack([doc.tags.join(' '), doc.era, doc.domain]),
  }
}

function bucketToItem(b: QuoteBucket): LibraryItem {
  const facet = normalizeFacet(b.tradition)
  const countLabel = `${b.count} ${b.count === 1 ? 'quote' : 'quotes'}`

  return {
    kind: 'quote',
    href: quoteHrefFromParts(b.bucket),
    title: b.label,
    category: 'quotes',
    role: 'quotes',
    facet,
    badges: [facet, countLabel].filter((v): v is string => Boolean(v)),
    // For a quote bucket the author IS the title, so repeating it as a subtitle
    // would just duplicate the heading.
    subtitle: b.isCollective ? 'Collective source' : null,
    blurb: null, // filled by the caller, which has the quote texts to hand
    terms: joinHaystack([b.keywords.join(' '), b.categories.join(' ')]),
    bucket: b.bucket,
  }
}

/**
 * Every browsable item, sorted alphabetically and interleaved. Neither kind is
 * grouped to the bottom — the type pills provide that view on demand.
 */
export function getLibraryItems(): LibraryItem[] {
  const docs = getAllDocs().map(docToItem)

  const quotes = getQuoteBuckets().map((b) => {
    const item = bucketToItem(b)
    // A doc has a curated summary; a bucket has none. The first quote is the
    // most inviting stand-in, and concrete in a way a synthesized label isn't.
    const detail = getQuoteBucket(b.bucket)
    const first = detail?.quotes[0]?.text
    item.blurb = first
      ? `“${clampBlurb(first)}”`
      : `${b.count} quotes · ${b.categories.slice(0, 3).join(', ')}`
    return item
  })

  return [...docs, ...quotes].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
  )
}

// ─── Tier 2: the lazy full-text index ────────────────────────────────────────

export type QuoteSearchEntry = {
  /** Bucket segment, matching LibraryItem.bucket. */
  b: string
  /** Quote id, for the #anchor on a matched result. */
  i: string
  /** Quote text, lowercased for matching. */
  t: string
}

/**
 * Per-quote text for full-text search — 349 records, ~53KB raw.
 *
 * Kept OUT of the page payload on purpose. Inlining it would roughly triple the
 * index page's transferred bytes and tax every visitor for data only searchers
 * use. It is served as a static build-time artifact from
 * `app/library/search-index/route.ts` and fetched once, on first focus of the
 * search input — long before anyone finishes typing.
 *
 * Keys are one character because this ships 349 times over.
 */
export function getQuoteSearchIndex(): QuoteSearchEntry[] {
  const out: QuoteSearchEntry[] = []
  for (const b of getQuoteBuckets()) {
    const detail = getQuoteBucket(b.bucket)
    if (!detail) continue
    for (const q of detail.quotes) {
      out.push({ b: b.bucket, i: q.id, t: q.text.toLowerCase() })
    }
  }
  return out
}
