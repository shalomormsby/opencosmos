---
title: "Constellation (Cosmograph)"
role: guide
format: manual
domain: opencosmos
tags: [constellation, cosmograph, knowledge-graph, visualization, webgl, upstash, vector, tuning, reference]
audience: [engineer, creator, ai]
complexity: intermediate
summary: >
  Reference manual for the OpenCosmos Constellation — the WebGL knowledge graph rendered by
  @opencosmos/constellation (a React wrapper around @cosmos.gl/graph). Documents the six-tier
  hierarchy, every styling and LOD setting with current values, the data pipeline from corpus
  frontmatter through Upstash Vector to the rendered graph, and exact file locations for
  fine-tuning. Designed to be scannable by both humans and AIs.
curated_at: 2026-05-08
curator: shalom
source: original
corpus_tier: source
related_docs:
  - guides/opencosmos-knowledge-graph.md
  - guides/opencosmos-rag-architecture.md
  - guides/opencosmos-knowledge-tooling-overview.md
---

# Constellation (Cosmograph)

The **Constellation** is OpenCosmos's living knowledge-graph visualization — the corpus rendered as a navigable starfield where every tradition, work, section, and quote occupies a place in a coherent three-domain hierarchy. It is built on the [@cosmos.gl/graph](https://cosmosgl.github.io/graph) engine (the open-source WebGL force-directed graph engine that also powers the commercial **Cosmograph** product), wrapped in a React package called [@opencosmos/constellation](#packageopencosmosconstellation).

This guide is the canonical reference for understanding, operating, and tuning the constellation. It supersedes the older [Knowledge Graph](opencosmos-knowledge-graph.md) guide (which documents the legacy sigma.js renderer being phased out).

