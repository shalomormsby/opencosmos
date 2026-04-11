import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { withAuth } from '@workos-inc/authkit-nextjs'
import { getSubscription, incrementUsage, isWithinBudget, markByok } from '@/lib/subscription'
import { TIERS } from '@/lib/stripe'

const SYSTEM_PROMPT = process.env.COSMO_SYSTEM_PROMPT!
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!
const GITHUB_PM_REPO = process.env.GITHUB_PM_REPO ?? ''
const GITHUB_PM_PAT = process.env.GITHUB_PM_PAT ?? ''
const PM_CACHE_KEY = 'cosmo_pm_context:v1'
const PM_CACHE_TTL = 3600 // 1 hour
const SESSION_TTL = 604800 // 7 days

// Free-tier token budget: 20k tokens ≈ 3–4 substantive exchanges with Cosmo.
export const FREE_TOKEN_BUDGET = 20_000

// Monthly cap denominated in estimated tokens (not requests).
// Default: 50M tokens/month ≈ $15 at current rates. One 1.79M-token crafted
// request incremented the old request counter by 1 — this closes that gap.
// Set via COSMO_FREE_MONTHLY_TOKEN_CAP env var.
const MONTHLY_TOKEN_CAP = parseInt(process.env.COSMO_FREE_MONTHLY_TOKEN_CAP ?? '50000000', 10)

// Per-tier payload limits to prevent cost-inflation attacks (April 8, 2026 incident).
// A 40k-char limit for free tier is ~2× a Wikipedia article — generous for real
// users, impossible to exploit at scale. Admin and BYOK are exempt.
const MAX_MESSAGES_FREE = 10
const MAX_MESSAGES_SUBSCRIBER = 100
const MAX_CHARS_FREE = 40_000      // ~10k tokens
const MAX_CHARS_SUBSCRIBER = 400_000 // ~100k tokens

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

// IP rate limiter: 30 free-tier requests per IP per 24 hours.
// Catches bot/scraper abuse without blocking households sharing a single IP.
const ipRatelimit = new Ratelimit({
  redis: new Redis({ url: REDIS_URL, token: REDIS_TOKEN }),
  limiter: Ratelimit.slidingWindow(30, '24 h'),
  prefix: 'cosmo_ip:v2',
  analytics: false,
})

function freeSessionKey(sessionId: string) {
  return `cosmo_free:v1:${sessionId}`
}

function freeTokenKey(sessionId: string) {
  return `cosmo_free_tokens:v1:${sessionId}`
}

function monthlyCapKey(): string {
  const now = new Date()
  return `cosmo_monthly:v1:${now.getUTCFullYear()}-${now.getUTCMonth() + 1}`
}

