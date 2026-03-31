import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'

const SYSTEM_PROMPT = process.env.COSMO_SYSTEM_PROMPT!
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!
const FREE_LIMIT = 3
const SESSION_TTL = 604800 // 7 days

const SYSTEM_CONTENT = [
  {
    type: 'text' as const,
    text: SYSTEM_PROMPT,
    cache_control: { type: 'ephemeral' as const },
  },
]

// Default client uses server-side ANTHROPIC_API_KEY (shared free-tier key)
const defaultClient = new Anthropic()

function redisKey(sessionId: string) {
  return `cosmo_free:v1:${sessionId}`
}

async function checkAndIncrement(
  sessionId: string
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', redisKey(sessionId)],
        ['EXPIRE', redisKey(sessionId), SESSION_TTL],
      ]),
    })
    const [incrResult] = (await res.json()) as [{ result: number }]
    const count = incrResult.result
    return { allowed: count <= FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - count) }
  } catch {
    return { allowed: true, remaining: FREE_LIMIT } // fail open
  }
}

function sessionCookie(sessionId: string) {
  return `cosmo_session=${sessionId}; HttpOnly; SameSite=Strict; Secure; Max-Age=${SESSION_TTL}; Path=/`
}

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKey } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Session tracking for free-tier gate (skipped for BYOK)
    let newSessionCookie: string | null = null

    if (!apiKey) {
      const existingSession = req.cookies.get('cosmo_session')?.value
      const sessionId = existingSession ?? randomUUID()
      const { allowed } = await checkAndIncrement(sessionId)

      if (!allowed) {
        const res = NextResponse.json(
          { error: 'free_limit_reached', remaining: 0 },
          { status: 429 }
        )
        if (!existingSession) res.headers.set('Set-Cookie', sessionCookie(sessionId))
        return res
      }

      if (!existingSession) newSessionCookie = sessionCookie(sessionId)
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

    const headers: Record<string, string> = {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-cache',
      'X-Accel-Buffering': 'no',
    }
    if (newSessionCookie) headers['Set-Cookie'] = newSessionCookie

    return new Response(readable, { headers })
  } catch {
    return NextResponse.json({ error: 'Conversation interrupted' }, { status: 500 })
  }
}
