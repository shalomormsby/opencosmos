import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!
const FREE_LIMIT = 3
const SESSION_TTL = 604800 // 7 days

function redisKey(sessionId: string) {
  return `cosmo_free:v1:${sessionId}`
}

async function getCount(sessionId: string): Promise<number> {
  try {
    const res = await fetch(`${REDIS_URL}/get/${redisKey(sessionId)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
    })
    const data = (await res.json()) as { result: string | null }
    return data.result ? parseInt(data.result, 10) : 0
  } catch {
    return 0 // fail open
  }
}

function sessionCookie(sessionId: string) {
  return `cosmo_session=${sessionId}; HttpOnly; SameSite=Strict; Secure; Max-Age=${SESSION_TTL}; Path=/`
}

// GET /api/session — returns { remaining: number } for the current session
export async function GET(req: NextRequest) {
  const sessionId = req.cookies.get('cosmo_session')?.value

  if (!sessionId) {
    return NextResponse.json({ remaining: FREE_LIMIT })
  }

  const count = await getCount(sessionId)
  return NextResponse.json({ remaining: Math.max(0, FREE_LIMIT - count) })
}

// POST /api/session — creates a new anonymous session, returns { remaining: number }
export async function POST() {
  const sessionId = randomUUID()

  // Initialize counter to 0 in Redis (SET NX so it doesn't overwrite an existing key)
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['SET', redisKey(sessionId), '0', 'NX'],
        ['EXPIRE', redisKey(sessionId), SESSION_TTL],
      ]),
    })
  } catch {
    // fail open — session cookie still set, counter will init on first INCR
  }

  const res = NextResponse.json({ remaining: FREE_LIMIT })
  res.headers.set('Set-Cookie', sessionCookie(sessionId))
  return res
}
