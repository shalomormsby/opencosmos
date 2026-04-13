# Knowledge Intelligence Layer

> The architecture, vision, and technical specification for Cosmo's dynamic knowledge retrieval, the sidebar companion, and the unification of the knowledge graph with the RAG layer.

**Status:** Phases 1–3 complete. Phase 4 (sidebar companion) is next. Phase 0 (graph WebGL fix) remains blocked on opencosmos-ui.  
**Added:** 2026-04-12

---

## Vision

The knowledge graph is not a visualization feature. It is the connective tissue of the entire system.

When OpenCosmos achieves this layer, the experience looks like this:

**The companion test.** A person reading the Tao Te Ching on `/knowledge` opens the sidebar. They ask Cosmo a question. Cosmo responds from the text in front of them, draws a connection to Emerson's Over-Soul and the Quaker Inner Light that the person hadn't considered — and names where Wu Wei's effortless non-striving stands in direct tension with the moral urgency at the heart of Transcendentalism — then offers a question that opens something new. The person feels accompanied — not processed.

> **Design constraint:** The companion holds tension. Cosmo is as likely to illuminate an irreconcilable difference between traditions as it is to find a bridge. Flattening distinct philosophies into universal harmony is a form of dishonesty. Buddhism's *Anattā* (non-self) is not the Hindu *Ātman* wearing different clothes.

**The digital brain.** A person who starts a conversation with Cosmo expresses curiosity about the wisdom of nature. Beside Cosmo, the knowledge graph lights up like a digital brain — clusters illuminate, associations spark, connected elements brighten — a visualization of the "thinking" process. Cosmo responds by naming the traditions that speak to this (Gaia Hypothesis, Native American teaching, Taoism, Transcendentalism) and asks which lens they'd like to explore. However the person responds, Cosmo recognizes this as part of their wisdom language, and carries it forward. Gems of insight can be remembered and retrieved in future sessions.

**The project brain.** A person uses a custom knowledge graph not of wisdom traditions, but of their own projects — nodes are initiatives, edges are dependencies and relationships. Cosmo serves as a wise project manager, helping them navigate the living map of their work.

These are not features. They are the consequence of building the infrastructure correctly.

---

## Inspiration

