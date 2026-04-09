import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextResponse } from 'next/server'
import { clearByok } from '@/lib/subscription'

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
