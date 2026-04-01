import { getSignInUrl } from '@workos-inc/authkit-nextjs'
import { redirect } from 'next/navigation'

export async function GET() {
  const url = await getSignInUrl()
  return redirect(url)
}
