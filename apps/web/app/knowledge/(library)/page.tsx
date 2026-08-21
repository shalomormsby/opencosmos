import type { Metadata } from 'next'
import Link from 'next/link'
import { Card } from '@opencosmos/ui'
import { getAllDocs } from '@/lib/knowledge'
import { getQuoteBuckets } from '@/lib/quotes'
import KnowledgeBrowser from '../KnowledgeBrowser'

export const metadata: Metadata = {
  title: 'The Library — OpenCosmos',
  description: 'Every source Cosmo draws from, open to everyone.',
}

export default function KnowledgePage() {
  const docs = getAllDocs()
  const quoteBuckets = getQuoteBuckets()
  const quoteCount = quoteBuckets.reduce((n, b) => n + b.count, 0)

  return (
    <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
      <div className="max-w-2xl mb-16">
        <p className="text-xs uppercase tracking-widest text-foreground/35 mb-4">
          The Library
        </p>
        <h1 className="text-4xl font-light tracking-wide text-foreground mb-6">
          Every source Cosmo draws from,
          <br />
          open to everyone.
        </h1>
        <div className="space-y-4">
          <p className="text-foreground/55 leading-relaxed">
            This is the knowledge corpus — the source texts, wisdom traditions, guides, and
            collections that ground Cosmo&apos;s responses. Nothing is hidden. Browse freely,
            read at your own pace.
          </p>
          <p className="text-foreground/55 leading-relaxed">
            Cosmo&apos;s knowledge corpus includes these curated gems of wisdom from the public domain.
            Open the left sidebar to explore and discuss with Cosmo, in the context of each work.
          </p>
        </div>
      </div>

      {quoteCount > 0 && (
        <Link href="/knowledge/quotes" className="block group mb-12">
          <Card className="p-5 transition-colors hover:bg-foreground/[0.02]">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-sm font-medium text-foreground mb-1">Quotes</h2>
                <p className="text-xs text-foreground/50 leading-relaxed">
                  Attributed passages Cosmo can cite, each shown with what is actually known about
                  where it came from.
                </p>
              </div>
              <span className="text-xs text-foreground/30 shrink-0">
                {quoteCount} from {quoteBuckets.length} sources →
              </span>
            </div>
          </Card>
        </Link>
      )}

      <KnowledgeBrowser docs={docs} />
    </div>
  )
}
