import { withAuth } from '@workos-inc/authkit-nextjs'
import { redirect } from 'next/navigation'
import { Header, Button } from '@opencosmos/ui'
import Link from 'next/link'

export const metadata = { title: 'My Account — OpenCosmos' }

export default async function AccountPage() {
  let user: { firstName: string | null; email: string } | null = null

  try {
    const auth = await withAuth({ ensureSignedIn: false })
    if (!auth.user) redirect('/api/auth/signin')
    user = { firstName: auth.user.firstName, email: auth.user.email }
  } catch {
    redirect('/api/auth/signin')
  }

  const name = user!.firstName ?? user!.email

  return (
    <main className="min-h-screen bg-background">
      <Header
        logo={
          <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
            OpenCosmos
          </Link>
        }
        navAlignment="right"
        navLinks={[
          { label: 'Dialog', href: '/chat' },
          { label: 'Knowledge', href: '/knowledge' },
          { label: 'Studio', href: 'https://studio.opencosmos.ai' },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <a href="/api/auth/signout">Sign out</a>
          </Button>
        }
      />
      <div className="max-w-lg mx-auto px-6 py-24 space-y-4">
        <h1 className="text-3xl font-light tracking-wide text-foreground">
          Welcome, {name}.
        </h1>
        <p className="text-foreground/50 leading-relaxed">
          Your account is active.
        </p>
      </div>
    </main>
  )
}
