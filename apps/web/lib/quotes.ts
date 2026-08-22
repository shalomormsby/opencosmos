import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

/**
 * Reader for the quote substrate — knowledge/quotes/*.yaml.
 *
 * Quotes live outside the markdown corpus that lib/knowledge.ts serves: they
 * are structured records with their own provenance block, not documents with
 * frontmatter and prose. They get their own reader and their own pages.
 *
 * Two file shapes, both emitted by scripts/normalize-quotes:
 *   person file     — author metadata at the top, quotes inherit it
 *   collective file — `collective:` at the top, each quote carries its own author
 *
 * gray-matter's yaml engine is used rather than importing js-yaml directly, so
 * this app needs no dependency it doesn't already declare.
 */

const QUOTES_DIR = path.join(process.cwd(), '../../knowledge/quotes')

/**
 * gray-matter bundles js-yaml and exposes it as `engines.yaml`, but its type
 * definitions don't declare the property. Reaching through a narrow local type
 * keeps the parse typed at the call site without adding js-yaml as a direct
 * dependency of this app — which would rewrite the shared monorepo lockfile.
 */
const yamlEngine = (matter as unknown as {
  engines: { yaml: { parse(src: string): unknown } }
}).engines.yaml

/** Only bucket files live at the top level; these hold pipeline state. */
const NON_BUCKET_ENTRIES = new Set(['_source', '_review', '_archive'])

/** A bucket segment is used to build a filesystem path, so keep it strict. */
const BUCKET_RE = /^[a-z0-9-]+$/

export type QuoteProvenance = {
  status: string
  confidence: number | null
  earliest_print_source: string | null
  wikiquote_url: string | null
  notes: string | null
  reviewed_by_human: boolean
}

export type QuoteRecord = {
  id: string
  text: string
  author: string
  category: string | null
  keywords: string[]
  context: string | null
  favorite: boolean
  tradition: string | null
  provenance: QuoteProvenance
}

export type QuoteBucket = {
  /** URL segment and filename stem, e.g. `mary-oliver`. */
  bucket: string
  /** Display name — the author, or a readable label for a collective. */
  label: string
  isCollective: boolean
  tradition: string | null
  count: number
  href: string
  /**
   * Union of the keywords across this author's quotes. The embedding pipeline
   * already folds keywords into each quote's vector so Cosmo can retrieve by
   * theme; carrying them here lets a person search the same way instead of
   * only by author name.
   */
  keywords: string[]
  /** Categories present, for the same reason. */
  categories: string[]
}

export type QuoteBucketDetail = QuoteBucket & {
  quotes: QuoteRecord[]
}

const COLLECTIVE_LABELS: Record<string, string> = {
  proverbs: 'Proverbs & Sayings',
  'attributed-collectives': 'Attributed Collectives',
  anonymous: 'Anonymous',
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() !== '' ? v : null
}

function readBucketFile(bucket: string): { data: Record<string, unknown>; quotes: Record<string, unknown>[] } | null {
  if (!BUCKET_RE.test(bucket)) return null
  const filePath = path.join(QUOTES_DIR, `${bucket}.yaml`)
  // Guard against a bucket that escapes the quotes directory despite the regex.
  if (!path.resolve(filePath).startsWith(path.resolve(QUOTES_DIR) + path.sep)) return null
  if (!fs.existsSync(filePath)) return null

  const parsed = yamlEngine.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>
  if (!parsed || typeof parsed !== 'object') return null
  const quotes = Array.isArray(parsed.quotes) ? (parsed.quotes as Record<string, unknown>[]) : []
  return { data: parsed, quotes }
}

