import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextResponse } from 'next/server'
import { clearByok, markByok } from '@/lib/subscription'

// POST /api/byok — records that the authenticated user has a BYOK key.
// Called by the account page when a key is detected in localStorage so the
// server-side flag is set immediately — no chat message required.
export async function POST() {
  const { user } = await withAuth({ ensureSignedIn: false })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await markByok(user.id)
  return NextResponse.json({ ok: true })
}

// DELETE /api/byok — removes the server-side BYOK flag for the authenticated user.
// Called when the user explicitly clears their API key from the account page.
export async function DELETE() {
  const { user } = await withAuth({ ensureSignedIn: false })
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await clearByok(user.id)
  return NextResponse.json({ ok: true })
}
