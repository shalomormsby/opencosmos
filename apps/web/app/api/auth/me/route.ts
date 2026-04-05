import { withAuth } from '@workos-inc/authkit-nextjs'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { user } = await withAuth({ ensureSignedIn: false })
    if (!user) return NextResponse.json({ user: null })
    return NextResponse.json({
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        profilePictureUrl: user.profilePictureUrl ?? null,
      },
    })
  } catch {
    return NextResponse.json({ user: null })
  }
}
