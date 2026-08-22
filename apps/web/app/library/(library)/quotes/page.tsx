import type { Metadata } from 'next'
import { getLibraryItems } from '@/lib/library'
import LibraryBrowser from '../../LibraryBrowser'

export const metadata: Metadata = {
  title: 'Quotes — OpenCosmos',
  description: 'Attributed passages Cosmo can cite, with their provenance shown.',
}

/**
 * A filtered view of the library, not a separate collection — quotes also
 * appear in the main index alongside documents. This page exists because
 * provenance deserves its own framing, and because it is a useful deep link.
 */
export default function QuotesPage() {
  const items = getLibraryItems()

  return (
    <div className="max-w-7xl mx-auto px-6 pt-16 pb-24">
      <div className="max-w-2xl mb-16">
        <p className="text-xs uppercase tracking-widest text-foreground/35 mb-4">The Library</p>
        <h1 className="text-4xl font-light tracking-wide text-foreground mb-6">
          Quotes, and where
          <br />
          they actually came from.
        </h1>
        <div className="space-y-4">
          <p className="text-foreground/55 leading-relaxed">
            Every quote here has been checked for provenance before being allowed into the corpus.
            Each one shows what is actually known about its attribution — a primary source where one
            exists, and honest uncertainty where it doesn&apos;t.
          </p>
          <p className="text-foreground/55 leading-relaxed">
            When Cosmo cites a quote in conversation, it links here, to the record itself. These
            also appear in <a href="/library" className="text-[var(--color-primary)] hover:underline">the
            full library</a> alongside the source texts.
          </p>
        </div>
      </div>

      <LibraryBrowser items={items} only="quote" unit={{ one: 'quote source', many: 'quote sources' }} />
    </div>
  )
}
