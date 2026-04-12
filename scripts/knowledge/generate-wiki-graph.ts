/**
 * Knowledge Graph Generator
 *
 * Reads knowledge/wiki/**\/*.md, builds a graph of wiki nodes and their
 * cross-references, runs ForceAtlas2 to compute settled x/y positions,
 * and writes the result to Upstash Redis.
 *
 * Two keys are written:
 *   knowledge:graph         — full graph, gzip-compressed, Base64-encoded
 *   knowledge:graph:preview — top 40 nodes by connectionCount, < 5KB
 *
 * Usage: pnpm graph
 *
 * Designed to run server-side only (CI/CD + local dev).
 * graphology-layout-forceatlas2 is NOT shipped to the browser.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { resolve, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
import Graph from 'graphology'
import forceAtlas2 from 'graphology-layout-forceatlas2'
import { Redis } from '@upstash/redis'

// ─── Path setup + .env loading ────────────────────────────────────────────────

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT_DIR  = resolve(__dirname, '..', '..')
const WIKI_DIR  = resolve(ROOT_DIR, 'knowledge', 'wiki')

const envPath = join(ROOT_DIR, 'apps', 'web', '.env')
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*"?(.+?)"?\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}
// Also try .env.local
const envLocalPath = join(ROOT_DIR, 'apps', 'web', '.env.local')
if (existsSync(envLocalPath)) {
  for (const line of readFileSync(envLocalPath, 'utf-8').split('\n')) {
    const match = line.match(/^\s*([^#=]+?)\s*=\s*"?(.+?)"?\s*$/)
    if (match && !process.env[match[1]]) process.env[match[1]] = match[2]
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NodeType       = 'entity' | 'concept' | 'connection'
type Confidence     = 'high' | 'medium' | 'speculative' | 'pending'
type NodeRole       = 'wiki' | 'foundational'

interface WikiFrontmatter {
  title:         string
  role:          NodeRole
  domain:        string
  confidence?:   Confidence
  status?:       string
  synthesizes?:  string[]
  last_reviewed?: string  // YYYY-MM-DD
  tags?:         string[]
}

interface WikiNode {
  id:              string        // e.g. "concepts/impermanence"
  title:           string
  type:            NodeType
  domain:          string
  confidence:      Confidence
  role:            NodeRole
  synthesizes:     string[]      // source paths this node covers
  last_reviewed:   number        // ms epoch (for vibrancy)
  tags:            string[]
  summary:         string        // extracted from ## Summary section
  connectionCount: number        // computed after edge building
  vibrancy:        number        // computed
  x:               number
  y:               number
}

interface KnowledgeLink {
  source: string
  target: string
  label:  string
}

// ─── Frontmatter parser ───────────────────────────────────────────────────────

function parseFrontmatter(raw: string): WikiFrontmatter {
  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) return { title: '', role: 'wiki', domain: 'cross' }

  const yaml   = fmMatch[1]!
  const result: Record<string, unknown> = {}
  let   currentKey   = ''
  let   currentArray: string[] | null = null

  for (const line of yaml.split('\n')) {
    const arrayItem = line.match(/^\s+-\s+(.+)$/)
    if (arrayItem && currentKey) {
      if (!currentArray) currentArray = []
      currentArray.push(arrayItem[1]!.replace(/^["']|["']$/g, ''))
      result[currentKey] = currentArray
      continue
    }

    const inlineArray = line.match(/^(\w[\w_]*)\s*:\s*\[([^\]]*)\]/)
    if (inlineArray) {
      currentKey = inlineArray[1]!
      currentArray = null
      result[currentKey] = inlineArray[2]!.split(',').map((s) =>
        s.trim().replace(/^["']|["']$/g, ''),
      ).filter(Boolean)
      continue
    }

    const kv = line.match(/^(\w[\w_]*)\s*:\s*(.*)$/)
    if (kv) {
      currentKey   = kv[1]!
      currentArray = null
      const val    = kv[2]!.trim().replace(/^["']|["']$/g, '')
      if (val && val !== '>' && val !== '|') result[currentKey] = val
      continue
    }

    if (currentKey && line.match(/^\s{2,}\S/)) {
      const prev = result[currentKey]
      result[currentKey] = prev ? `${prev} ${line.trim()}` : line.trim()
    }
  }

  return {
    title:          String(result.title ?? ''),
    role:           (result.role as NodeRole) ?? 'wiki',
    domain:         String(result.domain ?? 'cross'),
    confidence:     (result.confidence as Confidence) ?? 'medium',
    status:         result.status ? String(result.status) : undefined,
    synthesizes:    Array.isArray(result.synthesizes) ? result.synthesizes as string[] : [],
    last_reviewed:  result.last_reviewed ? String(result.last_reviewed) : undefined,
    tags:           Array.isArray(result.tags) ? result.tags as string[] : [],
  }
}

/** Extract the first paragraph of the ## Summary section */
function extractSummary(markdown: string): string {
  const match = markdown.match(/## Summary\n+([^#\n][^\n]*(?:\n(?!#)[^\n]+)*)/)
  if (!match) return ''
  return match[1]!.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 280)
}

