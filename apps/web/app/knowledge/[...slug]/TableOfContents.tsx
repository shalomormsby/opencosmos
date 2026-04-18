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
  passage: string
  doc_title: string
  doc_path: string
  timestamp: number
}

type Props = {
  toc: TocEntry[]
  docTitle: string
  docPath: string   // relative knowledge/ path, e.g. "knowledge/sources/foo.md"
}

// Matches scroll-mt-28 (7rem = 112px) on h2/h3 in DocViewer, plus a small
// buffer so the heading registers as "active" the moment it locks into place.
const HEADER_OFFSET = 120

// Cap passage length sent to Cosmo — enough for meaningful grounding without
// ballooning the prompt. Typical paragraphs are 200–600 chars.
const PASSAGE_MAX_CHARS = 800

export default function TableOfContents({ toc, docTitle, docPath }: Props) {
  const [activeId, setActiveId] = useState<string>(toc[0]?.id ?? '')
  const [passage, setPassage] = useState<string>('')
  const headingElsRef = useRef<HTMLElement[]>([])
  const paragraphElsRef = useRef<HTMLElement[]>([])
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (toc.length === 0) return

    // Collect heading elements in document order. Re-collected whenever toc
    // changes (navigation to a new document).
    headingElsRef.current = toc
      .map(e => document.getElementById(e.id))
      .filter((el): el is HTMLElement => el !== null)

    // Collect paragraph elements inside the doc content wrapper so we can
    // report the user's current passage back to Cosmo.
    const container = document.querySelector('[data-doc-content]')
    paragraphElsRef.current = container
      ? Array.from(container.querySelectorAll('p')) as HTMLElement[]
      : []

    function updateActive() {
      const els = headingElsRef.current
      if (els.length === 0) return

      // Walk every heading in order. The last one whose top edge sits at or
      // above the threshold is the section currently being read.
      let next = els[0].id
      for (const el of els) {
        if (el.getBoundingClientRect().top <= HEADER_OFFSET) {
          next = el.id
        }
      }
      setActiveId(next)

      // Find the paragraph currently under the reading threshold. Prefer a
      // paragraph that straddles the line; otherwise fall back to the last
      // one whose top has passed it.
      const paragraphs = paragraphElsRef.current
      let chosen: HTMLElement | null = null
      for (const p of paragraphs) {
        const rect = p.getBoundingClientRect()
        if (rect.top <= HEADER_OFFSET && rect.bottom > HEADER_OFFSET) {
          chosen = p
          break
        }
      }
      if (!chosen) {
        for (let i = paragraphs.length - 1; i >= 0; i--) {
          if (paragraphs[i].getBoundingClientRect().top <= HEADER_OFFSET) {
            chosen = paragraphs[i]
            break
          }
        }
      }
      const text = chosen?.textContent?.trim() ?? ''
      setPassage(text.length > PASSAGE_MAX_CHARS ? text.slice(0, PASSAGE_MAX_CHARS) + '…' : text)
    }

    function onScroll() {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(updateActive)
    }

    // Seed the initial state before the user scrolls.
    updateActive()

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafRef.current)
    }
  }, [toc])

  // Write active section + current passage to sessionStorage whenever either
  // changes so the Cosmo chat at /dialog can pick it up and ground responses.
  useEffect(() => {
    if (!activeId) return
    const entry = toc.find(e => e.id === activeId)
    if (!entry) return

    const ctx: CosmoContext = {
      heading: entry.text,
      passage,
      doc_title: docTitle,
      doc_path: docPath,
      timestamp: Date.now(),
    }
    try {
      sessionStorage.setItem('cosmo_context', JSON.stringify(ctx))
    } catch {
      // sessionStorage unavailable (private browsing, storage full) — non-fatal
    }
  }, [activeId, passage, toc, docTitle, docPath])

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
