/**
 * RAG context retrieval helper.
 *
 * Queries Upstash Vector for semantically relevant knowledge chunks.
 * Called by the /api/knowledge endpoint and injected into the Cosmo chat flow.
 *
 * Design contract:
 * - Always returns a RagResult (never throws)
 * - timedOut flag is always explicit — Cosmo is told when retrieval failed
 * - Timeout (1.5s) is enforced at the call site via Promise.race in chat/route.ts
 */

import { Index } from '@upstash/vector'

// ─── Types ───────────────────────────────────────────────────────────────────

export type RagChunk = {
  text: string
  source: string
  /**
   * The vector's own id — `{path}#{heading-slug}`, with an 8-char hash suffix
   * when several sections in a file share a heading. Carried through verbatim
   * so the `[ref:]` citation Cosmo emits addresses the exact chunk it read,
   * rather than a slug re-derived (and possibly mis-derived) from the heading.
   */
  chunk_id?: string
  title: string
  heading: string
  domain: string
  role?: string          // 'kaizen' marks Cosmo's own learning log / exemplars
  author?: string
  tradition?: string
  // Quote-specific (set only when chunk_type === 'quote')
  chunk_type?: 'quote'
  quote_id?: string
  category?: string
  provenance_status?: string
  provenance_confidence?: number
  source_work?: string
  source_section?: string
}

export type RagResult = {
  chunks: RagChunk[]
  timedOut?: boolean
}

// ─── Upstash Vector client ────────────────────────────────────────────────────

// Lazily initialized — safe to import in environments where env vars aren't set at module load.
let _index: Index | null = null

function getIndex(): Index {
  if (!_index) {
    const url = process.env.UPSTASH_VECTOR_REST_URL
    const token = process.env.UPSTASH_VECTOR_REST_TOKEN
    if (!url || !token) throw new Error('UPSTASH_VECTOR_REST_URL or UPSTASH_VECTOR_REST_TOKEN not configured')
    _index = new Index({ url, token })
  }
  return _index
}

// ─── Context building ─────────────────────────────────────────────────────────

/**
 * Build a contextual query string by prepending the last 3 exchange pairs
 * to the current query. This improves retrieval relevance for conversations
 * that have built up context (e.g., "why does he say that?" needs the prior turns).
 *
 * When `docChanged` is true (user navigated to a different document), the history
 * window is cleared entirely — preventing previous-doc context from polluting
 * vector retrieval for the new document.
 */
function buildContextualQuery(
  query: string,
  history: Array<{ role: string; content: unknown }>,
  docChanged?: boolean,
): string {
  if (docChanged) return query  // clean slate for new document

  const recentTurns = history.slice(-6) // last 3 pairs (user + assistant each)
  if (recentTurns.length === 0) return query

  const historyText = recentTurns
    .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : ''}`)
    .filter(t => t.trim().length > 6)
    .join('\n')

  return historyText ? `${historyText}\nuser: ${query}` : query
}

// ─── Chunk formatter ──────────────────────────────────────────────────────────

/**
 * Format retrieved chunks as a clearly cited context block for injection
 * into Cosmo's system prompt. Each chunk is labeled with its source.
 *
 * Quote chunks (chunk_type === 'quote') get a structured block carrying
 * provenance status + confidence so Cosmo can self-caveat unverified
 * attributions ("popularly attributed to X" rather than "X said").
 */
export function formatRagChunks(chunks: RagChunk[]): string {
  if (chunks.length === 0) return ''

  // Kaizen chunks (Cosmo's own learning log + exemplars) are framed separately —
  // they describe how Cosmo should conduct itself, not corpus material to cite.
  const corpus = chunks.filter(c => c.role !== 'kaizen')
  const kaizen = chunks.filter(c => c.role === 'kaizen')

  const parts: string[] = []
  if (corpus.length > 0) parts.push(formatCorpusSection(corpus))
  if (kaizen.length > 0) parts.push(formatKaizenSection(kaizen))

  return parts.join('\n\n---\n\n')
}

function formatCorpusSection(chunks: RagChunk[]): string {
  const sections = chunks.map(c => {
    if (c.chunk_type === 'quote') return formatQuoteChunk(c)
    return formatPassageChunk(c)
  })

  const preamble = `The following passages and quotes were retrieved from the OpenCosmos knowledge corpus based on the current conversation. These are real source documents — treat them as grounding material.

