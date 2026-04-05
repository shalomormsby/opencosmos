import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

type Message = { role: 'user' | 'assistant'; content: string }
type Conversation = {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  updatedAt: number
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const TTL = 60 * 60 * 24 * 365 // 1 year

function storageKey(userId: string) {
  return `cosmo_conversations:v1:${userId}`
}

// GET /api/conversations — returns all conversations for the authenticated user
export async function GET() {
  const { user } = await withAuth({ ensureSignedIn: false })
  if (!user) return NextResponse.json({ conversations: [] }, { status: 401 })

  try {
    const data = await redis.get<Record<string, Conversation>>(storageKey(user.id))
    const conversations = data
      ? Object.values(data).sort((a, b) => b.updatedAt - a.updatedAt)
      : []
    return NextResponse.json({ conversations })
  } catch {
    return NextResponse.json({ conversations: [] })
  }
}

// PATCH /api/conversations — upserts a single conversation for the authenticated user
export async function PATCH(req: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: false })
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  try {
    const { conversation } = (await req.json()) as { conversation: Conversation }
    if (!conversation?.id) return NextResponse.json({ error: 'invalid' }, { status: 400 })

    const key = storageKey(user.id)
    const existing = (await redis.get<Record<string, Conversation>>(key)) ?? {}
    existing[conversation.id] = conversation
    await redis.set(key, existing, { ex: TTL })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 })
  }
}
