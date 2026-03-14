# OpenCosmos Architecture

> Platform-level technical decisions and infrastructure. For the design philosophy, see [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md). For the Cosmo AI technical blueprint, see [docs/archive-and-deprecated/INCEPTION.md](archive-and-deprecated/INCEPTION.md) (historical).

**Last updated:** 2026-03-10

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
| LLM inference | Dell XPS 8950 (RTX 3090) | Sovereign compute — Apertus 8B/70B via Ollama | Self-hosted, solar-powered |
| Monorepo | Turborepo + pnpm | Build orchestration | — |
| CI | GitHub Actions | Lint, typecheck, build verification | Free |
| DNS | Spaceship | opencosmos.ai         | — |
| npm | @opencosmos org | Design system packages | Free |

---

## Core Architecture Principles

1. **Compute is sovereign. Knowledge is shared.** LLM inference stays on local hardware (Sovereignty Tiers). The knowledge base is cloud-primary and globally accessible. These are different workloads with different requirements.

2. **Free tier first.** Every cloud service must have a generous free tier that covers current scale. Upgrade when usage demands it, not before.

3. **Vercel ecosystem.** Prefer services that integrate natively with Vercel (Upstash, Supabase) over standalone infrastructure. Less to manage.

4. **Documents live in git.** The `knowledge/` directory is the source of truth. Cloud services (Upstash Vector, docs site) are derived from git — not the other way around.

---

## Knowledge Base Architecture

The knowledge base serves two audiences through two interfaces, backed by one source of truth.

```
Author writes .md content
       │
       ▼
Publication CLI (pnpm knowledge:publish)
  ├─ LLM generates frontmatter (Apertus local → Claude API → manual)
  ├─ Author reviews + confirms
  ├─ Git commit + push
  └─ Upload to Open WebUI (Dell, if reachable)
       │
       ▼
knowledge/ (git, source of truth — this repo)
       │
       ├──→ GitHub Action ──→ Upstash Vector (embeddings, similarity search)
       │                            ↑
       │                 RAG API (apps/web/app/api/knowledge/)
       │
       └──→ Vercel build ──→ opencosmos.ai/knowledge (apps/web)
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

A lightweight CLI tool that automates the full knowledge publication workflow. The author's job is to write the content; the CLI handles metadata, git, cloud sync, and local mirror.

**Workflow:**

```
Author writes content (no frontmatter)
         │
         ▼
pnpm knowledge:publish <file-or-directory> [--role source] [--domain buddhism]
         │
         ├─ 1. Read the .md content
         ├─ 2. LLM generates frontmatter suggestions (title, role, format,
         │     domain, tags, audience, complexity, summary)
         ├─ 3. Write draft with frontmatter → open for author review
         ├─ 4. Author confirms or edits
         │
         ▼  On confirmation:
         ├─ 5. Write final file to knowledge/{role}s/{domain}-{slug}.md
         ├─ 6. Git add + commit + push → triggers GitHub Action (Upstash sync + Vercel rebuild)
         └─ 7. Upload to Open WebUI on Dell (if reachable via Tailscale)
```

**Metadata generation (LLM-assisted):**
- Sends document content + the frontmatter schema + domain/format/role taxonomies to an LLM
- LLM returns structured suggestions for all frontmatter fields
- Author reviews and can override any field before confirmation
- Falls back to manual entry if LLM is unavailable

**LLM provider options (in priority order):**
1. **Local Apertus** (via Ollama on Dell) — sovereign, free, no data leaves. Used when Dell is reachable on Tailscale.
2. **Claude API** — higher quality suggestions. Used when Dell is offline or for complex documents. Requires `ANTHROPIC_API_KEY`.
3. **Manual** — author fills in frontmatter by hand. Always available as fallback.

**CLI flags:**
- `--role <role>` — pre-set the role (skips LLM suggestion for this field)
- `--domain <domain>` — pre-set the domain
- `--dry-run` — generate frontmatter and show the result without writing, committing, or uploading
- `--no-push` — write and commit locally but don't push (for batching multiple documents)
- `--no-webui` — skip the Open WebUI upload step

**Location:** `scripts/publish-knowledge.ts`, registered as `pnpm knowledge:publish` in root `package.json`.

**Dependencies:** `gray-matter` (frontmatter parsing), `@anthropic-ai/sdk` (Claude API, optional), `inquirer` (interactive review prompts).

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

**Local mirror:** Open WebUI's built-in RAG on the Dell Sovereign Node. Syncs from the same `knowledge/` source. Used for offline access, development, and validating retrieval patterns before cloud deployment.

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

## Sovereignty Tiers (Compute)

Sovereignty Tiers govern **where LLMs process prompts** — not the knowledge base. The knowledge base is public by design.

| Tier | Where | When | Power |
|------|-------|------|-------|
| 1 — Full Sovereignty | Dell (local) | Daytime (Sun-Grace Protocol) | ~80-500W |
| 2 — Reduced Capability | Queries queued | Nighttime (Lunar Protocol) | ~3W (Dell sleeping) |
| 3 — Cloud-Assisted | External API | User opt-in, per-request | N/A |

See [sustainable-power-system-design.md](packages/ai/sustainable-power-system-design.md) for the solar nervous system.

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-10 | Upstash Vector for cloud knowledge base | Free tier covers curated corpus. Pay-per-query scales with self-funded project. Serverless + Vercel-native. Documents live in git; only need a vector index. |
| 2026-03-10 | Cloud-primary knowledge base + local mirror | Knowledge hosting ≠ compute. Serving embeddings costs pennies; inference costs watts. Global accessibility serves "Generous by Design." |
| 2026-03-10 | Sovereignty Tiers govern compute only | Published knowledge is intended to be shared. User inference privacy is a separate concern from publishing wisdom to the world. |

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
| LLM Inference | Ollama (Apertus 8B/70B) on Dell XPS 8950 |
| AI Package | `@opencosmos/ai` (WIP) |

---

**Related:**
- [AGENTS.md](../AGENTS.md) — Build commands, file organization, dev workflow
- [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md) — The four principles
- [docs/archive-and-deprecated/INCEPTION.md](archive-and-deprecated/INCEPTION.md) — Cosmo AI technical blueprint (historical)
- [packages/ai/sustainable-power-system-design.md](../packages/ai/sustainable-power-system-design.md) — Solar nervous system
- [docs/opencosmos-migration.md](opencosmos-migration.md) — Migration plan (Phase 1d: knowledge base strategy)
- [knowledge/README.md](../knowledge/README.md) — Knowledge corpus organization
