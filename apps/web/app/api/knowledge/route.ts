import { NextRequest, NextResponse } from 'next/server'
import { fetchRagContext } from '@/lib/rag'

/**
 * POST /api/knowledge
 *
 * Retrieves semantically relevant knowledge chunks for a query.
 * Called by the sidebar companion on /knowledge pages.
 * Also consumed by the main chat route internally (via fetchRagContext directly).
 *
 * Request:
 *   { query: string, conversation_history?: Message[], current_document?: string }
 *
 * Response:
 *   { chunks: RagChunk[] }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { query, conversation_history, current_document } = body as {
      query: unknown
      conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }>
      current_document?: string
    }

    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json({ error: 'query required' }, { status: 400 })
    }

    const result = await fetchRagContext(
      query.trim(),
      conversation_history ?? [],
      current_document,
    )

    return NextResponse.json(result)
  } catch (err) {
    console.error('[rag] retrieval error', err)
    return NextResponse.json({ chunks: [] }, { status: 500 })
  }
}
