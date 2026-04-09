import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { FREE_TOKEN_BUDGET } from '@/app/api/chat/route'

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!
const SESSION_TTL = 604800 // 7 days

function freeTokenKey(sessionId: string) {
  return `cosmo_free_tokens:v1:${sessionId}`
}

function sessionCookie(sessionId: string) {
  return `cosmo_session=${sessionId}; HttpOnly; SameSite=Strict; Secure; Max-Age=${SESSION_TTL}; Path=/`
}

async function getTokenData(sessionId: string): Promise<{ tokensUsed: number; ttl: number }> {
  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['GET', freeTokenKey(sessionId)],
        ['TTL', freeTokenKey(sessionId)],
      ]),
    })
    const [getResult, ttlResult] = (await res.json()) as [
      { result: string | null },
      { result: number },
    ]
    const tokensUsed = getResult.result ? parseInt(getResult.result, 10) : 0
    // TTL returns -2 if key doesn't exist, -1 if no expiry. Fall back to full SESSION_TTL.
    const ttl = ttlResult.result > 0 ? ttlResult.result : SESSION_TTL
    return { tokensUsed, ttl }
  } catch {
    return { tokensUsed: 0, ttl: SESSION_TTL } // fail open
  }
}

// GET /api/session — returns token quota status for the current session
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('cosmo_session')?.value

  if (!sessionId) {
    return NextResponse.json({
      tokensUsed: 0,
      tokenBudget: FREE_TOKEN_BUDGET,
      sessionExpiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL,
    })
  }

  const { tokensUsed, ttl } = await getTokenData(sessionId)
  return NextResponse.json({
    tokensUsed,
    tokenBudget: FREE_TOKEN_BUDGET,
    sessionExpiresAt: Math.floor(Date.now() / 1000) + ttl,
  })
}

// POST /api/session — creates a new anonymous session
export async function POST() {
  const sessionId = randomUUID()

  // Initialize token counter key (SET NX so it doesn't overwrite an existing key)
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SET', freeTokenKey(sessionId), '0', 'NX'],
        ['EXPIRE', freeTokenKey(sessionId), SESSION_TTL],
      ]),
    })
  } catch {
    // fail open — session cookie still set, counter will init on first increment
  }

  const res = NextResponse.json({
    tokensUsed: 0,
    tokenBudget: FREE_TOKEN_BUDGET,
    sessionExpiresAt: Math.floor(Date.now() / 1000) + SESSION_TTL,
  })
  res.headers.set('Set-Cookie', sessionCookie(sessionId))
  return res
}
