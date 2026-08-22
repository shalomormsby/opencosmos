'use client'

import { useEffect } from 'react'

/**
 * Tells the sidebar Cosmo (and the constellation's focus logic) which quote
 * record the reader has open.
 *
 * `cosmo_context` was only ever written by TableOfContents, which only document
 * pages render — so on a quote page Cosmo was still holding the last markdown
 * doc the reader visited. You could be looking at Marcus Aurelius while Cosmo
 * believed you were in the Dhammapada.
 *
 * The shape matches what TableOfContents writes and what useCosmoSession reads
 * — `doc_path` is the corpus path, so the chat route can resolve it the same
 * way it resolves a markdown document.
 */
export default function QuoteContext({ bucket, label }: { bucket: string; label: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(
        'cosmo_context',
        JSON.stringify({
          doc_path: `knowledge/quotes/${bucket}.yaml`,
          doc_title: label,
          heading: 'Quotes',
          timestamp: Date.now(),
        }),
      )
    } catch {
      // Private browsing or a full quota — the sidebar simply stays generic.
    }
  }, [bucket, label])

  return null
}