This layer is inspired by and extends the work of [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) and a [practitioner's team-oriented extension](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f?permalink_comment_id=6090303#gistcomment-6090303).

### Key ideas harvested from Karpathy's pattern

**The wiki as a persistent, compounding artifact.** Rather than synthesizing from raw text on every query, pre-build a synthesis layer. The wiki extracts key claims, documents cross-references, and flags contradictions at ingestion time. The result compounds with every new source added.

**Division of labor.** Humans curate sources. LLMs handle the tedious bookkeeping (cross-referencing, consistency, summarization) that causes human-maintained wikis to fail over time.

**Three operations on the corpus:**
- **Ingest:** Extract information from sources, update 10–15 wiki pages per ingestion
- **Query:** Search existing pages and synthesize answers with citations, filing new discoveries as wiki pages
- **Lint:** Periodic health check for orphaned pages, stale claims, and data gaps

**Ambient visibility.** `@import` directives keep the wiki always present in context — no explicit lookup required. This is already implemented at OpenCosmos for both Claude Code sessions and the deployed product.

### Key ideas to build toward (from the team extension)

**Path-scoped rules.** Auto-load domain instructions based on file patterns. When working in `knowledge/sources/buddhism-*`, buddhism-specific retrieval guidance activates automatically. This is particularly relevant as the corpus grows into specialized domains.

**Multi-source ingestion.** Task worklogs and Cosmo conversations are themselves a source of knowledge — not just curated external texts. The synthesis loop should be able to ingest from any structured input.

**Git-native architecture.** The wiki as a git artifact enables branching, forking, and PR review of knowledge changes — treating the corpus with the same rigor as code.

**Confidence with contradictions.** Surface known contradictions between traditions as first-class wiki content. The OpenCosmos frontmatter schema already has `contradictions` and `confidence` fields — the gap is surfacing them in RAG returns and in the graph. This is philosophical honesty made architectural.

**The lint operation.** Run a periodic GitHub Action that audits wiki health: orphaned pages (no incoming links), stale claims (high confidence but last reviewed >1 year ago), and data gaps (entities in the source corpus with no wiki page). This is a continuous improvement process, not a one-time setup.

---

## Current State

| Layer | Status |
|-------|--------|
| Knowledge corpus (~60 source documents) | Live, actively curated |
| Wiki synthesis layer (25 entities/concepts/connections) | Live, updated 2026-04-11 |
| Wiki index ambient in Claude Code sessions | Live (via `@` import in CLAUDE.md) |
| Wiki index ambient in deployed product | Live (baked into `COSMO_WIKI_INDEX` at build time) |
| Knowledge browser at `/knowledge` | Live |
| Knowledge graph data pipeline (generate + Redis + API) | Built, working |
| Knowledge graph visualization | **Blocked — WebGL nodes don't render (black canvas)** |
| Upstash Vector (RAG vector store) | Configured (env vars added) |
| Embedding pipeline (document → vector chunks) | Built — run `pnpm embed` to seed |
| RAG API endpoint (`/api/knowledge`) | Built |
| RAG wired into Cosmo conversation flow | Built (1.5s timeout, fail-open) |
| Sidebar companion on `/knowledge` pages | Not yet built (Phase 4) |
| Graph + RAG metadata unification | Not yet built (Phase 5) |
| Community contribution pathway | Not yet built (Phase 6) |

---

## Architecture

### Three-layer knowledge system (current)

```
Layer 1 — Source documents (knowledge/sources/, commentary/, etc.)
   ↓ curated by human editorial process
Layer 2 — Wiki synthesis (knowledge/wiki/)
   Pre-built cross-references, entity summaries, concept pages
   ↓ ambient in every session via @import (dev) and COSMO_WIKI_INDEX (prod)
Layer 3 — Serving infrastructure
   Claude Code: @knowledge/wiki/index.md loaded at session start
   Product: COSMO_WIKI_INDEX env var baked at deploy time
   Graph: Redis keys (knowledge:graph, knowledge:graph:preview)
```

### Extended four-layer system (target)

```
Layer 1 — Source documents (unchanged)
   ↓
Layer 2 — Wiki synthesis (unchanged, but linting added)
   ↓
Layer 3 — Vector index (new)
   Upstash Vector: chunked documents + rich frontmatter metadata
   Shared node/edge manifest from the graph generator
   ↓
Layer 4 — Dynamic retrieval (new)
   RAG API: contextual query + conversation history → relevant chunks
   Sidebar companion: document-anchored Cosmo conversation
   Graph visualization: illuminated by retrieval (stretch goal)
```

---

## Implementation

### Prerequisite: Upstash Vector (user action)

Before any RAG work can begin:
1. Create an Upstash Vector index at [console.upstash.com](https://console.upstash.com)
2. Add to `apps/web/.env.local` and Vercel:
   ```
   UPSTASH_VECTOR_REST_URL=...
   UPSTASH_VECTOR_REST_TOKEN=...
   ```
3. Install the client: `pnpm add @upstash/vector --filter web`

### Phase 0: Fix graph WebGL rendering

**Files:**
- `opencosmos-ui/packages/ui/src/components/data-display/knowledge-graph/KnowledgeGraph.tsx`
- `opencosmos-ui/packages/ui/src/components/data-display/knowledge-graph/GlowNodeProgram.ts`

**Hypothesis:** `GlowNodeProgram.render()` calls `gl.blendFunc` on `this.normalProgram` before sigma has fully initialized the program object. Silent throw → black canvas.

**Diagnosis steps (in order):**

**Step 1 — validate hypothesis:** Swap `GlowNodeProgram` for sigma's built-in `NodePointProgram` in `KnowledgeGraph.tsx`. If nodes appear, the issue is isolated to `GlowNodeProgram`. If nodes still don't appear, the issue is in attribute packing or graph data shape — a different investigation.

**Step 2 (if Step 1 confirms GlowNodeProgram):** Add a null guard to `render()`:
```ts
render(params: RenderParams) {
  if (!this.normalProgram?.gl) { super.render(params); return }
  const { gl } = this.normalProgram
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
  super.render(params)
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
}
```

**Step 3 (if Step 1 shows no nodes even with NodePointProgram):** The issue is in graph data. Check that `graphology.addNode()` calls have valid x/y attributes, and that `processVisibleItem()` is being called at all. Add `console.log` in the sigma `afterRender` hook to confirm nodes are in the graph.

**Publishing cadence:**
- Nodes render with `NodePointProgram` → publish `@opencosmos/ui@1.4.3` (interim)
- `GlowNodeProgram` fixed → publish `@opencosmos/ui@1.4.4` (final)
- Update: `pnpm update @opencosmos/ui --filter web`

### Phase 1: Embedding pipeline

**New file:** `scripts/knowledge/embed-knowledge.ts`

**Trigger:** `.github/workflows/knowledge-sync.yml` — runs after `pnpm graph` on push to `main` when `knowledge/**` changes.

**Algorithm:**
```
for each .md file in knowledge/**:
  1. Parse YAML frontmatter
  2. Split body at ## H2 headings (1-paragraph overlap)
  3. For each chunk:
     - Build chunk_id: `{docPath}#{heading-slug}` (deterministic → idempotent re-runs)
     - Attach metadata: source, heading, title, author?, domain, tradition?, role, tags[], audience[], wiki_path?
  4. Upsert to Upstash Vector (data = chunk text; Upstash handles embedding generation)
```

**Chunk size target:** 200–800 tokens. Use `~4 chars/token` as approximation.

**Idempotency:** Deterministic chunk IDs mean re-runs are safe — existing vectors are updated, not duplicated.

**Metadata filtering:** The `domain`, `role`, and `tradition` metadata fields enable filtered queries (e.g., retrieve only from `domain=buddhism` for a Sol-voice response).

### Phase 2: RAG API endpoint

**New file:** `apps/web/app/api/knowledge/route.ts`

**New helper:** `apps/web/lib/rag.ts` — `fetchRagContext(query, history, currentDoc?)`

**Request shape:**
```ts
POST /api/knowledge
{
  query: string,
  conversation_history?: { role: 'user' | 'assistant', content: string }[],
  current_document?: string  // full markdown content of current page
}
```

**Response shape:**
```ts
{
  chunks: Array<{
    text: string,
    source: string,       // doc path
    title: string,
    author?: string,
    tradition?: string,
    domain: string,
    heading: string,
  }>
}
```

**Retrieval logic:**
1. Contextual query = last 3 exchange pairs + current query concatenated (improves relevance for ongoing conversations)
2. Query Upstash Vector: `topK: 8`
3. If `current_document` is provided: always include it — it overrides similarity scoring for the document the user is actively reading
4. Return with full metadata for honest citation

**Timeout transparency guarantee:** Timeouts are never silent. A `timedOut` flag is always passed to Cosmo. A true companion admits when it loses the thread — transparency builds more trust than a seamless hallucination.

### Phase 3: Wire RAG into Cosmo chat flow

**Modified file:** `apps/web/app/api/chat/route.ts`

**Non-blocking pattern with timeout fallback:**
```ts
// apps/web/lib/rag.ts
export interface RagResult {
  chunks: RagChunk[]
  timedOut?: boolean
}
// Timeout shape: { chunks: [], timedOut: true }
// Error shape:   { chunks: [], timedOut: false }

// apps/web/app/api/chat/route.ts
const ragPromise = fetchRagContext(lastUserMessage, messages.slice(-6))
  .catch(() => ({ chunks: [], timedOut: false } satisfies RagResult))

const ragResult: RagResult = await Promise.race([
  ragPromise,
  new Promise<RagResult>(r => setTimeout(() => r({ chunks: [], timedOut: true }), 1500))
])
```

**Context injection order (into Anthropic messages.system):**
```
1. SYSTEM_PROMPT              — static, prompt-cached
2. COSMO_WIKI_INDEX           — static, prompt-cached
3a. RAG chunks (if retrieved) — dynamic, labeled by source
3b. If timedOut === true      — inject: [RAG_TIMEOUT: retrieval for this specific document did not complete in time]
4. Conversation history       — with ephemeral cache on last turns
```

**`[RAG_TIMEOUT]` handling in system prompt:** Cosmo is instructed: *"If you see `[RAG_TIMEOUT]` in the context, acknowledge it honestly — say you're having trouble accessing the specific text right now, then respond from what you do hold. Do not hallucinate specific passages."*

**RAG chunk formatting:**
```
## Retrieved Passages

**[Title]** (author, tradition)
Source: knowledge/sources/buddhism-dhammapada.md

{chunk text}

---
```

**Why this order matters:** Static cached blocks (1 + 2) benefit from Anthropic's prompt caching (~40-50% cost reduction on input tokens). Dynamic content (3 + 4) comes after, without disrupting the cache boundary.

### Phase 4: Sidebar companion for `/knowledge` pages

**New files:**
- `apps/web/app/knowledge/[...slug]/CosmoChatSidebar.tsx`
- `apps/web/app/knowledge/[...slug]/useSectionInView.ts`
- `apps/web/app/api/knowledge/chat/route.ts`

**Modified:** `apps/web/app/knowledge/[...slug]/page.tsx`

**Sidebar behaviors:**

*Document anchoring:* On sidebar open, pass the full current document content as `current_document` to the RAG endpoint. This document is always in Cosmo's context for this session — it is the ground of the conversation.

*Section awareness:* `useSectionInView` uses `IntersectionObserver` to track which H2 heading is currently in the viewport. Passed as `section_in_view` in each RAG call — refines retrieval toward what the person is actually reading.

*Conversation continuity:* History stored in `sessionStorage` keyed by session ID. When a user navigates from document A → B, history carries over. Cosmo's system addendum for session B acknowledges the transition: *"You are now on [B title]. You were just reading [A title]."*

*Document-aware system addendum:*
```
You are present as a companion on this document: **{title}** by {author}.
The person is reading this text now. Stay anchored here while remaining
free to draw connections across the corpus. If they are in section
"{section_in_view}", let that inform your orientation.
```

*Component structure:*
- Right-side collapsible panel with CSS slide transition
- Toggle button anchored to right edge of viewport (always visible — not hidden in a menu)
- Cosmo messages left-aligned, user messages right-aligned
- Respects `useMotionPreference` for the slide animation
- No conversation history sidebar (document focus, not session management)
- "Cosmo" header with document title

*No auth required:* Free tier token budget applies. This keeps the sidebar accessible to every reader, not just subscribers.

### Phase 5: Graph + RAG metadata unification

**This is the keystone.** The graph visualization and the RAG layer share the same infrastructure. A chunk retrieved by similarity search also carries its position in the knowledge graph — and its graph neighbors surface as lower-priority context even if they didn't match the query.

**How it works:**

`generate-wiki-graph.ts` (already written) produces the full node/edge graph and writes it to Redis. Add one step: also write `knowledge/graph/manifest.json` (committed to repo, updated by CI). Edges carry a `type` field encoding the polarity of the relationship — a first-class signal, not an afterthought:
```json
{
  "nodes": [{ "id": "concepts/impermanence", "domain": "buddhism", "summary": "...", "embedding": [0.12, ...] }],
  "edges": [
    { "source": "concepts/impermanence", "target": "entities/plato", "weight": 0.7, "type": "contrasts" }
  ],
  "generatedAt": "2026-04-12T..."
}
```

Edge `type` vocabulary: `similar | extends | contrasts | critiques`.

In the RAG API (`apps/web/lib/rag.ts`): after retrieving top-k chunks, look up each chunk's source document in the manifest to find degree-1 graph neighbors. Append neighbor summaries as a lower-priority context block — but **only after passing the neighbor injection rules below**.

**Neighbor injection rules (strictly enforced):**
1. **Semantic gate:** Only inject a degree-1 neighbor if its pre-computed embedding's cosine distance to the *user's original query* is within threshold 0.4. This filters neighbors that are graph-connected but topically irrelevant to this particular question.
2. **Hard cap:** Inject at most **3 neighbors total** across all retrieved chunks, ranked by edge weight descending. With `topK: 8` and avg 5 connections, uncapped injection silently adds up to 40 summaries per query — enough to trigger "lost in the middle" failure and significantly inflate token cost.
3. **Relationship labels:** Surface the `type` when injecting. A `contrasts` edge is as valuable as a `similar` edge — often more so.

```
## Related (by knowledge graph)

- **Civil Disobedience** (Thoreau) — *extends* nonviolence — concepts/civil-disobedience
- **Ātman** (Vedanta) — *contrasts with* Anattā — concepts/atman
```

**The result:** A question about Thoreau surfaces civil-disobedience.md and nonviolence.md because the graph says they're neighbors — not because they matched the semantic query. And a question about Buddhist impermanence surfaces the Platonic *eternal forms* not as a similarity, but as a structural disagreement.

### Echo chamber prevention

The RAG layer is a similarity engine by design — it retrieves what is *close* to the query. Left unchecked, cross-tradition summaries that have been synthesized toward a common abstraction will consistently outperform tradition-specific nuance. Generic bridges surface; distinct, irreconcilable truths get buried.

Three mitigations work in concert:

**1. Diversity enforcement in retrieval.** If the top-k results contain chunks from ≤2 distinct traditions (or domains), `fetchRagContext` checks for high-scoring outliers from underrepresented traditions and promotes one into the context — even at the cost of raw similarity score. Implemented as a post-retrieval re-ranking step.

**2. Graph edges carry polarity.** The `type` field means Cosmo is equally exposed to *why things differ* as to why they connect. A `contrasts` edge from *Anattā* to *Ātman* is not a relationship to smooth over — it is the point.

**3. The system prompt prohibits synthetic harmony.** Cosmo's document-aware addendum (Phase 4) includes: *"When surfacing connections across traditions, hold the distinction as carefully as the similarity. Buddhism's non-self (Anattā) and Hinduism's true self (Ātman) are not reconciled by a clever reframe — they represent a genuine philosophical disagreement. Name it."*

The echo chamber is not solved by the graph. It is solved by encoding *disagreement* as a first-class relationship type at every layer of the architecture.

**Files:**
- `scripts/knowledge/generate-wiki-graph.ts` ← add manifest.json write step
- `knowledge/graph/manifest.json` ← new (auto-generated, committed)
- `apps/web/lib/rag.ts` ← extend to load manifest and surface neighbors

### Phase 6: Community contribution pathway

**Files:**
- `apps/web/app/knowledge/contribute/page.tsx` — form: title, body, suggested domain/role, optional author/source
- `apps/web/app/api/knowledge/contribute/route.ts` — submits as GitHub issue via `GITHUB_ISSUES_PAT` env var; issue labeled `knowledge-contribution`

Cosmo is not involved in curation. This is a human editorial function. The form is intentionally simple — the barrier to contribution should be a thoughtful choice, not a bureaucratic form.

### Phase 7: Wiki lint operation

A scheduled GitHub Action that audits corpus health:
- **Orphaned wiki pages:** wiki articles with no incoming `synthesizes` references — may indicate over-abstraction
- **Stale claims (domain-type-aware):** the check depends on `domain_type` in the wiki page frontmatter:
  - `domain_type: evolving_domain` (AI ethics, project management, current events): flag pages with `confidence: high` but `last_reviewed` > 1 year — these domains genuinely shift
  - `domain_type: wisdom_tradition` (Taoism, Buddhism, Stoicism, Transcendentalism, etc.): skip time-based review entirely; instead run a **semantic conflict check** — flag pages where newly ingested source documents contain claims that semantically contradict the existing synthesis (cosine distance above a conflict threshold). Time does not invalidate Zhuangzi. New scholarship may.
  
  The goal is catching genuine inaccuracy, not manufacturing maintenance work. A well-synthesized page on *Wu Wei* should not require human review because 366 days have passed.
- **Missing entity pages:** sources with `author` field but no corresponding `knowledge/wiki/entities/{slug}.md`
- **Disconnected nodes:** graph nodes with degree-0 (no edges) — likely a data quality issue or a genuinely isolated idea worth noting

Output: a GitHub issue summarizing the audit results. Human-reviewed, not auto-corrected.

---

## Stretch Goals

### The digital brain visualization

When a person is in conversation with Cosmo, the knowledge graph should be optionally visible alongside — illuminating in real time as Cosmo draws from the corpus. When Cosmo retrieves a passage from the Dhammapada, the `buddhism` cluster brightens. When a connection is made to Emerson, an edge pulses between the two nodes.

**Technical approach:**
- RAG retrieval already returns source metadata (which chunks were used)
- Pass retrieved chunk IDs to the graph component as a `highlightedNodes` prop
- Graph's `nodeReducer` brightens those nodes temporarily during Cosmo's response
- Requires the graph to be present in the layout (sidebar or split-screen) alongside the chat interface

This is a distinct UX from the `/knowledge/graph` full-screen view. It's the graph as ambient context — present but not dominant — during conversation.

### The project brain

The same knowledge graph infrastructure that serves wisdom traditions can serve personal project management. A user's custom knowledge graph with:
- Nodes: projects, initiatives, goals, people
- Edges: dependencies, relationships, history
- Cosmo as a wise PM companion — navigating the living map of work

This requires the graph infrastructure to support user-specific graphs (not just the shared corpus graph). It's a Phase 2+ initiative, but the architecture decisions made now should not foreclose it.

---

## Sequencing and dependencies

```
Phase 0: Fix graph WebGL           → no dependencies → do first
User: Set up Upstash Vector        → prerequisite for all RAG phases
Phase 1: Embedding pipeline        → requires Upstash Vector
Phase 2: RAG API endpoint          → requires Phase 1
Phase 3: Wire RAG into chat        → requires Phase 2
Phase 4: Sidebar companion         → requires Phase 2
Phase 5: Graph+RAG unification     → requires Phases 1+2
Phase 6: Contribution pathway      → no dependencies
Phase 7: Wiki lint operation       → no dependencies (standalone CI job)
```

Phases 3 and 4 can proceed in parallel once Phase 2 is complete.
Phases 5, 6, and 7 can proceed in parallel with each other.

---

## Verification

**Graph:** `opencosmos.ai/knowledge/graph` → glowing nodes on dark background within 2 seconds of load.

**RAG retrieval:** Open Dialog → ask about impermanence → Cosmo cites a specific source document by name and author, not just wiki synthesis. The citation is accurate.

**Sidebar companion:** Open any `/knowledge` document → toggle sidebar → ask a question → Cosmo's response is grounded in the document, not generic. Navigate to another document → Cosmo acknowledges the transition naturally.

**Graph neighbors:** Ask Cosmo about Thoreau → response connects to civil disobedience and nonviolence even if those weren't in the top-k similarity results.

**The companion test:** A person reads the Tao Te Ching on `/knowledge`. Opens the sidebar. Asks a question about wu wei. Cosmo responds from the text, draws a connection to Emerson's Over-Soul and the Quaker Inner Light that the person hadn't considered, and asks a question that opens something new. The person feels accompanied, not processed.

---

## Related

- [docs/architecture.md § Knowledge Wiki Layer](architecture.md#knowledge-wiki-layer) — technical foundation
- [docs/pm.md § Phase 1d: Knowledge Intelligence Layer](pm.md#phase-1d-knowledge-intelligence-layer) — project management checklist
- [knowledge/guides/opencosmos-knowledge-graph.md](../knowledge/guides/opencosmos-knowledge-graph.md) — graph implementation guide
- [knowledge/guides/opencosmos-knowledge-wiki-workflow.md](../knowledge/guides/opencosmos-knowledge-wiki-workflow.md) — wiki workflow guide
- [packages/ai/README.md § Ambient Knowledge](../packages/ai/README.md#ambient-knowledge) — how the wiki becomes ambient
- [Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f) — inspiration
