# OpenCosmos PM

> Project management hub for all OpenCosmos work. For strategic rationale, see [strategy.md](strategy.md). For infrastructure details, see [architecture.md](architecture.md).

**Updated:** 2026-04-11

---

## Todo's from Shalom for OpenCosmos:  
- Turnstile not working. Deployed to Vercel → Turnstile activates on first free-tier send (check Vercel logs for `[turnstile]` entries). Logging added, but currently nothing shows. Logs added: 
    - [turnstile] verified ok — working correctly
    - [turnstile] missing token — widget not rendering or token not being sent
    - [turnstile] rejected — token invalid (e.g. expired, wrong site key)
    - nothing — free-tier path still not being hit
- opencosmos.ai:     
    - OpenCosmos/Creative Powerup integration: Solve Brian's request for Creative Powerup member credits to use with OpenCosmos
    - Create an icon and favicon
    - Add graceful error message when tokens are used up, or when there's an API error, or other error states
    - Token guage: 
        - Improve the logic of the display of the token gauge display
            - If the connection = API, then do not display token gauge; do display the green ∞ in left sidebar
        - Make the green display in the sidebar the same size it displays on the account page
    - Voice UI: Analyze the cost of adding voice using elevenlabs, Flash model. 
- OpenCosmos Home page: 
    - Replace inert text with streaming text greeting
    - Fix alignment issue of sphere on home page
- Account page: 
    - Enable users to upload profile photos (~5MB max), which, when displayed, show instead of their initials in their account icon.
- Create a new "Subscribe" page: 
    - Move subscription cards from the accounts page to a new subscribe page
    - Subscription plan cards: Fix tiles with sticky bottom row that bottom-aligns the CTA
- CFO mode: As the voice UI feature (described above) has financial implications, decide how best to centralize and organize strategic financial info like this, as well as the "Token Economics" section in ARCHITECTURE.md. If you were a wise CFO leading this part of OpenCosmos, how and where would you organize this info in this repo? 

## Projects

| Project | Status | Priority | Next milestone |
|---------|--------|----------|----------------|
| **Cosmo** (`apps/web`) | Pre-launch | P0 | Circle setup → Stripe live → launch |
| **Knowledge Graph** (`opencosmos.ai/knowledge/graph`) | Planned | **P1** | Data generator → Cosmograph component → route |
| **@opencosmos/ui** (separate repo) | Active | P1 | Ongoing maintenance |
| **Portfolio** (`apps/portfolio`) | Production | P2 | Design consulting pipeline (Phase 3) |
| **Creative Powerup** (`apps/creative-powerup`) | In development | P2 | Cosmo integration (Phase 3) |
| **@opencosmos/ai** (`packages/ai`) | WIP | P2 | Package foundation (Phase 2a) |
| **Stocks** (`apps/stocks`) | In development | P3 | TBD |

---

## Launch Checklist — Cosmo

External setup remaining before launch:

