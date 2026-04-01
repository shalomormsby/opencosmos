import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const SYSTEM_PROMPT = process.env.COSMO_SYSTEM_PROMPT!
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!
const GITHUB_PM_REPO = process.env.GITHUB_PM_REPO ?? ''
const GITHUB_PM_PAT = process.env.GITHUB_PM_PAT ?? ''
const PM_CACHE_KEY = 'cosmo_pm_context:v1'
const PM_CACHE_TTL = 3600 // 1 hour
const FREE_LIMIT = 3
const SESSION_TTL = 604800 // 7 days

// Hard monthly spend cap: if free-tier request count exceeds this, the shared
// key is effectively offline for the month. Each request ~$0.03 → 2000 = ~$60.
// Adjust via COSMO_FREE_MONTHLY_CAP env var.
const MONTHLY_CAP = parseInt(process.env.COSMO_FREE_MONTHLY_CAP ?? '2000', 10)

const SYSTEM_CONTENT = [
  {
    type: 'text' as const,
    text: SYSTEM_PROMPT,
    cache_control: { type: 'ephemeral' as const },
  },
]

// Default client uses server-side ANTHROPIC_API_KEY (shared free-tier key)
const defaultClient = new Anthropic()

const redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN })

// Fetches all .md files from the private cosmo-context GitHub repo and
// concatenates them into a single context string. Caches in Redis for 1 hour.
// Fails open — returns null on any error so chat is never blocked.
async function fetchPmContext(): Promise<string | null> {
  try {
    const cached = await redis.get<string>(PM_CACHE_KEY)
    if (cached) return cached

    const headers = {
      Authorization: `Bearer ${GITHUB_PM_PAT}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    }

    const listRes = await fetch(`https://api.github.com/repos/${GITHUB_PM_REPO}/contents/`, { headers })
    if (!listRes.ok) return null

    const files = (await listRes.json()) as Array<{ name: string; path: string; type: string }>
    const mdFiles = files.filter((f) => f.type === 'file' && f.name.endsWith('.md'))

    const parts = await Promise.all(
      mdFiles.map(async (f) => {
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_PM_REPO}/contents/${f.path}`,
          { headers }
        )
        if (!res.ok) return null
        const data = (await res.json()) as { content: string; encoding: string }
        const content = Buffer.from(data.content, 'base64').toString('utf-8')
        return `## ${f.name}\n\n${content}`
      })
    )

    const context = parts.filter(Boolean).join('\n\n---\n\n')
    if (!context) return null

    await redis.set(PM_CACHE_KEY, context, { ex: PM_CACHE_TTL })
    return context
  } catch {
    return null // fail open
  }
}

// IP rate limiter: 3 free-tier requests per IP per 24 hours.
// Uses sliding window so burst attempts don't reset the window.
const ipRatelimit = new Ratelimit({
  redis: new Redis({ url: REDIS_URL, token: REDIS_TOKEN }),
  limiter: Ratelimit.slidingWindow(3, '24 h'),
  prefix: 'cosmo_ip:v1',
  analytics: false,
})

function redisKey(sessionId: string) {
  return `cosmo_free:v1:${sessionId}`
}

function monthlyCapKey(): string {
  const now = new Date()
  return `cosmo_monthly:v1:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`
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

// Increment the monthly counter and check against the hard cap.
// Fails open so a Redis outage doesn't take down the free tier.
async function checkMonthlyCap(): Promise<boolean> {
  try {
    const key = monthlyCapKey()
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // TTL: 35 days — safely covers the full month + rollover
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, 3024000]]),
    })
    const [incrResult] = (await res.json()) as [{ result: number }]
    return incrResult.result <= MONTHLY_CAP
  } catch {
    return true // fail open
  }
}

function sessionCookie(sessionId: string) {
  return `cosmo_session=${sessionId}; HttpOnly; SameSite=Strict; Secure; Max-Age=${SESSION_TTL}; Path=/`
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKey } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Session tracking + bot protection for free-tier (skipped for BYOK and admin)
    const isAdmin = req.cookies.get('cosmo_admin')?.value === '1'
    let newSessionCookie: string | null = null

    if (!apiKey && !isAdmin) {
      // 1. Hard monthly spend cap — cheapest check, no Ratelimit SDK overhead
      const underCap = await checkMonthlyCap()
      if (!underCap) {
        return NextResponse.json(
          { error: 'free_tier_unavailable', message: 'Free tier is temporarily unavailable. Please use your own API key or subscribe.' },
          { status: 503 }
        )
      }

      // 2. IP rate limit — 3 requests per IP per 24h
      const ip = getClientIp(req)
      const { success: ipAllowed } = await ipRatelimit.limit(ip)
      if (!ipAllowed) {
        return NextResponse.json(
          { error: 'rate_limited', message: 'Too many requests from this IP. Please try again later or use your own API key.' },
          { status: 429 }
        )
      }

      // 3. Session-based counter (localStorage bypass protection)
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

    // Shalom mode: inject private PM context when cosmo_admin cookie is present.
    const systemContent = [...SYSTEM_CONTENT]
    if (isAdmin && GITHUB_PM_REPO && GITHUB_PM_PAT) {
      const pmContext = await fetchPmContext()
      if (pmContext) {
        systemContent.push({
          type: 'text' as const,
          text: `# Private Project Context\n\nThe following is Shalom's private project management context. Use it to answer questions about his projects, current status, priorities, and decisions.\n\n${pmContext}`,
          cache_control: { type: 'ephemeral' as const },
        })
      }
    }

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemContent,
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
