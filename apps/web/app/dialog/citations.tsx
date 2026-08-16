'use client'

import { defaultUrlTransform, type Components } from 'react-markdown'
import { cn } from '@opencosmos/ui'

/**
 * Cosmo's structured citation tokens, and how they're rendered.
 *
 * Two forms, both taught to Cosmo in `lib/rag.ts`:
 *
 *   [quote: knowledge/quotes/{author}.yaml#{quote-id}]   an attributed passage
 *   [ref: knowledge/sources/{work}.md#{section-slug}]    a work or a section of one
 *
 * Both are pre-processed into markdown links so the `a` override below can turn
 * them into small superscript markers — the prose keeps flowing, and each claim
 * still carries its receipt.
 *
 * This module is shared: `/dialog` renders through `CosmoChat`, while
 * `/knowledge`, `/knowledge/graph`, and `/inception` render through `ChatPanel`.
 * They must render citations identically, so neither surface owns this.
 */

const QUOTE_TOKEN_RE = /\[quote:\s*([^\]]+?)\]/g
const REF_TOKEN_RE   = /\[ref:\s*([^\]]+?)\]/g

/** Marks a pre-processed `[ref:]` link so the renderer can tell it from prose. */
const REF_SCHEME = 'cosmo-ref:'

/**
 * react-markdown sanitizes hrefs through `defaultUrlTransform`, which allows
 * only http, https, irc, ircs, mailto and xmpp — anything else with a scheme is
 * rewritten to the empty string. `cosmo-ref:` is not on that list, so without
 * this the marker below was silently erased before `citationAnchor` ever saw it,
 * the scheme test failed, and every passage citation rendered as `<a href="">`
 * — which the browser resolves to the current page. Citations appeared to work
 * and quietly reloaded /dialog instead of opening the passage.
 *
 * Quote tokens were unaffected: they carry a relative path with no scheme.
 *
 * Pass this to every <ReactMarkdown> that uses `chatMarkdownComponents`.
 */
export function citationUrlTransform(url: string): string {
  if (url.startsWith(REF_SCHEME)) return url
  return defaultUrlTransform(url)
}

const GITHUB_BLOB = 'https://github.com/shalomormsby/opencosmos/blob/main'

export function preprocessCitations(content: string): string {
  return content
    .replace(QUOTE_TOKEN_RE, (_m, ref: string) => `[↗](${ref.trim()})`)
    .replace(REF_TOKEN_RE,   (_m, ref: string) => `[↗](${REF_SCHEME}${ref.trim()})`)
}

/**
 * Every citation target in a message, in the order Cosmo emitted them, as the
 * repo-relative paths the constellation generator keys its nodes on. Used to
 * light up the corresponding nodes when the graph is on screen.
 *
 * Deduplicated — a response that leans on one passage three times should light
 * one node, not queue three.
 */
export function extractCitationTargets(content: string): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const re of [QUOTE_TOKEN_RE, REF_TOKEN_RE]) {
    // Both regexes are /g and module-level, so reset lastIndex before reuse.
    re.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = re.exec(content)) !== null) {
      const target = m[1]?.trim()
      if (target && !seen.has(target)) {
        seen.add(target)
        out.push(target)
      }
    }
  }
  return out
}

/** `knowledge/sources/x.md#slug` → `/knowledge/sources/x#slug`. */
function refToHref(ref: string): string | null {
  const hash = ref.indexOf('#')
  const path = hash === -1 ? ref : ref.slice(0, hash)
  const anchor = hash === -1 ? '' : ref.slice(hash + 1)
  if (!path.startsWith('knowledge/') || path.includes('..')) return null
  const inner = path.replace(/^knowledge\//, '').replace(/\.md$/, '')
  if (inner.split('/').filter(Boolean).length < 2) return null
  return `/knowledge/${inner}${anchor ? `#${anchor}` : ''}`
}

function CitationMarker({
  href,
  title,
  external,
  children,
}: {
  href: string
  title: string
  external: boolean
  children: React.ReactNode
}) {
  return (
    <sup>
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        title={title}
        className="ml-0.5 text-foreground/40 text-xs hover:text-foreground/70 transition-colors"
      >
        {children}
      </a>
    </sup>
  )
}

/**
 * The `a` renderer shared by both chat surfaces. Quote citations open the yaml
 * record on GitHub (quotes have no reader page); work/section citations link
 * into the library, landing on the passage itself when a section is named.
 */
export const citationAnchor: NonNullable<Components['a']> = ({ href, children }) => {
  if (href?.startsWith('knowledge/quotes/')) {
    const filePath = href.split('#')[0]
    return (
      <CitationMarker href={`${GITHUB_BLOB}/${filePath}`} title={href} external>
        {children}
      </CitationMarker>
    )
  }

  if (href?.startsWith(REF_SCHEME)) {
    const ref = href.slice(REF_SCHEME.length)
    const internal = refToHref(ref)
    // An unresolvable ref (Cosmo naming a path that isn't in the corpus) is
    // dropped rather than rendered as a dead link.
    if (!internal) return null
    return (
      <CitationMarker href={internal} title={ref} external={false}>
        {children}
      </CitationMarker>
    )
  }

  return (
    <a
      href={href}
      target={href?.startsWith('http') ? '_blank' : undefined}
      rel={href?.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="underline underline-offset-2 hover:text-foreground/60 transition-colors"
    >
      {children}
    </a>
  )
}

/**
 * Markdown component map for chat bubbles. Tighter than DocViewer's — bubbles
 * use text-sm and shouldn't carry article-style vertical rhythm. `last:mb-0`
 * prevents trailing whitespace inside the bubble.
 */
export const chatMarkdownComponents: Components = {
  p: ({ children }) => <p className="mb-3 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: citationAnchor,
  ul: ({ children }) => <ul className="list-disc list-outside pl-5 mb-3 last:mb-0 space-y-1">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal list-outside pl-5 mb-3 last:mb-0 space-y-1">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-foreground/20 pl-4 my-3 text-foreground/70 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isBlock = Boolean(className?.startsWith('language-'))
    return (
      <code className={cn('font-mono', isBlock ? className : 'px-1 py-0.5 rounded text-xs bg-foreground/5')}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="bg-foreground/5 rounded-lg p-3 overflow-x-auto mb-3 last:mb-0 text-xs">{children}</pre>
  ),
  h1: ({ children }) => <h1 className="text-base font-semibold mt-3 mb-2 first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="text-sm font-semibold mt-3 mb-2 first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="text-sm font-medium mt-2 mb-1 first:mt-0">{children}</h3>,
  hr: () => <hr className="my-4 border-foreground/10" />,
}
