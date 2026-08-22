'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Badge, Card, Input, cn } from '@opencosmos/ui'
import type { QuoteBucket } from '@/lib/quotes'

type Props = {
  buckets: QuoteBucket[]
  total: number
}

export default function QuoteBrowser({ buckets, total }: Props) {
  const [search, setSearch] = useState('')
  const [activeTradition, setActiveTradition] = useState<string | null>(null)

  const traditions = useMemo(
    () => Array.from(new Set(buckets.map((b) => b.tradition).filter(Boolean) as string[])).sort(),
    [buckets],
  )

  const filtered = useMemo(() => {
    return buckets.filter((b) => {
      if (activeTradition && b.tradition !== activeTradition) return false
      if (!search) return true
      // Match the way Cosmo retrieves — by theme as well as by name. Keywords
      // and categories are already folded into each quote's embedding; this
      // gives a person the same handle.
      const q = search.toLowerCase()
      return (
        b.label.toLowerCase().includes(q) ||
        b.tradition?.toLowerCase().includes(q) ||
        b.keywords.some((k) => k.toLowerCase().includes(q)) ||
        b.categories.some((c) => c.toLowerCase().includes(q))
      )
    })
  }, [buckets, activeTradition, search])

  const shown = filtered.reduce((n, b) => n + b.count, 0)
  const isFiltered = Boolean(activeTradition || search)

  return (
    <div>
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search by author, theme, or keyword…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {traditions.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {traditions.map((tradition) => (
            <button
              key={tradition}
              onClick={() => setActiveTradition(activeTradition === tradition ? null : tradition)}
              className={cn(
                'px-3 py-1 rounded-full text-xs transition-colors border',
                activeTradition === tradition
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-foreground/50 border-foreground/10 hover:border-foreground/30 hover:text-foreground/70',
              )}
            >
              {tradition}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-foreground/40 mb-6">
        {shown} {shown === 1 ? 'quote' : 'quotes'} from {filtered.length}{' '}
        {filtered.length === 1 ? 'source' : 'sources'}
        {isFiltered ? ` (of ${total} in the corpus)` : ' in the corpus'}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((b) => (
          <Link key={b.href} href={b.href} className="block group">
            <Card className="h-full p-5 transition-colors hover:bg-foreground/[0.02]">
              <div className="flex items-start justify-between gap-2 mb-3">
                {b.tradition ? (
                  <Badge variant="secondary" size="sm">
                    {b.tradition}
                  </Badge>
                ) : (
                  <span />
                )}
                <span className="text-xs text-foreground/30 shrink-0 pt-0.5">
                  {b.count} {b.count === 1 ? 'quote' : 'quotes'}
                </span>
              </div>
              <h3 className="text-sm font-medium text-foreground leading-snug">{b.label}</h3>
              {b.isCollective && (
                <p className="text-xs text-foreground/40 mt-2">Collective source</p>
              )}
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="text-sm text-foreground/40 py-12 text-center">
          No sources match that search.
        </p>
      )}
    </div>
  )
}
