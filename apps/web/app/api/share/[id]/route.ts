import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextRequest, NextResponse } from 'next/server'
import {
  Share,
  ShareLockedResponse,
  ShareViewResponse,
  deleteShare,
  getShare,
  isValidPasscode,
  verifyPasscode,
} from '../../../../lib/share'

function publicView(share: Share, isOwner: boolean): ShareViewResponse {
  const { passcodeHash, ownerUserId, ...rest } = share
  void passcodeHash
  void ownerUserId
  return { locked: false, share: rest, isOwner }
}

/**
 * GET /api/share/[id]
 *
 * - Public shares return the snapshot directly.
 * - Private shares require ?code=NNNN. If absent or wrong, returns
 *   { locked: true, visibility: 'private', shareId } with status 401, so the
 *   client can render a passcode prompt.
 */
export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  let share: Share | null
  try {
    share = await getShare(id)
  } catch {
    return NextResponse.json({ error: 'storage_failed' }, { status: 500 })
  }

  if (!share) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const { user } = await withAuth({ ensureSignedIn: false })
  const isOwner = Boolean(user && share.ownerUserId && user.id === share.ownerUserId)

  if (share.visibility === 'public') {
    return NextResponse.json(publicView(share, isOwner))
  }

  // Private: owner can always view, otherwise require passcode.
  if (isOwner) {
    return NextResponse.json(publicView(share, true))
  }

  const code = req.nextUrl.searchParams.get('code') ?? ''
  if (!isValidPasscode(code) || !share.passcodeHash || !verifyPasscode(code, id, share.passcodeHash)) {
    const locked: ShareLockedResponse = { locked: true, visibility: 'private', shareId: id }
    return NextResponse.json(locked, { status: 401 })
  }

  return NextResponse.json(publicView(share, false))
}

/**
 * DELETE /api/share/[id] — owner-only revoke.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const { user } = await withAuth({ ensureSignedIn: false })
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const share = await getShare(id)
  if (!share) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }
  if (share.ownerUserId !== user.id) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  await deleteShare(id, share)
  return NextResponse.json({ ok: true })
}
