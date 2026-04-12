---
title: "Knowledge Graph"
role: guide
format: manual
domain: opencosmos
tags: [knowledge-graph, visualization, sigma, webgl, redis, wiki, data-pipeline, engineering]
audience: [engineer, creator]
complexity: intermediate
summary: >
  Complete guide to the OpenCosmos knowledge graph — a live WebGL constellation of every
  wiki entity, concept, and connection. Covers the data pipeline from wiki markdown to
  Upstash Redis to the sigma.js renderer, how to run the generator locally, how to add
  new wiki articles and see them appear, and what is needed to ship to production.
curated_at: 2026-04-11
curator: shalom
source: original
corpus_tier: source
related_docs:
  - guides/opencosmos-knowledge-wiki-workflow.md
  - guides/opencosmos-knowledge-tooling-overview.md
  - guides/opencosmos-scripts-reference.md
---

# Knowledge Graph

The knowledge graph is a live, interactive visualization of the OpenCosmos wiki — every entity, concept, and connection rendered as a glowing constellation on a dark canvas. It lives at `opencosmos.ai/knowledge/graph` and updates automatically when wiki articles are merged to `main`.

This guide explains what it is, how it works, and how to maintain it.

---

## What It Is

The graph represents the **wiki** (`knowledge/wiki/`), not the source corpus (`knowledge/sources/`). Every markdown file in `wiki/entities/`, `wiki/concepts/`, and `wiki/connections/` becomes a node. Edges are inferred from shared synthesized sources — two nodes are connected if they both cite the same source document in their frontmatter.

The result is a force-directed map of intellectual kinship: nodes that share lineage cluster together, nodes that bridge traditions sit at the crossroads, isolated nodes float at the periphery.

### Visual Design

- **Glowing nodes** — each domain has its own color; node size reflects connection count; a breathing animation (synchronized per-node, offset by hash) gives the graph a living quality
- **Constellation aesthetic** — additive blending (`gl.SRC_ALPHA, gl.ONE`) makes overlapping nodes bloom instead of occlude
- **Focus mode** — clicking a node isolates its ego-network; camera animates to center it; neighbors pulse at full opacity
- **Search overlay** — ⌘K (or the "Search graph" button on mobile) opens a fuzzy-search panel over the graph
- **Canvas fallback** — Safari and iOS do not always support the WebGL extensions sigma requires; the graph silently falls back to a three-layer canvas renderer with equivalent visuals

---

## The Data Pipeline

```
knowledge/wiki/**/*.md
        │
        ▼
scripts/knowledge/generate-wiki-graph.ts   (pnpm graph)
        │  — reads frontmatter + ## Summary
        │  — infers edges from shared sources
        │  — runs ForceAtlas2 layout (graphology)
        │  — seeds positions from existing Redis data (layout stability)
        │  — computes vibrancy score per node
        │  — writes gzip+Base64 payload to Upstash Redis
        │
        ├──▶ knowledge:graph          (full graph, gzip+Base64, ~7 KB at 25 nodes)
        └──▶ knowledge:graph:preview  (top-40 nodes, plain JSON, for SSR skeleton)
                │
                ▼
        apps/web/app/api/knowledge/graph/route.ts
                │  — server route, 1h ISR revalidation
                │  — gunzips and streams raw JSON
                │
                ▼
        apps/web/app/knowledge/graph/graphWorker.ts
                │  — Web Worker fetches /api/knowledge/graph
                │  — parses JSON off the main thread
                │  — posts parsed data back to main thread
                │
                ▼
        @opencosmos/ui/knowledge-graph   (KnowledgeGraph component)
                │  — builds graphology graph from nodes + links
                │  — detects WebGL availability
                │  — renders sigma.js or CanvasGraph fallback
                │  — crossfades from SVG skeleton on first load
```

---

## Running the Generator Locally

```bash
# From the repo root
pnpm graph
```

