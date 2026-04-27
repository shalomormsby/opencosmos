import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import {
  Share,
  ShareConversationSnapshot,
  ShareMessage,
  hashPasscode,
  isValidPasscode,
  newShareId,
  putShare,
} from '../../../../lib/share'

const MAX_MESSAGES = 500
const MAX_CONTENT_BYTES = 1_000_000 // 1 MB safety cap on a single message

function isMessage(x: unknown): x is ShareMessage {
  if (!x || typeof x !== 'object') return false
  const m = x as Partial<ShareMessage>
  return (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'
}

function isSnapshot(x: unknown): x is ShareConversationSnapshot {
  if (!x || typeof x !== 'object') return false
  const s = x as Partial<ShareConversationSnapshot>
  return (
    typeof s.conversationId === 'string' &&
    typeof s.title === 'string' &&
    typeof s.snapshotAt === 'number' &&
    Array.isArray(s.messages) &&
    s.messages.length > 0 &&
    s.messages.length <= MAX_MESSAGES &&
    s.messages.every(isMessage) &&
    s.messages.every((m) => Buffer.byteLength(m.content, 'utf8') <= MAX_CONTENT_BYTES)
  )
}

/**
 * POST /api/share/create
 *
 * Body: {
 *   snapshot: ShareConversationSnapshot,
 *   visibility: 'public' | 'private',
 *   passcode?: string  // required and must be 4 digits when visibility=private
 * }
 *
 * Returns: { id, url, visibility }
 *
 * Auth is optional. When signed in, the share is recorded under the owner's
 * id (so they can revoke it later). Anonymous shares work but are not
 * revocable from the UI.
 */
export async function POST(req: NextRequest) {
  const { user } = await withAuth({ ensureSignedIn: false })

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 })
  }

  const { snapshot, visibility, passcode } = body as {
    snapshot?: unknown
    visibility?: unknown
    passcode?: unknown
  }

  if (!isSnapshot(snapshot)) {
    return NextResponse.json({ error: 'invalid_snapshot' }, { status: 400 })
  }

  if (visibility !== 'public' && visibility !== 'private') {
    return NextResponse.json({ error: 'invalid_visibility' }, { status: 400 })
  }

  if (visibility === 'private') {
    if (typeof passcode !== 'string' || !isValidPasscode(passcode)) {
      return NextResponse.json({ error: 'invalid_passcode' }, { status: 400 })
    }
  }

  const id = newShareId()
  const share: Share = {
    id,
    ownerUserId: user?.id ?? null,
    visibility,
    passcodeHash:
      visibility === 'private' && typeof passcode === 'string'
        ? hashPasscode(passcode, id)
        : undefined,
    snapshot,
    createdAt: Date.now(),
  }

  try {
    await putShare(share)
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 })
  }

  // Build absolute URL using the request's origin (covers prod + previews + localhost).
  const origin = req.headers.get('origin') || `https://${req.headers.get('host') ?? ''}`
  return NextResponse.json({
    id,
    url: `${origin}/share/${id}`,
    visibility,
  })
}
