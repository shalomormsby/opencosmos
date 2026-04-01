import { authkitMiddleware } from '@workos-inc/authkit-nextjs'
import { type NextFetchEvent, type NextRequest, NextResponse } from 'next/server'

const workosMiddleware = authkitMiddleware()

export async function middleware(request: NextRequest, event: NextFetchEvent) {
  try {
    return await workosMiddleware(request, event)
  } catch {
    return NextResponse.next()
  }
}

// Only run on auth routes — avoids WorkOS setting Cache-Control: no-store on
// regular page responses, which causes Safari to not apply CSS on hard refresh.
export const config = {
  matcher: ['/callback', '/api/auth/:path*'],
}
