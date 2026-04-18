# OpenCosmos PM

> Project management hub for all OpenCosmos work. For strategic rationale, see [strategy.md](strategy.md). For infrastructure details, see [architecture.md](architecture.md).

**Updated:** 2026-04-18

---

## Todo's from Shalom for OpenCosmos:  
- Turnstile not working. Deployed to Vercel → Turnstile activates on first free-tier send (check Vercel logs for `[turnstile]` entries). Logging added, but currently nothing shows. Logs added: 
    - [turnstile] verified ok — working correctly
    - [turnstile] missing token — widget not rendering or token not being sent
    - [turnstile] rejected — token invalid (e.g. expired, wrong site key)
    - nothing — free-tier path still not being hit
- opencosmos.ai:     
    - **CP member token access** — Brian's request (CP member credits on OpenCosmos) is now the primary P0 project. See [Phase 2](#phase-2-cp-member-token-access--top-up) below.
    - Create an icon and favicon
    - Add graceful error message when tokens are used up, or when there's an API error, or other error states
    - Token gauge: Make the green ∞ display in the sidebar the same size as it displays on the account page
    - Voice UI: Analyze the cost of adding voice using elevenlabs, Flash model. 
- OpenCosmos Home page: 
    - Replace inert text with streaming text greeting
    - Fix alignment issue of sphere on home page
- Account page: 
    - Enable users to upload profile photos (~5MB max), which, when displayed, show instead of their initials in their account icon.

## Status Overview

> Bird's-eye view of every active workstream. **Update the Status column whenever a task state changes — always before opening a PR for that work.** Priorities: P0 highest. Status legend: 🟢 active · 🟡 PR-ready · 🔵 blocked (needs decision/external) · ⚪ planned · ✅ done.

