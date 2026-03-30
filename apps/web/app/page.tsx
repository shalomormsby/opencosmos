import { Header, Button, GitHubIcon } from '@opencosmos/ui'
import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <Header
        logo={
          <span className="text-xl font-bold tracking-tight text-foreground">
            OpenCosmos
          </span>
        }
        navAlignment="right"
        navLinks={[
          { label: 'Chat', href: '/chat' },
          { label: 'Studio', href: 'https://studio.opencosmos.ai' },
        ]}
        actions={
          <Button variant="outline" size="sm" asChild className="gap-2">
            <a
              href="https://github.com/shalomormsby/opencosmos"
              target="_blank"
              rel="noopener noreferrer"
            >
              <GitHubIcon className="w-4 h-4" />
              Star on GitHub
            </a>
          </Button>
        }
      />

      <div className="flex flex-col items-center justify-center min-h-screen px-6">
        <div className="max-w-lg text-center space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-light tracking-wide text-foreground">
              OpenCosmos
            </h1>
            <p className="text-foreground/50 leading-relaxed">
              A place to think, to wonder, to be met.
            </p>
          </div>

          <Link
            href="/chat"
            className="inline-block px-8 py-3 rounded-full border border-foreground/20 text-foreground/70 hover:text-foreground hover:border-foreground/40 transition-colors text-sm tracking-wide"
          >
            Meet Cosmo →
          </Link>
        </div>
      </div>
    </main>
  )
}
