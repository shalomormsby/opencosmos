import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Badge, Separator } from '@opencosmos/ui'
import { getQuoteBucket, getQuoteBuckets, type QuoteRecord } from '@/lib/quotes'

type Props = {
  params: Promise<{ bucket: string }>
}

export async function generateStaticParams() {
  return getQuoteBuckets().map((b) => ({ bucket: b.bucket }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { bucket } = await params
  const detail = getQuoteBucket(bucket)
  if (!detail) return {}
  return {
    title: `${detail.label} — Quotes — OpenCosmos`,
    description: `${detail.count} attributed ${detail.count === 1 ? 'quote' : 'quotes'} from ${detail.label}, with provenance.`,
  }
}

/**
 * What is actually known about this attribution. `verified` means a primary
 * source is named; `attributed` means strong secondary evidence and no more.
 * The distinction is the whole point of the substrate, so it stays visible.
 */
function ProvenanceBadge({ quote }: { quote: QuoteRecord }) {
  const { status, confidence, reviewed_by_human } = quote.provenance
  const label = status === 'verified' ? 'Verified' : status === 'attributed' ? 'Attributed' : status
  const detail = [
    confidence != null ? `confidence ${confidence.toFixed(2)}` : null,
    reviewed_by_human ? 'reviewed by hand' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <Badge variant={status === 'verified' ? 'secondary' : 'outline'} size="sm" title={detail || undefined}>
      {label}
    </Badge>
  )
}

export default async function QuoteBucketPage({ params }: Props) {
  const { bucket } = await params
  const detail = getQuoteBucket(bucket)

  if (!detail) notFound()

  return (
    <div className="max-w-3xl mx-auto px-6 pt-16 pb-24">
      {/* Breadcrumb — Link-based for the same reason as the doc pages: the
          shared Breadcrumbs component renders a plain <a> and would reload
          the page, remounting the chat sidebar. */}
      <nav aria-label="Breadcrumb" className="mb-10">
        <ol className="flex items-center flex-nowrap list-none m-0 p-0 text-sm overflow-x-auto scrollbar-hide">
          {[
            { label: 'The Library', href: '/knowledge' },
            { label: 'Quotes', href: '/knowledge/quotes' },
            { label: detail.label },
          ].map((item, i, arr) => {
            const isLast = i === arr.length - 1
            return (
              <li key={i} className="flex items-center flex-shrink-0">
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-[var(--color-primary)] hover:bg-[var(--color-text-primary)] hover:text-[var(--color-background)] font-medium px-1.5 py-1.5 -mx-1.5 -my-1.5 rounded transition-colors duration-150 active:scale-95"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span className="text-foreground/50">{item.label}</span>
                )}
                {!isLast && <span className="mx-2 text-foreground/25">/</span>}
              </li>
            )
          })}
        </ol>
      </nav>

      <header className="mb-12">
        <h1 className="text-3xl font-light tracking-wide text-foreground mb-3">{detail.label}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-foreground/45">
          {detail.tradition && <Badge variant="secondary" size="sm">{detail.tradition}</Badge>}
          <span>
            {detail.count} {detail.count === 1 ? 'quote' : 'quotes'}
          </span>
        </div>
      </header>

      <Separator className="mb-12" />

      <div className="space-y-12">
        {detail.quotes.map((q) => (
          /* scroll-mt clears the fixed header when a #q_id deeplink lands here.
             The :target styles live in globals.css so the cited quote is
             briefly obvious without any client JS. */
          <article key={q.id} id={q.id} className="scroll-mt-28 quote-record">
            <blockquote className="border-l-2 border-foreground/15 pl-5">
              <p className="text-lg font-light leading-relaxed text-foreground/90">{q.text}</p>
            </blockquote>

            <div className="mt-4 pl-5 flex flex-wrap items-center gap-2">
              <ProvenanceBadge quote={q} />
              {q.category && (
                <span className="text-xs text-foreground/35">{q.category}</span>
              )}
              {/* The same keywords the embedding pipeline folds into this
                  quote's vector — shown so a reader can see why Cosmo
                  surfaced it, and search the index by the same handles. */}
              {q.keywords.map((k) => (
                <span
                  key={k}
                  className="text-xs text-foreground/40 px-2 py-0.5 rounded-full border border-foreground/10"
                >
                  {k}
                </span>
              ))}
            </div>

            {q.provenance.earliest_print_source && (
              <p className="mt-3 pl-5 text-xs text-foreground/45 leading-relaxed">
                <span className="text-foreground/30">Source: </span>
                {q.provenance.earliest_print_source}
              </p>
            )}

            {q.provenance.notes && (
              <p className="mt-2 pl-5 text-xs text-foreground/35 leading-relaxed">
                {q.provenance.notes}
              </p>
            )}

            {q.provenance.wikiquote_url && (
              <p className="mt-2 pl-5 text-xs">
                <a
                  href={q.provenance.wikiquote_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  Wikiquote
                </a>
              </p>
            )}
          </article>
        ))}
      </div>
    </div>
  )
}