> **Quick start for tuning:** jump to [Settings reference](#settings-reference) for the current values of every color, size, opacity, and zoom threshold, and the file path that holds each one.

---

## What it is

The constellation renders **700 nodes / 925 edges** of corpus structure as a force-directed graph against a near-black canvas. The rendering layer is purely visual; all the meaning lives in the underlying data:

- **3 domain nodes** — Wisdom · Literature · Science (the highest-level anchors)
- **23 tradition nodes** — Stoicism, Buddhism, Elizabethan, etc., with Philosophy as a special umbrella
- **84 work nodes** — every standardized source document
- **514 section nodes** — H2 headings inside works
- **46 quote nodes** — verified embeddable quotes
- **30 synthesis nodes** — wiki concepts and entities that weave works across traditions

Edges connect parents to children (`hierarchy`), works to their structural parts (`contains`), wiki bridges to the works they weave (`synthesizes`), quotes to their tradition (`member_of`), and works to their cosine-similarity neighbors via the Upstash Vector index (`semantic`).

---

## Architecture

```
┌───────────────────────────────────────────────────────────────────────────┐
│   knowledge/                                                              │
│   ├── sources/*.md     ← 84 works, frontmatter declares `tradition:`     │
│   ├── wiki/{entities,concepts,connections}/*.md  ← 30 synthesis bridges  │
│   └── quotes/*.yaml    ← 46 verified quotes (per author)                 │
└────────────────────────────────┬──────────────────────────────────────────┘
                                 │
       ┌─────────────────────────┴─────────────────────────┐
       ▼                                                   ▼
┌──────────────────────────┐              ┌──────────────────────────────┐
│ pnpm graph:constellation │              │       pnpm embed             │
│ (generator script)       │              │  (RAG embedding pipeline)    │
│                          │              │                              │
│ scripts/knowledge/       │              │ scripts/knowledge/           │
│  generate-constellation- │              │  embed-knowledge.ts          │
│  graph.ts                │              │                              │
│                          │              │ Chunks every md/yaml at H2/  │
│ Reads frontmatter,       │              │ H3/H4 boundaries, embeds via │
│ applies hierarchy        │              │ BGE_M3 (1024-dim cosine).    │
│ config, runs ForceAtlas2.│              │                              │
└──────────┬───────────────┘              └──────────────┬───────────────┘
           ▼                                              ▼
┌──────────────────────────┐              ┌──────────────────────────────┐
│  Upstash Redis           │              │   Upstash Vector             │
│  knowledge:constellation │◄─────────────┤   3,715 chunks               │
│  (gzipped graph payload) │  (semantic   │   chunk metadata.domain      │
│                          │   edge pass  │     derived via shared       │
│                          │   queries    │     resolveDomainForTradition│
│                          │   per work)  │                              │
└──────────┬───────────────┘              └──────────────────────────────┘
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  apps/web/app/api/knowledge/constellation/route.ts (consumer repo)   │
│  Serves the gzipped payload as JSON to the renderer.                 │
└──────────┬───────────────────────────────────────────────────────────┘
           ▼
┌──────────────────────────────────────────────────────────────────────┐
│  @opencosmos/constellation (opencosmos-ui repo)                      │
│  React wrapper around @cosmos.gl/graph.                              │
│  Renders WebGL canvas; HTML label overlay; tier-aware LOD;           │
│  ambient drift; focus targeting.                                     │
└──────────────────────────────────────────────────────────────────────┘
```

### What is Cosmograph?

**Cosmograph** is the commercial brand name for the GPU force-directed graph engine developed by OpenJS Foundation member [cosmosgl](https://github.com/cosmosgl/graph). The same engine ships open-source under MIT as `@cosmos.gl/graph` — that's what we use. Our React wrapper, `@opencosmos/constellation`, gives the engine an idiomatic React API and adds OpenCosmos-specific features (tier-aware coloring, sized hierarchy, LOD label overlay, ambient drift, focus targeting).

The constellation isn't *Cosmograph the product* — it's our community-friendly free wrapper around the same MIT engine. (The licensed Cosmograph product is CC BY-NC 4.0, which we explicitly avoid.)

### Relationship to the Upstash Vector index

The Upstash Vector index has a dual role:

1. **Cosmo's RAG retrieval.** Every chunk is embedded with BGE_M3 (1024-dim cosine), with metadata that includes the chunk's derived domain. Cosmo queries this index for context when responding to user prompts. (See [opencosmos-rag-architecture.md](opencosmos-rag-architecture.md) for the retrieval side.)
2. **Constellation semantic edges.** The generator queries Upstash Vector once per work (~84 queries during a full graph regen) to find each work's cosine-similarity neighbors. The top 3 distinct neighbor works become `semantic` edges — the soft white underlayer beneath the curated structural and wiki edges.

The vector index is the **single source of truth for embeddings**. It does not store hierarchy, tier, or any constellation-specific metadata — chunks just carry `domain`, `tradition`, `tags`, `text`, and so on. Hierarchy lives in the generator's config (see [Tradition → domain mapping](#tradition-→-domain-mapping)).

---

## The hierarchy

### Three domains (top-level)

| Domain | Node label | Node ID | Direct tradition children |
|---|---|---|---|
| **wisdom** | "Wisdom" | `domain/wisdom` | philosophy *(umbrella)*, buddhism, taoism, sufism, quakerism, vedanta, vedic, celtic, transcendentalism, christian-anarchism, romantic-mysticism |
| **literature** | "Literature" | `domain/literature` | elizabethan, german-romanticism, psychological-realism, heian-court-literature, european-orientalism, art |
| **science** | "Science" | `domain/science` | history-of-computing, engineering, psychology, ecology |

### Tradition nesting (umbrella)

Philosophy is the only umbrella tradition — it sits between Wisdom and the four formal philosophical schools.

| Parent tradition | Children |
|---|---|
| **philosophy** | platonism, stoicism, rationalism, german-idealism |

The umbrella structure means Stoicism is reached from Wisdom *via* Philosophy: `wisdom → philosophy → stoicism → meditations`. ForceAtlas2 pulls Stoicism toward Philosophy (direct edge) and Philosophy toward Wisdom (direct edge). Etymologically appropriate — "philosophy" literally means "love of wisdom".

### Tradition → domain mapping

The full mapping lives in [scripts/knowledge/tradition-domain.ts](../../scripts/knowledge/tradition-domain.ts) as `TRADITION_TO_DOMAIN` (direct) and `TRADITION_TO_PARENT_TRADITION` (nested). The generator and `embed-knowledge.ts` both import the helper `resolveDomainForTradition(tradition)` from this file — there is no duplication.

To add a new tradition:
1. Edit the source frontmatter `tradition:` field on the relevant work(s).
2. Add an entry to `TRADITION_TO_DOMAIN` (or `TRADITION_TO_PARENT_TRADITION` if it's a sub-school of Philosophy or another umbrella).
3. Run `pnpm embed && pnpm graph:constellation`.

---

## Settings reference

> **All current values as of 2026-05-08.** Tweak by editing the file paths shown — no other changes required.

### Tier styling

Drives node color, node size, label appearance threshold, and label typography.

| Tier | Node color | Node size | Label LOD | Label color | Label style |
|---|---|---|---|---|---|
| **domain** | `#ffd89c` *(brightest amber)* | 16 | **≥ 0×** | `rgba(255,255,255,1.0)` | 15 px · weight 700 · UPPERCASE · letter-spacing 0.04em |
| **tradition** | `#f4c87b` *(warm amber)* | 12 | **≥ 1.0×** | `rgba(255,255,255,0.95)` | 13 px · weight 600 · letter-spacing 0.02em |
| **synthesis** | `#79e0c2` *(mint)* | 9 | **≥ 1.31×** | `#79e0c2` *(mint, matches node)* | 12 px · weight 500 · letter-spacing 0.01em |
| **work** | `#7aa2ff` *(primary blue)* | 6 | **≥ 2.0×** | `rgba(255,255,255,0.85)` | 11 px · weight 500 |
| **section** | `#9d8df1` *(muted violet)* | 2.5 | **≥ 4.5×** | `rgba(255,255,255,0.70)` | 10 px · weight 400 |
| **quote** | `#a8b3c7` *(pale slate)* | 1.5 | **≥ 6.0×** | `rgba(255,255,255,0.60)` | 9 px · italic · max-width 180px ellipsis |

**Files:**
- Node colors + sizes: [`packages/constellation/src/theme/palettes.ts`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/theme/palettes.ts) (`DEFAULT_TIER_COLORS`, `DEFAULT_TIER_SIZES`).
- Label LOD thresholds: [`packages/constellation/src/lod/defaults.ts`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/lod/defaults.ts) (`DEFAULT_LOD_VISIBILITY`).
- Label typography: [`packages/constellation/src/labels/LabelLayer.tsx`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/labels/LabelLayer.tsx) (`applyTierStyle`).

**Visible label sets at each zoom range:**

| Zoom range | Visible label tiers |
|---|---|
| 0 – 1.0× | domain (3 labels) |
| 1.0 – 1.31× | + tradition (26 labels) |
| 1.31 – 2.0× | + synthesis (56 labels) |
| 2.0 – 4.5× | + work (140 labels max — capped at 100 by density cap) |
| 4.5 – 6.0× | + section (capped at 100, prioritized by degree) |
| ≥ 6.0× | + quote (capped at 100) |

The 100-label viewport-density cap is in `LabelLayer.tsx` as `MAX_VISIBLE_LABELS`.

### Edge styling

Drives edge color and width per edge type.

| Edge type | Connects | Color (RGBA float) | Hex preview | Alpha | Width | Current count |
|---|---|---|---|---|---|---|
| **hierarchy** | tradition → work · domain → tradition · tradition → tradition (umbrella) | `[0.55, 0.65, 0.85]` | `#8CA6D9` *(slate blue)* | 0.85 | 1.5 | 107 |
| **contains** | work → section | `[0.62, 0.55, 0.85]` | `#9E8CD9` *(lavender)* | 0.70 | 1.0 | 514 |
| **cites** | quote → work / section | `[0.85, 0.78, 0.55]` | `#D9C78C` *(sand amber)* | 0.85 | 1.5 | 0 *(every quote currently has `source_work: null`)* |
| **member_of** | quote → tradition (fallback when source_work is null) | `[0.70, 0.70, 0.75]` | `#B3B3BF` *(cool gray)* | 0.70 | 0.8 | 33 |
| **synthesizes** | synthesis (wiki bridge) → work | `[0.50, 0.92, 0.78]` | `#80EBC7` *(mint, matches synthesis node)* | 0.95 | 2.0 | 131 |
| **semantic** | work ↔ work (cosine similarity, top-3 neighbors per work) | `[0.95, 0.95, 1.00]` | `#F2F2FF` *(cool white)* | 0.70 | 1.0 | 140 |

**File:** [`packages/constellation/src/data/toFloat32.ts`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/data/toFloat32.ts) — see the `EDGE_STYLE` constant near the top.

### Background + canvas defaults

| Setting | Value | Where |
|---|---|---|
| Canvas background | `#0b0d12` (near-black) | Demo page passes via `backgroundColor` prop ([`apps/web/app/constellation/page.tsx`](https://github.com/shalomormsby/opencosmos-ui/blob/main/apps/web/app/constellation/page.tsx)) |
| Force simulation | **disabled** (`enableSimulation: false`) | Generator pre-lays positions via ForceAtlas2 once at graph build time |
| Position transition duration | `0` ms | Required for ambient drift to apply each frame instantly without stale tweens |
| Initial fitView | duration 400 ms · padding 0.1 | `KnowledgeGraph.tsx` after `graph.ready` resolves |
| Sampling distance for label set | 100 px screen-space | (no longer used — current LabelLayer iterates all tracked indices, viewport-culls, and applies the density cap) |

### Ambient drift (currently broken — see [Known issues](#known-issues))

| Setting | Value | Where |
|---|---|---|
| Default amplitude | 0.5% of bbox range | [`packages/constellation/src/motion/useAmbientDrift.ts`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/motion/useAmbientDrift.ts) |
| Default angular frequency | 0.4 rad/sec, jittered ±30% per node | same |
| Disabled when | `prefers-reduced-motion` is set OR `ambientDrift={false}` | `usePrefersReducedMotion` hook |

### Focus targeting

| Setting | Value | Where |
|---|---|---|
| Default focus radius | 1 hop (target + immediate neighbors) | [`packages/constellation/src/motion/useFocus.ts`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/motion/useFocus.ts) |
| Default tween duration | 800 ms | same |
| Default fitView padding | 0.2 (20%) | same |

---

## How to change things

### To re-tune label LOD thresholds

Edit [`packages/constellation/src/lod/defaults.ts`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/lod/defaults.ts):

```ts
export const DEFAULT_LOD_VISIBILITY: LodVisibilityRules = {
  domain:    0,     // < 1.0 ⇒ domains only
  tradition: 1.0,   // 1.0 ⇒ + traditions
  synthesis: 1.31,  // 1.31 ⇒ + wiki bridges
  work:      2.0,   // 2.0 ⇒ + works
  section:   4.5,   // 4.5 ⇒ + sections
  quote:     6.0,   // 6.0 ⇒ + quotes
}
```

Rebuild the package (`pnpm --filter @opencosmos/constellation build`) — Studio HMR picks up immediately. No data regen needed.

### To change a tier color or size

Edit [`packages/constellation/src/theme/palettes.ts`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/theme/palettes.ts) (`DEFAULT_TIER_COLORS`, `DEFAULT_TIER_SIZES`). Rebuild package. No data regen.

### To change an edge color, alpha, or width

Edit [`packages/constellation/src/data/toFloat32.ts`](https://github.com/shalomormsby/opencosmos-ui/blob/main/packages/constellation/src/data/toFloat32.ts) — `EDGE_STYLE` constant. Rebuild package. No data regen.

### To re-categorize a tradition (e.g., move Sufism from Wisdom to Literature)

Edit [`scripts/knowledge/tradition-domain.ts`](../../scripts/knowledge/tradition-domain.ts) — `TRADITION_TO_DOMAIN`. Run `pnpm graph:constellation` to regenerate the graph + re-snapshot. (`pnpm embed` is also needed if you want chunk metadata to reflect the new domain — but that's only used by RAG retrieval, not the constellation render.)

### To add a new tradition

1. Decide the tradition slug (lowercase, dashes for spaces — e.g., `feminist-philosophy`).
2. Edit each work's frontmatter `tradition:` field.
3. Add the tradition → domain mapping in [`tradition-domain.ts`](../../scripts/knowledge/tradition-domain.ts).
4. Run `pnpm embed && pnpm graph:constellation`.

### To unify two existing tradition slugs (e.g., merge Vedic into Vedanta)

The `vedic` slug is currently emitted by `synthesizeTradition()` in [`scripts/normalize-quotes/shared.ts`](../../scripts/normalize-quotes/shared.ts) (the regex matches `hindu|vedic|nondual|advaita|upanish|\byog`). Change the emitted value from `'vedic'` to `'vedanta'` in `TRADITION_RULES`. Then `pnpm graph:constellation`.

For source-file collisions, do a `sed` sweep:
```bash
for f in $(grep -l "^tradition: vedic$" knowledge/sources/*.md); do
  sed -i '' 's/^tradition: vedic$/tradition: vedanta/' "$f"
done
```

### To rebuild after a corpus change

```bash
# Both, in order — embed first so vector index is current,
# then graph generates with up-to-date semantic edges.
pnpm embed
pnpm graph:constellation
```

If you only changed wiki frontmatter (not source content), you can skip `pnpm embed` — wiki bridges are read directly from disk by the generator.

### To skip the semantic-edge pass during iteration

```bash
pnpm graph:constellation --no-semantic   # ~12 sec faster — skips the Upstash query loop
```

### To snapshot the live graph into the Studio demo

```bash
# Start consumer dev (port 3000)
cd /Users/shalomormsby/Developer/opencosmos
pnpm dev --filter web &

# Snapshot
curl -s http://localhost:3000/api/knowledge/constellation \
  -o /Users/shalomormsby/Developer/opencosmos-ui/apps/web/public/constellation-sample.json
```

The Studio demo at [`opencosmos-ui/apps/web/app/constellation/page.tsx`](https://github.com/shalomormsby/opencosmos-ui/blob/main/apps/web/app/constellation/page.tsx) reads from `/constellation-sample.json` (a static snapshot) — not from the live API. This keeps demo iteration offline-friendly.

---

## Frontmatter contract for source files

Every file in `knowledge/sources/` must declare:

```yaml
---
title: "The Republic"            # display name (Title Case)
work_type: work                  # 'work' | 'collection' | 'reference' | 'wiki'
role: source                     # 'source' | 'collection' | 'reference' | 'wiki'
tradition: platonism             # REQUIRED — lowercase, dashes for spaces
tags: [...]                      # used for RAG context, not constellation
audience: [...]                  # used for RAG context, not constellation
author: Plato                    # optional but recommended
# domain: ←  DO NOT include. Domain is derived from tradition via the
#            shared config in scripts/knowledge/tradition-domain.ts.
---
```

The `domain:` field was retired on 2026-05-08 — every source file's domain is now a derived property. Keeping it in frontmatter would re-introduce the categorical inconsistency the new hierarchy was built to fix.

Wiki frontmatter (`knowledge/wiki/`) is **not** affected — wiki nodes have their own `domain:` semantics (cross / philosophy / contemplative) used by the legacy wiki graph generator.

---

## Known issues

### Ambient drift not visible (P2, deferred)

With `ambientDrift={true}` and the demo's checkbox on, the field doesn't visibly breathe. Three structural fixes have been tried:
1. `transitionDuration: 0` so per-frame `setPointPositions` doesn't queue 800 ms tweens that get clobbered.
2. `graph.create()` after each position write to flush WebGL.
3. Bbox-relative amplitude so it survives cosmos's auto-rescale.

None made drift visible. Hypotheses to test on resume:
- (a) `dontRescale: true` may not be honored if `config.rescalePositions` is undefined and simulation is off (cosmos auto-rescales every call regardless).
- (b) `create()` may not be the right flush API at v3.0-beta.9 — try `render()` instead and time it.
- (c) cosmos may snapshot positions internally and ignore subsequent updates after the first ready cycle — would need to call `setConfigPartial({ enableSimulation: true })` briefly to wake the renderer.
- (d) the rAF loop may be running but the visual delta is genuinely too small at the rescale factor — instrument by logging `getPointPositions()[0]` over time to confirm the buffer is actually changing.

### Vedic and Vedanta render as separate tradition nodes

Both are wisdom-tradition slugs but distinct: `vedanta` comes from work-tradition frontmatter, `vedic` is auto-emitted by `synthesizeTradition()` for quote authors whose context matches the regex `hindu|vedic|nondual|advaita|upanish|\byog`. Both route to the wisdom domain. To merge: change the emitted slug in `TRADITION_RULES`.

### `cites` edges count is 0

Every quote currently has `source_work: null` in its yaml frontmatter. Once Stage 4 of the quote provenance pipeline (human review) populates source attribution, `cites` edges (quote → work) will appear automatically.

---

## Quick command reference

| Command | What it does | When to run |
|---|---|---|
| `pnpm graph:constellation` | Full graph regen with semantic edges (~15 sec) | After any data change OR config change |
| `pnpm graph:constellation --no-semantic` | Same minus the Upstash query loop (~3 sec) | Fast iteration on layout / structural edges |
| `pnpm embed` | Re-embed corpus to Upstash Vector | After source content changes |
| `pnpm --filter @opencosmos/constellation build` | Build the package (in opencosmos-ui repo) | After tweaking colors / LOD / label styles |
| `pnpm dev --filter web` *(opencosmos-ui)* | Start Studio dev server (port 3001) | To view the constellation demo |
| `pnpm dev --filter web` *(opencosmos)* | Start consumer app (port 3000) | To serve the live `/api/knowledge/constellation` endpoint |

---

## Related guides

- [opencosmos-knowledge-graph.md](opencosmos-knowledge-graph.md) — the legacy sigma.js wiki graph (being phased out).
- [opencosmos-rag-architecture.md](opencosmos-rag-architecture.md) — how Cosmo retrieves context from the same Upstash Vector index.
- [opencosmos-knowledge-tooling-overview.md](opencosmos-knowledge-tooling-overview.md) — broader corpus-tooling reference.
- [opencosmos-scripts-reference.md](opencosmos-scripts-reference.md) — reference for `pnpm` scripts in the consumer repo.
