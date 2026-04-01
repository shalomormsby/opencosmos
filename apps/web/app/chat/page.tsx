import { withAuth } from '@workos-inc/authkit-nextjs'
import { CosmoChat } from './CosmoChat'

export const metadata = {
  title: 'Cosmo — OpenCosmos',
}

export default async function ChatPage() {
  const { user } = await withAuth({ ensureSignedIn: false })
  return <CosmoChat user={user ?? undefined} />
}
