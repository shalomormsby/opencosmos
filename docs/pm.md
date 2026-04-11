# OpenCosmos PM

> Project management hub for all OpenCosmos work. For strategic rationale, see [strategy.md](strategy.md). For infrastructure details, see [architecture.md](architecture.md).

**Updated:** 2026-04-10

---

## Todo's from Shalom for OpenCosmos:  
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
| **@opencosmos/ui** (separate repo) | Active | P1 | Ongoing maintenance |
| **Portfolio** (`apps/portfolio`) | Production | P2 | Design consulting pipeline (Phase 3) |
| **Creative Powerup** (`apps/creative-powerup`) | In development | P2 | Cosmo integration (Phase 3) |
| **@opencosmos/ai** (`packages/ai`) | WIP | P2 | Package foundation (Phase 2a) |
| **Knowledge Graph** (`opencosmos.ai/knowledge/graph`) | Planned | P2 | Data generator → viz component → route |
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

### Phase 1c+: Knowledge Graph — `opencosmos.ai/knowledge/graph`

The knowledge wiki is a growing network of interconnected ideas — entities, concepts, cross-tradition syntheses. A graph visualization makes that structure visible and navigable for every visitor to opencosmos.ai. It is also a statement about what OpenCosmos is: a platform that treats knowledge as a living, relational web rather than a linear document collection.

**Design criteria (non-negotiable):**
- **Scalable** — must work gracefully at 8 nodes today and 200+ nodes in the future without visual collapse or performance degradation. The design should reveal structure, not fight it.
- **Intelligible and useful** — visitors should be able to orient immediately: what are the clusters, what are the highly-connected concepts, where are the edges of the map? Clicking a node should bring you somewhere meaningful.
- **Beautiful** — this is a cosmic knowledge graph on a platform called OpenCosmos. The aesthetic should feel like a star chart or constellation map: deep dark background, glowing nodes, luminous edges, confident typography. Reference: [Cosmograph](https://cosmograph.app/) — a WebGL-based graph tool with exactly the right visual register. We are not building a corporate org chart.

**Inspiration:** Cosmograph's aesthetic (WebGL-rendered, dark-field, particle-like nodes with glowing edges) is the visual north star. Their npm package (`@cosmograph/react`) is a viable option at scale. For the initial build, `react-force-graph-2d` (MIT, canvas-based) is better suited to a small graph and allows full control over node rendering. Revisit Cosmograph when the graph reaches 100+ nodes or if the 3D mode (`react-force-graph-3d`) isn't sufficiently stunning.

**Architecture — three layers:**

*Layer 1: Data generator* (this repo, `scripts/knowledge/`)

A script `generate-wiki-graph.ts` that reads all `knowledge/wiki/**/*.md`, extracts frontmatter and `## Connections` section wikilinks (`[[path]]` syntax), and outputs `knowledge/wiki/graph.json`:

```json
{
  "nodes": [
    { "id": "concepts/impermanence", "title": "Impermanence", "domain": "cross", "confidence": "high", "connectionCount": 4 }
  ],
  "edges": [
    { "source": "concepts/impermanence", "target": "entities/lao-tzu", "label": "Taoist flux as the medium of all existence" }
  ]
}
```

The script extends the existing `scanCorpus()` + `gray-matter` pipeline in `scripts/knowledge/shared.ts`. Run as `pnpm graph` or as part of `/knowledge-compile`. The JSON is committed to `opencosmos-ui/public/` as a static asset.

*Layer 2: Visualization component* (opencosmos-ui repo)

A `<KnowledgeGraph />` component using `react-force-graph-2d`. Visual encoding:

| Property | Encoding |
|----------|----------|
| Node color | Domain: `taoism` → jade, `philosophy` → gold, `literature` → cornflower, `cross` → violet |
| Node size | Connection count (more connected = larger, minimum size preserved) |
| Node glow | Confidence: `high` = bright halo, `medium` = soft, `speculative` = dim |
| Edge opacity | 0.4 base; 1.0 on hover with label |
| Background | CSS var `--background` (deep space dark) |
| Labels | Always visible on hover; title-case, match design system type scale |

Interaction model:
- Click node → navigate to wiki page (or slide-in detail panel with summary, confidence, tags, and link)
- Hover node → highlight direct connections, show edge labels
- Zoom/pan → built-in force graph behavior
- Legend → collapsible, shows domain colors and confidence encoding

*Layer 3: Route* (opencosmos-ui repo, `apps/web/`)

New page registered in `route-config.ts`. Natural location: `opencosmos.ai/knowledge/graph` — sits alongside the existing corpus browser at `opencosmos.ai/knowledge`. Could also live as a fullscreen experience at `/graph` with a link from `/knowledge`.

**Tasks:**
- [ ] Write `scripts/knowledge/generate-wiki-graph.ts` (~60 lines, extends existing pipeline)
- [ ] Fix the 6 asymmetric wiki links identified in the 2026-04-10 health check before building the visualization (the graph will expose them)
- [ ] Add `pnpm graph` script to root `package.json`; run as part of `/knowledge-compile`
- [ ] Install `react-force-graph-2d` in opencosmos-ui (`apps/web`)
- [ ] Build `<KnowledgeGraph />` component with visual encoding above
- [ ] Wire route in `route-config.ts` → `opencosmos.ai/knowledge/graph`
- [ ] Add link from the `/knowledge` corpus browser to the graph view
- [ ] Evaluate: does the visual hold up at 8 nodes? Adjust force simulation charge/link distance so small graphs don't collapse to a point
- [ ] Future: when graph reaches 100+ nodes, evaluate Cosmograph (`@cosmograph/react`) for WebGL rendering at scale

**Cross-repo context:** Data lives in `opencosmos` (this repo). Visualization lives in `opencosmos-ui`. The `graph.json` bridges them — generated here, consumed there. Keep the schema stable once the component is built.

**Home page integration:** The graph is also a candidate for the opencosmos.ai home page — replacing or complementing the static sphere placeholder with a living, animated knowledge constellation that communicates what OpenCosmos is before a visitor reads a word. At home-page scale, the graph would run in ambient/read-only mode (no click-to-navigate), with gentle continuous motion and no labels — pure visual communication of the platform's depth and interconnectedness. This is a separate design decision that follows the `/knowledge/graph` route being proven out first.

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