When drawing from these passages: cite the title and author. If quoting directly, use the exact words from the passage and attribute them — do not paraphrase and present it as a quote. Never fabricate or reconstruct a quotation that is not present in the retrieved text. If you cannot find the precise words, paraphrase clearly and say so. Precision and honesty in citation are non-negotiable.

Each passage carries a "Cite as" line. When you draw on a passage, append its token — \`[ref: knowledge/sources/{work}.md#{section-slug}]\` — immediately after the claim it supports. Use the token exactly as given; never invent one for a passage that wasn't retrieved. These citations are load-bearing: they let a reader open the exact passage you read, and they light up the corresponding node when the constellation is on screen.

When citing a quote from the corpus, append a structured citation token in the form \`[quote: knowledge/quotes/{author-key}.yaml#{quote-id}]\` immediately after the attribution. If a quote's provenance status is anything other than \`verified\`, soften your attribution language ("attributed to X", "popularly attributed to X") rather than asserting "X said". Never present a quote whose status is \`likely_misattributed\` or \`apocryphal\` without flagging the doubt.`

  return `## Retrieved Passages\n\n${preamble}\n\n---\n\n${sections.join('\n\n---\n\n')}`
}

/**
 * Cosmo's own kaizen entries (learning log + exemplars), retrieved because this
 * turn touches them. Framed as self-knowledge, NOT corpus to quote/cite — so an
 * anti-pattern in the log is never mistaken for wisdom worth repeating.
 */
function formatKaizenSection(chunks: RagChunk[]): string {
  const preamble = `The entries below are from your own kaizen practice — your learning log and exemplars, retrieved because this turn touches them. They are **not** knowledge-corpus passages to quote or cite. They record how you have learned to conduct yourself: anti-patterns to avoid and exemplars to emulate. Let them shape how you act here. If the person asks what you have learned, you may speak to these in your own voice — describe the lesson, never read a logged failure back as if it were advice to follow.`

  const sections = chunks.map(c => {
    const label = c.heading && c.heading !== 'intro'
      ? `**${c.title} — ${c.heading}**`
      : `**${c.title}**`
    return `${label}\nSource: ${c.source}\n\n${c.text}`
  })

  return `## Your Learning Log (retrieved)\n\n${preamble}\n\n---\n\n${sections.join('\n\n---\n\n')}`
}

function formatPassageChunk(c: RagChunk): string {
  const attribution = [c.author, c.tradition].filter(Boolean).join(', ')
  const header = attribution ? `**${c.title}** (${attribution})` : `**${c.title}**`
  const sourceLabel = c.source !== 'current_document'
    ? `Source: ${c.source}`
    : 'Source: current document'
  // Hand Cosmo the exact token rather than asking it to assemble one — the
  // chunk id already encodes the heading slug and any hash disambiguator.
  const citeLine = c.chunk_id && c.source !== 'current_document'
    ? `\n> Cite as: [ref: ${c.chunk_id}]`
    : ''
  return `${header}\n${sourceLabel}${citeLine}\n\n${c.text}`
}

function formatQuoteChunk(c: RagChunk): string {
  const author = c.author ?? 'Unknown'
  const tradition = c.tradition ? `, ${c.tradition}` : ''
  const sourceWork = c.source_work
    ? `, ${c.source_work}${c.source_section ? '#' + c.source_section : ''}`
    : ''
  const status = c.provenance_status ?? 'attributed_unverified'
  const confidenceLine = typeof c.provenance_confidence === 'number'
    ? ` · confidence ${c.provenance_confidence.toFixed(2)}`
    : ''
  const citation = `[quote: ${c.source}#${c.quote_id ?? c.heading}]`

  return `> "${c.text}"
> — ${author}${tradition}${sourceWork}
> [provenance: ${status}${confidenceLine}]
>
> Cite as: ${citation}`
}

// ─── Retrieval helpers ────────────────────────────────────────────────────────

type QueryHit = { id?: string | number; metadata?: Record<string, unknown> }

