'use client'

import { useState, useMemo } from 'react'
import { Button, Badge, Input, Card, cn } from '@opencosmos/ui'
import Link from 'next/link'
import type { KnowledgeDocMeta } from '@/lib/knowledge'
import { CATEGORY_LABELS, ROLE_LABELS } from '@/lib/knowledge-meta'

type Props = {
  docs: KnowledgeDocMeta[]
}

export default function KnowledgeBrowser({ docs }: Props) {
  const [search, setSearch] = useState('')
  const [activeRole, setActiveRole] = useState<string | null>(null)
  const [activeDomain, setActiveDomain] = useState<string | null>(null)

  const roles = useMemo(() => {
    return Array.from(new Set(docs.map((d) => d.role).filter(Boolean))).sort()
  }, [docs])

  const domains = useMemo(() => {
    return Array.from(new Set(docs.map((d) => d.domain).filter(Boolean))).sort()
  }, [docs])

  const filtered = useMemo(() => {
    return docs.filter((doc) => {
      if (activeRole && doc.role !== activeRole) return false
      if (activeDomain && doc.domain !== activeDomain) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.summary.toLowerCase().includes(q) ||
          doc.tags.some((t) => t.toLowerCase().includes(q)) ||
          doc.domain.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [docs, activeRole, activeDomain, search])

  const isFiltered = Boolean(activeRole || activeDomain || search)

  return (
    <div>
      {/* Search */}
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search by title, topic, or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Role filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant={activeRole === null ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => setActiveRole(null)}
        >
          All types
        </Button>
        {roles.map((role) => (
          <Button
            key={role}
            variant={activeRole === role ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setActiveRole(activeRole === role ? null : role)}
          >
            {ROLE_LABELS[role] ?? role}
          </Button>
        ))}
      </div>

      {/* Domain filters */}
      <div className="flex flex-wrap gap-2 mb-10">
        {domains.map((domain) => (
          <button
            key={domain}
            onClick={() => setActiveDomain(activeDomain === domain ? null : domain)}
            className={cn(
              'px-3 py-1 rounded-full text-xs transition-colors border',
              activeDomain === domain
                ? 'bg-foreground text-background border-foreground'
                : 'bg-transparent text-foreground/50 border-foreground/10 hover:border-foreground/30 hover:text-foreground/70'
            )}
          >
            {domain}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p className="text-sm text-foreground/40 mb-6">
        {filtered.length} {filtered.length === 1 ? 'document' : 'documents'}
        {isFiltered ? ' matching' : ' in the corpus'}
      </p>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((doc) => (
          <Link key={doc.href} href={doc.href} className="block group">
            <Card className="h-full p-5 transition-colors hover:bg-foreground/[0.02]">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex flex-wrap gap-1.5">
                  {doc.domain && (
                    <Badge variant="secondary" size="sm">
                      {doc.domain}
                    </Badge>
                  )}
                  {doc.format && (
                    <Badge variant="outline" size="sm">
                      {doc.format}
                    </Badge>
                  )}
                </div>
                {doc.role && (
                  <span className="text-xs text-foreground/30 shrink-0 pt-0.5">
                    {ROLE_LABELS[doc.role] ?? doc.role}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-medium text-foreground mb-2 leading-snug">
                {doc.title}
              </h3>

              {doc.author && (
                <p className="text-xs text-foreground/40 mb-2">{doc.author}</p>
              )}

              {doc.summary && (
                <p className="text-xs text-foreground/50 leading-relaxed line-clamp-3">
                  {doc.summary}
                </p>
              )}

              <div className="mt-3 text-xs text-foreground/25">
                {CATEGORY_LABELS[doc.category] ?? doc.category}
              </div>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-foreground/30">
          <p className="text-sm">No documents match your search.</p>
          {isFiltered && (
            <button
              onClick={() => {
                setSearch('')
                setActiveRole(null)
                setActiveDomain(null)
              }}
              className="mt-3 text-xs text-foreground/40 hover:text-foreground/60 transition-colors underline underline-offset-2"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  )
}
