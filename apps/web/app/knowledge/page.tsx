import type { Metadata } from 'next'
import Link from 'next/link'
import { Header, Button, GitHubIcon } from '@opencosmos/ui'
import { getAllDocs } from '@/lib/knowledge'
import KnowledgeBrowser from './KnowledgeBrowser'
import { AppShell } from '@/app/AppShell'

export const metadata: Metadata = {
  title: 'The Library — OpenCosmos',
  description: 'Every source Cosmo draws from, open to anyone.',
}

const NAV_LINKS = [
  { label: 'Dialog', href: '/dialog' },
  { label: 'Knowledge', href: '/knowledge' },
  { label: 'Studio', href: 'https://studio.opencosmos.ai/docs/getting-started' },
]

export default function KnowledgePage() {
  const docs = getAllDocs()

  return (
    <AppShell activePath="/knowledge">
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
        navLinks={NAV_LINKS}
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

      <div className="max-w-7xl mx-auto px-6 pt-32 pb-24">
        <div className="max-w-2xl mb-16">
          <p className="text-xs uppercase tracking-widest text-foreground/35 mb-4">
            The Library
          </p>
          <h1 className="text-4xl font-light tracking-wide text-foreground mb-6">
            Every source Cosmo draws from,
            <br />
            open to anyone.
          </h1>
          <p className="text-foreground/55 leading-relaxed">
            This is the knowledge corpus — the source texts, wisdom traditions, guides, and
            collections that ground Cosmo&apos;s responses. Nothing is hidden. Browse freely,
            read at your own pace.
          </p>
        </div>

        <KnowledgeBrowser docs={docs} />
      </div>
    </main>
    </AppShell>
  )
}
