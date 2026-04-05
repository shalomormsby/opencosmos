import { authkitProxy } from '@workos-inc/authkit-nextjs'

export default authkitProxy()

// Run on all routes except Next.js internals and static assets.
// Broad coverage is needed because auth state is shown on every page.
// Static asset paths are excluded to avoid breaking Tailwind CSS v4.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
