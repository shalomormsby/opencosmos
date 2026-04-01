import { signOut } from '@workos-inc/authkit-nextjs'

export async function GET() {
  return signOut()
}
