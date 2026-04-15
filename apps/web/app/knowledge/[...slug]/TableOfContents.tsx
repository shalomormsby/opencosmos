'use client'

import { useEffect, useRef, useState } from 'react'
import { cn } from '@opencosmos/ui'

export type TocEntry = {
  id: string
  text: string
  depth: 2 | 3
}

type CosmoContext = {
  heading: string
  doc_title: string
  doc_path: string
  timestamp: number
}

type Props = {
  toc: TocEntry[]
  docTitle: string
  docPath: string   // relative knowledge/ path, e.g. "knowledge/sources/foo.md"
}

export default function TableOfContents({ toc, docTitle, docPath }: Props) {
  const [activeId, setActiveId] = useState<string>('')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (toc.length === 0) return

    const headingIds = new Set(toc.map(e => e.id))

    // Track which headings are above the viewport fold so we can determine
    // the "active" one — the last heading that has scrolled past the top.
    const aboveFold = new Set<string>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id
          if (!headingIds.has(id)) continue

          if (entry.isIntersecting) {
            aboveFold.delete(id)
          } else if (entry.boundingClientRect.top < 0) {
            // Heading has scrolled past the top
            aboveFold.add(id)
          }
        }

        // Active = the last heading that scrolled above the fold,
        // or the first TOC entry if nothing has scrolled yet.
        const orderedIds = toc.map(e => e.id)
        let nextActive = ''
        for (const id of orderedIds) {
          if (aboveFold.has(id)) nextActive = id
        }
        setActiveId(nextActive || orderedIds[0] || '')
      },
      { rootMargin: '-64px 0px -80% 0px', threshold: 0 },
    )

    const headings = document.querySelectorAll('h2[id], h3[id]')
    headings.forEach(el => observerRef.current!.observe(el))

    return () => observerRef.current?.disconnect()
  }, [toc])

  // Write active section to sessionStorage whenever it changes so the
  // Cosmo chat at /dialog can pick it up and ground responses in context.
  useEffect(() => {
    if (!activeId) return
    const entry = toc.find(e => e.id === activeId)
    if (!entry) return

    const ctx: CosmoContext = {
      heading: entry.text,
      doc_title: docTitle,
      doc_path: docPath,
      timestamp: Date.now(),
    }
    try {
      sessionStorage.setItem('cosmo_context', JSON.stringify(ctx))
    } catch {
      // sessionStorage unavailable (private browsing, storage full) — non-fatal
    }
  }, [activeId, toc, docTitle, docPath])

  if (toc.length === 0) return null

  return (
    <aside
      aria-label="Document outline"
      className="hidden lg:block sticky top-28 self-start max-h-[calc(100vh-8rem)] overflow-y-auto"
    >
      <p className="text-xs uppercase tracking-widest text-foreground/30 mb-3 font-medium px-2">
        On this page
      </p>
      <ul className="space-y-0.5">
        {toc.map(entry => {
          const isActive = activeId === entry.id
          return (
            <li key={entry.id}>
              <a
                href={`#${entry.id}`}
                className={cn(
                  'block text-sm leading-snug py-1 border-l-2 transition-colors',
                  entry.depth === 3 ? 'pl-4' : 'pl-2',
                  isActive
                    ? 'border-white text-white font-medium'
                    : 'border-transparent text-foreground/40 hover:text-foreground/70 hover:border-foreground/20',
                )}
                onClick={(e) => {
                  e.preventDefault()
                  const el = document.getElementById(entry.id)
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }}
              >
                {entry.text}
              </a>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