// Reads current free-tier token usage for a session. Does not increment —
// increment happens after the stream completes (fire-and-forget).
async function getFreeTokenUsage(sessionId: string): Promise<number> {
  try {
    const res = await fetch(`${REDIS_URL}/get/${freeTokenKey(sessionId)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    })
    const data = (await res.json()) as { result: string | null }
    return data.result ? parseInt(data.result, 10) : 0
  } catch {
    return 0 // fail open
  }
}

// Increments the free-tier token counter after a stream completes.
// Fire-and-forget — never blocks the response.
async function incrementFreeTokens(
  sessionId: string,
  inputTokens: number,
  outputTokens: number,
): Promise<void> {
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCRBY', freeTokenKey(sessionId), inputTokens + outputTokens],
        ['EXPIRE', freeTokenKey(sessionId), SESSION_TTL],
        // Keep the legacy message counter key alive in parallel (for session route backwards compat)
        ['EXPIRE', freeSessionKey(sessionId), SESSION_TTL],
      ]),
    })
  } catch {
    // Fail silently — token tracking is best-effort
  }
}

// Increment the monthly token counter and check against the hard cap.
// Changed from request-count (INCR by 1) to token-estimate (INCRBY tokenEstimate)
// so one oversized request can't sneak through the cap.
// Fails open so a Redis outage never takes down the free tier.
async function checkMonthlyCap(tokenEstimate: number): Promise<boolean> {
  try {
    const key = monthlyCapKey()
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      // TTL: 35 days — safely covers the full month + rollover
      body: JSON.stringify([['INCRBY', key, tokenEstimate], ['EXPIRE', key, 3024000]]),
    })
    const [incrResult] = (await res.json()) as [{ result: number }]
    return incrResult.result <= MONTHLY_TOKEN_CAP
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

// ---------------------------------------------------------------------------
// Conversation history caching
//
// Adding cache_control to the last assistant message reduces input token costs
// ~40-50% on long conversations. The SDK marks that turn as the cache boundary;
// everything up to and including it is served from cache on the next call.
// ---------------------------------------------------------------------------

type Message = { role: 'user' | 'assistant'; content: string | Anthropic.ContentBlockParam[] }

function withHistoryCaching(messages: Message[]): Message[] {
  if (messages.length < 2) return messages

  // Find the last assistant message and mark it as the cache boundary.
  const result = messages.map((m) => ({ ...m }))
  for (let i = result.length - 1; i >= 0; i--) {
    if (result[i].role === 'assistant') {
      const content = typeof result[i].content === 'string'
        ? [{ type: 'text' as const, text: result[i].content as string, cache_control: { type: 'ephemeral' as const } }]
        : (result[i].content as Anthropic.ContentBlockParam[]).map((block, idx, arr) =>
            idx === arr.length - 1
              ? { ...block, cache_control: { type: 'ephemeral' as const } }
              : block
          )
      result[i] = { ...result[i], content }
      break
    }
  }
  return result
}

// ---------------------------------------------------------------------------
// Turnstile verification
//
// Verifies a Cloudflare Turnstile challenge token server-side. Called on the
// free-tier path only — BYOK, subscriber, and admin bypass this check.
//
// Returns true when:
//   - TURNSTILE_SECRET_KEY is not configured (dev mode — skip silently)
//   - Cloudflare confirms the token is valid
//   - Cloudflare's siteverify endpoint is unreachable (fail open — a CF outage
//     should not take down the free tier; other rate limits remain as backstop)
//
// Returns false when:
//   - Token is missing or empty
//   - Cloudflare returns success: false (bot, expired token, or reused token)
// ---------------------------------------------------------------------------

async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true   // Not configured — skip (dev or pre-Cloudflare deploy)
  if (!token) return false   // Missing token — reject

  try {
    const params = new URLSearchParams({ secret, response: token })
    if (ip !== 'unknown') params.append('remoteip', ip)

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: params,
    })
    const data = await res.json() as { success: boolean; 'error-codes'?: string[] }
    if (!data.success) {
      console.log('[turnstile] rejected', { 'error-codes': data['error-codes'] })
    }
    return data.success
  } catch (err) {
    // Fail open — CF outage should not block real users
    console.error('[turnstile] siteverify unreachable', err)
    return true
  }
}

export async function POST(req: NextRequest) {
  try {
    const { messages, apiKey, turnstileToken } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }

    // Compute payload size metrics up front — used by monthly cap and size limits.
    // Rough heuristic: 4 chars ≈ 1 token.
    const totalChars = messages.reduce(
      (sum: number, m: Message) =>
        sum + (typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length),
      0
    )
    const tokenEstimate = Math.ceil(totalChars / 4)

    const isAdmin = req.cookies.get('cosmo_admin')?.value === '1'
    const ip = getClientIp(req)
    let newSessionCookie: string | null = null
    let freeTierSessionId: string | null = null

    // ------------------------------------------------------------------
    // Determine access path:
    //   1. Admin (bypass everything)
    //   2. BYOK (user-supplied key, unlimited, bypass free-tier limits)
    //   3. Active subscriber (managed key, token-budgeted)
    //   4. Free tier (token-budgeted, shared key)
    // ------------------------------------------------------------------

    let subscribedUserId: string | null = null
    let subscriberTier: import('@/lib/stripe').Tier | null = null

    // Resolve the authenticated user for all non-admin paths.
    // For BYOK requests we still need the userId to record server-side BYOK status
    // (so the account page can show "API connection" regardless of browser/device).
    const authenticatedUser = !isAdmin
      ? await withAuth({ ensureSignedIn: false }).then(a => a.user).catch(() => null)
      : null

    // BYOK + logged-in user: mark them server-side so the account page knows.
    // Fire-and-forget — never blocks the response.
    if (apiKey && authenticatedUser) {
      markByok(authenticatedUser.id).catch(() => {})
    }

    if (!apiKey && !isAdmin) {
      // Check for an authenticated subscriber before falling to the free tier.
      const user = authenticatedUser
      if (user) {
        const sub = await getSubscription(user.id)
        if (sub && sub.status === 'active') {
          const usage = await import('@/lib/subscription').then(m => m.getUsage(user.id))
          if (isWithinBudget(sub.tier, usage.monthTotal, usage.weekTotal)) {
            subscribedUserId = user.id
            subscriberTier = sub.tier
          } else {
            // Budget exhausted — inform the client which limit was hit.
            const tierConfig = TIERS[sub.tier]
            const isWeeklyExhausted = usage.weekTotal >= tierConfig.weeklyBudgetMicrodollars
            return NextResponse.json(
              {
                error: 'subscription_limit_reached',
                period: isWeeklyExhausted ? 'weekly' : 'monthly',
                message: isWeeklyExhausted
                  ? 'You\'ve reached your weekly conversation limit. It resets on Monday, or you can upgrade your plan.'
                  : 'You\'ve reached your monthly conversation limit. It resets at the start of next month, or you can upgrade your plan.',
              },
              { status: 429 }
            )
          }
        }
      }

      // No active subscription — apply free-tier guards.
      if (!subscribedUserId) {
        // 0. Turnstile bot prevention — runs before Redis hits.
        //    Skipped when TURNSTILE_SECRET_KEY is not configured (dev).
        const turnstileValid = await verifyTurnstile(turnstileToken ?? '', ip)
        if (!turnstileValid) {
          return NextResponse.json({ error: 'bot_suspected' }, { status: 403 })
        }

        // 1. Hard monthly token cap (increments by estimated tokens, not by 1)
        const underCap = await checkMonthlyCap(tokenEstimate)
        if (!underCap) {
          return NextResponse.json(
            { error: 'free_tier_unavailable', message: 'Free tier is temporarily unavailable. Please use your own API key or subscribe.' },
            { status: 503 }
          )
        }

        // 2. IP rate limit
        const { success: ipAllowed } = await ipRatelimit.limit(ip)
        if (!ipAllowed) {
          return NextResponse.json(
            { error: 'rate_limited', message: 'Too many requests from this IP. Please try again later or use your own API key.' },
            { status: 429 }
          )
        }

        // 3. Token budget check
        // Stateless clients (bots, curl) that ignore Set-Cookie headers get pinned
        // to their IP — this closes the session-bypass exploit (April 8, 2026).
        // Real browser users get a UUID session cookie on their first request and
        // use their own per-browser token bucket from the second request onward.
        const existingSession = req.cookies.get('cosmo_session')?.value
        const sessionId = existingSession ?? `ip:${ip}`
        freeTierSessionId = sessionId

        const tokensUsed = await getFreeTokenUsage(sessionId)
        if (tokensUsed >= FREE_TOKEN_BUDGET) {
          return NextResponse.json(
            { error: 'free_limit_reached', remaining: 0 },
            { status: 429 }
          )
        }

        // Give new browser users a UUID cookie so future requests use a per-browser
        // token bucket instead of the shared IP bucket.
        if (!existingSession) {
          newSessionCookie = sessionCookie(randomUUID())
        }
      }
    }

    // ------------------------------------------------------------------
    // Payload size limits — after auth resolves access path.
    // Prevents cost-inflation attacks like the April 8, 2026 incident where
    // 3 crafted requests with ~600k tokens each cost ~$50–80 in one day.
    // Admin and BYOK are exempt (admin is you; BYOK users pay their own costs).
    // ------------------------------------------------------------------
    if (!isAdmin && !apiKey) {
      const maxMessages = subscribedUserId ? MAX_MESSAGES_SUBSCRIBER : MAX_MESSAGES_FREE
      const maxChars = subscribedUserId ? MAX_CHARS_SUBSCRIBER : MAX_CHARS_FREE

      if (messages.length > maxMessages) {
        return NextResponse.json({ error: 'too_many_messages' }, { status: 400 })
      }
      if (totalChars > maxChars) {
        return NextResponse.json({ error: 'payload_too_large' }, { status: 413 })
      }
    }

    // Structured request log — captured in Vercel Functions dashboard at no extra cost.
    // This single log line would have revealed the April 8 attack immediately:
    // estimatedTokens ~598k, accessPath: free, ip: [attacker].
    console.log(JSON.stringify({
      event: 'chat_request',
      ts: new Date().toISOString(),
      ip,
      session: req.cookies.get('cosmo_session')?.value ?? 'new',
      accessPath: isAdmin ? 'admin' : apiKey ? 'byok' : subscribedUserId ? `subscriber:${subscriberTier}` : 'free',
      messageCount: messages.length,
      estimatedChars: totalChars,
      estimatedTokens: tokenEstimate,
    }))

    // BYOK: use provided key. Subscriber or free tier: use shared server key.
    const client = apiKey ? new Anthropic({ apiKey }) : defaultClient

    // Shalom admin mode: inject private PM context.
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

    // Apply conversation history caching for subscribers (reduces costs ~40-50%).
    // Free-tier requests are short-lived sessions where caching has minimal benefit.
    const cachedMessages = subscribedUserId ? withHistoryCaching(messages) : messages

    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemContent,
      messages: cachedMessages,
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
          // Track token usage after stream completes. Fire-and-forget — never blocks the response.
          stream.finalMessage().then((msg) => {
            if (subscribedUserId && subscriberTier) {
              incrementUsage(
                subscribedUserId!,
                msg.usage.input_tokens,
                msg.usage.output_tokens,
              ).catch(() => {})
            }
            if (freeTierSessionId) {
              incrementFreeTokens(
                freeTierSessionId,
                msg.usage.input_tokens,
                msg.usage.output_tokens,
              ).catch(() => {})
            }
          }).catch(() => {})
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
