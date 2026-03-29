import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const SYSTEM_PROMPT = process.env.COSMO_SYSTEM_PROMPT!

const SYSTEM_CONTENT = [
  {
    type: 'text' as const,
    text: SYSTEM_PROMPT,
    cache_control: { type: 'ephemeral' as const },
  },
]

// Default client uses server-side ANTHROPIC_API_KEY (shared free-tier key)
const defaultClient = new Anthropic()

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKey } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // BYOK: use provided key. Otherwise fall back to server key (free tier).
    // The provided key is used only for this request and never stored.
    const client = apiKey ? new Anthropic({ apiKey }) : defaultClient

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_CONTENT,
      messages,
    })

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta'
            ) {
              controller.enqueue(new TextEncoder().encode(event.delta.text))
            }
          }
        } catch (err) {
          controller.error(err)
        } finally {
          controller.close()
        }
      },
      cancel() {
        stream.abort()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Conversation interrupted' }, { status: 500 })
  }
}