This runs `scripts/knowledge/generate-wiki-graph.ts` via `tsx`. It reads every `.md` file in `knowledge/wiki/entities/`, `knowledge/wiki/concepts/`, and `knowledge/wiki/connections/`, computes the graph, and writes to Upstash Redis.

**Prerequisites:**

```bash
# .env at repo root
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

**Expected output:**

```
[graph] Reading wiki articles…
[graph] 25 nodes, 62 edges
[graph] Running ForceAtlas2 layout (100 iterations)…
[graph] Vibrancy computed (max: 0.91, median: 0.78)
[graph] Writing to Redis…
[graph] knowledge:graph → 7.3 KB gzipped
[graph] knowledge:graph:preview → 40 nodes
[graph] Done in 1.8s
```

Once the generator finishes, start the web app:

```bash
pnpm dev --filter web
# → http://localhost:3000/knowledge/graph
```

The graph page will load the SVG skeleton (from Redis preview) immediately, then fetch the full graph in a Web Worker and crossfade to the live sigma renderer.

---

## How New Wiki Articles Appear

1. **Write the article** following the [wiki workflow guide](opencosmos-knowledge-wiki-workflow.md). Place it in `knowledge/wiki/entities/`, `knowledge/wiki/concepts/`, or `knowledge/wiki/connections/`.

2. **Include `synthesized_from` frontmatter** — this is what creates edges:
   ```yaml
   synthesized_from:
     - sources/philosophy-the-republic.md
     - sources/taoism-tao-te-ching.md
   ```
   Any two articles that share a source will be connected in the graph.

3. **Run `pnpm graph`** locally to regenerate and push to Redis, then verify at `localhost:3000/knowledge/graph`.

4. **Merge to `main`** — the GitHub Action (`.github/workflows/knowledge-sync.yml`) detects changes under `knowledge/**`, runs `pnpm graph` automatically, and calls `POST /api/revalidate` to trigger ISR. The live graph at `opencosmos.ai` updates within seconds.

---

## Vibrancy

Each node has a **vibrancy score** (0–1) that controls how strongly it breathes in the constellation animation and how prominently its glow blooms. It is computed from three components:

| Component | Weight | Source |
|-----------|--------|--------|
| Recency | up to 0.6 | Days since `curated_at` frontmatter (decays to 0 after ~2 days) |
| Reference density | up to 0.1 | Number of `synthesized_from` sources |
| Connectivity | up to 0.4 | Log-normalized connection count relative to the most-connected node |

**Foundational floor:** Any node in `wiki/entities/` (primary thinkers, primary texts) has its raw score raised to a minimum of 0.75, so foundational nodes never fade into the background regardless of age.

High vibrancy: a recently-updated, heavily-connected concept article.
Low vibrancy: a newly-created entity with no connections yet.

---

## Domain Colors

Nodes are colored by domain — set in the `domain` frontmatter field of each wiki article. The color palette lives in `@opencosmos/ui/knowledge-graph` as `DOMAIN_COLORS`.

| Domain | Color | Hex |
|--------|-------|-----|
| `philosophy` | Warm amber | `#f4a261` |
| `literature` | Sky blue | `#6b9ee8` |
| `buddhism` | Sage green | `#74c69d` |
| `taoism` | Forest green | `#52b788` |
| `cross` | Soft violet | `#c77dff` |
| `vedic` | Coral | `#e76f51` |
| `indigenous` | Earth brown | `#c9a96e` |
| `ecology` | Teal | `#48cae4` |
| `default` | Muted grey | `#8b949e` |

To add a new domain: add an entry to `DOMAIN_COLORS` in `packages/ui/src/components/data-display/knowledge-graph/constants.ts` in the `opencosmos-ui` repo, publish a new version, and update the version ref in `apps/web/package.json`.

---

## The Rendering Stack

### WebGL Path (sigma.js v3)

The primary renderer uses [sigma.js v3](https://www.sigmajs.org/) with a custom `GlowNodeProgram` written in GLSL:

- **Vertex shader** — positions each node with a sinusoidal offset that varies by `nodeIndex` (deterministic per-session breathing, not synchronized jank); amplitude is modulated by `vibrancy`
- **Additive blending** — overlapping nodes bloom rather than occlude, producing the constellation effect
- **ForceAtlas2 layout** — computed server-side by the generator, not in the browser; positions are stable across reloads (seeded from existing Redis data)
- **Camera animation** — focus mode uses sigma's camera API to animate to the selected node at `ratio: 0.3` (zoom in)

### Canvas Fallback (three-layer canvas)

When WebGL is unavailable:

- **Edge layer** (offscreen canvas, drawn once) — all edges, then composited
- **Node layer** (rAF loop) — domain-batched circles with pulsing `globalAlpha`
- **Highlight layer** (on-demand) — redrawn only when selection changes

Hit testing respects coarse pointer devices: on touch screens, the hit radius is `max(node.radius, 20px)` to ensure tappability.

### SVG Skeleton (SSR)

On first page load, before the Web Worker has parsed the full graph, a lightweight SVG skeleton is rendered from the Redis preview data (top 40 nodes by connection count). This is generated server-side in `page.tsx` and appears immediately — no layout shift, no blank screen. The skeleton crossfades out as the live sigma graph fades in (600ms transition).

### Web Worker

Parsing a 2–3 MB JSON payload on the main thread blocks the UI for 80–150ms. The graph JSON is fetched and parsed in a dedicated Web Worker (`graphWorker.ts`), which posts the parsed data to the main thread when ready. The worker is created in a `useEffect` and terminated in the cleanup function.

---

## File Map

| Path | What it is |
|------|-----------|
| `scripts/knowledge/generate-wiki-graph.ts` | Generator — reads wiki, writes Redis |
| `apps/web/app/knowledge/graph/page.tsx` | Server component — fetches preview, renders skeleton |
| `apps/web/app/knowledge/graph/GraphPageClient.tsx` | Client component — orchestrates Worker + KnowledgeGraph |
| `apps/web/app/knowledge/graph/graphWorker.ts` | Web Worker — fetches + parses full graph JSON |
| `apps/web/app/knowledge/graph/domain-colors.ts` | Local copy of `DOMAIN_COLORS` (see note below) |
| `apps/web/app/api/knowledge/graph/route.ts` | API route — decompresses and streams graph JSON |
| `apps/web/app/api/revalidate/route.ts` | API route — triggers ISR on POST from GitHub Actions |
| `.github/workflows/knowledge-sync.yml` | CI — runs generator on `knowledge/**` push |
| `packages/ui/src/components/data-display/knowledge-graph/` | `@opencosmos/ui` component (opencosmos-ui repo) |

### Why `domain-colors.ts` is local

`DOMAIN_COLORS` is a plain constant object — no WebGL, no React. But it lives in `@opencosmos/ui/knowledge-graph`, which re-exports from sigma. Even though `KnowledgeGraph` itself is wrapped in `dynamic({ ssr: false })`, Next.js/Turbopack still traces the static import chain of every client component during the server build. That trace reaches sigma's module-level code, which references `WebGL2RenderingContext` — a browser global that doesn't exist on the server — and crashes the build.

Keeping `DOMAIN_COLORS` in a local file breaks the import chain: the server component graph never touches sigma. The `dynamic()` import is the only path that reaches the package, and it only runs in the browser.

**If you update `DOMAIN_COLORS` in `@opencosmos/ui`,** remember to mirror the change in `apps/web/app/knowledge/graph/domain-colors.ts`.

---

## Environment Variables

| Variable | Where to set | Purpose |
|----------|-------------|---------|
| `UPSTASH_REDIS_REST_URL` | `.env`, Vercel (opencosmos.ai), GitHub Actions secret | Redis connection |
| `UPSTASH_REDIS_REST_TOKEN` | `.env`, Vercel (opencosmos.ai), GitHub Actions secret | Redis auth |
| `REVALIDATE_SECRET` | `.env.local`, Vercel (opencosmos.ai), GitHub Actions secret | Guards `/api/revalidate` |
| `NEXT_PUBLIC_APP_URL` | `.env.local`, GitHub Actions secret | Base URL for revalidation curl (`https://opencosmos.ai`) |

The `REVALIDATE_SECRET` should be a random string (e.g., `openssl rand -hex 32`). The GitHub Actions workflow sends it as `x-revalidate-secret` in the curl POST after each graph generation.

---

## Automatic Updates (GitHub Actions)

The workflow at `.github/workflows/knowledge-sync.yml` triggers on any push to `main` that touches `knowledge/**`. It:

1. Checks out the repo
2. Installs dependencies (`pnpm install --frozen-lockfile`)
3. Runs `pnpm graph` (writes to Redis)
4. Calls `curl -X POST $NEXT_PUBLIC_APP_URL/api/revalidate` with `x-revalidate-secret` header

The `concurrency.cancel-in-progress: true` setting means rapid wiki edits don't queue up — only the latest push runs.

After the workflow completes, `opencosmos.ai/knowledge/graph` serves the updated graph within the ISR revalidation window (1 hour max, usually seconds via the explicit revalidation call).

---

## Production Checklist

The graph is fully implemented. Before it works in production, complete these steps:

- [ ] **Publish `@opencosmos/ui@1.4.0`** — the `KnowledgeGraph` component and `knowledge-graph` subpath export live in the `opencosmos-ui` repo. Run `pnpm changeset` there, merge the changeset PR, and the npm publish will fire automatically. Then update `apps/web/package.json` from `file:` to `^1.4.0`.
- [ ] **Install sigma.js dependencies** — `@react-sigma/core`, `sigma`, `graphology`, `graphology-layout-forceatlas2` are peer deps. After switching from `file:` to the npm version, install them in `apps/web/`: `pnpm add sigma graphology @react-sigma/core graphology-layout-forceatlas2 --filter web`
- [ ] **Add environment variables to Vercel** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REVALIDATE_SECRET` on the opencosmos.ai deployment
- [ ] **Add GitHub Actions secrets** — `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `REVALIDATE_SECRET`, `NEXT_PUBLIC_APP_URL=https://opencosmos.ai`
- [ ] **Run `pnpm graph` once** to seed the initial Redis data before deploying
- [ ] **Deploy and verify** — navigate to `opencosmos.ai/knowledge/graph`, check the skeleton appears immediately, check the sigma graph crossfades in after ~1s

---

## Troubleshooting

**"Graph unavailable" error on the page**

The Web Worker failed to fetch `/api/knowledge/graph`. Usually means:
- `UPSTASH_REDIS_REST_URL` or `UPSTASH_REDIS_REST_TOKEN` is missing from the Vercel deployment
- `pnpm graph` has never been run (Redis key does not exist)
- The `knowledge:graph` Redis key expired (it has no TTL by default — check the Upstash console)

**Graph loads but is empty / shows only a few nodes**

`pnpm graph` only indexes `knowledge/wiki/**/*.md`. Wiki articles must be in `entities/`, `concepts/`, or `connections/` subdirectories. Source corpus files (`knowledge/sources/`) do not become nodes.

**Node positions scramble on every regeneration**

The generator seeds positions from existing Redis data. If `UPSTASH_REDIS_REST_URL` is missing when running locally, it falls back to random seeding. Check your `.env`.

**Skeleton appears but live graph never loads**

Check browser DevTools → Application → Service Workers; look for a stale worker. Hard-reload with Cmd+Shift+R. If the issue persists, check that the `graphWorker.ts` Web Worker build is included in the Next.js bundle (it should be, via `new URL('./graphWorker.ts', import.meta.url)`).

**Canvas fallback looks different from screenshots**

Expected — the canvas fallback is a faithful reproduction of the sigma aesthetic but not pixel-identical. The breathing animation uses `globalAlpha` pulsing rather than GLSL vertex offsets, and lacks the additive bloom. It is designed for correctness and accessibility, not visual parity.
