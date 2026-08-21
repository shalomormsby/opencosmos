import Link from 'next/link'

/**
 * Reached when a citation points at a quote record that isn't in the corpus.
 *
 * Cosmo is told to cite only the exact tokens handed to it in retrieved
 * context, so this should be rare — but a stale link from an older
 * conversation, or a quote since archived in review, can still land here.
 * Better to say so plainly and offer the way back than to show a bare 404.
 */
export default function QuoteNotFound() {
  return (
    <div className="max-w-3xl mx-auto px-6 pt-16 pb-24">
      <nav aria-label="Breadcrumb" className="mb-10">
        <ol className="flex items-center list-none m-0 p-0 text-sm">
          <li className="flex items-center">
            <Link
              href="/knowledge"
              className="text-[var(--color-primary)] hover:bg-[var(--color-text-primary)] hover:text-[var(--color-background)] font-medium px-1.5 py-1.5 -mx-1.5 -my-1.5 rounded transition-colors duration-150"
            >
              The Library
            </Link>
            <span className="mx-2 text-foreground/25">/</span>
          </li>
          <li className="text-foreground/50">Quotes</li>
        </ol>
      </nav>

      <h1 className="text-3xl font-light tracking-wide text-foreground mb-4">
        That quote isn&apos;t in the collection.
      </h1>
      <p className="text-foreground/55 leading-relaxed mb-8 max-w-xl">
        The link points at a record this corpus doesn&apos;t hold. It may have been archived during
        provenance review, or the citation may be from an older conversation.
      </p>
      <Link
        href="/knowledge/quotes"
        className="text-[var(--color-primary)] hover:underline text-sm"
      >
        Browse all quotes →
      </Link>
    </div>
  )
}
