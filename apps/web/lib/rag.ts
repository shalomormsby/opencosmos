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
  title: string
  heading: string
  domain: string
  author?: string
  tradition?: string
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
 */
function buildContextualQuery(
  query: string,
  history: Array<{ role: string; content: string }>,
): string {
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
 */
export function formatRagChunks(chunks: RagChunk[]): string {
  if (chunks.length === 0) return ''

  const sections = chunks.map(c => {
    const attribution = [
      c.author,
      c.tradition,
    ].filter(Boolean).join(', ')

    const header = attribution
      ? `**${c.title}** (${attribution})`
      : `**${c.title}**`

    const sourceLabel = c.source !== 'current_document'
      ? `Source: ${c.source}`
      : 'Source: current document'

    return `${header}\n${sourceLabel}\n\n${c.text}`
  })

  return `## Retrieved Passages\n\n${sections.join('\n\n---\n\n')}`
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Fetch RAG context for a query + conversation history.
 *
 * @param query         The user's current message
 * @param history       Prior conversation turns (last 3 pairs used for context)
 * @param currentDoc    Full markdown content of the document the user is reading,
 *                      if any. Always included when provided — it is the ground of
 *                      the conversation, regardless of similarity score.
 */
export async function fetchRagContext(
  query: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  currentDoc?: string,
): Promise<RagResult> {
  const contextualQuery = buildContextualQuery(query, history)

  const index = getIndex()
  const results = await index.query<Record<string, unknown>>({
    data: contextualQuery,
    topK: 8,
    includeMetadata: true,
    includeData: false,
  })

  const chunks: RagChunk[] = results
    .filter(r => r.metadata && (r.metadata as Record<string, unknown>).source)
    .map(r => {
      const meta = r.metadata as Record<string, unknown>
      return {
        text: (meta.text as string) ?? '',
        source: (meta.source as string) ?? '',
        title: (meta.title as string) ?? '',
        heading: (meta.heading as string) ?? '',
        domain: (meta.domain as string) ?? '',
        ...(meta.author && { author: meta.author as string }),
        ...(meta.tradition && { tradition: meta.tradition as string }),
      }
    })
    .filter(c => c.text.length > 0)

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
