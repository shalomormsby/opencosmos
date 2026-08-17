import { getSignUpUrl } from '@workos-inc/authkit-nextjs'
import { redirect } from 'next/navigation'

// Mirrors ../signin, but lands on AuthKit's registration screen instead of its
// login screen. Xensō's front door offers both: play needs no account at all,
// and the account is asked for at the moment there is something to save — but a
// player who would rather start with one shouldn't have to arrive at a login
// form and hunt for the sign-up link.
export async function GET() {
  const url = await getSignUpUrl()
  return redirect(url)
}
