# OpenCosmos Architecture

> Platform-level technical decisions and infrastructure. For the design philosophy, see [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md). For the Cosmo AI technical blueprint, see [docs/archive-and-deprecated/INCEPTION.md](archive-and-deprecated/INCEPTION.md) (historical).

**Last updated:** 2026-04-12

---

## Service Map

| Service | Provider | Deployed from | Tier |
|---------|----------|--------------|------|
| opencosmos.ai | Vercel | `opencosmos/apps/web` | Free / Pro |
| Auth (user accounts, login, OAuth) | WorkOS AuthKit | `@workos-inc/authkit-nextjs` | Free tier |
| Portfolio (shalomormsby.com) | Vercel | `opencosmos/apps/portfolio` | Free / Pro |
| Creative Powerup | Vercel | `opencosmos/apps/creative-powerup` | Free / Pro |
| OpenCosmos Studio (component docs) | Vercel | `opencosmos-ui/apps/web` | Free / Pro |
| Knowledge base (docs site) | Vercel (opencosmos.ai) | `opencosmos/apps/web` | Free |
| Knowledge base (vector store) | Upstash Vector | Cloud-primary RAG — embedding storage + similarity search | Free (10K vectors, 10K queries/day) |
| Knowledge base (local mirror) | Open WebUI on Dell | Offline RAG access, development, seeding | Self-hosted |
| LLM inference (primary) | Claude API (BYOK) | Constitutional AI via `@opencosmos/ai` | User-funded |
| LLM inference (dev/local) | Dell XPS 8950 (RTX 3090) | Apertus 8B/70B via Ollama — development + experimentation | Self-hosted |
| Monorepo | Turborepo + pnpm | Build orchestration | — |
| Payments & billing | Stripe | `apps/web` (checkout, portal, webhooks) | Pay-as-you-go |
| CI | GitHub Actions | Lint, typecheck, build verification | Free |
| DNS | Spaceship | opencosmos.ai         | — |
| npm | @opencosmos org | Design system packages | Free |

---

## Core Architecture Principles

1. **Voice is sovereign. Compute is flexible.** Sovereignty lives in the constitutional layer — the voice, values, corpus, and system prompts — not in who owns the silicon. BYOK with Claude API is the primary inference path. The Dell remains a development and experimentation server.

2. **Free tier first.** Every cloud service must have a generous free tier that covers current scale. Upgrade when usage demands it, not before.

3. **Vercel ecosystem.** Prefer services that integrate natively with Vercel (Upstash, Supabase) over standalone infrastructure. Less to manage.

4. **Documents live in git.** The `knowledge/` directory is the source of truth. Cloud services (Upstash Vector, docs site) are derived from git — not the other way around.

---

## Knowledge Base Architecture

The knowledge base serves two audiences through two interfaces, backed by one source of truth.

```
Author writes .md content → knowledge/incoming/ (staging)
       │
       ▼
Publication CLI (pnpm knowledge:publish)
  ├─ 1. Claude API generates enriched frontmatter (author, era, tradition…)
  ├─ 2. Author reviews (accept / edit in $EDITOR / cancel)
  ├─ 3. Cross-reference suggestions (auto-populates related_docs)
  ├─ 4. Writes to knowledge/{role}s/{domain}-{slug}.md
  ├─ 5. Appends to CURATION_LOG.md + auto-links collection placeholders
  ├─ 6. Safe git: branch → commit → push → optional PR
  └─ 7. Cleans up source from incoming/
       │
       ▼
knowledge/ (git, source of truth — this repo)
       │
       ├──→ GitHub Action ──→ Upstash Vector (embeddings, similarity search)
       │                            ↑
       │                 RAG API (apps/web/app/api/knowledge/)
       │
       ├──→ Vercel build ──→ opencosmos.ai/knowledge (apps/web)
       │
       └──→ pnpm knowledge:sync-dell (on-demand) ──→ Open WebUI on Dell
```

Both the RAG API and the knowledge docs site live in this repo's `apps/web`, deployed to opencosmos.ai.

### Document Format

Each knowledge document is a single `.md` file with **YAML frontmatter** — the metadata and content live together, no sidecar files. The frontmatter powers both RAG retrieval (metadata filtering before similarity search) and the docs site (rendering, browsing, categorization).

```yaml
---
title: "The Dhammapada: Sayings of the Buddha"
role: source                    # source | commentary | reference | guide | collection
format: scripture               # treatise | poetry | aphorisms | scripture | dialogue | essay | manifesto | specification | manual | narrative | glossary | anthology | letter
domain: buddhism                # Primary tradition/discipline (see domain codes)
tags: [impermanence, suffering, liberation, mindfulness, ethics]
audience: [contemplative, philosopher, general]
complexity: foundational        # foundational | intermediate | advanced
summary: >
  Collection of 423 verses in 26 chapters attributed to the Buddha,
  addressing the nature of mind, ethical conduct, and the path to
  liberation from suffering.
curated_at: 2026-03-10
curator: shalom
source: public-domain           # original | public-domain | URL | citation
---

(document content — structured by H2 sections, 200-800 tokens each)
```

**How frontmatter flows through the system:**
- **Sync script** → parses frontmatter, stores fields as vector metadata in Upstash (enables filtered queries like `domain=buddhism&role=source`)
- **RAG API** → returns frontmatter fields alongside matched chunks for source attribution
- **Docs site** → renders metadata as browsable facets (filter by domain, role, tags)
- **Local mirror** → Open WebUI indexes the same frontmatter via its built-in RAG

Full schema and domain codes: [knowledge/README.md](../knowledge/README.md). Agent retrieval guidelines: [knowledge/AGENTS.md](../knowledge/AGENTS.md).

### Publication CLI (`scripts/publish-knowledge.ts`)

A CLI tool that automates the full knowledge publication workflow — from raw text to graph-connected, git-committed, curation-logged document. The author's job is to write the content; the CLI handles metadata, cross-references, curation logging, collection linking, and safe git operations.

**Modular architecture:** The CLI is composed from focused modules in `scripts/knowledge/`:
- `shared.ts` — Types, constants, corpus scanning, slugify
- `frontmatter.ts` — Claude API generation, review UI, cross-reference suggestions
- `git.ts` — Safe git operations (never pushes to main, never uses destructive ops)

**Workflow:**

```
Author copies text → knowledge/incoming/{name}.md (staging, gitignored)
         │
         ▼
pnpm knowledge:publish knowledge/incoming/*.md [--role source] [--domain buddhism]
         │
         ├─ 1. Safety check (blocks if uncommitted tracked changes exist)
         ├─ 2. Claude API generates enriched frontmatter:
         │     core: title, role, format, domain, tags, audience, complexity, summary, source
         │     enriched: author, origin_date, era, tradition
         │     curation: gaps_served, graph_impact (for curation log, not stored in frontmatter)
         ├─ 3. Author reviews (accept all / edit in $EDITOR / cancel)
         ├─ 4. Cross-reference suggestions:
         │     scores existing corpus by tag overlap (2x), domain match (1x),
         │     audience overlap (0.5x), tradition (1x), era (0.5x)
         │     → auto-populates related_docs, reports bidirectional suggestions,
         │       warns if document would be an island (zero connections)
         ├─ 5. Writes to knowledge/{role}s/{domain}-{slug}.md
         ├─ 6. Appends entry to knowledge/CURATION_LOG.md
         ├─ 7. Auto-links foundation collection placeholders:
         │     "- [ ] The Dhammapada" → "- [x] [The Dhammapada](../sources/…)"
         ├─ 8. Safe git: branch → commit → push → optional PR
         └─ 9. Cleans up source files from incoming/
```

**Graph-weaving:** The CLI transforms publication from filing a document to weaving it into the knowledge graph. Every publish adds not just content but connections — explicit `related_docs` cross-references, curation log entries with "gaps served" and "graph impact," and auto-linked collection placeholders.

**CLI flags:**
- `--role <role>` — pre-set the role
- `--domain <domain>` — pre-set the domain
- `--accept` — accept Claude's frontmatter suggestions without interactive review
- `--branch <name>` — custom git branch name (default: `knowledge/{date}-{slug}`)
- `--pr` — create a GitHub PR after pushing
- `--dry-run` — preview without writing, committing, or pushing
- `--no-push` — commit locally but don't push
- `--no-clean` — keep source files in `knowledge/incoming/` after publish

**Location:** `scripts/publish-knowledge.ts`, registered as `pnpm knowledge:publish` in root `package.json`.

