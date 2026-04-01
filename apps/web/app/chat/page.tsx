import { withAuth } from '@workos-inc/authkit-nextjs'
import { CosmoChat } from './CosmoChat'

export const metadata = {
  title: 'Cosmo — OpenCosmos',
}

export default async function ChatPage() {
  let user: { firstName: string | null; email: string } | undefined

  try {
    const auth = await withAuth({ ensureSignedIn: false })
    if (auth.user) user = { firstName: auth.user.firstName, email: auth.user.email }
  } catch {
    // withAuth failure (e.g. misconfigured env) should not break the chat page
  }

  return <CosmoChat user={user} />
}