- ✅ Cloudflare Turnstile keys added to `.env` and Vercel (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`)
- [ ] **Circle** — Dashboard → Settings → API → copy token → set `CIRCLE_API_KEY` in `.env.local` + Vercel
- [ ] **Circle community ID** — Dashboard → Settings → General → Community ID → set `CIRCLE_COMMUNITY_ID` in `.env.local` + Vercel
- [ ] **Anthropic spend limit** — Verify the monthly limit is active on `opencosmos-main` in console.anthropic.com (Fix 5)
- [ ] **Stripe live mode** — Swap test price IDs for live `STRIPE_PRICE_SPARK/FLAME/HEARTH` in Vercel when ready to accept real payments

After PR #91 merges:
- Deploy to Vercel → verify Turnstile activates on first free-tier send (check Vercel logs for `[turnstile]` entries)
- Verify benefit provisioning on test checkout: Substack subscriber list + Circle member list

---

## Cosmo — `apps/web`

Conversation interface at opencosmos.ai. Organized by phase.

### Phase 1a: Voice ✅ — Closed 2026-03-29

Cosmo's voice validated on first contact. See [Chronicle Chapter 7](chronicle.md#2026-03-29--first-contact). AI Triad system prompts (Sol, Socrates, Optimus) written but deferred until post-launch.

### Phase 1b: Subscriptions — Infrastructure Complete, Tasks Remaining

Three tiers (Spark $5, Flame $10, Hearth $50), Stripe billing, WorkOS auth, usage tracking (microdollar counters), TokenGauge UI, BYOK path, and bot protection (Fixes 1–6) are all shipped.

**Open tasks:**
- [ ] Register `https://opencosmos.ai/api/webhooks/stripe` in Stripe Dashboard — events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Hearth tier: automatically provision full CP membership on subscribe, revoke on cancel
- [ ] Existing CP members: offer migration path to Hearth (they get Cosmo included)
- [ ] **Privacy policy** — required before Stripe processes real payments. Must cover: usage metrics collected, BYOK key non-storage, Stripe data handling, retention period, user rights.
- [ ] **Terms of service** — usage limits, acceptable use, subscription terms
- [ ] **Substack partner API** — Apply at substack.com/for-business to enable programmatic paid newsletter access for Flame/Hearth. Current `POST /api/v1/free` endpoint grants free-tier Substack access only; partner API enables gifting paid subscriptions.
- [ ] Fix 7 — Monitoring & anomaly alerts (post-launch; see [architecture.md § Bot Protection](architecture.md#bot-protection-design))

### Phase 1c: Knowledge Corpus (Cloud RAG)

- ✅ Knowledge corpus browser at `opencosmos.ai/knowledge` — live
- [ ] Set up Upstash Vector (account, index, `UPSTASH_VECTOR_URL` + `UPSTASH_VECTOR_TOKEN` in `.env`)
- [ ] Build GitHub Action sync workflow: on push to `main` when `knowledge/**` changes → chunk by H2 → upsert to Upstash Vector with frontmatter metadata
- [ ] Build RAG API endpoint (`apps/web/app/api/knowledge/route.ts`)
- [ ] Wire RAG retrieval into Cosmo conversation flow — constitutional layer queries corpus before responding
- [ ] Community contribution pathway — submit knowledge for curation

### Phase 1c+: Knowledge Graph — `opencosmos.ai/knowledge/graph` [P1]

**Why this is P1:** Every time someone adds to the corpus, they should *see* it change. The graph is the reward for contributing — a palpable, beautiful, living confirmation that the knowledge is growing and connecting. It is also the single best communication of what OpenCosmos is: a platform that treats knowledge as a living, relational web. No visitor should have to read a paragraph to understand that. They should see it.

**Design criteria (non-negotiable):**
- **Scalable** — works gracefully at 79 nodes today and 2,500 nodes in the future without visual collapse or performance degradation. The design should reveal structure, not fight it.
- **Intelligible and useful** — visitors orient immediately: what are the clusters, what are the highly-connected concepts, where are the edges of the map? Clicking a node goes somewhere meaningful. *Note: at 2,500 nodes and 10,000+ edges, a force-directed graph without interaction design is a hairball. Intelligibility is not a property of the layout alone — it requires a designed focus model. See interaction model below.*
- **Beautiful** — this is a cosmic knowledge graph on a platform called OpenCosmos. The aesthetic must feel like a star chart or constellation map: deep dark background, glowing nodes, luminous edges, confident typography. We are not building a corporate org chart.

**Library: sigma.js v3 + graphology + @react-sigma/core**

All three are MIT. sigma.js is WebGL-rendered, GPU-accelerated, and handles 10,000+ nodes comfortably. The cosmic aesthetic — glowing nodes, luminous edges, additive blending — is native to WebGL and is what sigma.js is built for.

**Library decision — why sigma.js:**

| Library | Performance ceiling | Glow aesthetics | Creative control | MIT | Zero-to-beautiful |
|---------|-------------------|-----------------|-----------------|-----|-------------------|
| **sigma.js v3** (recommended) | 10k+ nodes (WebGL) | GPU-native glow via custom programs | Full — write GLSL programs | ✅ | Medium — more setup, but opencosmos-ui already writes GLSL shaders |
| `react-force-graph-2d` | ~7k *elements* (nodes + edges) | CPU `shadowBlur` — expensive per node | Very high — raw canvas | ✅ | Medium-hard — canvas glow is a manual trick |
| `@antv/g6` | 2,500+ comfortable (WebGL) | Built-in themes, less custom control | Moderate | ✅ | Easy — pre-built dark themes |
| Cosmograph | 100k+ (GPU) | GPU-native | High | ❌ CC BY-NC | Easy |

> **Why not `react-force-graph-2d`:** Its performance wall is at ~7,000 *total elements* (nodes + edges combined). A 2,500-node knowledge graph will likely have 10,000+ edges — that's 12,500+ elements, well past the threshold. More critically: canvas `shadowBlur` (how you achieve glow) is CPU-bound and expensive per-node. At scale it degrades. For a shared design system component that any consumer might use at any corpus size, a CPU-bound ceiling is the wrong foundation. Build with the right renderer once.
>
> **Why not Cosmograph:** CC BY-NC 4.0 license. OpenCosmos has paid subscription tiers → commercial deployment. Requires a Business license. sigma.js is MIT and technically equivalent.
>
> **Why sigma.js over @antv/g6:** G6's built-in themes look "enterprise beautiful." The OpenCosmos aesthetic is specific — cosmic constellation, not enterprise graph analytics. The control you lose to G6's abstraction layers is precisely the control needed to achieve the star-chart feel. The existing opencosmos-ui codebase already writes GLSL shaders (`OrbBackground`, `SplashCursor`, `lib/webgl/`), so sigma.js's custom programs are not new territory.

**Home in `@opencosmos/ui`:** This component is built in the `opencosmos-ui` repo as a first-class design system component, published as `@opencosmos/ui/knowledge-graph` (a separate subpath entry, following the `/forms`, `/tables`, `/dnd` pattern). This makes it available to any OpenCosmos consumer — the portfolio, creative powerup, future apps — and serves as an open-source resource. See architecture below.

---

**Architecture — three layers + one repo split:**

*Layer 1: Data generator + live data architecture* (`scripts/knowledge/generate-wiki-graph.ts` — this repo)

Reads all `knowledge/wiki/**/*.md`, extracts frontmatter and `synthesizes` cross-references. Runs ForceAtlas2 to convergence and writes settled `x`/`y` positions into each node.

**The "instant reward" problem — and why a static file is the wrong target:**

The UX promise is that every contribution makes the graph visibly grow. A static `apps/web/public/wiki-graph.json` file cannot fulfill this — it only updates on deployment, which may lag by hours or days. The architecture must reconcile the promise with the data layer. Two distinct scenarios require two distinct solutions:

*After a contribution merges to `main` (all users):*
The generator writes to **Upstash Redis** (already in the stack from Phase 1b) rather than to a committed file. The GitHub Action that runs on `knowledge/**` changes (Phase 1c) calls `pnpm graph` and writes the result to a `knowledge:graph` Redis key. A Next.js API route serves this data with ISR:

```ts
// apps/web/app/api/knowledge/graph/route.ts
export const revalidate = 3600  // fallback: refresh every hour

export async function GET() {
  const data = await redis.get('knowledge:graph')
  return Response.json(data)
}
```

At the end of the GitHub Action, POST to Next.js on-demand revalidation:
```yaml
# .github/workflows/knowledge-sync.yml (extends Phase 1c workflow)
concurrency:
  group: knowledge-graph-generator
  cancel-in-progress: true  # safe because generator reads full repo, not Redis delta

- name: Regenerate graph
  run: pnpm graph  # reads existing Redis state to seed positions, writes updated state to Redis

- name: Revalidate graph route
  run: |
    curl -X POST "${{ secrets.NEXT_PUBLIC_APP_URL }}/api/revalidate" \
      -H "x-revalidate-secret: ${{ secrets.REVALIDATE_SECRET }}" \
      -d '{"path": "/knowledge/graph"}'
```

**Instant skeleton — preview key:** Alongside writing the full graph to `knowledge:graph`, the generator writes a second key: `knowledge:graph:preview`. This payload contains only the 40 highest-`connectionCount` nodes with stripped-down data — `{ id, x, y, connectionCount, domain }`, no labels, no links, no summary. Total size: < 5KB. The Next.js page component fetches this via SSR and renders it as an SVG skeleton immediately on mount — glowing dots in the right positions, no WebGL required. When the Web Worker finishes parsing the full graph, the skeleton crossfades out (`opacity: 0 transition: 0.6s`) and the live renderer fades in. The user sees the shape of the constellation within milliseconds of navigation.

```ts
// In generate-wiki-graph.ts — write both keys
import { gzipSync } from 'zlib'

// Full graph: compress before writing — raw JSON is 2.5–3MB; gzip reduces to ~700KB,
// well within Upstash's per-value limit as the corpus grows past 1,000 nodes
const fullPayload = JSON.stringify({ nodes, links, generatedAt })
const compressed  = gzipSync(fullPayload).toString('base64')
await redis.set('knowledge:graph', compressed)

// Preview key: < 5KB uncompressed — no compression needed
await redis.set('knowledge:graph:preview', JSON.stringify({
  nodes: [...nodes]
    .sort((a, b) => b.connectionCount - a.connectionCount)
    .slice(0, 40)
    .map(({ id, x, y, connectionCount, domain }) => ({ id, x, y, connectionCount, domain })),
  generatedAt,
}))
```

The API route decompresses before serving:

```ts
// apps/web/app/api/knowledge/graph/route.ts
import { gunzipSync } from 'zlib'
export const revalidate = 3600

export async function GET() {
  const compressed = await redis.get<string>('knowledge:graph')
  if (!compressed) return new Response('Not found', { status: 404 })
  const json = gunzipSync(Buffer.from(compressed, 'base64')).toString()
  return new Response(json, { headers: { 'Content-Type': 'application/json' } })
}
```

**Race condition — multiple simultaneous merges:** `cancel-in-progress: true` is safe here because the generator always reads from the full `knowledge/wiki/**` repo checkout, not from a delta. When concurrent merges trigger the workflow, the in-progress run is canceled and restarted from the latest HEAD — which already contains all merged files. The graph always converges to the correct final state. Burst merges cause compute waste, not data loss. The Redis payload includes `generatedAt: Date.now()` for auditability.

The graph updates for all users within seconds of a merge — not on the next deployment.

*When a contributor submits (contributor only, before merge):*
The contribution UI optimistically injects the pending node directly into the live graphology instance in memory — no server round-trip. The node is visually distinct (see "pending" visual state below) and appears on the graph immediately. It is not persisted; it exists only in this session. When the contribution is merged and the route revalidates, the canonical node replaces it on next load.

**Graph data schema:**

```json
{
  "nodes": [
    {
      "id": "concepts/impermanence",
      "title": "Impermanence",
      "type": "concept",
      "domain": "cross",
      "confidence": "high",
      "connectionCount": 6,
      "summary": "Buddhist anicca, Taoist flux, Whitman's cycles, Nietzsche's eternal recurrence",
      "vibrancy": 0.85,
      "x": 142.7,
      "y": -83.4
    }
  ],
  "links": [
    {
      "source": "concepts/impermanence",
      "target": "entities/lao-tzu",
      "label": "Taoist flux as the medium of all existence"
    }
  ]
}
```

Node `type` values: `"entity"` | `"concept"` | `"connection"` (matches wiki subdirectory). The schema includes `generatedAt` at the root for auditability.

`role` (optional): `"foundational"` — a wiki frontmatter field that declares explicit bedrock status. When present, the generator applies a vibrancy floor of `max(vibrancy, 0.75)`, overriding the computed decay regardless of recency or connectivity. This is the escape valve for concepts the corpus itself declares as load-bearing — the Tao, Impermanence, Interbeing — where algorithmic inference from connection counts alone is insufficient. Reserve this for true pillars; overuse collapses the encoding's honesty.

`vibrancy` (0.0–1.0) is computed in the generator from how recently the node and its neighbors have been updated or referenced. It is a temporal vitality signal, distinct from `confidence` (which is about source quality). Nodes untouched for 12+ months decay toward 0.5; actively-referenced nodes approach 1.0. The shader scales breathing amplitude and core brightness by vibrancy, so the actively-living edges of the map pulse harder than the archived center.

```ts
// In generate-wiki-graph.ts — vibrancy computation
const now = Date.now()
const MS_PER_YEAR = 365 * 24 * 60 * 60 * 1000

// Vibrancy has two faces: temporal (frontier, new growth) and structural (bedrock, load-bearing).
// A foundational concept that hasn't been edited in 3 years is not dying — it's complete.
// The connectivityBonus ensures structural centrality protects nodes from recency decay.
function computeVibrancy(
  node: WikiNode,
  recentRefs: Map<string, number>,
  maxConnectionCount: number
): number {
  const daysSinceUpdate   = (now - (node.updatedAt ?? 0)) / MS_PER_YEAR
  const recencyScore      = Math.max(0, 1 - daysSinceUpdate * 0.5)  // max 0.6 — halves after 2 years
  const referenceBonus    = Math.min(0.1, (recentRefs.get(node.id) ?? 0) * 0.05)
  const connectivityBonus = Math.min(0.4,  // max 0.4 — log-normalized structural centrality
    (Math.log(node.connectionCount + 1) / Math.log(maxConnectionCount + 1)) * 0.4
  )
  return Math.min(1.0, recencyScore + referenceBonus + connectivityBonus)
}
```

Vibrancy by node archetype:

| Archetype | Recency | Connectivity | Vibrancy | Reads as |
|-----------|---------|--------------|----------|----------|
| New frontier concept, 2 edges | 0.60 | 0.08 | 0.68 | Active and growing |
| Foundational concept, 40 edges, 3 years old | 0.25 | 0.36 | 0.61 | Stable bedrock |
| Active hub, 60 edges, recently updated | 0.60 | 0.40 | 1.00 | The living core |
| Orphaned stub, 0 edges, 2 years old | 0.25 | 0.00 | 0.25 | Correctly recedes |

The pillars do not glow as brightly as the frontier — nor should they. But they do not go dark. An old concept with 40 inbound connections holds at ~0.61 vibrancy. An orphaned stub correctly fades toward the archived floor.

```glsl
// In GlowNodeProgram vertex shader — breathing amplitude scales with vibrancy
attribute float a_vibrancy;  // per-node, from node attribute
float effectiveAmplitude = u_amplitude * max(0.4, a_vibrancy);  // floor at 40% — never fully dead
float ox = sin(u_time * 0.28 + phase) * effectiveAmplitude;
float oy = cos(u_time * 0.28 + phase * 1.31) * effectiveAmplitude;
// Core brightness also dims with low vibrancy:
float coreBrightness = 0.6 + a_vibrancy * 0.4;
```

Vibrancy bands: `0.0–0.3` archived (rarely updated, structurally isolated) · `0.3–0.7` stable bedrock or active frontier · `0.7–1.0` actively living (recent + highly connected). Note: a foundational node with many connections can hold 0.6+ indefinitely without any edits — structural centrality compensates for recency decay. A node decays toward zero only when both dimensions are absent: old and unconnected.

> **ID hygiene:** Call `.trim()` on every node `id`. Inconsistent whitespace creates silent duplicate nodes.

**Layout stability — seed with existing positions:** ForceAtlas2 is sensitive to initial conditions. Running it from scratch on every CI/CD run rotates, inverts, or entirely rearranges the global topology — the buddhism cluster that was top-left yesterday may be bottom-right today. This destroys spatial memory.

Fix: before running the generator, read the current graph from Redis. For every node that already exists, initialize it at its current `x`/`y`. For new nodes, initialize at the centroid of their expected neighbors' positions (computed from the link structure + existing positions). Run ForceAtlas2 for ~100 iterations (not 500) — the anchored existing nodes resist global rearrangement; new nodes settle into the existing topology without causing a layout scramble.

```ts
// In generate-wiki-graph.ts
const existing = await redis.get('knowledge:graph')  // null on first run
const existingPositions = new Map(existing?.nodes.map(n => [n.id, { x: n.x, y: n.y }]))

graph.forEachNode((id) => {
  const pos = existingPositions.get(id)
  if (pos) {
    graph.setNodeAttribute(id, 'x', pos.x)  // anchor existing nodes
    graph.setNodeAttribute(id, 'y', pos.y)
  } else {
    // New node: initialize near neighbors' centroid, or origin if no neighbors yet
    const neighbors = graph.neighbors(id)
    const cx = neighbors.reduce((s, n) => s + (existingPositions.get(n)?.x ?? 0), 0) / (neighbors.length || 1)
    const cy = neighbors.reduce((s, n) => s + (existingPositions.get(n)?.y ?? 0), 0) / (neighbors.length || 1)
    graph.setNodeAttribute(id, 'x', cx + (Math.random() - 0.5) * 10)
    graph.setNodeAttribute(id, 'y', cy + (Math.random() - 0.5) * 10)
  }
})
forceAtlas2.assign(graph, {
  iterations: 100,
  settings: {
    strongGravityMode: true,  // REQUIRED: without this, degree-0 isolated nodes fly to infinity
    gravity: 0.05,            // gentle central pull — prevents orphan nodes collapsing the camera zoom
    barnesHutOptimize: true,  // O(n log n) approximation — critical at 2,500+ nodes
    scalingRatio: 2,
    slowDown: 10,
  },
})
```

**Pending node visual state:** A contributor's optimistically-injected node needs its own encoding — distinct from `speculative` confidence (which means "single-source synthesis") and from `high` confidence. Pending means "submitted, awaiting curation." Visual treatment: same domain color but with a dashed circular ring rendered as a second pass in `GlowNodeProgram`, reduced breathing amplitude, label suffixed with " ·· pending". This is a defined `confidence` value of `"pending"` in the type system.

**Tentative edges for pending nodes:** The pending node is not isolated — it arrives with tentative connections. When the contributor submits, the client already holds the full node list in the graphology instance. Scan the submitted content for title matches against existing nodes (case-insensitive, partial match threshold). Each match generates a tentative edge to that node. These render as dashed lines at lower opacity (0.25 vs the canonical 0.5 base), no label, clearly provisional. After merge + revalidation, the generator's canonical cross-references replace them — the final edges may differ (the generator uses full corpus analysis, not just title matching), but the tentative edges give the contributor an immediate, meaningful picture of where their contribution connects.

```ts
// Client-side tentative edge detection — runs on submission, zero server cost
const STOP_WORDS = new Set(['the', 'and', 'for', 'that', 'this', 'with', 'from', 'are', 'was'])
const MIN_TITLE_LENGTH = 4
const MAX_TENTATIVE_EDGES = 8  // if we exceed this, something is wrong — show none

function escapeRegExp(s: string) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function detectTentativeEdges(
  pendingId: string,
  submittedText: string,
  existingNodes: KnowledgeNode[]
): KnowledgeLink[] {
  const matches = existingNodes.filter(n => {
    if (n.title.length < MIN_TITLE_LENGTH) return false           // "AI", "To", "Art" → skip
    if (STOP_WORDS.has(n.title.toLowerCase())) return false       // common words → skip
    const pattern = new RegExp('\\b' + escapeRegExp(n.title) + '\\b', 'i')  // whole-word match
    return pattern.test(submittedText)
  })

  // Sort by hub importance — most-connected nodes first
  matches.sort((a, b) => b.connectionCount - a.connectionCount)
  // Slice to cap — show the most significant connections, never silence a prolific contributor
  return matches
    .slice(0, MAX_TENTATIVE_EDGES)
    .map(n => ({ source: pendingId, target: n.id, tentative: true }))
}
```

*Layer 2: Visualization component* (`packages/ui/src/components/data-display/KnowledgeGraph.tsx` — **opencosmos-ui repo**)

`<KnowledgeGraph />` lives in the design system, published as `@opencosmos/ui/knowledge-graph` (a dedicated subpath entry, following the `/forms`, `/tables`, `/dnd` pattern). It is a reusable, open-source component — any OpenCosmos app or any external consumer can use it.

**Main thread parsing penalty — Web Worker for graph deserialization:**

A 2,500-node, 10,000-edge JSON payload is 2.5–3MB uncompressed. Brotli compression (automatic on Vercel) reduces wire size to ~350KB, but `await response.json()` on a 3MB string still blocks the main thread for 50–200ms — visible jank at the exact moment the page mounts.

Fix: fetch and parse in a Web Worker. The main thread receives already-parsed plain objects and builds the Graphology instance from them — zero parse cost on the UI thread.

```ts
// apps/web/app/knowledge/graph/graphWorker.ts
self.onmessage = async () => {
  const res  = await fetch('/api/knowledge/graph')
  const text = await res.text()
  const data = JSON.parse(text)   // heavy parse — off main thread
  self.postMessage(data)           // structured clone back to main
}

// In the page component
useEffect(() => {
  const worker = new Worker(new URL('./graphWorker.ts', import.meta.url))
  worker.postMessage(null)
  worker.onmessage = (e) => { setGraphData(e.data) }
  return () => worker.terminate()  // terminate on unmount, not on message receipt
  // Binding termination to onmessage is the common mistake — if the component unmounts
  // before the fetch resolves, the worker leaks. useEffect cleanup is the correct lifecycle hook.
}, [])
```

Webpack 5 (Next.js ≥ 13) supports `new Worker(new URL(...))` natively. No additional packages needed.

**Stack:**
- `sigma` (v3) — WebGL rendering engine; per-frame GPU render pass drives the breathing animation
- `graphology` — graph data structure (sigma's required data model)
- `@react-sigma/core` — React bindings
- `graphology-layout-forceatlas2` — **generator only** (opencosmos repo devDep); runs server-side to produce settled x/y positions; not shipped to the browser
- sigma + graphology + @react-sigma/core declared as optional peer dependencies in `packages/ui/package.json`; isolated to the `./knowledge-graph` subpath entry so consumers who don't use it pay zero bundle cost

**sigma.js component shape:**

```tsx
// packages/ui/src/components/data-display/KnowledgeGraph.tsx
'use client'
import { useEffect, useRef } from 'react'
import { SigmaContainer, useLoadGraph, useRegisterEvents } from '@react-sigma/core'
import Graph from 'graphology'
// No forceAtlas2 import — layout is pre-baked in the generator, not run on the client
import type { KnowledgeGraphData, KnowledgeNode } from './types'

export function KnowledgeGraph({ data, onNodeClick, ambient = false, className }: KnowledgeGraphProps) {
  return (
    <SigmaContainer
      className={className}
      style={{ background: 'var(--background)' }}
      settings={{
        nodeProgramClasses: { circle: GlowNodeProgram },  // custom glow shader with u_time
        renderEdgeLabels: false,
        labelSize: 11,
        labelColor: { color: 'rgba(255,255,255,0.7)' },
        defaultEdgeColor: 'rgba(255,255,255,0.12)',
        defaultEdgeType: 'line',
        // hideEdgesOnMove: do NOT use — kills the breathing effect; WebGL handles it
      }}
    >
      <GraphLoader data={data} />
      <ShaderAnimator ambient={ambient} />  {/* drives u_time uniform each rAF */}
      <EventController onNodeClick={onNodeClick} />
    </SigmaContainer>
  )
}
```

> **Custom glow program (`GlowNodeProgram`):** sigma.js uses WebGL programs for node rendering. The existing `lib/webgl/Program.ts` in opencosmos-ui is the exact same abstraction. Write a `GlowNodeProgram` that extends sigma's `NodeProgram` — draws a large, soft bloom circle with low alpha (the glow) behind a smaller, bright circle (the core). This is the same technique used in `OrbBackground`. Additive blending (`gl.blendFunc(gl.SRC_ALPHA, gl.ONE)`) makes overlapping glows brighten each other, producing the constellation effect.

**Domain color palette** (constellation register — unchanged):

```ts
export const DOMAIN_COLORS: Record<string, string> = {
  philosophy:  '#f4a261',  // warm gold
  literature:  '#6b9ee8',  // cornflower blue
  buddhism:    '#74c69d',  // jade green
  taoism:      '#52b788',  // deep jade
  indigenous:  '#e07b54',  // earth red
  cross:       '#c77dff',  // violet — bridges between traditions
  ecology:     '#74c69d',  // forest green
  vedic:       '#ffd166',  // saffron
  opencosmos:  '#e9c46a',  // cosmos gold
  default:     '#8b949e',  // muted silver for unmapped domains
}
```

**Full visual encoding:**

| Property | Encoding |
|----------|----------|
| Node color | Domain (see palette above) |
| Node size | `log(connectionCount + 1) × 5`, min 3 — hubs are visibly larger |
| Node shape | Circle — entities slightly larger base size than concepts |
| Node label | Title; shown via sigma's built-in label renderer; hidden during motion (`hideLabelsIfTooSmall`) |
| Node opacity | Confidence: `high` = 1.0, `medium` = 0.8, `speculative` = 0.55, `pending` = 0.65 (optimistic, not yet curated) |
| Pending node ring | `confidence: "pending"` nodes render a dashed circular ring as a second shader pass — same domain color, pulsing slowly. No edges (cross-references not yet computed). Label suffixed with " ·· pending". |
| Edge color | `rgba(255,255,255,0.12)` base; canonical. Tentative edges: `rgba(255,255,255,0.25)` dashed, no label. |
| Edge width | 1px base; highlight on node hover/focus via sigma's `edgeReducer` |
| Node vibrancy | `vibrancy` (0.0–1.0): scales breathing amplitude and core brightness. High vibrancy pulses hard; archived nodes dim and breathe slowly. Floor at 40% amplitude — never fully still. |
| Background | `var(--background)` — deep space dark from design system |

**Interaction model — three states:**

The key insight: "click = navigate away immediately" is wrong for a dense graph. It removes the user from the map before they have oriented. The correct model defers navigation until the user has focused, read, and chosen.

*State 1 — Ambient (default):*
- Full graph visible, breathing animation active
- Node labels suppressed (too dense to read at full zoom)
- Cluster labels visible at zoom-out level — `philosophy`, `buddhism`, `cross`, etc. — rendered as faint large-type overlays at the centroid of each domain cluster. These are landmarks, not node labels. They fade as the user zooms in.
- Hover on a node: target enlarges slightly, direct connections brighten, everything else dims ~20% (subtle, not dramatic — a whisper, not a spotlight)

*State 2 — Focus (click or search result):*
- Camera animates smoothly to the target node (`sigma.getCamera().animate({ x, y, ratio })`)
- **Ego-network isolation**: target node + all degree-1 neighbors remain at full brightness and full breathing amplitude. All other nodes and edges dim to ~10% opacity and reduce breathing amplitude (they recede into the background, still alive but subordinate).
- Node labels become visible on the isolated neighborhood (zoom level is higher, field is sparse enough to read)
- Tooltip panel appears: title, type badge, domain, confidence, 1-line summary, "Open wiki page →" button. Navigation only happens from this button — not from the click that triggered focus.
- Degree-2 toggle: a subtle "Show extended connections" control expands isolation to degree-2 neighbors
- Escape / click canvas background → fade back to ambient state
  > **Routing note:** Node IDs use slash notation (`concepts/impermanence`). This constructs `/knowledge/wiki/concepts/impermanence` — verify the wiki catch-all route (`[[...slug]]/page.tsx`) handles nested paths before building focus state. If not, encode IDs in the generator.

*State 3 — Search (⌘K or visible search trigger):*
- Text input filters the node list in real-time (match on title, domain, type)
- Results appear as a list overlay (use `@opencosmos/ui` Command/Popover — not a custom component)
- Selecting a result triggers State 2 (camera animates, ego-network isolates) — search and click are the same focus trigger, just different entry points
- Search is the primary wayfinding tool at 2,500 nodes. It is not optional.

> **Mobile search discovery:** ⌘K is invisible to users without a physical keyboard. Mobile users see a canvas with no obvious search affordance and no way to orient in a 2,500-node graph. Do not rely on gesture or keyboard-shortcut discovery. The fix: a **persistent, always-visible search button** — a floating search icon (magnifying glass) anchored to a corner of the canvas, or a thin persistent search bar at the top of the graph view that is always tappable. On desktop this button coexists with ⌘K; on mobile it is the primary affordance. The button triggers the same Command/Popover overlay. A label ("Search graph") on the button is preferred over an icon-only touch target — meet WCAG 2.5.3 (Label in Name) from the start.

**Implementation via sigma.js reducers:**
```ts
// sigma's nodeReducer and edgeReducer apply per-frame display overrides
// without mutating the underlying graphology graph
sigma.setSetting('nodeReducer', (node, data) => {
  if (focusedNode === null) return data  // ambient: full display
  const isNeighbor = graph.neighbors(focusedNode).includes(node)
  const isFocused = node === focusedNode
  if (isFocused || isNeighbor) return data  // focused neighborhood: full display
  return { ...data, color: '#111', size: data.size * 0.4, zIndex: 0 }  // dimmed
})
sigma.setSetting('edgeReducer', (edge, data) => {
  if (focusedNode === null) return data
  if (!graph.extremities(edge).includes(focusedNode)) return { ...data, hidden: true }
  return data
})
```

**Zoom-adaptive labels:**
```ts
// In the sigma render loop — suppress labels when zoomed out, show on zoom-in
sigma.setSetting('labelRenderedSizeThreshold',
  camera.ratio > 0.5 ? Infinity : 8  // hide all labels at full zoom-out
)
```

**Confidence as opacity:** Speculative wiki pages recede visually. High-confidence pages burn brightest. The graph is a real-time confidence map of the corpus.

**ForceAtlas2 — converge once, then stop. The breathing lives in the shader:**

ForceAtlas2 runs *once*, server-side, in the generator script. It produces well-clustered x/y positions (hubs pulling their neighborhoods together), which are written directly into `wiki-graph.json`. The client receives already-settled positions. No layout shift, no scatter-on-load, no client-side simulation at all.

The "breathing" effect — the slow organic oscillation that makes a graph feel alive — does not come from a running physics simulation. It comes from a time-based sine wave in the `GlowNodeProgram` GLSL vertex shader:

```glsl
// In GlowNodeProgram vertex shader
uniform float u_time;  // incremented each frame via requestAnimationFrame

// Golden ratio phase offset gives each node an independent drift cycle
// so they oscillate out of phase with each other — organic, not synchronized
float phase = float(a_index) * 2.3999632; // index × golden angle (radians)
float ox = sin(u_time * 0.28 + phase) * 0.006;
float oy = cos(u_time * 0.28 + phase * 1.31) * 0.006;

vec2 pos = a_position + vec2(ox, oy);
```

This runs on the GPU as part of the normal render pass. The CPU cost is zero. The main thread is completely free. Edges breathe because sigma recomputes edge positions from node positions each frame — as nodes drift, edge endpoints move with them.

**Additional shader controls:**
- `u_amplitude` uniform — scale the oscillation. Normal graph view: `0.006`. Ambient/homepage mode: `0.012` (wider, dreamier drift). Hover on a node: lerp amplitude toward `0.0` so the node locks in place as you approach it — tactile and intentional.
- `prefers-reduced-motion` → set `u_amplitude = 0.0`. The graph is static but still beautiful.

> **Follow-on — breathing character by structural role:** Bedrock and frontier breathe differently in nature. Mass moves slowly; lightness moves fast. A future refinement: add `a_frequency` as a per-node vertex attribute alongside `a_vibrancy`. High-connectivity foundational nodes get a lower frequency (slow, deep pulse — like tectonic plates); newly-created frontier nodes get the current frequency (quick, flickering aliveness). This requires a second vertex attribute in `GlowNodeProgram` and a `frequencyMap` in the generator, but no shader architecture changes. Defer until base breathing is tuned and the vibrancy encoding is proven in production.

> **Why this is the correct approach, not a compromise:** Running ForceAtlas2 perpetually at 60fps on 2,500 nodes is an n-body simulation on the client's CPU — a massive, continuous battery drain to achieve an aesthetic wobble. For a platform mindful of the energy footprint of digital products, burning CPU cycles infinitely for visual effect is a contradiction in values. The GPU vertex shader achieves the same result at a fraction of the power, because that is what GPUs are designed for.
>
> **Why WebGL matters here:** This technique is only possible *because* we chose a WebGL renderer. Canvas-based approaches (react-force-graph-2d) do not have access to vertex shaders — the breathing would have required exactly the CPU-bound simulation we're now avoiding.

**Subpath export in `@opencosmos/ui`:**

```ts
// packages/ui/src/knowledge-graph.ts  — new subpath entry point
export { KnowledgeGraph } from './components/data-display/KnowledgeGraph'
export type { KnowledgeGraphData, KnowledgeNode, KnowledgeLink } from './components/data-display/types'
```

```json
// packages/ui/package.json additions
{
  "exports": {
    "./knowledge-graph": {
      "types": "./dist/knowledge-graph.d.ts",
      "import": "./dist/knowledge-graph.mjs",
      "require": "./dist/knowledge-graph.js"
    }
  },
  "peerDependenciesMeta": {
    "sigma": { "optional": true },
    "graphology": { "optional": true },
    "@react-sigma/core": { "optional": true }
    // graphology-layout-forceatlas2 is a generator devDep (opencosmos repo), not a client peer dep
  },
  "size-limit": [
    { "name": "KnowledgeGraph", "path": "dist/knowledge-graph.mjs", "limit": "100 KB" }
  ]
}
```

*Layer 3: Route/consumer* (`apps/web/app/knowledge/graph/page.tsx` — this repo)

New Next.js App Router page at `opencosmos.ai/knowledge/graph`.

```ts
// Consume from the design system — not a local component
import dynamic from 'next/dynamic'
const KnowledgeGraph = dynamic(
  () => import('@opencosmos/ui/knowledge-graph').then(m => m.KnowledgeGraph),
  { ssr: false }  // WebGL requires browser — do this first or dev server throws
)
```

- At SSR time: fetches `knowledge:graph:preview` from Redis (< 5KB, 40 hub nodes) and renders an SVG skeleton immediately on mount — the constellation's shape appears within milliseconds of navigation, before the Web Worker completes
- Full graph data fetched via Web Worker asynchronously (see below) — when complete, crossfades from SVG skeleton to live renderer (`opacity` transition 0.6s)
- Full-bleed layout (no sidebar, dark background, edge-to-edge)
- On node focus → ego-network isolation; on "Open wiki page →" click → `router.push(\`/knowledge/wiki/${nodeId}\`)`
- Accepts `pendingNodes?: KnowledgeNode[]` prop — contribution UI passes optimistically-injected nodes here; the component adds them to the graphology instance with `confidence: "pending"` encoding
- WebGL unavailable (Safari/iOS): canvas renderer activates automatically — same interaction model, same pre-baked positions, no static fallback needed. See canvas renderer architecture below.

**Canvas renderer (WebGL unavailable — Safari/iOS):**

When WebGL detection fails on mount, `<KnowledgeGraph />` routes to an internal `<CanvasGraph />` renderer. The consumer sees one component — the routing is invisible. This is not a degraded fallback; it is a lighter-weight renderer that supports the full three-state interaction model using the same pre-baked x/y positions.

The performance problem with canvas at 2,500 nodes + 10,000 edges is edge rendering — drawing 10,000 lines per frame at 60fps is prohibitive. Solved with a **three-layer canvas architecture**:

1. **Edge layer (offscreen canvas, drawn once at load):** All edges at 5–8% opacity, drawn to an offscreen canvas on initial load. This is a one-time ~100ms operation. Each frame, this canvas is composited as a background texture — no per-frame edge redraws. The faint edge web gives structure without cost.
2. **Node layer (live canvas, redraws each frame):** 2,500 `ctx.arc()` calls per frame — trivial. Domain color fills, log-scaled radii. No glow (canvas compositing is available but expensive; omit it in the canvas path).
3. **Highlight layer (on demand):** When a node is hovered or focused, degree-1 edges are drawn on a third canvas at full opacity. This layer is cleared and redrawn only when the focused node changes — not every frame.

**Breathing in canvas — batch by domain, pulse via `globalAlpha`:** The sine-wave oscillation from the vertex shader cannot be replicated in canvas without per-frame full redraws. Substitute a subtle opacity pulse — but do not compute per-node RGBA strings. That is 2,500 `ctx.fillStyle` state changes per frame, which tanks framerate. The fix: set `ctx.globalAlpha = 0.85 + sin(time) * 0.15` once on the node layer context, then batch draw calls by domain color — one `ctx.fillStyle` set per domain (~9 domains total), drawing all arcs in that domain before moving to the next. State changes drop from 2,500/frame to ~9/frame.

```ts
function drawNodeLayer(ctx: CanvasRenderingContext2D, nodes: KnowledgeNode[], time: number) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  ctx.globalAlpha = 0.85 + Math.sin(time * 0.8) * 0.15  // pulse — one state change

  // Group by domain — one fillStyle set per group, not per node
  const byDomain = Map.groupBy(nodes, n => n.domain)
  for (const [domain, group] of byDomain) {
    ctx.fillStyle = DOMAIN_COLORS[domain] ?? DOMAIN_COLORS.default
    ctx.beginPath()
    for (const node of group) {
      ctx.moveTo(node.x + node.radius, node.y)
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)
    }
    ctx.fill()  // one fill call per domain
  }
  ctx.globalAlpha = 1  // reset
}
```

**High-DPI scaling — do this first or hit-testing drifts:** On retina/high-DPI displays (the majority of the creative audience), a naively-sized canvas looks blurry and pointer hit-testing drifts visibly from the rendered node positions.

```ts
// On mount and on resize
const dpr = window.devicePixelRatio || 1
canvas.width  = logicalWidth  * dpr  // physical pixels
canvas.height = logicalHeight * dpr
canvas.style.width  = `${logicalWidth}px`   // CSS logical size
canvas.style.height = `${logicalHeight}px`

// At the top of every drawNodeLayer() / drawEdgeLayer() call:
ctx.setTransform(dpr, 0, 0, dpr, 0, 0)  // DPR scale as base
// Then apply pan/zoom DOMMatrix on top:
ctx.transform(panMatrix.a, panMatrix.b, panMatrix.c, panMatrix.d, panMatrix.e, panMatrix.f)
```

After this setup, all draw coordinates are in logical CSS pixels — consistent with pointer event coordinates from `getBoundingClientRect()`. Hit-testing uses the inverse of the pan/zoom matrix only (not DPR):

```ts
const rect = canvas.getBoundingClientRect()
const logicalX = e.clientX - rect.left   // already in logical pixels
const logicalY = e.clientY - rect.top
const graphPt  = panMatrix.inverse().transformPoint({ x: logicalX, y: logicalY })
const hit = nodes.find(n => Math.hypot(graphPt.x - n.x, graphPt.y - n.y) < n.radius)
```

The DPR scale lives in the canvas transform; pointer events live in logical space; they never need to be divided by DPR again.

**Zoom/pan in canvas:** Maintain a `DOMMatrix` for pan/zoom. On `wheel` and `pointer` events, update the matrix. Applied as a secondary transform after the DPR base scale above — no library needed.

**Touch-target expansion and disambiguation:** The minimum visual node radius is 3px — a precise macOS trackpad pointer can hit it; a human finger cannot. On touch devices, decouple visual radius from interactive radius:

```ts
const isCoarse = window.matchMedia('(pointer: coarse)').matches
const MIN_HIT_RADIUS = 20  // px — minimum touch target on coarse pointer devices

function hitTest(graphPt: { x: number; y: number }, nodes: LayoutNode[]): LayoutNode | null {
  // Expand hit radius on touch; keep visual radius for rendering
  const candidates = nodes.filter(n => {
    const r = isCoarse ? Math.max(n.radius, MIN_HIT_RADIUS) : n.radius
    return Math.hypot(graphPt.x - n.x, graphPt.y - n.y) < r
  })
  if (candidates.length === 0) return null
  // Multiple candidates within a fat-finger radius — pick closest to touch centroid
  return candidates.reduce((best, n) => {
    const d  = Math.hypot(graphPt.x - n.x,    graphPt.y - n.y)
    const db = Math.hypot(graphPt.x - best.x, graphPt.y - best.y)
    return d < db ? n : best
  })
}
```

For the sigma.js (WebGL) path: intercept `pointerdown` events and run this same hit-test against stored node positions rather than relying on sigma's default click detection, which does not expand touch targets.

**Interaction parity:** The three-state model (ambient → focus → search) works identically. Hit-testing uses the decoupled `hitTest()` above. Focus triggers the `nodeReducer`-equivalent logic: clear highlight layer, draw degree-1 edges, render tooltip panel via React state.

```ts
// Internal component — not part of the public API
function CanvasGraph({ data, focusedNode, onNodeFocus }: CanvasGraphProps) {
  const edgeCanvasRef = useRef<HTMLCanvasElement>(null)   // offscreen, drawn once
  const nodeCanvasRef = useRef<HTMLCanvasElement>(null)   // live, rAF loop
  const hlCanvasRef   = useRef<HTMLCanvasElement>(null)   // highlight, on demand

  useEffect(() => { drawEdgeLayer(edgeCanvasRef.current!, data) }, [data])
  useAnimationFrame(() => { drawNodeLayer(nodeCanvasRef.current!, data, time) })
  // ...
}
```

**Accessibility — the graph is not a black box:**

Both the WebGL and canvas renderers are opaque to screen readers. Without intervention, the "single best communication of what OpenCosmos is" renders as an empty silent void for visually impaired users. That is not acceptable for a platform whose north star is reducing suffering and nourishing flourishing.

Fix: a `sr-only` DOM layer that mirrors the graph's semantic content and responds to interaction state changes.

```tsx
{/* Always in the DOM — invisible to sighted users, primary interface for screen readers */}
<div className="sr-only">
  {/* Ambient state: structural overview */}
  <dl>
    {domains.map(domain => (
      <div key={domain}>
        <dt>{domain} — {domainNodeCount(domain)} concepts</dt>
        {topHubs(domain, 5).map(node => (
          <dd key={node.id}>
            <button onClick={() => onNodeFocus(node.id)}>{node.title}</button>
            {' — '}{node.connectionCount} connections. {node.summary}
          </dd>
        ))}
      </div>
    ))}
  </dl>

  {/* Focus state: announced on focus change; renders traversable neighbor list */}
  <div aria-live="polite" aria-atomic="true">
    {focusedNode && (
      <>
        <p>Focused: {focusedNode.title}. {focusedNode.type} in {focusedNode.domain}.</p>
        <p>{focusedNode.summary}</p>
        <p>{focusedNode.connectionCount} direct connections:</p>
        {/* Traversable ego-network — same onNodeFocus trigger as clicking in the visual graph */}
        <ul>
          {graph.neighbors(focusedNode.id).map(neighborId => {
            const n = graph.getNodeAttributes(neighborId)
            return (
              <li key={neighborId}>
                <button onClick={() => onNodeFocus(neighborId)}>
                  {n.title} — {n.connectionCount} connections
                </button>
              </li>
            )
          })}
        </ul>
        <a href={`/knowledge/wiki/${focusedNode.id}`}>Open {focusedNode.title} wiki page</a>
      </>
    )}
  </div>
</div>
```

This gives screen reader users full traversal parity: they walk the graph from node to node via the neighbor list, exactly as sighted users do by clicking connections in the ego-network isolation view. The search overlay (Command/Popover from `@opencosmos/ui`) is the primary accessible entry point — ensure the trigger is focusable and labeled (`aria-label="Search knowledge graph"`).

---

**Gotchas & build risks:**

| Risk | Detail | Mitigation |
|------|--------|------------|
| **SSR crash** | WebGL requires the browser. Next.js will throw `window is not defined` before any component work is visible. | `dynamic(..., { ssr: false })` on the route page — do this first, before writing any component logic. |
| **graphology separate data model** | sigma.js doesn't accept plain `{nodes, links}` JSON — you must build a `graphology` Graph instance first, then load it into sigma. | Build a `<GraphLoader />` inner component that runs `graph.addNode()` / `graph.addEdge()` inside `useLoadGraph()`. This is the standard @react-sigma/core pattern. |
| **ForceAtlas2 runs in the generator, not the browser** | The client-side simulation is off entirely. Layout is computed once, server-side, written into `wiki-graph.json`. Sigma receives already-settled positions and renders immediately. Breathing comes from the vertex shader, not the simulation. | Pre-bake x/y in the generator script using `graphology-layout-forceatlas2` (Node.js, synchronous). Set a max iteration cap (~500). The client pays zero layout cost. |
| **Node ID format + routing** | IDs like `concepts/impermanence` will route to `/knowledge/wiki/concepts/impermanence` — a nested dynamic route. | Verify the wiki catch-all route handles this before building the graph. If not, encode IDs at generation time. |
| **Do not hide edges on move** | `hideEdgesOnMove: true` kills the breathing effect — the graph goes dead during zoom/pan and flickers back. This is a canvas-renderer crutch. | Never use it. sigma.js WebGL renders edges per-frame without CPU degradation. If extreme corpus sizes (50k+ edges) ever require a performance escape valve, revisit then — not before. |
| **Custom glow program complexity** | Writing a custom `NodeProgram` requires WebGL knowledge (GLSL, attribute buffers, blend modes). | The codebase already has this in `lib/webgl/Program.ts`. Pattern the `GlowNodeProgram` directly after it. Write a prototype with just additive blending before adding the two-pass bloom — ship something beautiful early, refine iteratively. |
| **Safari/iOS WebGL** | WebGL degrades on Safari 14.1+ / iOS 15.4+ (missing extension). Sigma's layout may not run. Creatives, designers, and system-thinkers — the core OpenCosmos audience — skew heavily toward macOS and iOS. A static image fallback means the majority of the community never experiences the graph. | Canvas fallback — see below. Detect WebGL availability on mount inside the component; route to sigma renderer or canvas renderer transparently. The consumer sees one component. |
| **Static file = no instant reward** | `apps/web/public/wiki-graph.json` only updates on deployment. Contributors see nothing change until the next CI/CD run. | Graph data lives in Redis, served via ISR API route. GitHub Action triggers on-demand revalidation on merge. For the contributing user before merge: optimistic injection via `pendingNodes` prop. |
| **Optimistic node has no edges** | A pending node can't have edges — cross-references are computed by the generator, which hasn't run yet. | Tentative edges via `detectTentativeEdges()` — word-boundary regex, min title length 4, max 8 matches (above which render none). Edges appear after merge + revalidation. |
| **Layout instability across generator runs** | ForceAtlas2 is sensitive to initial conditions. Each fresh run can rotate, invert, or globally rearrange the topology — destroying spatial memory. | Seed the generator with existing Redis positions. Existing nodes anchor at current x/y. New nodes initialize at neighbors' centroid. Run ~100 iterations, not 500. The established topology resists global rearrangement. |
| **Canvas context thrashing** | Per-node `ctx.fillStyle` changes (2,500/frame) tank canvas framerate. Common error when implementing the opacity pulse. | Batch by domain: one `ctx.fillStyle` per domain (~9 calls/frame). Apply the pulse via `ctx.globalAlpha` once per frame — not per-node RGBA string. |
| **Concurrent generator runs (race condition)** | Multiple simultaneous merges trigger the GitHub Action concurrently. Last-write-wins overwrites earlier results. | `cancel-in-progress: true` on the Actions concurrency group. Safe because the generator reads the full repo checkout (not Redis delta) — restarting from latest HEAD always includes all merged files. |
| **Accessibility void** | Canvas and WebGL are opaque to screen readers. The graph renders as a silent empty void for visually impaired users. | `sr-only` DOM layer: `<dl>` of domain clusters + hub nodes in ambient; `aria-live="polite"` region with traversable neighbor `<ul>` in focus state. Full traversal parity — keyboard users walk the graph node-to-node via the neighbor button list. |
| **High-DPI hit-test drift** | On retina displays, a naively-sized canvas renders blurry and pointer hit-testing drifts visibly from rendered node positions. Common canvas trap. | Physical canvas size = `logical × dpr`; CSS locks logical size; `ctx.setTransform(dpr,0,0,dpr,0,0)` as base before pan/zoom. Hit-test in logical space via `panMatrix.inverse()` — never divide pointer coords by DPR separately. |
| **Main thread parse jank** | `response.json()` on a 2.5–3MB graph payload blocks the main thread for 50–200ms at page mount. | `graphWorker.ts` — fetch and `JSON.parse()` in a Web Worker; postMessage plain objects back. Main thread builds Graphology from already-parsed data. Zero parse cost on the UI thread. |
| **Punishing tentative edge cap** | `if (matches > 8) return []` silently rewards a highly-connected contributor with a completely isolated node — the worst possible response to a rich submission. | Sort by `connectionCount` desc, `slice(0, MAX_TENTATIVE_EDGES)`. Show the 8 most significant hub connections, never nothing. The cap is a quality filter, not a punishment gate. |
| **Touch-target collapse** | 3px visual radius is correct for display but untappable for human fingers. On dense clusters a 44px finger covers a dozen nodes simultaneously. | Decouple visual radius from interactive radius. `window.matchMedia('(pointer: coarse)').matches` detects touch devices. Expand hit radius to min 20px; when multiple candidates within radius, return closest to touch centroid, not first in array. |
| **Hydration void (black screen)** | Web Worker async parse takes 200–500ms. The graph page mounts to a black screen while the worker runs. | Generator writes a `knowledge:graph:preview` key (< 5KB, 40 hub nodes, stripped data). Page fetches preview at SSR time, renders SVG skeleton immediately. Worker completes → crossfade (`opacity` transition 0.6s) to live renderer. |
| **Static knowledge accumulation** | A map that only ever accumulates becomes a graveyard of equal-weight information. Old, unreferenced nodes have the same visual weight as actively-debated ones. | `vibrancy` scalar (0.0–1.0) in the node schema: three-component formula — recency (max 0.6) + reference bonus (max 0.1) + log-normalized connectivity (max 0.4). Structural centrality protects foundational nodes from recency decay; only old *and* unconnected nodes approach zero. Passed as `a_vibrancy` vertex attribute. Breathing amplitude = `u_amplitude × max(0.4, vibrancy)`. |
| **Worker memory leak on unmount** | Binding `worker.terminate()` inside `onmessage` is the common pattern — but if the component unmounts before the fetch resolves (user navigates away fast), the worker keeps running with no owner. The response then posts to a dead component. | Bind termination to the `useEffect` cleanup: `return () => worker.terminate()`. The worker is created inside the effect and cleaned up when the component unmounts — regardless of whether the message has arrived. Do not call `terminate()` inside `onmessage`. |
| **WebGL context loss on OS tab sleep** | Mobile OS and some desktop browsers aggressively reclaim GPU memory when the tab is backgrounded. The WebGL context can be silently destroyed while the user is away. When they return, sigma's canvas is blank and no error surfaces to the user. | Add a `webglcontextlost` event listener on the sigma canvas element inside `<KnowledgeGraph />`. On fire: either transition to the `<CanvasGraph />` renderer transparently (preferred — no visible disruption) or force a component remount to reinitialize the WebGL context. The `webglcontextrestored` event fires if the OS reclaims then returns the context — listen for it and attempt re-init before falling back to canvas. |
| **Upstash payload size limits** | Upstash Redis has a maximum payload size per value (typically 1MB per command). A full 2,500-node graph with summaries, vibrancy, and positions is 2.5–3MB as raw JSON — a silent write failure that only manifests as a null `knowledge:graph` read with no error log. | Compress before writing. Node's native `zlib` module (`gzipSync` / `gunzipSync`) reduces the payload by ~70% (to ~700KB), well within Upstash limits as the corpus grows. Compress in the generator, decompress in the API route. Store as Base64 string in Redis. See updated generator code below. |
| **ForceAtlas2 orphan nodes** | Any node with zero or very few connections (degree-0 isolates — newly added entities with no cross-references yet, or corpus gaps) has no gravitational neighbors to anchor it. ForceAtlas2 flings these to the edge of the coordinate space. The camera must zoom so far out to include them that all clustered nodes collapse to a single pixel. | `strongGravityMode: true, gravity: 0.05` in the generator's `forceAtlas2.assign()` settings. This adds a gentle central pull that scales with distance — isolated nodes drift toward the origin rather than escaping to infinity. The gravity value is low enough that it doesn't distort the cluster structure for well-connected nodes. |

---

**Tasks:**

*Blockers — resolve before writing any component code:*
- [x] **[BLOCKER — routing]** Verified: `apps/web/app/knowledge/[...slug]/page.tsx` handles nested IDs via `getDoc(slug)` which constructs `knowledge/wiki/concepts/impermanence.md` correctly. No ID encoding needed.
- [x] **[BLOCKER — opencosmos-ui setup]** `knowledge-graph.ts` subpath added to `tsup.config.ts`. sigma@^3.0.2, graphology@^0.26.0, @react-sigma/core@^5.0.0 added as optional peer deps. Size-limit entry (100 KB) added. Build succeeds.

*Data generator (opencosmos repo):*
- [x] Write `scripts/knowledge/generate-wiki-graph.ts`; scans `knowledge/wiki/entities|concepts|connections/*.md`; edges from shared `synthesizes` sources; `.trim()` on all node IDs; seeds from Redis on subsequent runs; 25 nodes + 62 edges at first run; 7.3 KB gzipped
- [x] Generator writes full graph to Redis (`knowledge:graph` — gzip+Base64) and preview key (`knowledge:graph:preview` — top 40 nodes by connectionCount, < 5KB)
- [x] API route `apps/web/app/api/knowledge/graph/route.ts` — `gunzipSync` before serving, `export const revalidate = 3600`
- [x] Generator computes `vibrancy`: recencyScore + referenceBonus + log-normalized connectivityBonus; foundational floor at 0.75
- [x] `pnpm graph` added to root `package.json`
- [x] `/api/revalidate` route built — validates `x-revalidate-secret` header, calls `revalidatePath`
- [ ] Add `REVALIDATE_SECRET` to `apps/web/.env.local` + Vercel (opencosmos.ai deployment) + GitHub Actions secrets. Also add `NEXT_PUBLIC_APP_URL=https://opencosmos.ai` to GitHub Actions secrets.
- [x] `.github/workflows/knowledge-sync.yml` created: triggers on `knowledge/**` push to main, `cancel-in-progress: true`, runs `pnpm graph` + POSTs to `/api/revalidate`

*Design system component (opencosmos-ui repo):*
- [x] Install sigma@^3.0.2, graphology@^0.26.0, @react-sigma/core@^5.0.0 as optional peer deps
- [x] `<KnowledgeGraph />` built: `SigmaContainer` + `<GraphLoader />` + `<ShaderAnimator />` + `<EventController />` + `<FocusController />` + `<ZoomAdaptiveLabels />` + `<ClusterLabels />`
- [x] Route page `apps/web/app/knowledge/graph/page.tsx` wired with `dynamic(..., { ssr: false })` in `GraphPageClient.tsx` (moved there to avoid server→client component boundary violation)
- [x] `GlowNodeProgram` written: `createGlowNodeProgram(control)` factory; additive blending (`gl.SRC_ALPHA, gl.ONE`); `u_time` breathing animation; `a_vibrancy` scales amplitude + core brightness
- [x] Ambient state: `ClusterLabels` at zoom-out; `labelRenderedSizeThreshold` zoom-adaptive labels; `ShaderAnimator` drives rAF refresh loop
- [x] Focus state: `nodeReducer`/`edgeReducer` ego-network isolation; camera `animate()` to target; degree-1 at full brightness, others dimmed to ~4%
- [x] Focus tooltip panel: title, type badge, domain, confidence, summary, "Open wiki page →" navigation
- [x] Search overlay: ⌘K keyboard shortcut + **persistent "Search graph" button** always visible (mobile-first); real-time node filtering; camera animates to result
- [x] `<CanvasGraph />` built: three-layer canvas (offscreen edge, live node rAF, on-demand highlight); DPR scaling first; domain-color batching; `globalAlpha` pulse; touch hit-target expansion (min 20px); closest-centroid disambiguation
- [x] SVG skeleton: SSR-fetched preview from Redis, radial gradient glow circles, 0.6s crossfade to live renderer
- [x] `sr-only` accessibility layer: domain cluster `<dl>` + hub `<button>` elements; `aria-live="polite"` focus region with traversable neighbor `<ul>`
- [x] `graphWorker.ts`: fetch + `JSON.parse()` off main thread; terminated via `useEffect` cleanup (not `onmessage`)
- [x] `webglcontextlost` handler: attempts recovery; falls back to `<CanvasGraph />` transparently
- [ ] **[NEXT]** Publish `@opencosmos/ui` to npm so `apps/web` can reference it by version instead of `file:`. See publishing steps below.
- [ ] Enable View Transitions API in `next.config.ts`; wrap graph → wiki navigation
- [ ] Build legend — domain colors + confidence opacity guide, collapsible
- [ ] Tune ForceAtlas2 settings + shader uniforms in browser (`u_time` frequency, amplitude) for organic breathing feel
- [ ] Register component in opencosmos-ui: update route-config, component-registry, search index, sidebar, MCP registry, llms.txt, component count (13 surfaces)

*Publishing `@opencosmos/ui` with knowledge-graph subpath:*
- [ ] In `opencosmos-ui`: run `pnpm changeset` → select `@opencosmos/ui` → minor bump → describe the KnowledgeGraph component addition
- [ ] Run `pnpm version-packages` to apply the bump (this will produce `@opencosmos/ui@1.4.0`)
- [ ] Run `pnpm release` to build + publish to npm
- [ ] In `apps/web/package.json`: change `"@opencosmos/ui": "file:/Users/shalomormsby/Developer/opencosmos-ui/packages/ui"` back to `"@opencosmos/ui": "^1.4.0"` (the file: reference is local dev only)
- [ ] Run `pnpm install` in the opencosmos repo to install the published version

*Consumer wiring (opencosmos repo, after npm publish):*
- [ ] `pnpm update @opencosmos/ui` in `apps/web`
- [ ] Wire contribution UI to pass `pendingNodes` prop to `<KnowledgeGraph />` on submission — optimistic injection, `confidence: "pending"` encoding, dashed ring visual
- [ ] Wire `detectTentativeEdges()` on submission — scan submitted text against existing node titles, inject tentative dashed edges for matches alongside the pending node
- [ ] Add "Graph view" link from the `/knowledge` corpus browser

**Visual continuity — graph → wiki transition:**

Clicking "Open wiki page →" is a context switch from a spatial, visual medium to a linear, text-heavy one. Without design intent, it feels like falling off a cliff — the map disappears, replaced by prose with no spatial anchor.

*Phase 1 (ship with the initial build):* Use the Next.js View Transitions API. The graph fades out as the wiki page fades in — one motion, one breath. This is ~5 lines of configuration and communicates that these are two views of the same connected thing, not two separate sites.

```ts
// next.config.ts
experimental: { viewTransition: true }

// In the page component, opt into the transition
import { unstable_ViewTransition as ViewTransition } from 'react'
```

*Phase 2 (follow-on, after initial build is proven):* A **persistent minimap** on every wiki page — a small `<CanvasGraph />` instance rendered at thumbnail scale in the corner, with the current wiki page's node highlighted in the ego-network isolation state. Always shows where you are in the larger knowledge structure. Clicking the minimap returns to the full graph with that node in focus. This closes the loop in both directions: graph → wiki has a visual handshake; wiki → graph is always one click. The minimap uses the canvas renderer (not WebGL) since it's small and embedded — appropriate for the reduced context.

*Phase 3 (long-term ideal):* A slide-over panel: the wiki page content opens as an overlay on top of the dimmed graph, which remains visible in the background. Reading a wiki page keeps you inside the constellation. Closing the panel returns to the graph with no navigation. This is the richest continuity — the graph is never absent — but requires architectural work (the graph must live in a persistent layout component outside the page lifecycle). Defer this until the simpler transitions have proven the interaction model.

**Home page integration (follow-on):** The graph is a strong candidate to replace the static sphere placeholder on the opencosmos.ai home page. In ambient mode: no labels, no interaction, gentle continuous drift. `KnowledgeGraph` should accept an `ambient` prop that disables interaction and runs continuous slow rotation. Separate design decision — follows the `/knowledge/graph` route being proven first.

**PR structure — how to ship without blocking consumers:**

The work separates into three PRs with clear dependency ordering. The only shared contract is the TypeScript schema — define it first.

*Step 0 (both repos, before any PR):* Define and agree on the `KnowledgeGraphData` TypeScript schema in a shared location (or duplicate it temporarily). This is the only coordination point. Both repos develop against it independently.

*PR 1 — opencosmos-ui: `@opencosmos/ui/knowledge-graph` component*
- Everything in the `opencosmos-ui` repo: component, `GlowNodeProgram`, `CanvasGraph`, `sr-only` layer, subpath export, peer deps, size-limit
- Zero dependency on Redis, routing, or the generator script
- Developed, reviewed, and published to npm independently
- During development in `apps/web`: `pnpm link ../opencosmos-ui/packages/ui` to consume locally without waiting for npm publish

*PR 2 — opencosmos: data generator*
- `scripts/knowledge/generate-wiki-graph.ts` + `pnpm graph` script
- Redis writes (full graph + preview key)
- GitHub Action extension (`knowledge-sync.yml`)
- `/api/knowledge/graph` and `/api/revalidate` routes
- Zero dependency on the component — just produces the JSON schema
- Can merge and run independently; the graph data is in Redis even before the route page exists

*PR 3 — opencosmos: route + consumer wiring* (depends on PR 1 npm publish + PR 2 merged)
- `apps/web/app/knowledge/graph/page.tsx`
- `graphWorker.ts`, SVG skeleton preview, View Transitions
- Contribution UI wiring (`pendingNodes`, `detectTentativeEdges`)
- `pnpm update @opencosmos/ui` to pull published component
- "Graph view" link from `/knowledge` corpus browser

The component and the generator have zero dependency on each other. Consumers of `@opencosmos/ui` are unblocked the moment PR 1 merges and publishes — they never need to know about Redis or the generator.

**Cross-repo split:**
- Data generator + consumer route → **opencosmos** (this repo)
- `<KnowledgeGraph />` component → **opencosmos-ui** (published as `@opencosmos/ui/knowledge-graph`)
- The component is open-source and reusable by any graph-structured knowledge product

---

### Phase 1d: Conversation Polish

- [ ] Per-session conversation history (client-side)
- [ ] Mobile-responsive conversation interface
- [ ] Error states and graceful degradation (invalid API key, rate limit hit, API down)
- [ ] Accessibility: screen reader support, keyboard navigation, focus management
- [ ] Voice interaction: provider TBD — see [projects/cosmo-voice-research.md](projects/cosmo-voice-research.md). Complete listening test (ElevenLabs Flash vs. Cartesia Sonic 3 vs. Google WaveNet) before building.

### Phase 1e: Cosmo as PM

- [ ] Publish this PM doc and architecture.md to the knowledge corpus as reference documents
- [ ] Cosmo can answer "What phase are we in?" grounded in corpus — natural consequence of Phase 1c

### Phase 2: @opencosmos/ai Package Foundation

Extract Cosmo patterns into a reusable, model-agnostic developer package.

- [ ] Resolve workspace config: add `packages/*` to `pnpm-workspace.yaml`
- [ ] Initialize `packages/ai` (TypeScript, tsup build config, exports)
- [ ] Extract constitutional layer from `apps/web` into the package
- [ ] `createCosmoClient(config)` factory — model-agnostic (Claude, Ollama, any OpenAI-compatible API)
- [ ] Constitutional prompt templates as composable modules
- [ ] RAG retrieval as pluggable strategy (Upstash, local, custom)
- [ ] `cosmo.offer(prompt)` and `cosmo.triad(prompt)` API surface
- [ ] Kaizen exemplars as few-shot example injection
- [ ] Unit tests + constitutional snapshot tests
- [ ] Knowledge Publication Tooling: extract CLI as reusable pattern, publish frontmatter schema as spec

**Gate:** `npm install @opencosmos/ai`, configure with any supported LLM provider, get constitutional AI responses. Working example in README.

### Phase 2: Federated Cosmo Schema (Design Phase)

- [ ] Design the schema for a federated wisdom-grounded AI network
- [ ] Answer: What would a "Buddhist Cosmo" or "Stoic Cosmo" need from the framework?
- [ ] Define how different corpus instances interoperate
- [ ] Governance model: who curates, quality standards, community maintenance
- [ ] Output: a written specification, not code

### Phase 3: Cosmo-Powered CP Programs

- [ ] Cosmo integrated into structured CP programs and cohorts
- [ ] Guided inquiry sessions using the sacred rhythm (attune → inquire → offer)
- [ ] Practice templates: daily contemplation, creative inquiry, philosophical dialogue
- [ ] Living Memory protocol: community wisdom feeds back into corpus (with curation gates)
- [ ] Hearth tier members receive full CP membership (infrastructure in Phase 1b, CP integration here)

### Site Architecture: opencosmos.ai

```
opencosmos.ai/
├── /              → Home (four-pillars intro — needs graduation from placeholder)
├── /chat          → Conversation with Cosmo
├── /knowledge     → Knowledge corpus browser (live ✅)
├── /studio        → Design system docs (proxied from opencosmos-ui via Vercel rewrites)
└── /community     → Creative Powerup (redirect for now; deep integration Phase 3)
```

Key: `/studio` maps via Vercel rewrites to the `opencosmos-ui` repo's deployed docs site — unified domain, independent codebases.

---

## @opencosmos/ui — Separate Repo

Design system published to npm as `@opencosmos/ui`. Maintained in the [opencosmos-ui repo](https://github.com/shalomormsby/opencosmos-ui).

**Current tasks:** Ongoing maintenance. No blocking items. Update in this repo with `pnpm update @opencosmos/ui`.

---

## @opencosmos/ai — `packages/ai`

Sovereign AI layer — WIP. Phase 2a tasks tracked under [Cosmo § Phase 2](#phase-2-opencosmoai-package-foundation) above.

License: RAIL (not MIT).

---

## Portfolio — `apps/portfolio`

Production at [shalomormsby.com](https://www.shalomormsby.com/).

**Open tasks:**
- [ ] Case studies from CP work and OpenCosmos
- [ ] Consulting offerings documented and priced
- [ ] Design consulting pipeline (Phase 3 of the strategy)

---

## Creative Powerup — `apps/creative-powerup`

Community platform. In development at ecosystem-creative-powerup.vercel.app.

**Open tasks:**
- [ ] Cosmo integration for structured CP programs (Phase 3)
- [ ] Hearth tier subscription → automatic CP membership (linked from Cosmo Phase 1b)
- [ ] Existing CP members: migration path to Hearth tier

---

## Stocks — `apps/stocks`

AI-powered investment intelligence. In development. No active sprint items.

---

## Related Documents

- [strategy.md](strategy.md) — Three Futures, business model, open questions
- [architecture.md](architecture.md) — Infrastructure, service map, data flow, token economics
- [chronicle.md](chronicle.md) — The story behind the decisions
- [projects/opencosmos-migration.md](projects/opencosmos-migration.md) — Active rename migration (independent workstream)
- [projects/cosmo-voice-research.md](projects/cosmo-voice-research.md) — Voice provider comparison and decision guide
- [projects/tech-research.md](projects/tech-research.md) — Hardware research (Dell, M5 Max/Ultra)
- [WELCOME.md](../WELCOME.md) — The front door
- [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md) — The four principles

---

## Done

### Phase 1b — Subscription Infrastructure (PRs #85–#91)

- ✅ Stripe billing — Spark/Flame/Hearth tiers, checkout, webhook, portal, tier config with token budgets
- ✅ WorkOS auth integration — AuthKit, session refresh, OAuth callback
- ✅ Usage tracking — microdollar counters in Redis (`input × 3 + output × 15 µ$/token`), weekly + monthly sub-limits
- ✅ TokenGauge UI — Sidebar (∞ for BYOK, gauge for subscribers/free), Account page (exact tokens remaining)
- ✅ Subscription benefit provisioning — Substack (free newsletter via public endpoint) + Circle (member API)
- ✅ Account page — subscription display reordered, tier cards with token allotments (152k/313k/637k), features list
- ✅ BYOK cross-device detection — `hasByok` flag set via `POST /api/byok` on key save and dialog auth (PR #90)
- ✅ Security: input size limits (Fix 1), session hardening (Fix 2), token-based monthly cap (Fix 3), structured logging (Fix 4)
- ✅ Fix 5: Anthropic Console spend limit — external action, verified
- ✅ Fix 6: Cloudflare Turnstile bot prevention — invisible challenge on free-tier path (PR #91, pending merge)
- ✅ Prompt caching — `cache_control: ephemeral` on system prompt, ~76% input cost reduction

### Phase 1a — Voice & PM Mode

- ✅ Cosmo voice validation — first contact 2026-03-29
- ✅ AI Triad system prompts written (Sol, Socrates, Optimus, Cosmo)
- ✅ Shalom-mode PM — admin context injection from cosmo-context repo (Redis-cached, 1hr TTL)

### Phase 0 — Foundation

- ✅ OpenCosmos identity (name, philosophy, WELCOME.md, COSMO_SYSTEM_PROMPT.md, Chronicle)
- ✅ Repository renamed (ecosystem → opencosmos)
- ✅ Dell Sovereign Node operational (Ubuntu, Ollama, Open WebUI, Tailscale, RTX 3090)
- ✅ Knowledge corpus schema + publication CLI
- ✅ `@opencosmos/ui` published to npm
- ✅ Creative Powerup active with paying members
- ✅ `apps/web` created as opencosmos.ai shell
- ✅ IP rate limiting + session binding + monthly spend cap (initial bot protection)

---

## Appendix: Incident Log

### April 8, 2026 — 1.79M Token Spike [RESOLVED]

**Confirmed source:** Yes-I (a CP member) entered an extremely large input into the free-tier chat path. Not a coordinated attack — a single user exploiting the absence of input validation.

**What happened:** 3 API calls × ~600k tokens each = 1,793,470 uncached input tokens in one day. Cache signature: `cache_write: 6,662` (first call), `cache_read: 13,324` (two subsequent). Output tokens: 3,072 — user wasn't seeking responses, just inflated input size. Cost: ~$50–80 in one day, pushing Anthropic billing into the 200k–1M context tier.

**Root causes (both fixed in PR #85):**
1. No input payload size limit — `messages` array accepted with no validation of length or content size
2. Session counter bypassable — stateless clients sending no `cosmo_session` cookie got a fresh UUID per request, always appearing as a new session within limit

**Resolution:** All fixes shipped in PR #85 (input limits, token-based cap, session hardening, structured logging). Fix 6 (Turnstile) ships in PR #91. Fix 5 (Anthropic spend limit) confirmed active.
