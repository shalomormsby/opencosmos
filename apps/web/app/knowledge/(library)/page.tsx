import type { Metadata } from 'next'
import { getAllDocs } from '@/lib/knowledge'
import KnowledgeBrowser from '../KnowledgeBrowser'

export const metadata: Metadata = {
  title: 'The Library — OpenCosmos',
  description: 'Every source Cosmo draws from, open to anyone.',
}

export default function KnowledgePage() {
  const docs = getAllDocs()

  return (
    <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
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
  )
}
