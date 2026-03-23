# OpenCosmos Architecture

> Platform-level technical decisions and infrastructure. For the design philosophy, see [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md). For the Cosmo AI technical blueprint, see [docs/archive-and-deprecated/INCEPTION.md](archive-and-deprecated/INCEPTION.md) (historical).

**Last updated:** 2026-03-22

---

## Service Map

| Service | Provider | Deployed from | Tier |
|---------|----------|--------------|------|
| opencosmos.ai | Vercel | `opencosmos/apps/web` | Free / Pro |
| Portfolio (shalomormsby.com) | Vercel | `opencosmos/apps/portfolio` | Free / Pro |
| Creative Powerup | Vercel | `opencosmos/apps/creative-powerup` | Free / Pro |
| OpenCosmos Studio (component docs) | Vercel | `opencosmos-ui/apps/web` | Free / Pro |
| Knowledge base (docs site) | Vercel (opencosmos.ai) | `opencosmos/apps/web` | Free |
| Knowledge base (vector store) | Upstash Vector | Cloud-primary RAG — embedding storage + similarity search | Free (10K vectors, 10K queries/day) |
| Knowledge base (local mirror) | Open WebUI on Dell | Offline RAG access, development, seeding | Self-hosted |
| LLM inference (primary) | Claude API (BYOK) | Constitutional AI via `@opencosmos/ai` | User-funded |
| LLM inference (dev/local) | Dell XPS 8950 (RTX 3090) | Apertus 8B/70B via Ollama — development + experimentation | Self-hosted |
| Monorepo | Turborepo + pnpm | Build orchestration | — |
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

- **Auth:** Public read — the knowledge is public by design. Optional API key via `@upstash/ratelimit` for heavy consumers.
- **Rate limiting:** `@upstash/ratelimit` (same Upstash ecosystem, serverless, free tier). Default: 60 requests/minute per IP.
- **Shape:** `GET /api/knowledge?q=<query>&limit=5&domain=buddhism`
  - `q` (required) — natural language query
  - `limit` (optional, default 5) — number of results
  - `domain` (optional) — filter by domain code
  - `role` (optional) — filter by document role (source, commentary, reference, guide, collection)
- **Response:** Ranked chunks with source attribution (title, author, curator, domain, role, similarity score, source file path).
- **Implementation:** Query Upstash Vector with optional metadata filters, return top-K results.

### Knowledge Docs Site

A section of opencosmos.ai at `/knowledge/`, built from `knowledge/**/*.md` at deploy time.

- Renders markdown with frontmatter metadata displayed
- Browsable by domain, role, and tags
- Search powered by the same Upstash Vector index (via the RAG API)
- Built as part of the `apps/web` Next.js app — no separate deployment

### Sync Workflow (Git → Upstash Vector)

A script/GitHub Action that keeps Upstash Vector in sync with `knowledge/`.

```
On push to main (paths: knowledge/**):
  1. Parse changed .md files (frontmatter + content)
  2. Chunk by H2 sections (200-800 tokens, matching corpus guidelines)
  3. Generate embeddings (Upstash's built-in embedding or external model)
  4. Upsert to Upstash Vector with metadata (title, domain, role, tags, file path)
  5. Delete vectors for removed files
```

- **Trigger:** GitHub Action on push to `main` when `knowledge/` files change
- **Scope:** Incremental — only process changed files (git diff)
- **Embedding:** Upstash Vector supports server-side embedding with built-in models — no separate embedding API needed
- **Metadata:** Frontmatter fields stored as vector metadata for filtered retrieval

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
- [three-futures-roadmap.md](projects/three-futures-roadmap.md) — Strategic plan and phased milestones
- [chronicle.md](chronicle.md) — The story behind the decisions
- [knowledge/README.md](../knowledge/README.md) — Knowledge corpus organization
- [archive-and-deprecated/INCEPTION.md](archive-and-deprecated/INCEPTION.md) — Cosmo AI technical blueprint (historical)