| Area | Phase / Task | Status | Priority | Next step |
|------|--------------|--------|----------|-----------|
| **Cosmo** (`apps/web`) | [Phase 1: Constellation § Phase 0](#phase-0--verify--commit-quick-wins) — H1 strips, Cosmo context, paint-safe | 🟡 PR-ready | P1 | Merge `fix/knowledge-graph-prep` → main; test on prod |
| Cosmo | [Phase 1: Constellation § Phase 1](#phase-1--standardize-the-standardization-skill) — patch standardize-knowledge, strip 22 H1 files | 🟡 PR-ready | P1 | Review + merge `feat/constellation-phase-1` → main |
| Cosmo | [Phase 1: Constellation § Phase 2](#phase-2--split-monoliths) — `/split-collection` skill + Shakespeare split | ⚪ Planned | P1 | Follows Phase 1 |
| Cosmo | [Phase 1: Constellation § Phase 3](#phase-3--quote-infrastructure) — quote YAML substrate, embed pipeline | ⚪ Planned | P1 | Awaiting sample quote data from Shalom |
| Cosmo | [Phase 1: Constellation § Phase 5](#phase-5--build-opencosmosconstellation) — `@opencosmos/constellation` package | ⚪ Planned | P1 | Built in `opencosmos-ui` repo |
| Cosmo | [Phase 1: Constellation § Phases 6–9](#phase-6--opencosmos-consumes-opencosmosconstellation) — consume, semantic edges, citations, sidebar | ⚪ Planned | P1 | Sequential after Phase 5 ships |
| Cosmo | [Phase 1: Constellation § Phase 10–11](#phase-10--community-contribution-pathway) — contribution pathway, wiki lint | ⚪ Planned | P2 | After Phase 9 |
| Cosmo | [Phase 2: CP Member Token Access & Top-up](#phase-2-cp-member-token-access--top-up) | 🔵 Blocked | P0 | Needs Shalom decisions Q1–Q4 |
| Cosmo | [Phase 1b residuals](#phase-1b-subscriptions--infrastructure-preserved-ui-superseded) — Stripe webhook, privacy policy, TOS, Fix 7 | ⚪ Planned | P1 | External actions (Stripe, legal) |
| Cosmo | [Phase 3: Conversation polish](#phase-3-conversation-polish) — mobile, accessibility, voice | ⚪ Planned | P2 | — |
| Cosmo | [Phase 4: Cosmo as PM](#phase-4-cosmo-as-pm) — publish PM doc to corpus | ⚪ Planned | P2 | Natural consequence of Phase 1 RAG |
| **@opencosmos/ai** (`packages/ai`) | [Phase 5: Package foundation](#phase-5-opencosmosai-package-foundation) | ⚪ Planned | P2 | After Constellation ships |
| @opencosmos/ai | [Phase 6: Federated Cosmo schema](#phase-6-federated-cosmo-schema-design-phase) | ⚪ Planned | P3 | Design only — no code |
| @opencosmos/ai | [Phase 7: Cosmo-powered CP programs](#phase-7-cosmo-powered-cp-programs) | ⚪ Planned | P3 | Depends on Phase 5 + CP tokens |
| **@opencosmos/ui** (separate repo) | Ongoing maintenance | 🟢 Active | P1 | — |
| **Portfolio** (`apps/portfolio`) | Case studies + consulting pipeline | ⚪ Planned | P2 | — |
| **Creative Powerup** (`apps/creative-powerup`) | Cosmo integration | ⚪ Planned | P3 | Depends on Phase 2 CP tokens |
| **Stocks** (`apps/stocks`) | TBD | ⚪ Planned | P3 | No active sprint |
| **Turnstile** | Verify free-tier activation on Vercel | 🔵 Blocked | P2 | Nothing in logs — needs investigation |


---

## Cosmo — `apps/web`

Conversation interface at opencosmos.ai. Organized by phase.

### Phase 1a: Voice ✅ — Closed 2026-03-29

Cosmo's voice validated on first contact. See [Chronicle Chapter 7](chronicle.md#2026-03-29--first-contact). AI Triad system prompts (Sol, Socrates, Optimus) written but deferred until post-launch.

### Phase 1b: Subscriptions — Infrastructure Preserved, UI Superseded

> **2026-04-16 Brand Architecture Pivot:** OpenCosmos no longer offers subscription tiers. The account page shows only: BYOK (unlimited), free 20K token quota, and a CP community invitation. All paid Cosmo access moves to Creative Powerup memberships. The Stripe infrastructure (checkout, portal, webhooks, benefit provisioning) remains intact for existing subscribers to manage billing — no new checkout flows belong on opencosmos.ai. See [strategy.md § Brand Architecture](strategy.md).

Three tiers (Spark $5, Flame $10, Hearth $50), Stripe billing, WorkOS auth, usage tracking (microdollar counters), TokenGauge UI, BYOK path, and bot protection (Fixes 1–6) are all shipped. Subscription UI removed in PRs #112–#113.

**Still needed:**
- [ ] Register `https://opencosmos.ai/api/webhooks/stripe` in Stripe Dashboard — events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` *(required for existing subscribers to cancel/update billing — no new subscriptions, but webhook is still needed)*
- [ ] **Privacy policy** — required before Stripe processes real payments. Must cover: usage metrics collected, BYOK key non-storage, Stripe data handling, retention period, user rights.
- [ ] **Terms of service** — usage limits, acceptable use, subscription terms
- [ ] Fix 7 — Monitoring & anomaly alerts (post-launch; see [architecture.md § Bot Protection](architecture.md#bot-protection-design))

**Superseded (no action required):**
- ~~Hearth tier: automatically provision full CP membership on subscribe, revoke on cancel~~ — no new Hearth subscriptions on opencosmos.ai
- ~~Existing CP members: offer migration path to Hearth~~ — moot; CP membership stays in Creative Powerup
- ~~Substack partner API~~ — no Flame/Hearth tiers to provision

### Phase 2: CP Member Token Access & Top-up

**Status:** Planning — architectural questions require Shalom's decisions before implementation begins.

**Why this exists:** The brand architecture pivot closes the OpenCosmos subscription path but opens a new obligation: CP members need managed Cosmo access (no API key required). This project builds that path cleanly, reusing the Phase 1b infrastructure rather than replacing it.

---

#### What already works

**Case 1 — Free visitor quota:** Already complete. The 20K token session budget, account page quota card, and `isLimited` state in CosmoChat (which shows the API key entry form + CP invitation when quota is exhausted) are all intact and functioning. No action required for Case 1.

**Case 2 — CP member token access:** Requires implementation. See below.

---

#### Case 2: CP Member Token Tracking + Buy-More

CP members should receive a token allotment per tier, tracked against their usage. When the allotment is exhausted, they can purchase additional tokens at cost. Purchased tokens are non-expiring while CP membership is active.

**Existing infrastructure that can be reused (nothing needs rebuilding):**

| File | What it does |
|------|-------------|
| `apps/web/lib/subscription.ts` | `getSubscription()`, `incrementUsage()`, `isWithinBudget()`, `monthlyUsagePercent()`, `getByokFlag()`, `markByok()` — all Redis-backed. Needs a `bonusTokens` counter added. |
| `apps/web/lib/stripe.ts` | `TIERS` config with `monthlyBudgetMicrodollars` per tier; checkout and portal session creation. TIERS config needs updating for CP allotments; checkout needs a `token_pack` product type. |
| `apps/web/lib/benefits.ts` | Circle member provisioning for Hearth tier — the Circle API connection pattern already exists here. **Invert it:** instead of provisioning Circle from Cosmo, receive Circle events to provision Cosmo from CP. |
| `apps/web/app/api/subscription/route.ts` | Returns `hasByok` + subscription usage data. Already the source of truth for sidebar and account page usage display. |
| `apps/web/app/api/stripe/checkout/route.ts` | Stripe checkout session creation. Intact and UI-hidden. Re-expose for token top-up purchases. |
| `apps/web/app/api/webhooks/stripe/route.ts` | Handles `checkout.session.completed`, `customer.subscription.updated/deleted`. Extend to handle token pack purchases. |

**Token economics reference:**
- Input: 3 µ$/token · Output: 15 µ$/token
- Typical conversation: ~20K tokens ≈ $0.30 cost
- Old tier budgets for reference: 152K tokens ≈ $1/month cost; 313K ≈ $2/month; 637K ≈ $4/month

---

#### Open questions — requires Shalom's decisions

**Q1 — How is CP membership verified from OpenCosmos?**

This is the critical architectural question. Three options:

*Option A — Circle webhook (recommended):* When someone joins CP on Circle, a webhook fires. A new `/api/webhooks/circle` route receives it, matches the member's email against the authenticated WorkOS user, and writes `cp_member: true` + `cp_tier: entry|full|hearth` to Redis with their token allotment. This is an inversion of the existing `benefits.ts` Circle pattern — exactly the right reuse. Requires: Circle webhook secret env var, a mapping from Circle "space" or membership level to tier name.

*Option B — Stripe webhook from CP:* If CP uses its own Stripe account, a shared webhook route can receive CP subscription events. Requires coordinating webhook secrets between two Stripe accounts.

*Option C — Manual admin flag:* A private `POST /api/admin/cp-member` endpoint sets the Redis flag manually. Not scalable, but viable for low membership counts during initial rollout while webhook integration is being built.

**Decision needed:** Which verification path? If Option A, does Circle support webhooks on membership join/level changes? What's the CP Circle community ID?

---

**Q2 — What are the CP tier token allotments?**

The old Spark/Flame/Hearth allotments (152K/313K/637K tokens/month) were designed for standalone $5/$10/$50 Cosmo subscriptions. CP tiers have different pricing and different value propositions. New allotments are needed.

Suggested approach: anchor allotments to CP membership cost, not the old tier math. At ~$0.30/10K tokens cost, 100K tokens costs ~$3 — a meaningful fraction of a $X/month CP membership. Shalom should decide: what fraction of each CP tier's monthly fee covers Cosmo usage? That fraction divided by $0.30/10K gives the monthly allotment.

**Decision needed:** Monthly token allotment for each CP tier (entry, full, hearth).

---

**Q3 — "Buy more tokens at cost" mechanic:**

When a CP member exhausts their monthly allotment, they purchase additional tokens at cost (no markup).

*Suggested pack sizes:* $3 for 100K tokens · $9 for 350K tokens · $25 for 1M tokens. These are at-cost rates; Shalom confirms final pack sizes and prices.

*Implementation:* A one-time Stripe payment (not a subscription) with `metadata.token_pack = '100k'|'350k'|'1m'`. The webhook handler receives `checkout.session.completed`, identifies it as a token pack via metadata, and calls `addBonusTokens(userId, packSize)` in `subscription.ts`. Bonus tokens are stored in a separate Redis counter (`cosmo:bonus_tokens:{userId}`), distinct from the monthly allotment. `isWithinBudget()` checks monthly allotment first; when exhausted, deducts from bonus balance. Bonus tokens do not expire on monthly reset — only when consumed or CP membership lapses.

**Decision needed:** Confirm pack sizes and prices. Any objection to the non-expiring bonus mechanic?

---

**Q4 — Where does the "buy more" UI live?**

*Option A — Account page inline (recommended for MVP):* When a CP member is near or at limit, the account page token gauge shows a "Top up" button alongside the usage meter. One click opens Stripe checkout for token packs. No new pages, minimum surface area.

*Option B — Modal on quota exhaustion in CosmoChat:* When `isLimited` fires for a CP member (distinct from free-tier exhaustion, which shows the API key form), a CP-specific modal appears offering token top-up. Better UX — catches the user at the moment of need. Requires detecting CP member status in the `isLimited` check.

*Option C — Dedicated `/account/tokens` page:* Room for usage history, pack comparisons. A later-iteration refinement.

Recommended path: build Option A first; add Option B as a UX enhancement once the plumbing works.

**Decision needed:** Confirm Option A as the starting point, or preference for Option B.

---

#### Implementation sequence (after decisions above)

1. Implement CP membership verification per Q1 decision
2. Update `TIERS` config in `subscription.ts` / `stripe.ts` with new CP allotments (Q2)
3. Add `bonusTokens` Redis counter to `subscription.ts`; update `isWithinBudget()` to deduct bonus after monthly allotment
4. Add `addBonusTokens(userId, packSize)` function to `subscription.ts`
5. Create Stripe one-time token pack products; wire `POST /api/stripe/checkout` to support `type: 'token_pack'`
6. Extend webhook handler to identify and handle token pack `checkout.session.completed` events
7. Update account page: CP member state shows tier allotment usage + "Top up" button (Q4)
8. Update CosmoChat `isLimited` state: CP member → "Top up" flow vs. free tier → "Enter API key + visit CP"
9. Register Stripe webhook for token pack product events

---

### Phase 1: Constellation — Corpus Standardization → Living Knowledge Graph [P1]

**Status as of 2026-04-18:** Active. Phase 0 (foundational cleanup) verified on localhost and PR-ready. Supersedes the sigma.js WebGL approach in [Phase 1c+ (deprecated)](#phase-1c-deprecated-knowledge-graph--opencosmosaiknowledgegraph-p1) paused 2026-04-12. Consolidates three previously-separate workstreams (Cloud RAG, Knowledge Intelligence Layer, Constellation) into one coherent plan.

#### Context

OpenCosmos wants a **dynamic, interactive knowledge graph** that renders the entire corpus — works, sections, quotes, and the relationships between them — as a navigable visual substrate. The user should be able to explore by intuition ("this looks interesting, what is it?"), Cosmo should be able to traverse it as part of reasoning ("I'll walk from Tolstoy → Thoreau → Gandhi"), and the whole thing should feel like a living map rather than a database dump.

This project delivers that vision in six connected workstreams:

1. **Foundational cleanup** — strip H1 drift across the corpus, extend Cosmo reading context, fix first-paint light-mode flash and sidebar infinity parity (Phase 0 implemented, PR-ready).
2. **Cloud RAG retrieval** — Upstash Vector + `fetchRagContext()` wired into Cosmo's conversation flow. Embed pipeline complete, 893 chunks upserted; RAG API endpoint and citation formatting live (see [Done](#done) for what shipped as part of the former Phase 1c / Phase 1d §§1–3).
3. **Standardization skill hardening** — patch `/standardize-knowledge` so it's safe corpus-wide, and extend the frontmatter schema with fields the graph needs (`work_type`, `parent_work`).
4. **Corpus restructuring** — physically split monoliths (Shakespeare, Khayyám, Walden) into per-work files; add a quote substrate (`knowledge/quotes/`) for ~1,800 attributed passages.
5. **Visualization** — build `@opencosmos/constellation`: an open-source React component in `opencosmos-ui` built on `@cosmos.gl/graph` (MIT, same engine as Cosmograph). OpenCosmos dogfoods it; the wider community gets it as a gift.
6. **Cosmo in the Knowledge sidebar + community pathways** — companion chat grounded in the reading view; community contribution form; scheduled wiki-lint action (rebuilt atop the now-landed RAG infrastructure; formerly Phase 1d §§4–7).

**Critical license finding that shaped this plan:** `@cosmograph/cosmograph` is still CC BY-NC-4.0 (non-commercial). Rather than accept the restriction, we use its MIT-licensed underlying engine `@cosmos.gl/graph` and build a React wrapper that becomes a reusable community primitive — answering the question of "can this be a community empowerment resource" with yes.

#### Key decisions

##### 1. Graph library: `@cosmos.gl/graph` (MIT), wrapped as `@opencosmos/constellation`

- **Engine:** `@cosmos.gl/graph` v3.0 beta — same GPU force-directed engine that powers Cosmograph. MIT licensed. Member of OpenJS Foundation.
- **Wrapper:** a new package in the `opencosmos-ui` monorepo: `@opencosmos/constellation`.
- **Responsibilities:** thin React shell around `new Graph()`, HTML label overlay (using `getSampledNodePositionsMap()` for positioning), LOD helper (visual-weight by zoom, not visibility), theme-aware color scales, idiomatic React props (`nodes`, `links`, `onNodeClick`, …) that internally transform to Float32Array.
- **Why a new package (not a component in `@opencosmos/ui`):** `@opencosmos/ui` is for app chrome; a knowledge-graph visualizer is a specialized domain primitive. Separate package = separate semver cadence, fewer transitive deps for `@opencosmos/ui` consumers, cleaner story for the community (`import { KnowledgeGraph } from '@opencosmos/constellation'`).
- **What OpenCosmos consumes vs what the community gets:** same component. The community resource is production-validated by OpenCosmos before it ships.

##### 2. Node hierarchy (five tiers, rendered simultaneously)

```
Corpus
  └─ Tradition       (platonic, stoic, buddhism, indigenous, transcendentalism, …)
       └─ Work       (Hamlet, The Republic, The Prophet, Walden, a single Rumi poem)
            └─ Section  (Act III, Book I, "On Love")
                 └─ Quote  (an attributed passage, often sourced to a section)
```

- **Tradition nodes:** synthesized from frontmatter `tradition` field, one per distinct value. Large cluster-center nodes, prominent at all zoom levels.
- **Work nodes:** every source doc with `work_type: 'work'`. Primary layer — always rendered.
- **Section nodes:** every H2 heading within a work. Always rendered; size and label visibility scale with zoom.
- **Quote nodes:** small nodes attached by edge to their source work (and, if known, source section). Always rendered. At landing-page zoom they form a fine dust around each work; at closer zoom they resolve into individual citations.
- **Collection nodes:** NOT a separate tier — collections become soft groupings via `related_docs`/`synthesizes`.

**Rationale:** Five tiers mirrors how humans actually navigate knowledge (tradition → specific work → section of that work → quotable line). Three-tier (works only) is too flat; seven-tier (adding corpus + century) is too fine.

**Density philosophy — the whole constellation, always visible.** The full graph (all ~3,000+ nodes) renders simultaneously as the landing-page experience — a gently animated starfield of the entire corpus, every tradition, work, section, and quote present at once. What zoom controls is not *presence* but *resolution*: node size, label visibility, edge opacity, and label culling. Far-out, the graph reads as constellations of light; zoomed in, individual stars (quotes, sections) become named and interactive. LOD is a visual-weight system, not a visibility gate.

##### 3. Shakespeare and other monoliths: physical split into per-work files

**Physical split, not vector-index-only.** Reasons, in order of importance:

1. **Graph clarity.** Nodes = files. Every work gets its own node; every node has a file.
2. **URL cleanliness.** `/knowledge/shakespeare/hamlet` beats `/knowledge/shakespeare/collected-works#hamlet`. Better for sharing, better for Cosmo citations (clickable deep links).
3. **RAG precision.** Retrieval for "Hamlet's soliloquy" should rank Hamlet's chunks highest. With per-work files, Upstash Vector's `source` metadata does this natively.
4. **Frontmatter per work.** Each play has distinct `tradition` nuance (history vs tragedy vs comedy) and `related_docs`.
5. **Authoring ergonomics.** Editing a 5.3MB file is painful; editing `hamlet.md` (~200KB) is fine.

**Collections survive as slim index files** with frontmatter only: `literature-the-complete-works-of-william-shakespeare.md` becomes ~30 lines of frontmatter + `related_docs` listing the 38 per-play files.

**Targets for splitting (priority order):**
- `literature-the-complete-works-of-william-shakespeare.md` — 38 plays + 1 sonnets file (the 154 sonnets become H2 sections within one `shakespeare-sonnets.md`).
- `literature-leaves-of-grass.md` (Whitman) — H2-per-poem, keep as one file.
- `literature-the-forerunner.md` (Gibran) — H2-per-parable, keep as one file.
- `literature-rub-iy-t-of-omar-khayy-m-and-sal-m-n-and-abs-l.md` — two distinct works → two files.
- `philosophy-walden-and-on-the-duty-of-civil-disobedience.md` — two distinct works → split (extract Walden; deprecate combined file, keep standalone civil-disobedience).
- `philosophy-the-egyptian-book-of-the-dead-translation-and-commentary.md` (757 KB) — keep as one file; ensure H2 chapters are clean.

**Rule of thumb:** if a file contains ≥ 2 works that a reader would cite separately, split them.

##### 4. Quote substrate: YAML files in `knowledge/quotes/`

~1,800 quotes incoming. A quote has fundamentally different shape from a work (fragment, not whole):

- **Format:** YAML, not Markdown. Quotes are structured (author, source, theme, text), not narrative.
- **File organization:** `knowledge/quotes/{author-or-source-slug}.yaml`. E.g. `quotes/shakespeare.yaml`, `quotes/rumi.yaml`, `quotes/proverbs.yaml`.
- **Why not one-big-quotes.yaml:** future editing (add/remove per author), meaningful diffs, parallel attribution to source works.
- **Why not per-quote .md files:** 1,800 files is noise; quotes don't need TOC or pages. They're graph citizens, not library items.

Example `knowledge/quotes/shakespeare.yaml`:
```yaml
attribution_default:
  author: William Shakespeare
  tradition: literature
  era: early-modern
quotes:
  - id: hamlet-act3-to-be-or-not-to-be
    source_work: sources/literature/shakespeare-hamlet.md
    source_section: "Act III, Scene I"
    text: "To be, or not to be, that is the question…"
    themes: [existence, mortality, doubt]
```

**Embed pipeline additions:**
- New file-type handler in `scripts/knowledge/embed-knowledge.ts`: YAML files produce one chunk per quote (not per heading).
- Chunk metadata: `chunk_type: 'quote'`, `source_work`, `source_section`, `themes`, `attribution`.
- Chunk ID format: `knowledge/quotes/shakespeare.yaml#hamlet-act3-to-be-or-not-to-be`.

##### 5. Frontmatter schema additions

Extend `Frontmatter` in [scripts/knowledge/shared.ts](../scripts/knowledge/shared.ts) and [apps/web/lib/knowledge.ts](../apps/web/lib/knowledge.ts):

```typescript
type Frontmatter = {
  // ...existing fields...
  work_type: 'work' | 'collection' | 'reference' | 'wiki'   // NEW, required
  parent_work?: string                                       // NEW, optional
}

type QuoteRecord = {                   // NEW — for knowledge/quotes/*.yaml
  id: string
  source_work?: string
  source_section?: string
  text: string
  themes?: string[]
  author?: string
  tradition?: string
  era?: string
}
```

`work_type` required on every new/cleaned source doc. Backfill: walk `knowledge/sources/` → `work`, `knowledge/collections/` → `collection`, `knowledge/references/` → `reference`, `knowledge/wiki/` → `wiki`. Human review where ambiguous.

##### 6. Cosmo-in-Knowledge-sidebar (deferred to Phase 9, deliberate)

Cosmo embedded in the Knowledge route's left sidebar, with duplicate Dialog/Knowledge/Studio nav items removed. Requires:
- Extract `CosmoChatPanel` from `CosmoChat.tsx`; lift state into `useCosmoSession()`.
- Add `sidebarContent` slot prop to `AppShell`.
- Mobile fallback (< 1024px): floating action button with bottom sheet.
- Grounding: reads `sessionStorage['cosmo_context']` — automatic integration with `current_section` / `current_passage`.

Best done after Phase 5 lands so the constellation-aware experience is present when the sidebar ships.

#### Phased implementation

##### Phase 0 — Verify + commit quick wins (today, 15 min)

Already implemented in this session; pending localhost verification:

- [ ] `pnpm dev` → verify:
  - Knowledge docs render; TOC active-section tracking works.
  - Dialog sidebar infinity is green + `text-sm` (matches Knowledge).
  - First page load shows black, not white flash.
  - Scroll through a knowledge doc, then open `/dialog` and ask a question — Cosmo's response references the passage.
- [ ] Commit: `fix(knowledge): standardize body H1, enrich Cosmo context, paint-safe layout`

##### Phase 1 — Standardize the standardization skill (1–2 hours)

**Files:**
- [.claude/skills/standardize-knowledge/SKILL.md](../.claude/skills/standardize-knowledge/SKILL.md)

**Changes:**

1. **Add Step 0.5 — frontmatter enrichment check.** Verify `work_type`; infer from path if missing. Flag ambiguous cases for manual review.
2. **Add Step 2b — strip H1-in-body.** Any `^# ` line before the first `^## ` is an H1-in-body and is deleted along with the trailing blank line. Frontmatter `title` is authoritative.
3. **Extend Step 1 grep** to include `knowledge/references/`.
4. **Rewrite Shakespeare special case (Step 2)** to reference a new auxiliary skill `/split-collection`: "If this is a multi-work file, invoke `/split-collection` first, then re-run."
5. **Add Step 5b — required-field verification.** Fail the file if after cleanup `work_type` is unset or `title` is missing.
6. **Step 6 footer — list required env vars** for `pnpm embed` to prevent silent re-index failure.

**Strip the remaining 22 H1-in-body files** as the first corpus-wide application of the patched skill.

##### Phase 2 — Split monoliths (1 day)

**New skill:** `.claude/skills/split-collection/SKILL.md` — splits a multi-work file into per-work files + slim collection index.

**Procedure (Shakespeare):**

1. Parse the 5.3MB file by H2 headings. Each matching H2 is a work boundary.
2. Map heading title → slug (`Hamlet, Prince of Denmark` → `hamlet`; `Henry IV, Part 1` → `henry-iv-part-1`).
3. For each work, create `knowledge/sources/shakespeare/{slug}.md`:
   - Frontmatter: copy from collection file, override `title`, set `work_type: 'work'`, `parent_work: sources/literature-the-complete-works-of-william-shakespeare.md`, infer `format` from heading pattern.
   - Body: from the H2 to the next H2, downshifted one level.
4. Sonnets: 154 sonnets become H2 sections within `knowledge/sources/shakespeare/sonnets.md`.
5. Rewrite original collection file as slim pointer:
   ```yaml
   ---
   title: "The Complete Works of William Shakespeare"
   role: collection
   work_type: collection
   author: William Shakespeare
   related_docs:
     - sources/shakespeare/hamlet.md
     # ... 37 more ...
   ---
   ```
6. Run patched `/standardize-knowledge` on every new per-work file.

Apply to: Shakespeare, Whitman (H2-per-poem, no split), Gibran Forerunner (H2-per-parable, no split), Khayyám+Salámán (two-file split), Walden+Civil Disobedience (extract Walden, deprecate combined).

##### Phase 3 — Quote infrastructure (1–2 days)

**Files:**
- New: `knowledge/quotes/README.md`, `knowledge/quotes/{author}.yaml` × many.
- Modify: [scripts/knowledge/embed-knowledge.ts](../scripts/knowledge/embed-knowledge.ts) — add YAML handler, `chunk_type: 'quote'` branch.
- Modify: [scripts/knowledge/shared.ts](../scripts/knowledge/shared.ts) — add `QuoteRecord` type + parse helper.

**Changes:**

- Detect `.yaml` / `.yml` files in `knowledge/quotes/`. Parse with `js-yaml`.
- For each quote, emit chunk with `id: knowledge/quotes/{file}.yaml#{quote.id}`, `metadata.chunk_type: 'quote'`, text (≤2000 chars), `source_work`, `source_section`, `themes`, `attribution`, inherited `domain`.
- Quotes use no overlap (atomic chunks).

**RAG integration:**
- [apps/web/lib/rag.ts](../apps/web/lib/rag.ts) — quote-specific formatting: `> "text" — Attribution, Source`.
- Cosmo quote citation token: `[quote: path/to/file.yaml#quote-id]` (distinct from work `[ref: ...]`).

##### Phase 4 — Re-embed and generate initial graph (30 min)

```bash
pnpm embed
pnpm graph
curl localhost:3000/api/knowledge/graph
```

##### Phase 5 — Build `@opencosmos/constellation` (3–5 days, in `opencosmos-ui` repo)

**Repo:** `/Users/shalomormsby/Developer/opencosmos-ui`
**New package:** `packages/constellation/`

```
packages/constellation/
├── src/
│   ├── KnowledgeGraph.tsx          # main component
│   ├── useGraphInstance.ts         # instance + lifecycle hook
│   ├── labels/
│   │   ├── LabelLayer.tsx
│   │   └── useNodeSampling.ts      # wraps getSampledNodePositionsMap
│   ├── lod/
│   │   ├── useLevelOfDetail.ts     # zoom → visual-weight (size, label, opacity)
│   │   └── defaults.ts             # all tiers always visible
│   ├── motion/
│   │   ├── useAmbientDrift.ts      # gentle idle motion
│   │   └── useZoomTo.ts            # programmatic zoom-to-node
│   ├── data/
│   │   ├── toFloat32.ts            # nodes/links → typed arrays
│   │   └── types.ts
│   ├── theme/palettes.ts
│   └── index.ts
├── package.json                    # peerDep: react ^18, @cosmos.gl/graph ^3
└── README.md
```

**Public API:**
```tsx
import { KnowledgeGraph } from '@opencosmos/constellation'

<KnowledgeGraph
  nodes={nodes}          // GraphNode[] — ALL nodes, always rendered
  links={links}
  nodeColorBy="domain"
  nodeSizeBy="degree"
  clusterBy="tradition"
  // LOD controls visual WEIGHT, not visibility.
  lodRules={[
    { minZoom: 0,   sizeScale: n => n.tier === 'tradition' ? 1.0 : n.tier === 'work' ? 0.6 : n.tier === 'section' ? 0.25 : 0.12, showLabel: n => n.tier === 'tradition' },
    { minZoom: 1.5, sizeScale: n => n.tier === 'quote' ? 0.35 : 1.0,                                                              showLabel: n => n.tier !== 'quote' },
    { minZoom: 3,   sizeScale: () => 1.0,                                                                                          showLabel: () => true },
  ]}
  ambientMotion={{ enabled: true, amplitude: 0.5, speed: 0.08 }}
  focus={focusNodeId}          // programmatic zoom-to; null = full-corpus view
  focusRadius={2}              // highlight N-hop neighborhood
  onNodeClick={(node) => { /* ... */ }}
  highlightedNodeIds={[]}       // for Cosmo's visible reasoning trail
  theme="dark"
/>
```

**Implementation notes:**

- `useGraphInstance` creates `new Graph(container, config)` on mount, cleans up on unmount.
- `toFloat32` converts `{nodes, links}` to typed arrays while maintaining an `index → GraphNode` map for event callbacks.
- Label layer is a single absolutely-positioned div; uses `getSampledNodePositionsMap()` + `trackNodePositionsByIds()`; position-syncs every frame via requestAnimationFrame.
- **LOD = visual weight.** `useLevelOfDetail` listens to zoom and re-derives per-node `sizeScale`, label visibility, edge opacity. Every node stays on canvas — no visibility gates.
- **Ambient motion.** `useAmbientDrift` applies very-low-amplitude, low-frequency perturbation when the user is idle. Stops on interaction. Respects `prefers-reduced-motion` — amplitude clamped to 0.
- **Zoom-to-context.** `useZoomTo` exposes `graphRef.current?.zoomTo({ nodeId, paddingPx, durationMs })` — tweens the camera to frame target + N-hop neighborhood.
- Theme: reads CSS variables `--color-domain-philosophy` etc. with sensible fallbacks.

**Landing-page experience (OpenCosmos's canonical use):**

1. Page mounts → full corpus renders at zoomed-out "starfield" view. Every node present; labels culled to tradition-tier. Ambient drift begins.
2. After ~2–3 seconds of idle admiration, the camera gently tweens toward the user's specified context — last-read doc (from `sessionStorage['cosmo_context']`), a `?focus=` param, or a default "today's invitation" node.
3. On arrival, labels for nearby sections/quotes fade in; ambient drift continues at lower amplitude near the focused subgraph.
4. Interaction (scroll / drag / click) ends the intro animation immediately.

This "gentle starfield that zooms into your corner" feel is also the pattern any community consumer can adopt.

**Docs in OpenCosmos Studio:**
- `/docs/constellation/getting-started`
- Live CodeSandbox embed
- "Bring your own corpus" recipe

**Publish:** `@opencosmos/constellation@0.1.0` to npm.

##### Phase 6 — OpenCosmos consumes `@opencosmos/constellation` (1–2 days)

**Files:**
- Modify: [scripts/knowledge/generate-wiki-graph.ts](../scripts/knowledge/generate-wiki-graph.ts) — emit hierarchical node set (tradition + work + section + quote) with `tier` field.
- Modify: [apps/web/app/knowledge/graph/GraphPageClient.tsx](../apps/web/app/knowledge/graph/GraphPageClient.tsx) — replace sigma.js with `<KnowledgeGraph>` from `@opencosmos/constellation`. Wire landing-page intro: read `sessionStorage['cosmo_context']`, honor `?focus=`, fall back to "today's invitation". Pass `ambientMotion={{ enabled: true }}`, `focus={resolvedFocusId}`. Entire corpus always rendered.
- Delete (opencosmos-ui historical location): `packages/ui/src/components/data-display/knowledge-graph/` (retire sigma.js).
- Modify: [apps/web/app/api/knowledge/graph/route.ts](../apps/web/app/api/knowledge/graph/route.ts) — JSON shape stays similar. **Performance note:** verify payload ≤ ~2MB gzipped with full corpus (~3k nodes + 10k edges). If larger, stream or paginate quotes behind a second fetch that hydrates after first paint.

**New graph generator output:**
```json
{
  "nodes": [
    {"id":"tradition/platonic","tier":"tradition","label":"Platonic","tradition":"platonic","domain":"philosophy"},
    {"id":"sources/philosophy-apology.md","tier":"work","label":"Apology","tradition":"platonic","author":"Plato"},
    {"id":"sources/philosophy-apology.md#the-good","tier":"section","label":"The Good","parent":"sources/philosophy-apology.md"},
    {"id":"knowledge/quotes/plato.yaml#apology-unexamined-life","tier":"quote","label":"Unexamined life","parent":"sources/philosophy-apology.md"}
  ],
  "links": [
    {"source":"tradition/platonic","target":"sources/philosophy-apology.md","type":"hierarchy"},
    {"source":"sources/philosophy-apology.md","target":"sources/philosophy-apology.md#the-good","type":"contains"},
    {"source":"knowledge/quotes/plato.yaml#apology-unexamined-life","target":"sources/philosophy-apology.md","type":"cites"}
  ]
}
```

##### Phase 7 — Semantic edges (1 day)

**File:** [scripts/knowledge/generate-wiki-graph.ts](../scripts/knowledge/generate-wiki-graph.ts)

- After building hierarchical nodes, query Upstash Vector for all chunk embeddings (paginate).
- For each node (work or section), find top-3 cosine-similarity neighbors across the corpus.
- Emit edges `{source, target, type: 'semantic', weight: similarity_score}`.
- Cache similarity matrix in Redis under `graph:semantic:v1:{corpus_hash}`.
- In `@opencosmos/constellation`, `type: 'semantic'` edges render at 30% opacity and thinner; curated edges render at 100% opacity and thicker.

##### Phase 8 — Cosmo citations + bidirectional links (2–3 days)

**Files:**
- [packages/ai/COSMO_SYSTEM_PROMPT.md](../packages/ai/COSMO_SYSTEM_PROMPT.md) — citation format: "Cite sources as `[ref: path/to/file.md#section-slug]` for works or `[quote: path/to/file.yaml#quote-id]` for quotes. Inline within your sentence."
- [apps/web/app/dialog/CosmoChat.tsx](../apps/web/app/dialog/CosmoChat.tsx) — post-process message text, replace citation tokens with clickable `<Link>` components that navigate to `/knowledge/{slug}` + emit `window.postMessage({type:'highlight-node', id:X})` for any open graph tab.
- [apps/web/app/knowledge/[...slug]/TableOfContents.tsx](../apps/web/app/knowledge/[...slug]/TableOfContents.tsx) — add "See in graph →" link under the active section, linking to `/knowledge/graph?focus={slug}`.
- [apps/web/app/knowledge/graph/GraphPageClient.tsx](../apps/web/app/knowledge/graph/GraphPageClient.tsx) — read `?focus=` query param, center graph + highlight 1-hop neighbors on mount.

**Cosmo's "visible reasoning":** when Cosmo emits a citation mid-response, the passage viewer (if open) briefly pulses the active section; the graph (if open) pulses the cited node. User sees Cosmo's journey, not just its destination.

##### Phase 9 — Cosmo-in-Knowledge-sidebar (2–3 days, done last)

**Files:**
- New: `apps/web/app/dialog/useCosmoSession.ts` — hook that owns messages/apiKey/tokens/PM state.
- Modify: [apps/web/app/dialog/CosmoChat.tsx](../apps/web/app/dialog/CosmoChat.tsx) — extract `CosmoChatPanel`, wrap with `useCosmoSession()`.
- Modify: [apps/web/app/AppShell.tsx](../apps/web/app/AppShell.tsx) — add `sidebarContent?: ReactNode` prop.
- Modify: [apps/web/app/knowledge/[...slug]/page.tsx](../apps/web/app/knowledge/[...slug]/page.tsx) — pass `<CosmoChatPanel variant="sidebar" />` as `sidebarContent`.
- Modify: [apps/web/app/knowledge/page.tsx](../apps/web/app/knowledge/page.tsx) — same for the library index.
- Mobile: below `lg`, revert to current nav; floating action button planned for Phase 10.

##### Phase 10 — Community contribution pathway

Absorbed from the former Phase 1d §6. Opens a path for the community to add to the corpus — human-curated, not auto-accepted.

- [ ] `apps/web/app/knowledge/contribute/page.tsx` — simple submission form (domain, title, body, source citation)
- [ ] `apps/web/app/api/knowledge/contribute/route.ts` — creates a GitHub issue via `GITHUB_ISSUES_PAT`; labels `knowledge-contribution`; returns issue URL
- [ ] Contribution UI also calls `detectTentativeEdges()` client-side, passing the pending node + tentative links into `<KnowledgeGraph pendingNodes>` for optimistic injection (dashed ring, `confidence: "pending"`). After merge + revalidation the canonical node replaces it.

##### Phase 11 — Wiki lint + graph metadata unification

Absorbed from the former Phase 1d §§5, 7.

- [ ] Scheduled GitHub Action: detect orphaned pages, stale claims, missing entity pages, disconnected nodes. Output as a GitHub issue — human-reviewed, not auto-corrected.
- [ ] `knowledge/graph/manifest.json` write step in `scripts/knowledge/generate-wiki-graph.ts` so the RAG layer can introspect the graph topology.
- [ ] Extend `fetchRagContext()` to surface degree-1 graph neighbors as lower-priority context — cross-tradition connections become structural, not coincidental.
- [ ] Stretch: retrieved nodes highlighted in real time in the constellation while Cosmo responds (see [knowledge-intelligence-layer.md § Stretch Goals](knowledge-intelligence-layer.md#stretch-goals)).

#### Files touched

**This session (already edited, pending commit):**
- `knowledge/sources/philosophy-nature.md`, `philosophy-the-kingdom-of-god-is-within-you.md`, `philosophy-on-the-duty-of-civil-disobedience.md`, `knowledge/references/philosophy-the-egyptian-book-of-the-dead-translation-and-commentary.md` — H1 strips
- `apps/web/app/dialog/CosmoChat.tsx` — TTL 5min → 30min; pass `current_passage`
- `apps/web/app/knowledge/[...slug]/TableOfContents.tsx` — capture current passage
- `apps/web/app/knowledge/[...slug]/DocViewer.tsx` — `data-doc-content` wrapper
- `apps/web/app/api/chat/route.ts` — extended `CurrentSection`, richer system block
- `apps/web/app/layout.tsx` — inline `#000` + `color-scheme: dark`
- `apps/web/components/TokenGauge.tsx` — compact+unlimited → green + `text-sm`

**Phase 1:** `.claude/skills/standardize-knowledge/SKILL.md`, `scripts/knowledge/shared.ts` (+ `work_type`, `parent_work`), `apps/web/lib/knowledge.ts` (+ `work_type`, `parent_work`), 22 `knowledge/sources/*.md` (strip H1).

**Phase 2:** New `.claude/skills/split-collection/SKILL.md`, Shakespeare split → `knowledge/sources/shakespeare/*.md`, other monoliths.

**Phase 3:** New `knowledge/quotes/README.md` + `.yaml` data, `scripts/knowledge/embed-knowledge.ts`, `scripts/knowledge/shared.ts`, `apps/web/lib/rag.ts`.

**Phase 5 (opencosmos-ui repo):** New `packages/constellation/*`.

**Phases 6–9 (opencosmos repo):** `scripts/knowledge/generate-wiki-graph.ts`, `apps/web/app/knowledge/graph/GraphPageClient.tsx`, `packages/ai/COSMO_SYSTEM_PROMPT.md`, `apps/web/app/dialog/CosmoChat.tsx`, `apps/web/app/AppShell.tsx`, `apps/web/app/knowledge/[...slug]/*`.

#### Existing utilities to reuse (do not re-invent)

- **Heading chunker:** [scripts/knowledge/embed-knowledge.ts:82-157 `chunkAtHeadings()`](../scripts/knowledge/embed-knowledge.ts#L82-L157) — already handles H2/H3 + legacy CHAPTER. Extend for quotes.
- **TOC extractor:** [apps/web/app/knowledge/[...slug]/page.tsx:16-24 `extractToc()`](../apps/web/app/knowledge/[...slug]/page.tsx#L16-L24) — uses `github-slugger`; slug IDs match `rehype-slug` output.
- **Frontmatter parser:** `gray-matter` via [apps/web/lib/knowledge.ts](../apps/web/lib/knowledge.ts).
- **Graph data cache:** Upstash Redis, gzipped JSON, ISR revalidate=3600 at [apps/web/app/api/knowledge/graph/route.ts](../apps/web/app/api/knowledge/graph/route.ts). Keep as-is.
- **Vector retrieval:** [apps/web/lib/rag.ts](../apps/web/lib/rag.ts). Keep.
- **Sidebar slot pattern:** [apps/web/app/AppShell.tsx](../apps/web/app/AppShell.tsx) already accepts `bottomItems` + `footer` — add `sidebarContent` in the same spirit.
- **Cosmo context transmission:** `sessionStorage['cosmo_context']` + `current_section` payload — already end-to-end; the new `current_passage` field rides the same channel.

#### Verification (end-to-end)

**Phase 0 (today):**
1. `pnpm dev` in `apps/web`.
2. Open `localhost:3000/knowledge/sources/philosophy-nature` — page loads, no body H1 visible, TOC works.
3. Scroll into middle of a section — active heading highlights in TOC.
4. Open `/dialog` — sidebar infinity is green + matches Knowledge.
5. Reload `/` — no white flash; page paints black.
6. Ask Cosmo about the passage you scrolled through — response references the specific paragraph, not just chapter.

**Phase 1–2:**
1. `/standardize-knowledge all` runs cleanly: no H1-in-body remains, all docs have `work_type`.
2. `git status` shows 22 modified files; diffs are purely H1 deletions.
3. Shakespeare split produces ~38 per-play files; `pnpm build` passes.
4. `curl localhost:3000/knowledge/sources/shakespeare/hamlet` → Hamlet renders.

**Phase 3–4:**
1. Add 5 test quotes to `knowledge/quotes/test.yaml`.
2. `pnpm embed` succeeds; Upstash Vector shows new chunks with `chunk_type: 'quote'`.
3. Ask Cosmo about a quote's theme — response retrieves + attributes correctly.

**Phase 5:**
1. `pnpm --filter @opencosmos/constellation test` passes.
2. Storybook shows `<KnowledgeGraph>` rendering sample data.
3. `pnpm --filter @opencosmos/constellation publish --dry-run` produces expected tarball.

**Phase 6–7:**
1. `pnpm graph` → Redis contains new hierarchical JSON.
2. `/knowledge/graph` renders the **entire corpus at once** at landing zoom — traditions as bright anchors, works as mid-tier lights, sections and quotes as fine dust. No tier hidden.
3. Ambient drift is visible: nodes breathe slightly.
4. After ~2–3 seconds with no interaction, camera gently tweens toward the focus target.
5. Any scroll/drag/click during intro immediately cancels the tween.
6. Zooming in manually causes nearby labels to fade in; zooming out causes them to cull back to tradition-tier.
7. `prefers-reduced-motion` disables ambient drift and replaces intro tween with instant jump.
8. Hovering a node shows label; clicking navigates to the work.
9. Semantic edges visible as thin translucent connectors; curated edges prominent.

**Phase 8:**
1. Ask Cosmo: "What does Tolstoy say about non-violence?" — response contains `[ref: ...]` tokens rendered as clickable links.
2. Click citation → navigates to doc + scrolls to section.
3. From TOC, click "See in graph" → graph centers on node, 1-hop neighbors highlighted.

**Phase 9:**
1. `/knowledge/sources/philosophy-apology` loads with Cosmo chat panel in left sidebar.
2. Duplicate Dialog/Knowledge/Studio nav links are gone.
3. Question in panel grounds in currently-open document.
4. On mobile (< 1024px), sidebar chat reverts to nav; floating action button (Phase 10) TBD.

#### Timeline

- Phase 0: today (15 min).
- Phase 1: 1 half-day.
- Phase 2: 1 day.
- Phase 3: 1–2 days.
- Phase 4: 30 minutes.
- Phase 5: 3–5 days (cross-repo; longest).
- Phase 6: 1 day.
- Phase 7: 1 day.
- Phase 8: 2–3 days.
- Phase 9: 2–3 days.

**Total:** ~3 weeks focused work. Phases parallelizable where independent (quotes/split; constellation/corpus).

#### Open questions

1. **Tradition palette.** 12-color palette from `@opencosmos/tokens`, mapped alphabetically by default, frontmatter override. Can land with defaults and tune later.
2. **Constellation name.** `@opencosmos/constellation` fits the brand. Alternatives: `@opencosmos/atlas`, `@opencosmos/starfield`. Not plan-blocking.
3. **Community resource scope.** Minimal v0.1.0 README; invest in docs when API is proven by real OpenCosmos use.
4. **Walden extraction.** Confirm: extract Walden into own file, deprecate combined file, civil-disobedience stays standalone.
5. **Quote ingestion format.** User has 1,800 quotes — current format? (CSV? Notes? Doc?) Sample unblocks YAML schema.

---

### Phase 3: Conversation Polish

- [ ] Per-session conversation history (client-side)
- [ ] Mobile-responsive conversation interface
- [ ] Error states and graceful degradation (invalid API key, rate limit hit, API down)
- [ ] Accessibility: screen reader support, keyboard navigation, focus management
- [ ] Voice interaction: provider TBD — see [projects/cosmo-voice-research.md](projects/cosmo-voice-research.md). Complete listening test (ElevenLabs Flash vs. Cartesia Sonic 3 vs. Google WaveNet) before building.

### Phase 4: Cosmo as PM

- [ ] Publish this PM doc and architecture.md to the knowledge corpus as reference documents
- [ ] Cosmo can answer "What phase are we in?" grounded in corpus — natural consequence of Phase 1 (RAG pipeline already live)

### Phase 5: @opencosmos/ai Package Foundation

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

### Phase 6: Federated Cosmo Schema (Design Phase)

- [ ] Design the schema for a federated wisdom-grounded AI network
- [ ] Answer: What would a "Buddhist Cosmo" or "Stoic Cosmo" need from the framework?
- [ ] Define how different corpus instances interoperate
- [ ] Governance model: who curates, quality standards, community maintenance
- [ ] Output: a written specification, not code

### Phase 7: Cosmo-Powered CP Programs

- [ ] Cosmo integrated into structured CP programs and cohorts
- [ ] Guided inquiry sessions using the sacred rhythm (attune → inquire → offer)
- [ ] Practice templates: daily contemplation, creative inquiry, philosophical dialogue
- [ ] Living Memory protocol: community wisdom feeds back into corpus (with curation gates)
- [ ] Hearth tier members receive full CP membership (infrastructure in Phase 1b, CP integration here — note: Hearth is superseded; see [Phase 1b](#phase-1b-subscriptions--infrastructure-preserved-ui-superseded) for brand architecture pivot)

---

## Completed Work

## Environment Setup — Done ✅

All set up in `.env.local` / Vercel / GitHub Secrets:

- ✅ **`REVALIDATE_SECRET`** — Add to `apps/web/.env.local`, Vercel (opencosmos.ai), and GitHub Actions secrets. Used by `POST /api/revalidate` to authorize on-demand ISR revalidation after knowledge graph sync.
- ✅ **`NEXT_PUBLIC_APP_URL=https://opencosmos.ai`** — Add to GitHub Actions secrets (used by `knowledge-sync.yml` to POST revalidation after graph update).
- ✅ Cloudflare Turnstile keys — added (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`)
- ✅ Anthropic spend limit — confirmed active on `opencosmos-main` (Fix 5)

---


## Blocked or Deprecated Projects 
This plans in this section are provided for reference, as examples of plans that did not work and ideas and strategies to not repeat. 

### Phase 1c+ (Deprecated): Knowledge Graph — `opencosmos.ai/knowledge/graph` [P1]

**Status as of 2026-04-12:** Blocked. The data pipeline, API route, Web Worker, and SVG skeleton all work correctly. The graph page loads at `opencosmos.ai/knowledge/graph`. The `KnowledgeGraph` component in `@opencosmos/ui` mounts without crashing. But **no nodes or edges render** — the canvas is black, with sigma's canvas2d labels (node titles and cluster domain names) visible at correct positions, but no WebGL geometry.

#### What's been built (shipped)

- `scripts/knowledge/generate-wiki-graph.ts` — reads `knowledge/wiki/**`, runs ForceAtlas2, writes gzip+Base64 to Upstash Redis
- `apps/web/app/api/knowledge/graph/route.ts` — decompresses and serves graph JSON
- `apps/web/app/knowledge/graph/graphWorker.ts` — Web Worker fetches + parses JSON off main thread
- `apps/web/app/knowledge/graph/GraphPageClient.tsx` — orchestrates skeleton → live crossfade
- `apps/web/app/knowledge/graph/domain-colors.ts` — local DOMAIN_COLORS copy to break Turbopack's SSR import chain to sigma
- `@opencosmos/ui@1.4.2` — KnowledgeGraph component with custom `GlowNodeProgram` WebGL renderer
- `knowledge/guides/opencosmos-knowledge-graph.md` — complete technical guide

#### Bugs fixed along the way

| Bug | Fix |
|-----|-----|
| Web Worker `fetch` failed ("Failed to parse URL from /api/knowledge/graph") | Pass `location.origin` from main thread via `postMessage`; construct absolute URL in worker |
| Sigma crash: "Container has no height" | `allowInvalidContainer: true` in SigmaContainer settings (`@opencosmos/ui@1.4.1`) |
| Build crash: `WebGL2RenderingContext is not defined` (SSR) | Create local `domain-colors.ts` to break Turbopack's static import trace to sigma |
| npm publish E404 (release workflow) | Add `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` to release workflow; user created Granular Access Token |
| Lockfile pinned to old version despite `^` range | `pnpm update @opencosmos/ui --filter web` + commit lockfile |

#### The remaining blocker — nodes don't render

**Symptom:** Black canvas. Sigma's canvas2d label layer renders correctly (text appears at right positions, including cluster labels like "CONTEMPLATIVE", "Dialog"). Zero WebGL geometry — no nodes, no edges.

**What this tells us:** Sigma itself is alive. Graph data is loaded (labels prove this). The issue is specific to the WebGL program layer, not the data pipeline or mount lifecycle.

**Attempts so far:**

1. **`allowInvalidContainer: true`** — sigma was crashing on zero-height container at init. This fixed the crash but didn't fix the render.

2. **`ResizeObserver` gate in GraphPageClient** — delayed `<KnowledgeGraph>` mount until `containerRef.clientHeight > 0`. Did not fix the render.

3. **`gl_PointSize` formula fix** — diagnosed that `u_correctionRatio` ≈ 0.001 (= 1/viewportWidth), which would make `gl_PointSize ≈ 0.01` (invisible). Changed vertex shader to use `u_sizeRatio` + `u_pixelRatio`, matching sigma's built-in `NodePointProgram` formula. Published as `@opencosmos/ui@1.4.2`. Did not fix the render.

**Current best guess (with low confidence):**

Sigma's `Program` base class calls `this.renderProgram(params, this.normalProgram)` in its `render()` method. `GlowNodeProgram` overrides `render()` to set additive blending, then calls `super.render(params)`. The question is whether `this.normalProgram` is fully initialized by the time `render()` is first called — if it's `undefined` or has an uninitialized `gl` context, the `gl.blendFunc` call in the override would throw, silently abort the render, and leave the canvas black. This would be consistent with all symptoms.

**Best guess for the next fix:**

Two parallel approaches worth trying:

1. **Remove the custom render override entirely** — replace `GlowNodeProgram` with sigma's built-in `NodePointProgram` as a temporary test. If nodes appear, the issue is definitively in the render() override or shader. If nodes still don't appear, the issue is in the attribute packing or graph data.

2. **Guard `this.normalProgram` in render()** — add a null check before `gl.blendFunc`:
   ```ts
   render(params: RenderParams) {
     if (!this.normalProgram?.gl) { super.render(params); return }
     const { gl } = this.normalProgram
     gl.blendFunc(gl.SRC_ALPHA, gl.ONE)
     super.render(params)
     gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
   }
   ```

**Honest assessment:** Three rounds of fixes have not solved this. The root cause is somewhere in the interaction between the custom WebGL program and sigma's internal rendering pipeline. Without a minimal reproducible example (a local HTML page with sigma + the GlowNodeProgram, no React, no Next.js, no SSR) it is difficult to isolate whether the issue is in the shader, the attribute packing, the render() override, or something sigma does during initialization. The minimal reproduction test is probably the most useful next step before making another change.

**Paused.** Work on this feature is paused as of 2026-04-12. The data pipeline and infrastructure are complete and correct. Only the WebGL node renderer is broken.

---

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
- [ ] Add `REVALIDATE_SECRET` + `NEXT_PUBLIC_APP_URL` to env — see [Environment Setup](#environment-setup--pending) above
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



### Site Architecture: opencosmos.ai

```
opencosmos.ai/
├── /              → Home (four-pillars intro — needs graduation from placeholder)
├── /chat          → Conversation with Cosmo
├── /knowledge     → Knowledge corpus browser (live ✅)
├── /studio        → Design system docs (proxied from opencosmos-ui via Vercel rewrites)
└── /community     → Creative Powerup (redirect for now; deep integration Phase 7)
```

Key: `/studio` maps via Vercel rewrites to the `opencosmos-ui` repo's deployed docs site — unified domain, independent codebases.

---

## @opencosmos/ui — Separate Repo

Design system published to npm as `@opencosmos/ui`. Maintained in the [opencosmos-ui repo](https://github.com/shalomormsby/opencosmos-ui).

**Current tasks:** Ongoing maintenance. No blocking items. Update in this repo with `pnpm update @opencosmos/ui`.

---

## @opencosmos/ai — `packages/ai`

Sovereign AI layer — WIP. Tasks tracked under [Cosmo § Phase 5](#phase-5-opencosmosai-package-foundation) above.

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

Community platform. In development at ecosystem-creative-powerup.vercel.app. This is where paid Cosmo access lives (no API key required for members). See [strategy.md § Brand Architecture](strategy.md) for the OpenCosmos / CP split.

**Open tasks:**
- [ ] CP member token access on OpenCosmos — see [Phase 2](#phase-2-cp-member-token-access--top-up) above; requires Circle webhook or equivalent membership verification
- [ ] Cosmo integration for structured CP programs (Phase 7)

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

### Brand Architecture Pivot (2026-04-16) — PRs #112–#113

- ✅ Strategic decision: OpenCosmos stays purely open (BYOK + free quota + corpus); all paid Cosmo access moves to Creative Powerup memberships. Full rationale in [strategy.md § Brand Architecture](strategy.md).
- ✅ Account page: removed all subscription UI (tier cards, active subscription card, portal/upgrade links) for all user states
- ✅ Account page: BYOK-connected state shows clean green indicator + masked key + unlimited TokenGauge; no form
- ✅ Account page: free visitor state shows 20K quota meter + CP community invitation tile (links to creativepowerup.com)
- ✅ Sidebar: BYOK users see ∞ immediately (localStorage-first check; no longer depends on server `hasByok` timing)
- ✅ CosmoChat: removed "or subscribe" link from `isLimited` exhaustion message

### Phase 1b — Subscription Infrastructure (PRs #85–#91)

- ✅ Stripe billing — Spark/Flame/Hearth tiers, checkout, webhook, portal, tier config with token budgets
- ✅ WorkOS auth integration — AuthKit, session refresh, OAuth callback
- ✅ Usage tracking — microdollar counters in Redis (`input × 3 + output × 15 µ$/token`), weekly + monthly sub-limits
- ✅ TokenGauge UI — Sidebar (∞ for BYOK, gauge for subscribers/free), Account page (exact tokens remaining)
- ✅ Subscription benefit provisioning — Substack (free newsletter via public endpoint) + Circle (member API)
- ✅ Account page — subscription display, tier cards, BYOK detection *(UI superseded by brand architecture pivot; infrastructure preserved)*
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
