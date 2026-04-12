/**
 * Stub for @opencosmos/ui/knowledge-graph — used until @opencosmos/ui@1.4.0
 * is published and the version ref in package.json is updated.
 *
 * The real KnowledgeGraph component and its types/constants are in the
 * opencosmos-ui repo. This stub satisfies Next.js's static module resolution
 * so the build passes; at runtime the graph page shows the loading/error state
 * instead of the live sigma renderer.
 *
 * Remove this file and the webpack alias in next.config.mjs once 1.4.0 is live.
 */

import type { ComponentProps } from 'react'

export type KnowledgeNodeType = 'entity' | 'concept' | 'connection'
export type KnowledgeConfidence = 'high' | 'medium' | 'speculative' | 'pending'

export interface KnowledgeNode {
  id: string
  title: string
  type: KnowledgeNodeType
  domain: string
  confidence: KnowledgeConfidence
  connectionCount: number
  summary: string
  vibrancy: number
  x: number
  y: number
}

export interface KnowledgeLink {
  source: string
  target: string
  label?: string
  tentative?: boolean
}

export interface KnowledgeGraphData {
  nodes: KnowledgeNode[]
  links: KnowledgeLink[]
  generatedAt: number
}

export interface KnowledgePreviewData {
  nodes: Array<Pick<KnowledgeNode, 'id' | 'x' | 'y' | 'connectionCount' | 'domain'>>
  generatedAt: number
}

export interface KnowledgeGraphProps {
  data: KnowledgeGraphData
  onNodeClick?: (nodeId: string) => void
  pendingNodes?: KnowledgeNode[]
  ambient?: boolean
  className?: string
}

export const DOMAIN_COLORS: Record<string, string> = {
  philosophy:  '#f4a261',
  literature:  '#6b9ee8',
  buddhism:    '#74c69d',
  taoism:      '#52b788',
  indigenous:  '#e07b54',
  cross:       '#c77dff',
  ecology:     '#74c69d',
  vedic:       '#ffd166',
  opencosmos:  '#e9c46a',
  stoicism:    '#a8c5da',
  sufism:      '#d4a5c9',
  science:     '#7ec8e3',
  psychology:  '#b8b4e0',
  art:         '#f9c74f',
  ai:          '#90e0ef',
  default:     '#8b949e',
}

/** No-op stub — replaced by the real sigma renderer once 1.4.0 is published */
export function KnowledgeGraph(_props: KnowledgeGraphProps) {
  return null
}
