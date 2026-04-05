import { withAuth } from '@workos-inc/authkit-nextjs'
import { redirect } from 'next/navigation'
import { Header, Button, Card, CardContent, Separator } from '@opencosmos/ui'
import Link from 'next/link'
import { AppShell } from '@/app/AppShell'
import { ApiKeyForm } from './ApiKeyForm'

export const metadata = { title: 'My Account — OpenCosmos' }

export default async function AccountPage() {
  let user: {
    firstName: string | null
    lastName: string | null
    email: string
    profilePictureUrl: string | null
    createdAt: string | null
  } | null = null

  try {
    const auth = await withAuth({ ensureSignedIn: false })
    if (!auth.user) redirect('/api/auth/signin')
    user = {
      firstName: auth.user.firstName,
      lastName: auth.user.lastName,
      email: auth.user.email,
      profilePictureUrl: auth.user.profilePictureUrl ?? null,
      createdAt: auth.user.createdAt ? new Date(auth.user.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
    }
  } catch {
    redirect('/api/auth/signin')
  }

  const u = user!
  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ')
  const initials = ((u.firstName?.[0] ?? '') + (u.lastName?.[0] ?? '')).toUpperCase() || u.email[0].toUpperCase()

  return (
    <AppShell>
      <main className="min-h-screen bg-background">
        <Header
          sticky={false}
          className="sticky top-0 z-40"
          logo={
            <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
              OpenCosmos
            </Link>
          }
          navAlignment="right"
          navLinks={[
            { label: 'Dialog', href: '/dialog' },
            { label: 'Knowledge', href: '/knowledge' },
            { label: 'Studio', href: 'https://studio.opencosmos.ai/docs/getting-started' },
          ]}
          actions={
            <Button variant="outline" size="sm" asChild>
              <a href="/api/auth/signout">Log out</a>
            </Button>
          }
        />

        <div className="max-w-2xl mx-auto px-6 py-16 space-y-10">

          {/* Profile */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-5">
                {/* Avatar */}
                <div className="shrink-0 w-16 h-16 rounded-full bg-foreground/10 flex items-center justify-center overflow-hidden">
                  {u.profilePictureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={u.profilePictureUrl}
                      alt={fullName || u.email}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-semibold text-foreground/50 select-none">
                      {initials}
                    </span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  {fullName && (
                    <p className="text-lg font-medium text-foreground truncate">{fullName}</p>
                  )}
                  <p className="text-sm text-foreground/50 truncate">{u.email}</p>
                  {u.createdAt && (
                    <p className="text-xs text-foreground/30">Member since {u.createdAt}</p>
                  )}
                </div>
              </div>

              <Separator className="my-5" />

              <Button variant="outline" size="sm" asChild>
                <a href="/api/auth/signout">Log out</a>
              </Button>
            </CardContent>
          </Card>

          {/* API key + plan tiers */}
          <ApiKeyForm />

        </div>
      </main>
    </AppShell>
  )
}