function toRecord(q: Record<string, unknown>, file: Record<string, unknown>): QuoteRecord | null {
  const id = str(q.id)
  const text = str(q.text)
  if (!id || !text) return null

  const p = (q.provenance ?? {}) as Record<string, unknown>
  return {
    id,
    text,
    // Person files hoist the author to the top of the file; collective files
    // keep it per-quote. Prefer whichever is present.
    author: str(q.author) ?? str(file.author) ?? 'Unknown',
    category: str(q.category),
    keywords: Array.isArray(q.keywords) ? q.keywords.map(String) : [],
    context: str(q.context),
    favorite: q.favorite === true,
    tradition: str(q.tradition) ?? str(file.tradition),
    provenance: {
      status: str(p.status) ?? 'attributed_unverified',
      confidence: typeof p.confidence === 'number' ? p.confidence : null,
      earliest_print_source: str(p.earliest_print_source),
      wikiquote_url: str(p.wikiquote_url),
      notes: str(p.notes),
      reviewed_by_human: p.reviewed_by_human === true,
    },
  }
}

function listBucketNames(): string[] {
  if (!fs.existsSync(QUOTES_DIR)) return []
  return fs
    .readdirSync(QUOTES_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => f.replace(/\.yaml$/, ''))
    .filter((b) => !NON_BUCKET_ENTRIES.has(b) && BUCKET_RE.test(b))
}

/** Every author/collective that has at least one quote in the corpus. */
export function getQuoteBuckets(): QuoteBucket[] {
  const buckets: QuoteBucket[] = []

  for (const bucket of listBucketNames()) {
    const parsed = readBucketFile(bucket)
    if (!parsed || parsed.quotes.length === 0) continue

    const isCollective = str(parsed.data.collective) != null
    const records = parsed.quotes.map((q) => toRecord(q, parsed.data)).filter((r): r is QuoteRecord => r !== null)
    if (records.length === 0) continue

    buckets.push({
      bucket,
      label: isCollective
        ? (COLLECTIVE_LABELS[bucket] ?? bucket.replace(/-/g, ' '))
        : (str(parsed.data.author) ?? records[0].author),
      isCollective,
      tradition: str(parsed.data.tradition) ?? records.find((r) => r.tradition)?.tradition ?? null,
      count: records.length,
      href: `/knowledge/quotes/${bucket}`,
      keywords: Array.from(new Set(records.flatMap((r) => r.keywords))).sort(),
      categories: Array.from(new Set(records.map((r) => r.category).filter((c): c is string => !!c))).sort(),
    })
  }

  return buckets.sort((a, b) => a.label.localeCompare(b.label))
}

/** One author/collective and its quotes, or null if the bucket doesn't exist. */
export function getQuoteBucket(bucket: string): QuoteBucketDetail | null {
  const parsed = readBucketFile(bucket)
  if (!parsed) return null

  const records = parsed.quotes.map((q) => toRecord(q, parsed.data)).filter((r): r is QuoteRecord => r !== null)
  if (records.length === 0) return null

  const isCollective = str(parsed.data.collective) != null
  return {
    bucket,
    label: isCollective
      ? (COLLECTIVE_LABELS[bucket] ?? bucket.replace(/-/g, ' '))
      : (str(parsed.data.author) ?? records[0].author),
    isCollective,
    tradition: str(parsed.data.tradition) ?? records.find((r) => r.tradition)?.tradition ?? null,
    count: records.length,
    href: `/knowledge/quotes/${bucket}`,
    keywords: Array.from(new Set(records.flatMap((r) => r.keywords))).sort(),
    categories: Array.from(new Set(records.map((r) => r.category).filter((c): c is string => !!c))).sort(),
    quotes: records,
  }
}

export function getQuoteCount(): number {
  return getQuoteBuckets().reduce((n, b) => n + b.count, 0)
}

/**
 * Every citable quote target, as the `bucket#id` pairs Cosmo's `[quote:]`
 * tokens resolve to. Used to verify at build time that the citations Cosmo can
 * emit actually land somewhere.
 */
export function getQuoteTargets(): string[] {
  const out: string[] = []
  for (const b of getQuoteBuckets()) {
    const detail = getQuoteBucket(b.bucket)
    if (detail) for (const q of detail.quotes) out.push(`${b.bucket}#${q.id}`)
  }
  return out
}
