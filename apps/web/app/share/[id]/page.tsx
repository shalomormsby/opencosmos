import { notFound } from 'next/navigation'
import { withAuth } from '@workos-inc/authkit-nextjs'
import { getShare } from '../../../lib/share'
import { ShareViewClient } from './ShareViewClient'

export const metadata = {
  title: 'Shared chat — OpenCosmos',
  robots: { index: false, follow: false },
}

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * Server-rendered share view. Fetches the share record directly from Redis
 * (faster + no extra round-trip than a client-side /api/share GET) and
 * decides up front whether to render the chat or the passcode gate. The
 * passcode gate hits /api/share/[id]?code= on submit.
 */
export default async function SharePage({ params }: PageProps) {
  const { id } = await params
  if (!id) notFound()

  const share = await getShare(id)
  if (!share) notFound()

  const { user } = await withAuth({ ensureSignedIn: false })
  const isOwner = Boolean(user && share.ownerUserId && user.id === share.ownerUserId)

  // Public share, or owner viewing their own private share — render directly.
  if (share.visibility === 'public' || isOwner) {
    return (
      <ShareViewClient
        initial={{
          kind: 'unlocked',
          snapshot: share.snapshot,
          visibility: share.visibility,
          isOwner,
        }}
      />
    )
  }

  // Private + non-owner — show passcode gate.
  return <ShareViewClient initial={{ kind: 'locked', shareId: id, isOwner: false }} />
}
