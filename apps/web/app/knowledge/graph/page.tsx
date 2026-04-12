import type { Metadata } from 'next'
import Link from 'next/link'
import { Redis } from '@upstash/redis'
import { Header, Button, GitHubIcon } from '@opencosmos/ui'
import { AppShell } from '@/app/AppShell'
import type { KnowledgePreviewData } from '@opencosmos/ui/knowledge-graph'
import { GraphPageClient } from './GraphPageClient'

export const metadata: Metadata = {
  title: 'Knowledge Graph — OpenCosmos',
  description: 'A living map of the ideas, traditions, and connections in the OpenCosmos knowledge corpus.',
}

const NAV_LINKS = [
  { label: 'Dialog',    href: '/dialog' },
  { label: 'Knowledge', href: '/knowledge' },
  { label: 'Studio',    href: 'https://studio.opencosmos.ai/docs/getting-started' },
]

async function getPreviewData(): Promise<KnowledgePreviewData | null> {
  try {
    const redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
    return await redis.get<KnowledgePreviewData>('knowledge:graph:preview')
  } catch {
    return null
  }
}

export default async function GraphPage() {
  const preview = await getPreviewData()

  return (
    <AppShell activePath="/knowledge">
      <div className="flex flex-col h-screen bg-background overflow-hidden">
        {/* Header */}
        <Header
          sticky={false}
          className="shrink-0 z-40 border-b border-border/30"
          logo={
            <Link href="/" className="text-xl font-bold tracking-tight text-foreground">
              OpenCosmos
            </Link>
          }
          navAlignment="right"
          navLinks={NAV_LINKS}
          actions={
            <div className="flex items-center gap-3">
              <Link
                href="/knowledge"
                className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
              >
                ← The Library
              </Link>
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
            </div>
          }
        />

        {/* Full-bleed graph canvas */}
        <div className="flex-1 relative overflow-hidden">
          <GraphPageClient preview={preview} />
        </div>
      </div>
    </AppShell>
  )
}
