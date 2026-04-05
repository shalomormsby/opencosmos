import { Header, Button, OrbBackground } from '@opencosmos/ui'
import Link from 'next/link'
import { AuthButton } from './AuthButton'
import { AppShell } from './AppShell'

export default function Home() {
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
          actions={<AuthButton />}
        />

        <div className="relative flex flex-col items-center justify-center min-h-screen px-6 overflow-hidden">
          {/* Animated sphere background */}
          <div className="absolute inset-0 pointer-events-none">
            <OrbBackground hoverIntensity={0.3} rotateOnHover={true} />
          </div>

          {/* Hero content */}
          <div className="max-w-lg text-center space-y-8 relative z-10">
            <div className="space-y-3">
              <h1 className="text-4xl font-light tracking-wide text-foreground">
                OpenCosmos
              </h1>
              <p className="text-foreground/50 leading-relaxed">
                At home in the universe.
              </p>
            </div>

            <Button variant="secondary" size="lg" asChild>
              <Link href="/dialog">Meet Cosmo →</Link>
            </Button>
          </div>
        </div>
      </main>
    </AppShell>
  )
}
