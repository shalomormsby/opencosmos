'use client'

/**
 * GraphPageClient — client component that orchestrates:
 *   1. SVG skeleton from SSR preview data (visible immediately)
 *   2. Web Worker parsing of full graph JSON
 *   3. Crossfade from skeleton → live KnowledgeGraph renderer
 *   4. Navigation to wiki pages on node focus
 *
 * KnowledgeGraph is dynamically imported here (not passed as a prop from
 * the server component — functions can't cross the server/client boundary).
 * ssr: false is required because sigma.js WebGL needs the browser.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import type { KnowledgePreviewData, KnowledgeGraphData, KnowledgeGraphProps } from '@opencosmos/ui/knowledge-graph'
import { DOMAIN_COLORS } from './domain-colors'

// Dynamic import lives in the Client Component — Next.js App Router rule:
// component functions cannot be passed as props from Server → Client components.
const KnowledgeGraph = dynamic<KnowledgeGraphProps>(
  () => import('@opencosmos/ui/knowledge-graph').then((m) => m.KnowledgeGraph),
  { ssr: false },
)

interface GraphPageClientProps {
  preview: KnowledgePreviewData | null
}

export function GraphPageClient({ preview }: GraphPageClientProps) {
  const router = useRouter()
  const containerRef                      = useRef<HTMLDivElement>(null)
  const [graphData, setGraphData]       = useState<KnowledgeGraphData | null>(null)
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [containerReady, setContainerReady] = useState(false)
  const [error, setError]               = useState<string | null>(null)

  useEffect(() => {
    // Create worker inside useEffect — terminated in cleanup regardless of fetch state.
    // DO NOT call worker.terminate() inside onmessage; that leaks the worker on early unmount.
    const worker = new Worker(new URL('./graphWorker.ts', import.meta.url))

    worker.onmessage = (e: MessageEvent<{ data?: KnowledgeGraphData; error?: string }>) => {
      if (e.data.error) {
        setError(e.data.error)
        return
      }
      if (e.data.data) {
        setGraphData(e.data.data)
        setTimeout(() => setShowSkeleton(false), 100)
      }
    }

    worker.postMessage({ origin: location.origin })

    return () => worker.terminate()
  }, [])

  // Gate KnowledgeGraph mount until the container has real dimensions.
  // sigma computes WebGL viewport matrices at init — a zero-height container
  // produces degenerate matrices and renders nothing (labels appear via canvas2d
  // but no WebGL nodes). ResizeObserver fires as soon as layout gives the div height.
  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (el.clientHeight > 0) {
      setContainerReady(true)
      return
    }
    const ro = new ResizeObserver(() => {
      if (el.clientHeight > 0) {
        setContainerReady(true)
        ro.disconnect()
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const handleNodeClick = (nodeId: string) => {
    router.push(`/knowledge/wiki/${nodeId}`)
  }

  return (
    <div ref={containerRef} className="relative w-full h-full">
      {/* SVG skeleton — visible immediately from SSR preview data */}
      {preview && (
        <div
          className="absolute inset-0 transition-opacity duration-[600ms]"
          style={{ opacity: showSkeleton ? 1 : 0, pointerEvents: 'none', zIndex: 1 }}
        >
          <SkeletonGraph preview={preview} />
        </div>
      )}

      {/* Live graph — fades in when Web Worker finishes AND container has real height */}
      {graphData && containerReady && (
        <div
          className="absolute inset-0 transition-opacity duration-[600ms]"
          style={{ opacity: showSkeleton ? 0 : 1, zIndex: 2 }}
        >
          <KnowledgeGraph
            data={graphData}
            onNodeClick={handleNodeClick}
            className="w-full h-full"
          />
        </div>
      )}

      {/* Error state */}
      {error && !graphData && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center text-foreground/40 px-6">
            <p className="text-sm mb-2">Graph unavailable</p>
            <p className="text-xs">{error}</p>
            <p className="text-xs mt-3">
              Run{' '}
              <code className="font-mono bg-foreground/10 px-1 py-0.5 rounded">
                pnpm graph
              </code>{' '}
              to generate the knowledge graph.
            </p>
          </div>
        </div>
      )}

      {/* Loading state — no preview, no data yet */}
      {!preview && !graphData && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-foreground/30">
            <div className="w-1.5 h-1.5 rounded-full bg-foreground/30 animate-pulse" />
            <p className="text-xs">Loading knowledge graph…</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SVG skeleton ─────────────────────────────────────────────────────────────

function SkeletonGraph({ preview }: { preview: KnowledgePreviewData }) {
  if (!preview.nodes.length) return null

  const xs     = preview.nodes.map((n) => n.x)
  const ys     = preview.nodes.map((n) => n.y)
  const minX   = Math.min(...xs)
  const maxX   = Math.max(...xs)
  const minY   = Math.min(...ys)
  const maxY   = Math.max(...ys)
  const rangeX = maxX - minX || 1
  const rangeY = maxY - minY || 1

  const normalized = preview.nodes.map((n) => ({
    ...n,
    nx: ((n.x - minX) / rangeX) * 90 + 5,
    ny: ((n.y - minY) / rangeY) * 90 + 5,
    r:  Math.max(1.5, Math.log(n.connectionCount + 1) * 1.2),
  }))

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{ background: 'var(--background)' }}
      aria-hidden="true"
    >
      <defs>
        {preview.nodes.map((n) => {
          const color = DOMAIN_COLORS[n.domain] ?? DOMAIN_COLORS['default'] ?? '#8b949e'
          return (
            <radialGradient key={`glow-${n.id}`} id={`glow-${n.id.replace(/\//g, '-')}`}>
              <stop offset="0%"   stopColor={color} stopOpacity="0.6" />
              <stop offset="60%"  stopColor={color} stopOpacity="0.15" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </radialGradient>
          )
        })}
      </defs>

      {normalized.map(({ id, nx, ny, r, domain }) => {
        const safeId = id.replace(/\//g, '-')
        const color  = DOMAIN_COLORS[domain] ?? DOMAIN_COLORS['default'] ?? '#8b949e'
        return (
          <g key={id}>
            <circle cx={nx} cy={ny} r={r * 3} fill={`url(#glow-${safeId})`} opacity="0.4" />
            <circle cx={nx} cy={ny} r={r}     fill={color}                  opacity="0.7" />
          </g>
        )
      })}
    </svg>
  )
}