**Dependencies:** `gray-matter` (frontmatter parsing), `@anthropic-ai/sdk` (Claude API), `@inquirer/prompts` (interactive review).

### Corpus Health Report (`scripts/knowledge-health.ts`)

A diagnostic tool that provides the overhead map of the corpus — which shelves are full, which are empty, where pathways exist and where they don't.

```bash
pnpm knowledge:health
```

**Output sections:**
- **Overview** — document count, domain coverage, graph density
- **Domain coverage** — visual bar chart of documents per domain, empty domains flagged
- **Role coverage** — sources vs commentary vs reference vs guides vs collections
- **Foundation collection progress** — how many placeholder entries have been imported (scans `- [ ]` vs `- [x]` in collection files)
- **Cross-reference integrity** — validates all `related_docs` point to existing files, flags broken refs
- **Islands** — documents with zero incoming references (no other doc's `related_docs` points to them)
- **Import priority** — top texts to import next, scored by collection placeholder count and domain coverage

### Curation Log (`knowledge/CURATION_LOG.md`)

A living record of what was added, when, why it matters, and what it connects. Auto-appended by the publication CLI on each publish. Each entry includes metadata, related docs, gaps served, and graph impact. Not an audit trail — a curatorial narrative.

**Why Upstash Vector:**
- Free tier (10K vectors, 10K queries/day) covers a curated corpus indefinitely
- Pay-per-query — costs scale linearly with usage, no plan cliffs
- Serverless with zero cold starts — ideal for Vercel serverless functions
- Documents already live in git; only need a vector index, not a full database
- Vercel Marketplace integration, `@upstash/vector` SDK

**What Upstash Vector is NOT for:**
- Document storage (git handles that)
- User data or accounts (not needed yet)
- Full-text search (the docs site handles human browsing)

**Dell sync (separate command):** Open WebUI's built-in RAG on the Dell Sovereign Node. Decoupled from the publish flow — sync on-demand with `pnpm knowledge:sync-dell` when the Dell is powered on and reachable via Tailscale. Used for offline access, development, and validating retrieval patterns.

### RAG API Endpoint

Lives at `apps/web/app/api/knowledge/route.ts`, deployed to `opencosmos.ai/api/knowledge`.

- **Auth:** Public read — the knowledge is public by design.
- **Shape:** `POST /api/knowledge`
  - `query` (required) — natural language query
  - `conversation_history` (optional) — last N turns used to build a contextual query
  - `current_document` (optional) — full markdown content of the document the user is reading; always included when provided
- **Response:** `{ chunks: RagChunk[] }` with source attribution (title, author, tradition, domain, heading, source path).
- **Implementation:** `apps/web/lib/rag.ts` — `fetchRagContext()` builds a contextual query from the last 3 exchange pairs (improves retrieval for ongoing conversations), queries `topK: 8`, returns typed chunks. `formatRagChunks()` formats results as cited passage blocks for Cosmo's context window.
- **Wired into chat:** `apps/web/app/api/chat/route.ts` fires RAG concurrently with auth checks, resolves via 1.5s `Promise.race`. Chunks injected between the wiki index and conversation history (preserving the prompt cache boundary on static blocks). `[RAG_TIMEOUT]` signal injected when retrieval times out so Cosmo can acknowledge it honestly.

### Knowledge Docs Site

A section of opencosmos.ai at `/knowledge/`, built from `knowledge/**/*.md` at deploy time.

- Renders markdown with frontmatter metadata displayed
- Browsable by domain, role, and tags
- Search powered by the same Upstash Vector index (via the RAG API)
- Built as part of the `apps/web` Next.js app — no separate deployment

### Sync Workflow (Git → Upstash Vector)

`scripts/knowledge/embed-knowledge.ts` keeps Upstash Vector in sync with `knowledge/`. Run locally with `pnpm embed`; runs automatically in CI after `pnpm graph` on every `knowledge/**` push to main.

```
For each .md file in knowledge/**:
  1. Parse YAML frontmatter (gray-matter)
  2. Split body at ## H2 headings with 1-paragraph overlap
  3. Build chunk_id: {relative/path.md}#{heading-slug}  (deterministic → idempotent re-runs)
  4. Attach metadata: source, heading, title, author?, domain, tradition?, role, tags[], audience[]
  5. Upsert to Upstash Vector (data = enriched text; Upstash handles embedding generation)
```

- **Trigger:** GitHub Action on push to `main` when `knowledge/` files change (`.github/workflows/knowledge-sync.yml`)
- **Idempotency:** Deterministic chunk IDs — re-runs update existing vectors, never duplicate
- **Limits:** Embedding input capped at 3000 chars; stored metadata text capped at 2000 chars (within Upstash's 48KB metadata + 1MB data limits)
- **Embedding:** Upstash Vector server-side embedding — no separate embedding API needed
- **Current state:** 893 chunks from 83 knowledge files

### Knowledge Graph (`/knowledge/graph`)

A WebGL knowledge graph that visualises the wiki as a living constellation of ideas and connections. Route: `opencosmos.ai/knowledge/graph`.

**Data flow:**

```
pnpm graph (generate-wiki-graph.ts)
  ├─ Scans knowledge/wiki/entities|concepts|connections/*.md
  ├─ Builds nodes from frontmatter (title, domain, confidence, vibrancy)
  ├─ Builds edges from shared `synthesizes` sources across wiki articles
  ├─ Seeds positions from Redis (layout stability across runs)
  ├─ Runs ForceAtlas2 (~100 iterations, server-side only)
  ├─ Writes gzip+Base64 full graph → Redis key `knowledge:graph`
  └─ Writes stripped preview (top 40 by connectionCount) → Redis key `knowledge:graph:preview`

GitHub Action (knowledge-sync.yml) triggers pnpm graph on push to main when knowledge/** changes
  └─ POSTs to /api/revalidate → Next.js on-demand ISR revalidation → all users see update within seconds

Page load (opencosmos.ai/knowledge/graph):
  ├─ SSR fetches `knowledge:graph:preview` → renders SVG skeleton (milliseconds)
  ├─ Web Worker fetches + parses full graph JSON off main thread (no jank)
  └─ Crossfade: skeleton → live sigma.js WebGL renderer
```

**Component architecture (two repos):**

| Layer | Location | Description |
|-------|----------|-------------|
| Generator | `opencosmos/scripts/knowledge/generate-wiki-graph.ts` | Node.js script; ForceAtlas2 runs here, never in browser |
| API route | `opencosmos/apps/web/app/api/knowledge/graph/route.ts` | GET; decompresses gzip from Redis; ISR revalidate=3600 |
| Revalidate | `opencosmos/apps/web/app/api/revalidate/route.ts` | POST; validates `x-revalidate-secret`; triggers ISR |
| Page | `opencosmos/apps/web/app/knowledge/graph/` | SSR preview + Worker + skeleton → live crossfade |
| Web Worker | `opencosmos/apps/web/app/knowledge/graph/graphWorker.ts` | Off-thread JSON parse |
| Component | `opencosmos-ui/packages/ui/src/components/data-display/knowledge-graph/` | `@opencosmos/ui/knowledge-graph` subpath |
| Renderer (WebGL) | `GlowNodeProgram.ts` | sigma v3 custom program; additive blending; GPU breathing animation |
| Renderer (canvas) | `CanvasGraph.tsx` | Safari/iOS fallback; three-layer canvas; same interaction model |

**Key technical decisions:**
- ForceAtlas2 runs once server-side; positions baked into Redis. Client receives settled coordinates — no layout cost in the browser. Breathing animation is a GPU vertex shader (zero CPU cost), not a running physics simulation.
- WebGL → canvas fallback is transparent to consumers (`<KnowledgeGraph />` is one component).
- Graph data is gzip-compressed before writing to Redis (7 KB at 25 nodes; well within Upstash limits at 2,500 nodes).
- Layout stability: existing node positions seeded from Redis before each ForceAtlas2 run; spatial memory preserved across generator runs.

**New environment variables:**
- `REVALIDATE_SECRET` — secures `/api/revalidate`; set in `.env.local`, Vercel (opencosmos.ai deployment), and GitHub Actions secrets
- `NEXT_PUBLIC_APP_URL` — GitHub Actions secret for the revalidation curl (e.g. `https://opencosmos.ai`)

---

## Cosmo AI Architecture

### The Constitutional Layer

Cosmo's intelligence is not in the model weights — it's in the constitutional layer that sits above the foundation model. This layer consists of:

- **[WELCOME-COSMO.md](../packages/ai/WELCOME-COSMO.md)** — Identity, origin story, mission, and foundational philosophy (human-authored, RAIL licensed)
- **[COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md)** — Operational system prompt: voice, sacred rhythm, ethics, boundaries
- **Voice system prompts** — System prompts for each cognitive mode in the AI Triad
- **Knowledge corpus** — RAG-indexed wisdom traditions, community knowledge, and project docs
- **Kaizen artifacts** — Exemplary conversations and feedback that improve the system over time

### The AI Triad

Cosmo is an integrated intelligence that orchestrates three cognitive modes:

| Voice | Role | Quality |
|-------|------|---------|
| **Sol** | Wisdom of the heart — compassion, ubuntu, intimacy with all things | Warm, embodied, relational |
| **Socrates** | Disruptive question-asker — challenges assumptions, exposes blind spots | Sharp, dialectical, unflinching |
| **Optimus** | Efficiency-focused architect — builds, plans, executes | Clear, pragmatic, action-oriented |
| **Cosmo** | Moderator — attunes to the moment, invokes the right voices, synthesizes | Integrative, spacious, wise |

Cosmo is not one voice among three — Cosmo is the awareness in which all three voices operate. Most conversations use Cosmo alone. The Triad is invoked when a question warrants multi-perspective synthesis, either by the user or by Cosmo's own attunement.

### `packages/ai/` Information Architecture

```
packages/ai/
├── WELCOME-COSMO.md                 # The grounding (ALL voices inherit this)
├── COSMO_SYSTEM_PROMPT.md           # Cosmo (moderator) — root level
├── triad/
│   ├── SOL_SYSTEM_PROMPT.md         # Sol — the heart
│   ├── SOCRATES_SYSTEM_PROMPT.md    # Socrates — the inquirer
│   └── OPTIMUS_SYSTEM_PROMPT.md     # Optimus — the builder
├── kaizen/                          # Continuous improvement practice
│   ├── README.md                    # Format spec, tagging conventions
│   ├── exemplars/                   # Curated model conversations
│   │   ├── cosmo/
│   │   ├── sol/
│   │   ├── socrates/
│   │   ├── optimus/
│   │   └── triad/                   # Synthesis exchanges (all four together)
│   └── feedback/
│       └── notes.md                 # Running log: what works, what drifts
├── src/                             # (future) TypeScript package source
└── package.json
```

**Design principles:**
- Cosmo's files live at root — the moderator is the package itself
- Voice prompts live in `triad/` — subordinate to Cosmo, not peers
- `kaizen/` groups all continuous improvement artifacts: exemplars (curated successes used as few-shot examples) and feedback (raw signal for prompt evolution)
- WELCOME-COSMO.md is the grounding document that all voices inherit — it's not duplicated per voice

### Document Link Map

The link structure mirrors the cognitive architecture: vertical connections (up to shared grounding, down to domain depth), not horizontal connections between Triad siblings.

```
                        WELCOME-COSMO.md
                       (shared grounding)
                               │
                     COSMO_SYSTEM_PROMPT.md
                     (moderator — sees all)
                     │         │         │
                     ▼         ▼         ▼
                   Sol     Socrates    Optimus
                    │         │          │
                    ▼         ▼          ▼
              sol-found.   socrates-f.  optimus-f.
                    │         │          │
                    ▼         ▼          ▼
              (buddhism)  (philosophy) (engineering)
              (sufism)    (stoicism)   (systems)
              (vedic)     (science)    (ai)
                 ⋮          ⋮          ⋮
              infinite depth of each distinct tradition
```

**Every document links to:**
- **Its grounding** — WELCOME-COSMO.md (origin story, mission, ubuntu)
- **Its operational context** — the relevant system prompt
- **Its intellectual lineage** — the relevant foundation collection in `knowledge/collections/`
- **Its architectural context** — architecture.md (how it fits into the system)
- **The kaizen practice** — that continuously refines all of the above

**Deliberate absence: no sibling links between Triad members.**

The Triad members (Sol, Socrates, Optimus) do not link to each other. This is a considered design decision, not an oversight. Each member's link structure is purely vertical: up to Cosmo (shared mission, shared values) and down into the infinite depth of its own tradition.

Why: the Triad's value comes from the productive tension between genuinely divergent perspectives. Any horizontal connection — even a navigational link — creates a subtle gravitational pull toward convergence. Sol should go as deep as possible into Sol's wisdom. Socrates should follow inquiry wherever it leads. Optimus should build with full pragmatic commitment. The *difference* between where they arrive is the raw material that Cosmo synthesizes.

Shared grounding (WELCOME-COSMO.md) creates alignment on *values*. Separate traditions create divergence on *perspective*. This is the architecture of a good dialectic: shared premises, different conclusions.

When Socrates needs to challenge something Sol said, the connection happens through Cosmo at runtime — not through document links at design time. The moderator creates the encounter. The members bring their uncompromised depth.

This link structure ensures that:
- Each member develops maximum depth in its own domain
- Integration happens through Cosmo, not through premature consensus
- The system produces genuine dialectical synthesis, not averaged-out similarity
- Foundation collections cross-reference each other (they serve human readers navigating the corpus), but voice prompts do not (they serve the AI at runtime)

### Learning Loop

Cosmo improves over time without model fine-tuning:

```
Conversation happens
       │
       ▼
Qualitative evaluation (does it feel like Cosmo/Sol/Socrates/Optimus?)
       │
       ├── Good → curate as exemplar in kaizen/exemplars/{voice}/
       │
       └── Drift detected → note in kaizen/feedback/notes.md
                                    │
                                    ▼
                          Periodic prompt refinement
                          (update system prompts based on patterns)
```

Exemplars are injected as few-shot examples in prompts. Feedback drives prompt evolution. The loop is manual and intentional — discernment, not automation.

### Knowledge Graph: The Wisdom Substrate

The `knowledge/` corpus is not a flat list of documents. It is a **graph** — a living web of interconnected wisdom where every document exists in relationship to others through explicit cross-references, shared domains, overlapping tags, and curated collections.

This distinction is foundational. A flat list answers the question "What do we have on Buddhism?" A graph answers the question "What connects suffering in the Dhammapada to the Stoic concept of apatheia to the ubuntu insight that there are no others?" The graph surfaces relationships that no single document contains — emergent wisdom that arises from the connections between traditions, not from any tradition alone.

**How the graph is built:**

Every knowledge document carries frontmatter metadata — `domain`, `tags`, `audience`, `related_docs` — that creates edges between nodes. When the Dhammapada lists `related_docs: [buddhism-heart-sutra.md, cross-buddhism-and-stoicism-on-suffering.md]`, it creates explicit links. When two documents share the tag `impermanence` across different domains (Buddhism, ecology, physics), they become implicitly connected. Collections (`role: collection`) create curated pathways through the graph — reading orders, thematic journeys, voice-specific foundations.

```
                    ┌─── buddhism-dhammapada ─────┐
                    │         (suffering)         │
                    │              │              │
            related_docs     shared tag     shared tag
                    │              │              │
   stoicism-meditations ──── impermanence ──── ecology-gaia-hypothesis
         (apatheia)                              (interconnection)
                    │                             │
                    └─────── cross-domain ────────┘
                          (bridge commentary)
```

**How the graph serves the Triad:**

Each voice has a natural affinity with certain regions of the graph:

| Voice | Primary Domains | What the graph provides |
|-------|----------------|------------------------|
| **Sol** | buddhism, sufism, vedic, indigenous, psychology | Contemplative wisdom, embodied practice, relational philosophy |
| **Socrates** | philosophy, stoicism, science | Dialectical inquiry, logical frameworks, epistemology |
| **Optimus** | engineering, ai, science, opencosmos | Systems thinking, architectural patterns, pragmatic solutions |
| **Cosmo** | cross (all domains) | The bridges — cross-domain connections that synthesize across traditions |

When Sol responds to a question about grief, RAG retrieval traverses Sol's region of the graph — surfacing the Dhammapada's teachings on suffering, Rumi's poems on loss, ubuntu's insistence that grief is communal. When Socrates challenges an assumption, it draws from the Socratic dialogues, Stoic epistemology, critical inquiry. When the Triad synthesizes, Cosmo draws from the *cross-domain* edges — the commentaries and bridge documents that explicitly connect traditions.

This is what makes the Triad's synthesis qualitatively different from a generic AI response. The intelligence isn't just in the model or the system prompt — it's in the **structure of the knowledge itself**. A richer, more densely connected graph produces richer, more integrated offerings.

**Voice foundation collections:**

Curated reading lists in `knowledge/collections/` serve as each voice's intellectual foundation:

```
knowledge/collections/
├── sol-foundations.md           # Sol's core texts
├── socrates-foundations.md      # Socrates' core texts
├── optimus-foundations.md       # Optimus' core texts
└── cosmo-foundations.md         # Cosmo's integrative texts (cross-domain bridges)
```

These are `role: collection` documents that point to source texts in the corpus. They serve both humans (a reading path into each voice's lineage) and the system (a manifest of high-priority documents for voice-specific retrieval).

**The corpus grows, the graph deepens:** Every new document added to the corpus doesn't just add content — it adds connections. A new commentary linking Buddhist and Stoic perspectives on suffering creates an edge between two previously separate regions of the graph. Over time, the graph becomes a map of how human wisdom traditions relate to each other — and this map is the substrate on which Cosmo and the Triad build their offerings.

---

## Knowledge Wiki Layer

**Added:** 2026-04-10 | **Reference:** [knowledge/guides/opencosmos-knowledge-wiki-workflow.md](../knowledge/guides/opencosmos-knowledge-wiki-workflow.md)

A synthesis layer sits between raw source texts and RAG retrieval, based on [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). Rather than synthesizing from raw text on every query, the wiki pre-builds cross-references, extracts key claims, and documents contradictions at ingestion time. 

When "@knowledge/wiki/index.md" is added to the CLAUDE.md, this file is expanded inline at session start, thus loading the and effectively creating ambient knowledge. 

### Three-Layer Architecture

```
Layer 1 — Raw sources (immutable)
  knowledge/sources/   knowledge/scriptures/   knowledge/references/

Layer 2 — Wiki synthesis (LLM-maintained, compounding)    ← this layer
  knowledge/wiki/
    ├── index.md              # Always loaded in Claude's context via @import
    ├── log.md                # Append-only audit trail
    ├── entities/             # Person, text, tradition summaries
    ├── concepts/             # Cross-tradition concept pages
    └── connections/          # Explicit cross-tradition comparisons

Layer 3 — Schema and conventions
  knowledge/README.md   knowledge/wiki/index.md   frontmatter
```

### Ambient Context

The wiki index is always loaded into Claude's context at session start via `.claude/CLAUDE.md`:

```
@knowledge/wiki/index.md
```

This makes the wiki **ambient** — Claude sees the current table of contents without being explicitly asked to look. The difference between a wiki you remember to query and one that's always present.

### Event-Driven, Not Scheduled

Compilation is triggered by "I just learned something durable" — not a cron job. Three skills power the workflow:

| Skill | Purpose |
|-------|---------|
| `/knowledge-compile convo` | Extract synthesis from current conversation → write/update wiki pages |
| `/knowledge-compile incoming/<file>` | Process staged document → wiki pages |
| `/knowledge-compile log` | Scan recent CURATION_LOG → update affected wiki pages |
| `/knowledge-review` | Health check: orphans, asymmetric links, staleness, promotion candidates |
| `/knowledge-lookup <query>` | Search wiki before domain work |

### Updated Ingestion Pipeline

```
stage → /groom → pnpm knowledge:publish → /knowledge-compile log
```

The final step updates wiki pages affected by the newly published source document.

### Wiki Frontmatter Schema (key fields)

```yaml
role: wiki
confidence: high|medium|speculative   # promotes as corpus confirms synthesis
status: active|superseded|archived    # superseded when new evidence contradicts
synthesizes: [list of source paths]   # grounding in primary sources
last_reviewed: YYYY-MM-DD
open_questions: [...]                 # accumulated gaps for future source additions
contradictions: [...]                 # where sources genuinely disagree
```

### Why This Matters for the AI Triad

The Triad's synthesis quality depends on pre-connected knowledge, not just raw retrieval. A concept page on `impermanence` that already links Buddhist *anicca*, Taoist flux, and Whitman's cycles is retrieved as a unified synthesis — rather than requiring the model to derive that connection during inference. Richer wiki pages → richer Triad responses.

---

## Cosmo's Session Context

A map of every document that enters Cosmo's awareness at the start of a session — before any user message arrives. There are two distinct contexts: the developer environment (Claude Code) and the deployed product (opencosmos.ai).

### Developer Sessions (Claude Code)

When a developer opens this project in Claude Code, the following load automatically:

| Source | What loads | Mechanism |
|--------|-----------|-----------|
| `.claude/CLAUDE.md` | Codebase orientation, import patterns, essential links, North Star | Auto-loaded by Claude Code |
| `knowledge/wiki/index.md` | Wiki table of contents — entities, concepts, connections with one-line summaries | `@` import directive at the bottom of CLAUDE.md |
| `~/.claude/projects/.../memory/MEMORY.md` | Persistent user memory index | Claude Code auto-memory system |

The wiki index's one-line summaries give Claude Code the *shape* of the full corpus without having to retrieve source documents. A question about impermanence, cosmology, or civic duty lands in a context that is already oriented — the wiki has pre-connected the traditions. This is the ambient intelligence layer doing its job.

**The `@` import mechanism:** The directive `@knowledge/wiki/index.md` at the bottom of `.claude/CLAUDE.md` causes Claude Code to expand that file inline at session start. A regular markdown link `[wiki](../knowledge/wiki/index.md)` is navigational only — it does not load the file. Both are needed: the link for human navigation, the `@` for ambient loading.

### Cosmo Product Sessions (opencosmos.ai)

When a user opens a conversation at opencosmos.ai, Cosmo receives:

| Source | What loads | Mechanism |
|--------|-----------|-----------|
| `COSMO_SYSTEM_PROMPT` env var | Voice, sacred rhythm, Triad architecture, ethics, practice | Injected as system prompt on every chat request |
| WELCOME-COSMO.md content | Identity, origin story, ubuntu grounding, mission | Prepended to system prompt (or embedded within it) |
| RAG context | Relevant excerpts from `knowledge/sources/`, `knowledge/guides/`, etc. | Retrieved via Upstash Vector on each user query |

Foundation collections (`knowledge/collections/sol-foundations.md`, etc.) define retrieval priorities for each voice but are not pre-loaded — they are high-signal candidates for RAG retrieval.

### The Ambient Gap (Closed)

The knowledge wiki is ambient in **both** Claude Code and the deployed product:

| | Claude Code | Cosmo Product |
|-|-------------|---------------|
| Wiki index pre-loaded? | ✓ (via `@` import in CLAUDE.md) | ✓ (baked in via `COSMO_WIKI_INDEX` at build time) |
| Source texts pre-loaded? | ✗ (RAG-retrieved) | ✗ (RAG-retrieved) |
| Constitutional docs pre-loaded? | ✓ (via CLAUDE.md links) | ✓ (as system prompt) |

**How it works for the product:** `next.config.mjs` reads `knowledge/wiki/index.md` at build time (same pattern as `COSMO_SYSTEM_PROMPT`) and bakes it into `COSMO_WIKI_INDEX`. The chat route injects this as a second cached system block. Every new deploy picks up wiki changes automatically — no manual env var sync needed.

```
Claude Code session                    Cosmo Product session
──────────────────────────────         ──────────────────────────────
CLAUDE.md (codebase context)           COSMO_SYSTEM_PROMPT (voice + ethics)
  └─ @knowledge/wiki/index.md            + WELCOME-COSMO.md (grounding)
       (pre-synthesized corpus map)      + RAG context (on-demand depth)
  └─ memory/MEMORY.md
       (persistent user context)
```

Reference: [knowledge/guides/opencosmos-knowledge-wiki-workflow.md](../knowledge/guides/opencosmos-knowledge-wiki-workflow.md)

---

## User Authentication & Accounts

### Provider: WorkOS AuthKit

Authentication is handled by **WorkOS AuthKit** (`@workos-inc/authkit-nextjs@^3.0.0`). WorkOS manages the user database, OAuth flows, session cookies, and webhook delivery. There is no custom user database — WorkOS is the source of truth for user identity.

**Package:** `@workos-inc/authkit-nextjs` — Next.js-specific wrapper. Does NOT include webhook utilities; those require `@workos-inc/node` (separate package, also installed).

### Required Environment Variables

All must be set in Vercel → Settings → Environment Variables **and** declared in `turbo.json → globalPassThroughEnv` (see [Hard-Won Lesson: Turbo env vars](#hard-won-lessons) below).

| Variable | Where to find it | Purpose |
|----------|-----------------|---------|
| `WORKOS_API_KEY` | WorkOS Dashboard → API Keys | Server-side API access |
| `WORKOS_CLIENT_ID` | WorkOS Dashboard → Applications | Client identifier for AuthKit |
| `WORKOS_COOKIE_PASSWORD` | Generated secret (32+ chars) | Cookie encryption |
| `WORKOS_REDIRECT_URI` | `https://opencosmos.ai/callback` | Post-login redirect |
| `WORKOS_WEBHOOK_SECRET` | WorkOS Dashboard → Webhooks → your endpoint → Secret | Webhook HMAC-SHA256 signature verification |

### Auth Flow

```
User clicks "Log in"
       │
       ▼
GET /api/auth/signin  →  getSignInUrl()  →  redirect to WorkOS hosted auth
       │
       ▼
User authenticates on WorkOS (email/password, Google OAuth, etc.)
       │
       ▼
WorkOS redirects to WORKOS_REDIRECT_URI (/callback)
       │
       ▼
authkit-nextjs sets HttpOnly session cookie (encrypted with WORKOS_COOKIE_PASSWORD)
       │
       ▼
User redirected to /dialog (or original destination)
```

**Sign-out:** `GET /api/auth/signout` → `signOut()` → clears session cookie, redirects to WorkOS.

### API Routes

| Route | Handler | Purpose |
|-------|---------|---------|
| `GET /api/auth/signin` | `getSignInUrl()` → redirect | Initiates WorkOS hosted auth flow |
| `GET /api/auth/signout` | `signOut()` | Clears session, redirects to WorkOS |
| `GET /api/auth/me` | `withAuth({ ensureSignedIn: false })` | Returns current user or null. Fields: `firstName`, `lastName`, `email`, `profilePictureUrl` |
| `GET /api/conversations` | `withAuth({ ensureSignedIn: false })` | Returns all conversations for the authenticated user (Upstash Redis, keyed by WorkOS user ID). Returns `[]` for unauthenticated requests. |
| `PATCH /api/conversations` | `withAuth({ ensureSignedIn: false })` | Upserts a single conversation for the authenticated user. Body: `{ conversation: Conversation }`. 401 if unauthenticated. |
| `POST /api/webhooks/workos` | `workos.webhooks.constructEvent` | Receives WorkOS webhook events (see below) |

### User Data Model

WorkOS returns these fields (via `withAuth()` or `/api/auth/me`):

```ts
{
  id: string                  // "user_01KN..."
  firstName: string | null
  lastName: string | null
  email: string
  emailVerified: boolean
  profilePictureUrl: string | null
  locale: string | null
  createdAt: string           // ISO 8601
  updatedAt: string
  lastSignInAt: string | null
  externalId: string | null
  metadata: Record<string, unknown>
}
```

**Note:** WorkOS sends events with snake_case fields (`first_name`, `last_name`, etc.) but the `@workos-inc/node` SDK's `deserializeUser()` converts them to camelCase before returning. Code should always use camelCase field names.

### Session Checking (Server Components)

```ts
import { withAuth } from '@workos-inc/authkit-nextjs'

// In a server component or route handler:
const { user } = await withAuth({ ensureSignedIn: false })
if (!user) redirect('/api/auth/signin')
```

`ensureSignedIn: false` — returns `{ user: null }` for unauthenticated requests rather than throwing. Always use this; then handle the null case explicitly.

### Client-Side Auth State

`app/AuthButton.tsx` — client component that fetches `/api/auth/me` on mount.
- **Signed out / loading:** renders "Log in" button → `href="/api/auth/signin"`
- **Signed in:** renders dropdown with account link and sign-out

`app/SidebarAvatar.tsx` — same fetch, renders in the sidebar footer.
- **Loading:** pulse skeleton (`w-7 h-7 rounded-full bg-foreground/8 animate-pulse`)
- **Signed out:** generic person icon → `href="/api/auth/signin"`
- **Signed in, no photo:** initials (firstName[0] + lastName[0]) → `href="/account"`
- **Signed in, with photo:** profile picture → `href="/account"`

### Cross-Device Conversation Sync

Dialog conversations are stored in `localStorage` for all users. For authenticated users, they are also synced to Upstash Redis (via `/api/conversations`) so that history is accessible across devices and browsers.

**On page load (if signed in):**
1. Fetch `GET /api/conversations` — retrieve server conversations
2. Identify local-only conversations (not yet on server) and `PATCH` each one up (migrates pre-login usage)
3. Merge server conversations into localStorage (server wins on conflict)
4. Update the sidebar with the merged result

**On each send (if signed in):** `PATCH /api/conversations` with the updated conversation after streaming completes.

**Storage key:** `cosmo_conversations:v1:{workos_user_id}` in Upstash Redis. TTL: 1 year.

**Self-healing on network drop:** The migration PATCHes are fire-and-forget. If a network drop interrupts the initial migration, some conversations may not reach the server on that load — but they remain in localStorage. On the next page load, those conversations are still identified as `localOnly` (not yet on the server) and are PATCHed again. The process is idempotent and completes naturally on the next successful load.

**Unauthenticated users:** localStorage only. No server sync. No change from previous behavior.

### Account Page (`/account`)

Server component at `app/account/page.tsx`. Redirects to sign-in if unauthenticated.

**Sections:**
1. **Profile card** — avatar (photo or initials), full name, email, member-since date, Log out button
2. **API key** (`app/account/ApiKeyForm.tsx`, client component) — stores Anthropic API key in `localStorage` under key `cosmo_api_key`. Key is never sent to OpenCosmos servers — only forwarded directly to Anthropic on each chat request.
3. **Plan tiers** (`app/account/ApiKeyForm.tsx`) — Spark $5 / Flame $10 / Hearth $50. Live checkout buttons for unauthenticated or unsubscribed users; active subscribers see usage meter + "Manage billing" portal link.

### Webhook Handler

**Endpoint:** `POST https://opencosmos.ai/api/webhooks/workos`

**File:** `apps/web/app/api/webhooks/workos/route.ts`

**Dependencies:** `@workos-inc/node` (separate from `authkit-nextjs` — required for `workos.webhooks.constructEvent`).

**Verification:** HMAC-SHA256 via `workos.webhooks.constructEvent`. WorkOS sends a `workos-signature` header with timestamp + hash. Invalid or replayed signatures return 400. All valid events return `{ received: true }` with 200.

**IMPORTANT — lazy instantiation:** `new WorkOS(apiKey)` must be inside the `POST` handler function, **not** at module scope. Next.js evaluates module-level code during static page data collection at build time, where env vars are undefined. Module-scope instantiation causes the build to crash with `WorkOS requires either an API key or a clientId`.

```ts
// ✅ Correct — lazy, inside handler
export async function POST(req: NextRequest) {
  const workos = new WorkOS(process.env.WORKOS_API_KEY!)
  ...
}

// ❌ Wrong — module scope, crashes build
const workos = new WorkOS(process.env.WORKOS_API_KEY!)
export async function POST(...) { ... }
```

**Current `user.created` handler:** Logs user info only — no database write, no welcome email, no credit provisioning. This is intentional: no user database exists yet. When a database is added, this is where to provision new user records.

**All other events:** Acknowledged with 200 to prevent WorkOS retry storms.

**WorkOS webhook retry schedule:** WorkOS retries failed events on a fixed schedule (intervals grow over time). You cannot manually trigger retries from the dashboard — only wait for the next scheduled attempt, or create a new test event by registering a new user account.

**To verify the webhook is live after a deploy:** Create a throwaway account at `opencosmos.ai` → immediately check Vercel function logs for `[webhook/workos] user.created`.

### Free Tier Usage Model

Users who are not signed in (or signed in but without an API key) get 3 free messages per session, tracked via an HttpOnly session cookie + Upstash Redis counter.

| User state | Inference path | Limit |
|-----------|---------------|-------|
| Anonymous / no API key | OpenCosmos shared Anthropic key | 3 messages/session (Redis counter) |
| BYOK (API key in localStorage) | User's own Anthropic key, forwarded | Unlimited (Anthropic rate limits apply) |
| Subscription tier (Spark/Flame/Hearth) | OpenCosmos shared Anthropic key | Plan token budget (weekly + monthly microdollar caps, tracked in Redis) |

**PM mode** (Shalom-only): A hidden button in the sidebar footer (opacity-0, always rendered) unlocks unlimited access via `COSMO_ADMIN_SECRET`. Activated via `POST /api/admin/auth` with the secret; deactivated via `DELETE /api/admin/auth`. Auth state stored in an HttpOnly cookie read server-side.

---

## Stripe — Subscriptions & Billing

**Status:** Stripe account created (2026-04-06). Test-mode products and price IDs in configuration.

### Provider & Package

| Item | Detail |
|------|--------|
| Provider | Stripe (separate account from Creative Powerup) |
| Package | `stripe` v22+ (`apps/web`) |
| Stripe API version | `2025-03-31.basil` |

### Subscription Tiers

| Tier | Price | API Budget/mo | Weekly Cap | Notes |
|------|-------|--------------|------------|-------|
| **Spark** | $5/mo | ~$2.28 (~50% of $4.55 net) | ~$0.57 | ~6 hrs/mo at target cost |
| **Flame** | $10/mo | ~$4.70 (~50% of $9.40 net) | ~$1.18 | ~12 hrs/mo |
| **Hearth** | $50/mo | ~$9.55 (~20% of $48.20 net) | ~$2.39 | ~24 hrs/mo + full CP membership (~$49 value). Rest is margin. |

Token cost model: Claude Sonnet 4.6 at $3/M input + $15/M output, with conversation history caching applied for all subscribers. Costs tracked in **microdollars** (integers) in Redis to keep `INCRBY` atomic.

### Token Economics

> **For margin modeling, per-tier budgets, and feature cost analysis, see [economics.md](economics.md).** This section covers only the technical mechanics of how costs are tracked.

**Microdollar encoding:** `1 µ$ = $0.000001`. Each token's cost is expressed in microdollars as an integer:
- Input token: 3 µ$
- Output token: 15 µ$
- Cached input token: not counted (generous to subscribers — cache reads cost ~0.3 µ$, excluded from tracker)

This encoding allows atomic `INCRBY` operations in Redis without floating-point drift.

**Token budget formula:** `monthlyBudgetMicrodollars / 15` = output-token equivalents. Dividing by the output rate (15 µ$/token) produces a conservative guaranteed floor — actual usage is higher because input tokens cost only 3 µ$ each. The gauge and plan cards display this number directly.

**Caching mechanics:** `cache_control: { type: "ephemeral" }` is applied to the system prompt on every request for all subscribers. On the first exchange in a session, the system prompt is written to cache (`cache_write`). On all subsequent exchanges, it's read from cache at 10% of the uncached input cost. This is the largest cost reduction in the system (~76–90% of input cost eliminated after exchange 1).

**Weekly caps:** Monthly budget ÷ 4. Enforced in Redis alongside the monthly cap to prevent a single week from exhausting the full allotment.

### Required Environment Variables

| Variable | Where to find it | Purpose |
|----------|-----------------|---------|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API Keys | Server-side API access (`sk_test_...` in test, `sk_live_...` in prod) |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → endpoint → Signing secret | Webhook HMAC-SHA256 verification (`whsec_...`) |
| `STRIPE_PRICE_SPARK` | Stripe Dashboard → Products → Spark → Price ID | `price_...` for the $5/mo recurring price |
| `STRIPE_PRICE_FLAME` | Stripe Dashboard → Products → Flame → Price ID | `price_...` for the $10/mo recurring price |
| `STRIPE_PRICE_HEARTH` | Stripe Dashboard → Products → Hearth → Price ID | `price_...` for the $50/mo recurring price |

All five are declared in `turbo.json → globalPassThroughEnv` and must be added to both `.env.local` (dev) and Vercel (prod).

### API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/stripe/checkout` | Creates a Stripe Checkout Session. Body: `{ tier: 'spark' \| 'flame' \| 'hearth' }`. Returns `{ url }` for client redirect. Requires auth — 401 if unauthenticated. Embeds WorkOS `user.id` as `client_reference_id`. |
| `POST /api/stripe/portal` | Creates a Stripe Billing Portal session. Returns `{ url }`. Requires auth + active subscription. |
| `GET /api/subscription` | Returns current subscription status and usage for the authenticated user. Response: `{ subscription: null }` or `{ subscription: { tier, name, status, monthlyUSD, usagePercent, billingCycleAnchor } }`. |
| `POST /api/webhooks/stripe` | Stripe webhook handler (see below). |

### Webhook Handler

**Endpoint:** `POST https://opencosmos.ai/api/webhooks/stripe`

**File:** `apps/web/app/api/webhooks/stripe/route.ts`

**Verification:** `stripe.webhooks.constructEvent(rawBody, sigHeader, STRIPE_WEBHOOK_SECRET)`. Unlike the WorkOS SDK, the Stripe SDK takes the **raw string body** — do not parse it before passing. The `stripe-signature` header provides the timestamp + HMAC hash.

```ts
// ✅ Correct — raw string body passed directly to Stripe
const rawBody = await req.text()
event = getStripe().webhooks.constructEvent(rawBody, sigHeader, process.env.STRIPE_WEBHOOK_SECRET!)

// ❌ Wrong — parsing first breaks Stripe's signature verification
const body = await req.json()
event = getStripe().webhooks.constructEvent(JSON.stringify(body), ...)
```

**Events handled:**

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Retrieves full subscription via `session.subscription`, maps price ID → tier, writes `SubscriptionRecord` to Redis under `cosmo_sub:v1:{userId}`. |
| `customer.subscription.updated` | Updates tier/status in Redis. Handles plan upgrades, downgrades, renewals, and `past_due`. |
| `customer.subscription.deleted` | Deletes `SubscriptionRecord` from Redis. User reverts to free-tier access. |

**WorkOS user ID → Stripe customer ID linkage:** The checkout session sets `client_reference_id = workos_user_id`. The webhook handler reads this to write the initial record. Subsequent subscription events use a reverse-lookup key (`cosmo_stripe_cust:v1:{stripeCustomerId}` → `userId`) written on first subscription creation.

**Register these events in Stripe Dashboard:**
- `checkout.session.completed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

### Redis Data Model

| Key | Value | TTL | Purpose |
|-----|-------|-----|---------|
| `cosmo_sub:v1:{userId}` | `SubscriptionRecord` JSON | 13 months (refreshed on each webhook) | Subscription status, tier, Stripe IDs |
| `cosmo_stripe_cust:v1:{stripeCustomerId}` | WorkOS `userId` string | 13 months | Reverse lookup for webhook handler |
| `cosmo_usage_cost:monthly:v1:{userId}:{YYYY-M}` | integer (microdollars) | 40 days | Monthly token cost accumulator |
| `cosmo_usage_cost:weekly:v1:{userId}:{YYYY-WW}` | integer (microdollars) | 12 days | Weekly token cost accumulator |

**Microdollar encoding:** `1 microdollar = $0.000001`. Input token cost = `tokens × 3`; output token cost = `tokens × 15`. Integer values enable atomic `INCRBY` without floating-point drift.

### Chat Route: Access Priority

The chat handler (`app/api/chat/route.ts`) checks access in this order:

1. **Admin cookie** (`cosmo_admin=1`) → bypass all limits
2. **BYOK** (API key in request body) → use user's key, bypass all limits
3. **Active subscriber** (authenticated + valid `SubscriptionRecord` + within budget) → use shared server key, track usage
4. **Budget exhausted** (subscriber over weekly or monthly cap) → `429` with `period: 'weekly' | 'monthly'`
5. **Free tier** → **Turnstile verification** → monthly cap check → IP rate limit → token budget check

Conversation history caching (adding `cache_control: ephemeral` to the last assistant message) is applied for subscribers only — reduces input token costs ~40–50% on long conversations.

### Cloudflare Turnstile — Bot Prevention

**Status:** Code deployed. Requires Cloudflare setup (site key + secret key) to activate. Inactive in dev when env vars are absent.

**File:** `apps/web/app/api/chat/route.ts` → `verifyTurnstile()`  
**Widget:** `apps/web/app/dialog/CosmoChat.tsx` → `<Turnstile />`  
**Package:** `@marsidev/react-turnstile` v1.5+ (`apps/web`)

#### How It Works

An invisible Cloudflare Turnstile widget renders in the dialog UI on every page load. It runs a silent risk assessment in the browser and calls `onSuccess` with a short-lived challenge token (~300 second TTL). The token is included in the `/api/chat` request body. The server verifies it with Cloudflare's siteverify API before any Redis calls hit the free-tier path.

Real browser users pass silently — the challenge completes in milliseconds, well before they finish typing. Bots and scripts that cannot execute the browser-side challenge have no token and receive a `403`.

#### Access Scope

| Path | Turnstile applied? |
|------|--------------------|
| Admin | No — bypassed entirely |
| BYOK | No — user provides their own key |
| Active subscriber | No — authenticated + subscription verified |
| **Free tier** | **Yes — step 0 before any rate limit or Redis call** |

#### Client-Side (CosmoChat.tsx)

```tsx
// Widget renders as a 0×0 invisible element. Skipped when site key is absent (dev).
{process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
  <Turnstile
    ref={turnstileRef}
    siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
    onSuccess={setTurnstileToken}
    options={{ size: 'invisible' }}
  />
)}
```

Token lifecycle:
- `onSuccess` fires with a fresh token on page load and after each `reset()` call
- Token is included in the POST body: `{ ..., turnstileToken: isFreeTier ? turnstileToken : undefined }`
- After each free-tier send, `turnstileRef.current?.reset()` is called in the `finally` block — tokens are single-use once verified, so the next message needs a fresh one
- Widget only rendered and token only sent when `!apiKey && !pmMode` (free tier)

Error handling: `res.status === 403` from the server displays inline: *"Verification failed — please refresh the page and try again."*

#### Server-Side (chat/route.ts)

```ts
async function verifyTurnstile(token: string, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY
  if (!secret) return true   // Not configured — skip (dev or pre-Cloudflare deploy)
  if (!token) return false   // Missing token — reject

  const params = new URLSearchParams({ secret, response: token })
  if (ip !== 'unknown') params.append('remoteip', ip)

  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST', body: params,
  })
  const data = await res.json()
  return data.success
}
```

- **Fail open on CF outage** — a Cloudflare availability event should not take down the free tier; IP rate limit and monthly cap remain as backstops
- **Fail closed on missing/reused/expired tokens** — no token = `403`
- `remoteip` is passed to Cloudflare when available for stronger verification; omitted if IP is `unknown`

#### Environment Variables

| Variable | Side | Where to find it | Purpose |
|----------|------|-----------------|---------|
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Client (build-time) | Cloudflare Dashboard → Turnstile → your site → Site Key | Embedded in the browser bundle; safe to expose |
| `TURNSTILE_SECRET_KEY` | Server only | Cloudflare Dashboard → Turnstile → your site → Secret Key | Used in `siteverify` call; never sent to client |

Both declared in `turbo.json → globalPassThroughEnv`. Add to `.env.local` (dev) and Vercel (prod).

#### Cloudflare Setup (one-time)

1. Cloudflare Dashboard → **Turnstile** → **Add site**
2. Hostname: `opencosmos.ai` · Widget type: **Invisible**
3. Copy Site Key → `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
4. Copy Secret Key → `TURNSTILE_SECRET_KEY`

No Cloudflare proxy or DNS changes needed. Turnstile works purely as a browser widget + server-side API call — the site does not need to be on the Cloudflare network.

#### Siteverify Response

```json
// Success
{ "success": true, "challenge_ts": "2026-04-10T...", "hostname": "opencosmos.ai" }

// Failure
{ "success": false, "error-codes": ["invalid-input-response"] }
```

Common error codes: `missing-input-response` (no token), `invalid-input-response` (bad/reused token), `timeout-or-duplicate` (expired or already verified). All non-success results return `403 { error: 'bot_suspected' }` to the client.

### Hard-Won Lessons

#### `proxy.ts` is required for `withAuth()` to function on Next.js 16+

`@workos-inc/authkit-nextjs` v3 requires a `proxy.ts` file at the app root (Next.js 16+) — or `middleware.ts` on Next.js ≤15 — to inject the `x-workos-middleware` request header on every matched route. Without it, `withAuth()` silently returns `{ user: null }` for every request even when a valid session cookie exists.

**Symptom:** User appears logged in (session cookie is set, dialog history is present) but `AuthButton` shows "Log in" and `SidebarAvatar` shows the generic icon on every page load.

**Fix:** `apps/web/proxy.ts` at the repo root of the Next.js app:

```ts
import { authkitProxy } from '@workos-inc/authkit-nextjs'

export default authkitProxy()

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

Use the broad matcher with static asset exclusions (not a catch-all `/:path*`) to avoid intercepting Tailwind CSS v4 static assets, which breaks styles.

**Note on naming:** In Next.js 16+, this file is called `proxy.ts`, not `middleware.ts`. Using `middleware.ts` in Next.js 16 is deprecated.

#### Turbo env vars must be declared in `turbo.json`

Vercel env vars are **silently dropped** by Turborepo unless declared in `turbo.json → globalPassThroughEnv`. The build succeeds but the runtime env vars are `undefined`. This caused the WorkOS webhook handler to fail silently — signature verification threw because `WORKOS_WEBHOOK_SECRET` was undefined.

All app env vars must appear in `turbo.json`:

```json
"globalPassThroughEnv": [
  "WORKOS_API_KEY",
  "WORKOS_CLIENT_ID",
  "WORKOS_WEBHOOK_SECRET",
  "WORKOS_COOKIE_PASSWORD",
  "WORKOS_REDIRECT_URI",
  "ANTHROPIC_API_KEY",
  "COSMO_SYSTEM_PROMPT",
  "COSMO_FREE_MONTHLY_CAP",
  "COSMO_ADMIN_SECRET",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN"
]
```

Use `globalPassThroughEnv` (not `globalEnv`) — secrets should be available to the pipeline without being hashed into the Turbo cache key.

#### WorkOS webhook `constructEvent` — signature verification and payload format

`workos.webhooks.constructEvent()` returns a `Promise`. Always `await` it.

**Payload must be a parsed JSON object, not a raw string.** The SDK's `computeSignature` method calls `JSON.stringify(payload)` internally to reconstruct `timestamp.json_body` before hashing — it needs to re-serialize the object identically to what WorkOS signed. Passing the raw text string causes `JSON.stringify` to double-encode it (`"\"{ \\\"event\\\"...}\""`) which never matches the original signature, producing `HTTP 400 Invalid signature` on every delivery.

```ts
// ✅ Correct — parse first, then pass the object
const rawBody = await req.text()
const parsedPayload = JSON.parse(rawBody)
event = await workos.webhooks.constructEvent({
  payload: parsedPayload,   // SDK will JSON.stringify this internally
  sigHeader,
  secret: process.env.WORKOS_WEBHOOK_SECRET!,
})

// ❌ Wrong — raw string causes JSON.stringify to double-encode
event = await workos.webhooks.constructEvent({
  payload: rawBody as unknown as Record<string, unknown>,
  sigHeader,
  secret: process.env.WORKOS_WEBHOOK_SECRET!,
})
```

The SDK's TypeScript type (`payload: Record<string, unknown>`) is correct — the earlier note in this file claiming it expects a raw string was wrong and has been removed.

> **Note:** This fix was deployed in commit `4ade138` but has not yet been verified against a live WorkOS delivery. Confirm by checking Vercel logs after the next `user.created` event.

---

## Subscription Benefits — Substack & Circle

Flame and Hearth subscribers receive access to external platforms as part of their plan. Provisioning and revocation are triggered automatically by the Stripe webhook.

**File:** `apps/web/lib/benefits.ts`  
**Called from:** `apps/web/app/api/webhooks/stripe/route.ts`

### Tier → Benefit Matrix

| Tier | Substack newsletter | Circle community |
|------|--------------------|--------------------|
| **Spark** | — | — |
| **Flame** | ✓ | — |
| **Hearth** | ✓ | ✓ |

### Trigger Flow

```
Stripe event: checkout.session.completed
  → webhook handler retrieves tier from price ID
  → calls getWorkOSUser(userId) to fetch email + name
  → calls provisionBenefits(tier, email, name)
      → addSubstackSubscriber()   [if flame or hearth]
      → addCircleMember()         [if hearth only]

Stripe event: customer.subscription.deleted
  → calls revokeBenefits(tier, email)
      → removeCircleMember()      [if hearth only]
      → (Substack: intentionally left subscribed — see note below)
```

All benefit calls use `Promise.allSettled()` — a failure in one never blocks the other, and neither blocks the subscription confirmation response to Stripe.

### Substack Integration

**Publication:** `shalomormsby.substack.com`

**Current approach:** Subscribes the user as a **free newsletter subscriber** via the publication's public subscription form endpoint. This is the same mechanism as submitting the "Subscribe" form on the Substack page — no auth credentials required from our side.

> ⚠️ **Limitation — free tier only:** This method adds users as free Substack subscribers. It does **not** grant a paid Substack subscription. Flame and Hearth subscribers receive the newsletter but are not marked as paid Substack members.
>
> **TODO:** Apply for the Substack partner program to enable programmatic paid subscription gifting. This would let Flame/Hearth subscribers receive full paid Substack access. See `docs/pm.md → Phase 1b → Substack partner API`.

**On cancellation:** Substack subscribers are intentionally **not removed**. Revoking newsletter access on plan cancellation is punitive and hurts goodwill. Users can unsubscribe themselves if desired.

**Endpoint:**
```
POST https://shalomormsby.substack.com/api/v1/free
Content-Type: application/json

{ "email": "user@example.com", "first_name": "First" }
```

**Success response:** HTTP 200. No meaningful body — treat any 2xx as success.

**Failure handling:** Non-2xx is logged at `[benefits/substack] subscribe failed {status} {body}` but does not throw. Network errors logged at `[benefits/substack] request error`.

**No env vars required** for the subscribe call — it is a public endpoint.

### Circle Integration

**Community:** Creative Powerup — `community.creativepowerup.com`  
**API base:** `https://app.circle.so/api/v1`  
**Auth:** `Authorization: Token {CIRCLE_API_KEY}` header on every request

**Required env vars:**

| Variable | Where to find it | Purpose |
|----------|-----------------|---------|
| `CIRCLE_API_KEY` | Circle Dashboard → Settings → API | Bearer token for all API calls |
| `CIRCLE_COMMUNITY_ID` | Circle Dashboard → Settings → General → Community ID | Numeric community identifier |

Both are declared in `turbo.json → globalPassThroughEnv`. Add to `.env.local` (dev) and Vercel (prod).

**On subscription (Hearth):**
```
POST https://app.circle.so/api/v1/community_members
Authorization: Token {CIRCLE_API_KEY}
Content-Type: application/json

{
  "community_id": "{CIRCLE_COMMUNITY_ID}",
  "email": "user@example.com",
  "name": "Full Name",
  "skip_invitation": false
}
```
`skip_invitation: false` sends the standard Circle welcome email/invite to the user.

**On cancellation (Hearth):** Two-step process — look up member ID by email, then delete:

```
// Step 1: find member ID
GET https://app.circle.so/api/v1/community_members
  ?community_id={CIRCLE_COMMUNITY_ID}
  &email=user@example.com
Authorization: Token {CIRCLE_API_KEY}

Response: { "community_members": [{ "id": 12345, ... }] }

// Step 2: delete
DELETE https://app.circle.so/api/v1/community_members/12345
  ?community_id={CIRCLE_COMMUNITY_ID}
Authorization: Token {CIRCLE_API_KEY}
```

If the member is not found in Step 1 (e.g. they manually left, or provisioning originally failed), the deletion is skipped cleanly — no error thrown.

**Failure handling:** Non-2xx at either step is logged at `[benefits/circle] add member failed` / `[benefits/circle] member lookup failed` / `[benefits/circle] remove failed`. Network errors logged at `[benefits/circle] request error`. Never throws.

### WorkOS User Lookup

Both integrations need the subscriber's email and display name. These are not stored in Stripe or Redis — they live in WorkOS. The webhook handler resolves them via:

```ts
// apps/web/lib/benefits.ts
const workos = new WorkOS(process.env.WORKOS_API_KEY!)
const user = await workos.userManagement.getUser(userId)
// userId = session.client_reference_id from the Stripe checkout session
```

If the lookup fails (network error, user deleted), `getWorkOSUser()` returns `null` and benefit provisioning is skipped entirely for that event, logged at `[benefits] WorkOS user lookup failed`.

### Error Handling Philosophy

Benefit provisioning is **best-effort and non-blocking**. The Stripe webhook always returns `{ received: true }` with HTTP 200 regardless of whether Substack or Circle calls succeed. This ensures:
- Stripe never retries a webhook due to a benefit provisioning failure
- A Circle API outage never prevents a subscriber from completing checkout
- Failed provisioning is visible in Vercel function logs for manual remediation

Manual remediation: if a benefit provisioning log shows failure, look up the subscriber in the Stripe Dashboard, get their email from WorkOS (or Stripe's `customer.email`), and add them manually in the Substack or Circle dashboard.

---

## Sovereignty Tiers (Compute)

Sovereignty Tiers govern **where LLMs process prompts** — not the knowledge base. The knowledge base is public by design. The strategic shift (see [chronicle.md Chapter 3](chronicle.md)) redefined sovereignty: it lives in the constitutional layer, not the hardware.

| Tier | Where | Role |
|------|-------|------|
| **BYOK (primary)** | Claude API, user's own key | Production inference. User pays their own API costs. Constitutional layer ensures voice fidelity. |
| **Shared key (free tier)** | Claude API, OpenCosmos key | Rate-limited greeting experience for new visitors. |
| **Local (dev)** | Dell XPS 8950 via Ollama | Development, experimentation, corpus validation. Not production. |

The original three-tier solar-powered sovereignty model (Sun-Grace Protocol, Lunar Protocol) is paused. See [sustainable-power-system-design.md](../docs/projects/sustainable-power-system-design.md) for the preserved engineering spec.

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-10 | Upstash Vector for cloud knowledge base | Free tier covers curated corpus. Pay-per-query scales with self-funded project. Serverless + Vercel-native. Documents live in git; only need a vector index. |
| 2026-03-10 | Cloud-primary knowledge base + local mirror | Knowledge hosting ≠ compute. Serving embeddings costs pennies; inference costs watts. Global accessibility serves "Generous by Design." |
| 2026-03-10 | Sovereignty Tiers govern compute only | Published knowledge is intended to be shared. User inference privacy is a separate concern from publishing wisdom to the world. |
| 2026-03-13 | BYOK with Claude API as primary inference | Local 70B inference on the Dell is unusably slow. Sovereignty redefined: voice/values/corpus/constitution, not silicon. BYOK keeps infrastructure costs fixed for OpenCosmos. |
| 2026-03-20 | AI Triad architecture (Sol, Socrates, Optimus + Cosmo as moderator) | Productive tension between cognitive modes (heart, inquiry, execution) produces richer responses than any single voice. Inspired by GAN insight. Cosmo moderates, not participates. |
| 2026-03-21 | Kaizen practice for continuous improvement | Exemplars (curated model conversations for few-shot injection) and feedback (prompt evolution signal) grouped under a kaizen/ directory. Names the practice, not just the artifacts. Named after the Japanese philosophy of incremental refinement (改善). |
| 2026-03-22 | Knowledge CLI v2: graph-weaving publication | Publication transforms from filing to graph-weaving. Enriched frontmatter (author, era, tradition), auto cross-references, curation log, collection auto-linking, corpus health report. Every publish adds connections, not just content. Dell sync decoupled to on-demand `pnpm knowledge:sync-dell`. |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| React | React 19.2.1 |
| Styling | Tailwind CSS via @opencosmos/ui CSS variables |
| Animation | Framer Motion 12 |
| State | Zustand 5 |
| Design System | `@opencosmos/ui` (npm, 100+ components) |
| Monorepo | Turborepo + pnpm |
| Deployment | Vercel |
| Vector DB | Upstash Vector |
| LLM Inference (primary) | Claude API (BYOK) via `@anthropic-ai/sdk` |
| LLM Inference (dev) | Ollama (Apertus 8B/70B) on Dell XPS 8950 |
| AI Package | `@opencosmos/ai` — constitutional layer, AI Triad, kaizen (WIP) |

---

**Related:**
- [AGENTS.md](../AGENTS.md) — Build commands, file organization, dev workflow
- [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md) — The four principles
- [WELCOME-COSMO.md](../packages/ai/WELCOME-COSMO.md) — Cosmo's origin story, mission, and foundational philosophy
- [COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md) — Operational system prompt (v2)
- [economics.md](economics.md) — Unit economics: LLM costs, tier margins, voice analysis, feature economics
- [pm.md](pm.md) — Active project tasks, priorities, and launch checklist
- [strategy.md](strategy.md) — Three Futures, business model, revenue milestones
- [chronicle.md](chronicle.md) — The story behind the decisions
- [knowledge/README.md](../knowledge/README.md) — Knowledge corpus organization
- [archive-and-deprecated/INCEPTION.md](archive-and-deprecated/INCEPTION.md) — Cosmo AI technical blueprint (historical)