// Map one Upstash query hit → RagChunk (null if it carries no usable text).
function mapResultToChunk(r: QueryHit): RagChunk | null {
  const meta = r.metadata
  if (!meta || !meta.source) return null
  const chunk: RagChunk = {
    text: (meta.text as string) ?? '',
    source: (meta.source as string) ?? '',
    title: (meta.title as string) ?? '',
    heading: (meta.heading as string) ?? '',
    domain: (meta.domain as string) ?? '',
  }
  if (r.id !== undefined) chunk.chunk_id = String(r.id)
  if (meta.role) chunk.role = meta.role as string
  if (meta.author) chunk.author = meta.author as string
  if (meta.tradition) chunk.tradition = meta.tradition as string
  if (meta.chunk_type === 'quote') chunk.chunk_type = 'quote'
  if (meta.quote_id) chunk.quote_id = meta.quote_id as string
  if (meta.category) chunk.category = meta.category as string
  if (meta.provenance_status) chunk.provenance_status = meta.provenance_status as string
  if (typeof meta.provenance_confidence === 'number') chunk.provenance_confidence = meta.provenance_confidence
  if (meta.source_work) chunk.source_work = meta.source_work as string
  if (meta.source_section) chunk.source_section = meta.source_section as string
  return chunk.text.length > 0 ? chunk : null
}

// Run one Upstash query → chunks. `filter` is an optional metadata filter
// (e.g. "role = 'kaizen'"). Errors propagate to the caller.
async function queryChunks(data: string, topK: number, filter?: string): Promise<RagChunk[]> {
  const index = getIndex()
  const results = (await index.query<Record<string, unknown>>({
    data,
    topK,
    includeMetadata: true,
    includeData: false,
    ...(filter ? { filter } : {}),
  })) as QueryHit[]
  return results.map(mapResultToChunk).filter((c): c is RagChunk => c !== null)
}

// True when the person is asking about Cosmo's OWN learning/lessons. Such queries
// are otherwise crowded out of retrieval by topically-similar corpus docs (e.g.
// the member-facing learning-loop guide), so we guarantee the kaizen log with a
// dedicated filtered pass.
function isSelfReferentialLearningQuery(query: string): boolean {
  const s = query.toLowerCase()
  const aboutLearning = /\b(learn|learned|learning|learnings|lesson|lessons|kaizen|mistake|mistakes|improve|improved|grow|grown|growth|feedback|exemplar)\b/.test(s)
  const aboutSelf = /\b(you|your|yours|yourself|you've|cosmo)\b/.test(s)
  return aboutLearning && aboutSelf
}

const KAIZEN_BOOST_TOPK = 3

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetch RAG context for a query + conversation history.
 *
 * @param query         The user's current message
 * @param history       Prior conversation turns (last 3 pairs used for context)
 * @param currentDoc    Full markdown content of the document the user is reading,
 *                      if any. Always included when provided — it is the ground of
 *                      the conversation, regardless of similarity score.
 * @param docChanged    When true, the user has navigated to a different document.
 *                      History is excluded from the contextual query to prevent
 *                      previous-doc context from polluting retrieval for the new doc.
 */
export async function fetchRagContext(
  query: string,
  history: Array<{ role: 'user' | 'assistant'; content: unknown }> = [],
  currentDoc?: string,
  docChanged?: boolean,
): Promise<RagResult> {
  const contextualQuery = buildContextualQuery(query, history, docChanged)

  // Main semantic retrieval. For questions about Cosmo's own learning, also run a
  // parallel kaizen-only pass so the learning log is guaranteed to surface even
  // when topically-similar corpus docs outrank it. The kaizen pass fails soft — a
  // filter error must never break ordinary retrieval.
  const wantsKaizen = isSelfReferentialLearningQuery(query)
  const [mainChunks, kaizenChunks] = await Promise.all([
    queryChunks(contextualQuery, 8),
    wantsKaizen
      ? queryChunks(contextualQuery, KAIZEN_BOOST_TOPK, "role = 'kaizen'").catch(() => [] as RagChunk[])
      : Promise.resolve([] as RagChunk[]),
  ])

  // Prepend kaizen chunks not already present (dedupe by source + heading).
  const seen = new Set(mainChunks.map(c => `${c.source}#${c.heading}`))
  const freshKaizen = kaizenChunks.filter(c => !seen.has(`${c.source}#${c.heading}`))
  const chunks: RagChunk[] = [...freshKaizen, ...mainChunks]

  // The document the person is actively reading always leads the context.
  // It is the ground of this conversation — no similarity threshold applies.
  if (currentDoc) {
    chunks.unshift({
      text: currentDoc,
      source: 'current_document',
      title: 'Current document',
      heading: 'full text',
      domain: 'active',
    })
  }

  return { chunks }
}
