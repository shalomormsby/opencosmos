'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Button, Badge, Input, Card, cn } from '@opencosmos/ui'
import Link from 'next/link'
import type { LibraryItem, LibraryItemKind, QuoteSearchEntry } from '@/lib/library'
import { CATEGORY_LABELS, ROLE_LABELS } from '@/lib/knowledge-meta'

type Props = {
  items: LibraryItem[]
  /** Restrict to one kind (the quotes-only view). Omit for the whole library. */
  only?: LibraryItemKind
  /** Noun for the count line when restricted, e.g. 'quote source'. */
  unit?: { one: string; many: string }
}

/** Where the lazy quote full-text index lives. See app/(library)/search-index. */
const SEARCH_INDEX_URL = '/library/search-index'

/** Below this, matching is noise rather than signal. */
const MIN_QUERY = 2

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export default function LibraryBrowser({ items, only, unit }: Props) {
  const [search, setSearch] = useState('')
  const [activeRole, setActiveRole] = useState<string | null>(null)
  const [activeFacet, setActiveFacet] = useState<string | null>(null)

  // Tier 2: quote full-text, fetched once on first interaction with the search
  // box. Until it lands, matching runs on metadata alone — never blocking.
  const [quoteIndex, setQuoteIndex] = useState<QuoteSearchEntry[] | null>(null)
  const indexRequested = useRef(false)

  function loadSearchIndex() {
    if (indexRequested.current) return
    indexRequested.current = true
    fetch(SEARCH_INDEX_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (Array.isArray(data)) setQuoteIndex(data) })
      .catch(() => { /* metadata search still works; nothing to surface */ })
  }

  const scoped = useMemo(
    () => (only ? items.filter((i) => i.kind === only) : items),
    [items, only],
  )

  /**
   * Assembled here rather than shipped pre-joined: title, subtitle and blurb are
   * already in the payload to be rendered, so sending them a second time as a
   * search string would duplicate every summary across 288 cards.
   */
  const haystacks = useMemo(() => {
    const map = new Map<string, string>()
    for (const i of scoped) {
      map.set(
        i.href,
        [i.title, i.subtitle, i.blurb, i.facet, i.category, i.terms]
          .filter(Boolean)
          .join(' ')
          .toLowerCase(),
      )
    }
    return map
  }, [scoped])

  const roles = useMemo(
    () => Array.from(new Set(scoped.map((i) => i.role).filter(Boolean))).sort(),
    [scoped],
  )

  const facets = useMemo(
    () => Array.from(new Set(scoped.map((i) => i.facet).filter((f): f is string => !!f))).sort(),
    [scoped],
  )

  const query = search.trim().toLowerCase()
  const active = query.length >= MIN_QUERY

  /**
   * Quote text matches, keyed by bucket. Word-boundary matched so a short
   * query like "art" doesn't pull in every "heart" — titles and names keep
   * substring matching, where partials are genuinely useful.
   */
  const quoteHits = useMemo(() => {
    if (!active || !quoteIndex) return null
    const re = new RegExp(`\\b${escapeRegExp(query)}`, 'i')
    const hits = new Map<string, { id: string; text: string }>() // bucket -> first match
    for (const e of quoteIndex) {
      if (!hits.has(e.b) && re.test(e.t)) hits.set(e.b, { id: e.i, text: e.t })
    }
    return hits
  }, [active, query, quoteIndex])

  const filtered = useMemo(() => {
    return scoped.filter((item) => {
      if (activeRole && item.role !== activeRole) return false
      if (activeFacet && item.facet !== activeFacet) return false
      if (!active) return true
      if (haystacks.get(item.href)?.includes(query)) return true
      // Tier 2 fallback: the query may match the text of one of this author's
      // quotes even though none of its metadata mentions it.
      return Boolean(item.bucket && quoteHits?.has(item.bucket))
    })
  }, [scoped, activeRole, activeFacet, active, query, quoteHits, haystacks])

  const isFiltered = Boolean(activeRole || activeFacet || search)

  const counts = useMemo(() => {
    const docs = filtered.filter((i) => i.kind === 'doc').length
    const quotes = filtered.filter((i) => i.kind === 'quote').length
    return { docs, quotes }
  }, [filtered])

  /**
   * Mixed units, stated honestly. "178" that reads as quotes when it means
   * authors would be a subtler lie than the silo this replaces.
   */
  function countLine(): string {
    if (unit) {
      const n = filtered.length
      return `${n} ${n === 1 ? unit.one : unit.many}${isFiltered ? ' matching' : ''}`
    }
    const parts: string[] = []
    if (counts.docs) parts.push(`${counts.docs} ${counts.docs === 1 ? 'work' : 'works'}`)
    if (counts.quotes) parts.push(`${counts.quotes} quote ${counts.quotes === 1 ? 'source' : 'sources'}`)
    if (parts.length === 0) return 'Nothing matching'
    return parts.join(' · ') + (isFiltered ? ' matching' : ' in the corpus')
  }

  return (
    <div>
      <div className="mb-6">
        <Input
          type="search"
          placeholder="Search by title, author, theme, or quote…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={loadSearchIndex}
          className="max-w-sm"
        />
      </div>

      {/* Type filters */}
      {roles.length > 1 && (
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
      )}

      {/* Tradition filters */}
      {facets.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-10">
          {facets.map((facet) => (
            <button
              key={facet}
              onClick={() => setActiveFacet(activeFacet === facet ? null : facet)}
              className={cn(
                'px-3 py-1 rounded-full text-xs transition-colors border',
                activeFacet === facet
                  ? 'bg-foreground text-background border-foreground'
                  : 'bg-transparent text-foreground/50 border-foreground/10 hover:border-foreground/30 hover:text-foreground/70',
              )}
            >
              {facet}
            </button>
          ))}
        </div>
      )}

      <p className="text-sm text-foreground/40 mb-6">{countLine()}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item) => {
          // When the match came from a quote's text, show THAT quote and link
          // straight to it — otherwise the card previews an unrelated line and
          // the reader can't tell why it appeared.
          const hit = item.bucket ? quoteHits?.get(item.bucket) : undefined
          const href = hit ? `${item.href}#${hit.id}` : item.href
          const blurb = hit ? `“${hit.text}”` : item.blurb

          return (
            <Link key={item.href} href={href} className="block group">
              <Card className="h-full p-5 transition-colors hover:bg-foreground/[0.02]">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex flex-wrap gap-1.5">
                    {item.badges.map((b, i) => (
                      <Badge key={b} variant={i === 0 ? 'secondary' : 'outline'} size="sm">
                        {b}
                      </Badge>
                    ))}
                  </div>
                  <span className="text-xs text-foreground/30 shrink-0 pt-0.5">
                    {ROLE_LABELS[item.role] ?? item.role}
                  </span>
                </div>

                <h3 className="text-sm font-medium text-foreground mb-2 leading-snug">
                  {item.title}
                </h3>

                {item.subtitle && (
                  <p className="text-xs text-foreground/40 mb-2">{item.subtitle}</p>
                )}

                {blurb && (
                  <p
                    className={cn(
                      'text-xs leading-relaxed line-clamp-3',
                      item.kind === 'quote' ? 'text-foreground/55 italic' : 'text-foreground/50',
                    )}
                  >
                    {blurb}
                  </p>
                )}

                <div className="mt-3 text-xs text-foreground/25">
                  {CATEGORY_LABELS[item.category] ?? item.category}
                </div>
              </Card>
            </Link>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-20 text-foreground/30">
          <p className="text-sm">Nothing matches your search.</p>
          {isFiltered && (
            <button
              onClick={() => {
                setSearch('')
                setActiveRole(null)
                setActiveFacet(null)
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