// ─── Scan wiki directory ──────────────────────────────────────────────────────

function scanWiki(): WikiNode[] {
  const WIKI_SUBDIRS: Array<{ dir: string; type: NodeType }> = [
    { dir: 'entities',    type: 'entity' },
    { dir: 'concepts',    type: 'concept' },
    { dir: 'connections', type: 'connection' },
  ]

  const nodes: WikiNode[] = []

  for (const { dir, type } of WIKI_SUBDIRS) {
    const dirPath = resolve(WIKI_DIR, dir)
    if (!existsSync(dirPath)) continue

    for (const file of readdirSync(dirPath)) {
      if (!file.endsWith('.md')) continue

      const fullPath = resolve(dirPath, file)
      const raw      = readFileSync(fullPath, 'utf-8')
      const fm       = parseFrontmatter(raw)
      const summary  = extractSummary(raw)

      // Node ID: "{subdir}/{basename-without-ext}", trimmed
      const id = `${dir}/${file.replace(/\.md$/, '')}`.trim()

      // Parse last_reviewed date → epoch ms
      let lastReviewedMs = Date.now() - 365 * 24 * 60 * 60 * 1000  // default: 1 year ago
      if (fm.last_reviewed) {
        const parsed = Date.parse(fm.last_reviewed)
        if (!isNaN(parsed)) lastReviewedMs = parsed
      }

      nodes.push({
        id,
        title:          fm.title || file.replace(/\.md$/, '').replace(/-/g, ' '),
        type,
        domain:         fm.domain,
        confidence:     fm.confidence ?? 'medium',
        role:           fm.role,
        synthesizes:    fm.synthesizes ?? [],
        last_reviewed:  lastReviewedMs,
        tags:           fm.tags ?? [],
        summary,
        connectionCount: 0,   // filled after edge building
        vibrancy:       0,    // filled after connectionCount
        x: 0,
        y: 0,
      })
    }
  }

  return nodes
}

// ─── Build edges from shared synthesis ───────────────────────────────────────

/**
 * Two wiki nodes are connected when they share a synthesized source.
 * The edge label names the shared source to explain the connection.
 */
function buildEdges(nodes: WikiNode[]): KnowledgeLink[] {
  // source path → list of wiki node IDs that cover it
  const sourceIndex = new Map<string, string[]>()

  for (const node of nodes) {
    for (const src of node.synthesizes) {
      const normalized = src.trim()
      const bucket     = sourceIndex.get(normalized) ?? []
      bucket.push(node.id)
      sourceIndex.set(normalized, bucket)
    }
  }

  const edges: KnowledgeLink[] = []
  const seen  = new Set<string>()

  for (const [src, ids] of sourceIndex) {
    if (ids.length < 2) continue

    // Derive a human label from the source filename
    const srcLabel = src
      .replace(/^.*\//, '')          // strip path
      .replace(/\.md$/, '')          // strip .md
      .replace(/^[a-z]+-/, '')       // strip "buddhism-", "philosophy-", etc.
      .replace(/-/g, ' ')            // dashes to spaces
      .replace(/\b\w/g, (c) => c.toUpperCase())  // title case

    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        const a   = ids[i]!.trim()
        const b   = ids[j]!.trim()
        const key = [a, b].sort().join('||')
        if (seen.has(key)) continue
        seen.add(key)
        edges.push({ source: a, target: b, label: srcLabel })
      }
    }
  }

  return edges
}

// ─── Vibrancy computation ─────────────────────────────────────────────────────

