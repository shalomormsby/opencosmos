import { authkitMiddleware } from '@workos-inc/authkit-nextjs'
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server'

const workosMiddleware = authkitMiddleware()

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    return await workosMiddleware(request, event)
  } catch {
    // Fail open — if WorkOS is unreachable or misconfigured, pass the request through
    // so the rest of the site remains functional.
    return NextResponse.next()
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
