import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Header, Button, Badge, Separator, GitHubIcon, Breadcrumbs } from '@opencosmos/ui'
import { getDoc, getAllDocs } from '@/lib/knowledge'
import { CATEGORY_LABELS } from '@/lib/knowledge-meta'
import DocViewer from './DocViewer'

type Props = {
  params: Promise<{ slug: string[] }>
}

export async function generateStaticParams() {
  const docs = getAllDocs()
  return docs.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const doc = getDoc(slug)
  if (!doc) return {}
  return {
    title: `${doc.title} — OpenCosmos`,
    description: doc.summary || undefined,
  }
}

const NAV_LINKS = [
  { label: 'Dialog', href: '/chat' },
  { label: 'Knowledge', href: '/knowledge' },
  { label: 'Studio', href: 'https://studio.opencosmos.ai' },
]

export default async function DocPage({ params }: Props) {
  const { slug } = await params
  const doc = getDoc(slug)

  if (!doc) notFound()

  const hasAttribution = doc.author || doc.era || doc.tradition || doc.origin_date

  return (
    <main className="min-h-screen bg-background">
      <Header
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

      <div className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        {/* Breadcrumb */}
        <Breadcrumbs
          variant="bold"
          items={[
            { label: 'The Library', href: '/knowledge' },
            { label: CATEGORY_LABELS[doc.category] ?? doc.category, href: '/knowledge' },
            { label: doc.title },
          ]}
          className="mb-10"
        />

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-6">
          {doc.domain && <Badge variant="secondary">{doc.domain}</Badge>}
          {doc.format && <Badge variant="outline">{doc.format}</Badge>}
          {doc.complexity && (
            <Badge variant="outline" className="text-foreground/50">
              {doc.complexity}
            </Badge>
          )}
        </div>

        {/* Title */}
        <h1 className="text-3xl font-light tracking-wide text-foreground mb-4 leading-tight">
          {doc.title}
        </h1>

        {/* Attribution */}
        {hasAttribution && (
          <p className="text-sm text-foreground/40 mb-6 flex flex-wrap gap-x-2">
            {doc.author && <span>{doc.author}</span>}
            {doc.origin_date && <span>· {doc.origin_date}</span>}
            {doc.tradition && <span>· {doc.tradition}</span>}
            {doc.era && !doc.origin_date && <span>· {doc.era}</span>}
          </p>
        )}

        {/* Summary */}
        {doc.summary && (
          <p className="text-lg font-light text-foreground/60 leading-relaxed mb-10">
            {doc.summary}
          </p>
        )}

        <Separator className="mb-10" />

        {/* Content */}
        <DocViewer content={doc.content} />

        {/* Tags */}
        {doc.tags.length > 0 && (
          <div className="mt-16 flex flex-wrap gap-2">
            {doc.tags.map((tag) => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-foreground/5 text-xs text-foreground/40"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Related documents */}
        {doc.related_docs && doc.related_docs.length > 0 && (
          <div className="mt-12 pt-8 border-t border-foreground/10">
            <p className="text-xs uppercase tracking-widest text-foreground/30 mb-4">
              Related
            </p>
            <div className="flex flex-col gap-2">
              {doc.related_docs.map((rel) => {
                const parts = rel.replace('.md', '').split('/')
                const href = '/knowledge/' + parts.join('/')
                const label = parts[parts.length - 1]?.replace(/-/g, ' ') ?? rel
                return (
                  <Link
                    key={rel}
                    href={href}
                    className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors"
                  >
                    {label} →
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