function computeVibrancy(
  node:              WikiNode,
  maxConnectionCount: number,
): number {
  const now          = Date.now()
  const MS_PER_YEAR  = 365 * 24 * 60 * 60 * 1000

  const daysSinceUpdate   = (now - node.last_reviewed) / MS_PER_YEAR
  const recencyScore      = Math.max(0, 1 - daysSinceUpdate * 0.5)    // max 0.6 — halves after 2 years
  const referenceBonus    = 0                                           // reserved for future recentRefs map
  const connectivityBonus = Math.min(
    0.4,
    (Math.log(node.connectionCount + 1) / Math.log(maxConnectionCount + 1)) * 0.4,
  )

  const raw = Math.min(1.0, recencyScore + referenceBonus + connectivityBonus)

  // Foundational nodes: apply vibrancy floor of 0.75
  if (node.role === 'foundational') return Math.max(raw, 0.75)

  return raw
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('📡 Reading wiki directory...')
  const nodes = scanWiki()
  console.log(`  Found ${nodes.length} wiki nodes`)

  // Build graphology instance
  const graph = new Graph({ type: 'undirected' })

  for (const node of nodes) {
    graph.addNode(node.id, { x: node.x, y: node.y, ...node })
  }

  console.log('🔗 Building edges from shared synthesis...')
  const edges = buildEdges(nodes)
  console.log(`  Found ${edges.length} edges`)

  for (const edge of edges) {
    try {
      graph.addEdge(edge.source, edge.target, { label: edge.label })
    } catch {
      // Ignore duplicates or missing nodes
    }
  }

  // Compute connectionCount for each node
  const nodeMap = new Map(nodes.map((n) => [n.id, n]))
  graph.forEachNode((id) => {
    const node = nodeMap.get(id)
    if (node) node.connectionCount = graph.degree(id)
  })

  const maxConnectionCount = Math.max(
    ...nodes.map((n) => n.connectionCount),
    1,
  )

  // Seed positions from existing Redis state if available
  let existingPositions = new Map<string, { x: number; y: number }>()
  let redis: Redis | null = null

  try {
    redis = new Redis({
      url:   process.env.UPSTASH_VECTOR_URL ?? process.env.UPSTASH_REDIS_REST_URL ?? '',
      token: process.env.UPSTASH_VECTOR_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
    })

    const existing = await redis.get<string>('knowledge:graph')
    if (existing) {
      const { gunzipSync } = await import('node:zlib')
      const json    = gunzipSync(Buffer.from(existing, 'base64')).toString()
      const payload = JSON.parse(json) as { nodes: Array<{ id: string; x: number; y: number }> }
      existingPositions = new Map(payload.nodes.map((n) => [n.id, { x: n.x, y: n.y }]))
      console.log(`  Seeded ${existingPositions.size} positions from Redis`)
    }
  } catch (err) {
    console.warn('  Redis not available — running layout from scratch:', (err as Error).message)
  }

  // Initialize positions
  graph.forEachNode((id) => {
    const pos = existingPositions.get(id)
    if (pos) {
      graph.setNodeAttribute(id, 'x', pos.x)
      graph.setNodeAttribute(id, 'y', pos.y)
    } else {
      // New node: init near neighbors' centroid
      const neighbors = graph.neighbors(id)
      const cx = neighbors.reduce(
        (s, n) => s + (existingPositions.get(n)?.x ?? 0),
        0,
      ) / (neighbors.length || 1)
      const cy = neighbors.reduce(
        (s, n) => s + (existingPositions.get(n)?.y ?? 0),
        0,
      ) / (neighbors.length || 1)
      graph.setNodeAttribute(id, 'x', cx + (Math.random() - 0.5) * 10)
      graph.setNodeAttribute(id, 'y', cy + (Math.random() - 0.5) * 10)
    }
  })

  console.log('⚡ Running ForceAtlas2 (~100 iterations)...')
  forceAtlas2.assign(graph, {
    iterations: 100,
    settings: {
      strongGravityMode: true,   // prevents orphan nodes flying to infinity
      gravity:           0.05,   // gentle central pull
      barnesHutOptimize: true,   // O(n log n) — critical at scale
      scalingRatio:      2,
      slowDown:          10,
    },
  })

  // Write settled positions back into node objects + compute vibrancy
  graph.forEachNode((id, attrs) => {
    const node = nodeMap.get(id)
    if (!node) return
    node.x        = attrs.x as number
    node.y        = attrs.y as number
    node.vibrancy = computeVibrancy(node, maxConnectionCount)
  })

  // Build output payload
  const outputNodes = nodes.map((n) => ({
    id:              n.id,
    title:           n.title,
    type:            n.type,
    domain:          n.domain,
    confidence:      n.confidence,
    connectionCount: n.connectionCount,
    summary:         n.summary,
    vibrancy:        n.vibrancy,
    x:               n.x,
    y:               n.y,
  }))

  const outputLinks = edges.map((e) => ({
    source: e.source,
    target: e.target,
    label:  e.label,
  }))

  const generatedAt = Date.now()
  const fullPayload = JSON.stringify({ nodes: outputNodes, links: outputLinks, generatedAt })

  if (!redis) {
    console.log('⚠️  No Redis — printing summary only (set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to persist)')
    console.log(`  Nodes: ${outputNodes.length}  Links: ${outputLinks.length}`)
    console.log(`  Top 5 by connectionCount:`)
    ;[...outputNodes]
      .sort((a, b) => b.connectionCount - a.connectionCount)
      .slice(0, 5)
      .forEach((n) => console.log(`    ${n.title.padEnd(40)} ${n.connectionCount} connections  vibrancy=${n.vibrancy.toFixed(2)}`))
    return
  }

  // Compress + write full graph to Redis
  console.log('💾 Writing to Redis...')
  const compressed = gzipSync(Buffer.from(fullPayload)).toString('base64')
  await redis.set('knowledge:graph', compressed)

  // Write preview key (top 40 nodes, stripped fields, < 5KB)
  const previewNodes = [...outputNodes]
    .sort((a, b) => b.connectionCount - a.connectionCount)
    .slice(0, 40)
    .map(({ id, x, y, connectionCount, domain }) => ({ id, x, y, connectionCount, domain }))

  await redis.set('knowledge:graph:preview', JSON.stringify({ nodes: previewNodes, generatedAt }))

  console.log(`✅ Done — ${outputNodes.length} nodes, ${outputLinks.length} edges`)
  console.log(`  Full graph: ${(compressed.length / 1024).toFixed(1)} KB (Base64+gzip)`)
  console.log(`  Preview: ${previewNodes.length} nodes`)
}

main().catch((err) => {
  console.error('Generator failed:', err)
  process.exit(1)
})
