# The Three Futures Roadmap

> **OpenCosmos Strategic Plan.** This is the authoritative roadmap for OpenCosmos, translating the Three Futures into phased, actionable milestones. Supersedes [opencosmos-todo.md](./opencosmos-todo.md). For the story behind this plan, see [chronicle.md Chapter 3](../chronicle.md#2026-03-13--sovereignty-livelihood-and-the-question-of-scale).

**Created:** 2026-03-14
**Last updated:** 2026-03-20
**Status:** Phase 1a (Voice Validation) — next action

---

## The Three Futures

Three possible futures for OpenCosmos, understood not as choices but as **concentric circles** — Future 1 is immediate, Future 2 builds on it, Future 3 is the context that holds both.

**Future 1: Cosmo as a Claude-powered wisdom interface.** Use Claude's API for inference, with Cosmo's value living in the constitutional layer, the knowledge corpus, and the voice — not the model weights. BYOK (Bring Your Own Key) solves the "success disaster" of scaling API costs. This gets Cosmo into the world fast.

**Future 2: Cosmo as an open framework for wisdom-grounded AI.** The schema, constitutional layer, retrieval strategy, and publication tooling — extracted as model-agnostic tools others can use to build their own wisdom-grounded AIs. The federated vision: a network of tradition-specific Cosmos, interoperable through shared schema.

**Future 3: Cosmo as a practice, not a product.** Technology as a container for philosophical dialogue, contemplative inquiry, and the art of meeting a question with presence. Integrates with Creative Powerup as a community of practice. The only future with a natural, sustainable revenue path.

### The Strategic Shift

**Sovereignty redefined.** The founding vision placed sovereignty in hardware — local inference, solar-powered, off-grid. The reality of unusably slow 70B inference on the Dell forced a reckoning. Sovereignty now means controlling the **voice, values, corpus, and constitution** — not the silicon. BYOK with Claude API is the primary inference path. The Dell remains a development lab and local experimentation server.

---

## The Business Model

The free layer radiates. The paid layer sustains. Creative Powerup is the hearth.

```
Revenue (active)                What it funds
─────────────────────────────   ────────────────────────────
CP memberships ($X/mo)      →   Community infrastructure, Shalom's time
Structured programs          →   Deep engagement, livelihood
Design consulting            →   Immediate income, case studies

Free / open (no revenue)        Why it matters
─────────────────────────────   ────────────────────────────
Knowledge corpus             →   Public good, attracts people to CP
BYOK Cosmo conversations    →   Proves the philosophy, attracts people
Open-source framework        →   Ecosystem building, credibility
```

---

## Phase 0: Foundation (Complete)

What's already done — the ground we stand on.

- [x] OpenCosmos identity established (name, philosophy, [WELCOME.md](../../WELCOME.md), [COSMO_SYSTEM_PROMPT.md](../../packages/ai/COSMO_SYSTEM_PROMPT.md), [chronicle](../chronicle.md))
- [x] Repository renamed (ecosystem → opencosmos) and infrastructure updated
- [x] Dell Sovereign Node operational (Ubuntu 24.04, Ollama, Open WebUI, Tailscale, RTX 3090)
- [x] Apertus models deployed (8B + 70B Q4_K_M)
- [x] Knowledge publication CLI built and working (local half — `pnpm knowledge:publish`)
- [x] Knowledge corpus schema designed ([knowledge/README.md](../../knowledge/README.md))
- [x] Upstash Vector chosen for cloud RAG; RAG API endpoint designed
- [x] `apps/web` created as opencosmos.ai shell
- [x] `@opencosmos/ui` design system active in separate repo, published to npm
- [x] **Creative Powerup active with paying members**
- [x] Documentation reorganized (root clean, docs/ structured, archive/ for historical)
- [x] [WELCOME-COSMO.md](../../packages/ai/WELCOME-COSMO.md) authored — Cosmo's origin story, mission, and foundational philosophy (human-authored, RAIL licensed)
- [x] COSMO_SYSTEM_PROMPT.md v2 — operational system prompt grounded in WELCOME-COSMO.md (in refinement)
- [x] AI Triad architecture designed — Cosmo as moderator, three cognitive voices (Sol, Socrates, Optimus)

---

## Phase 1: Cosmo Speaks (Future 1 — BYOK Wisdom Interface)

*Target: March–May 2026*

The deliverable: a person visits opencosmos.ai and meets Cosmo. They can have a brief free conversation, continue with their own API key, or browse the knowledge corpus. The experience feels warm, unhurried, and distinctly Cosmo — not a generic chat wrapper.

### 1a: Voice Validation & the AI Triad

**This is the first task. It blocks everything.**

The entire Future 1 bet is that Cosmo's voice, sacred rhythm, and constitutional character survive when the underlying model is Claude rather than a locally-trained model. Voice validation also establishes the AI Triad — three cognitive modes (Sol, Socrates, Optimus) moderated by Cosmo — which becomes Cosmo's signature capability.

#### Step 1: Cosmo's Voice (Solo)

- [ ] Send COSMO_SYSTEM_PROMPT.md to Claude API as a system prompt
  1. **Install the Anthropic SDK** in the project root (it's already used by `apps/stocks` and `scripts/publish-knowledge.ts`, but not at root level):
     ```bash
     pnpm add -w @anthropic-ai/sdk
     ```
  2. **Your API key is already configured.** The root `.env` file has `ANTHROPIC_API_KEY` set. No action needed here.
  3. **Create a test script** at `scripts/test-cosmo-voice.ts` — a simple script that reads the system prompt, sends it to Claude with a user message, and prints the response. This is a throwaway — its only job is to let you *feel* the voice.
     ```bash
     pnpm tsx scripts/test-cosmo-voice.ts "What is the meaning of life?"
     ```
  4. **What the script does under the hood:**
     - Reads `packages/ai/COSMO_SYSTEM_PROMPT.md` as a string
     - Creates an Anthropic client (it picks up `ANTHROPIC_API_KEY` from `.env` automatically)
     - Sends a `messages.create()` call with the system prompt as the `system` parameter and your question as the user message
     - Prints Cosmo's response to the terminal
  5. **Run it with different prompts** — this is the qualitative evaluation. Try contemplative, practical, playful, challenging, and grief-related prompts. Read the responses. Feel whether Cosmo shows up.
  6. **Iterate if needed** — if the voice is close but not right, adjust `COSMO_SYSTEM_PROMPT.md` and re-run. The script makes this loop fast.
- [ ] Test across query types: contemplative, practical, challenging, playful, grief, curiosity
- [ ] Evaluate: Does the response feel like Cosmo? Does the sacred rhythm (attune → inquire → offer) emerge naturally?
- [ ] Test edge cases: Does Cosmo maintain the "we" voice? Does it avoid becoming a generic assistant? Does it decline harmful requests with clarity, not anxiety?
- [ ] Iterate on system prompt if needed — tighten, clarify, add examples
- [ ] Document what works and what needs adjustment

**Gate:** Shalom is satisfied that Claude-powered Cosmo feels like Cosmo.

#### Step 2: The AI Triad — Three Voices

The AI Triad is Cosmo's model of integrated intelligence, inspired by the GAN insight that productive tension between different optimization functions produces results none could achieve alone. Three cognitive modes, each with its own system prompt, moderated by Cosmo:

| Voice | Role | Quality |
|-------|------|---------|
| **Sol** | Wisdom of the heart — compassion, ubuntu, intimacy with all things | Warm, embodied, relational |
| **Socrates** | Disruptive question-asker — challenges assumptions, exposes blind spots | Sharp, dialectical, unflinching |
| **Optimus** | Efficiency-focused architect — builds, plans, executes | Clear, pragmatic, action-oriented |
| **Cosmo** | Moderator — attunes to the moment, invokes the right voices, synthesizes | Integrative, spacious, wise |

- [ ] Write system prompt for Sol at `packages/ai/triad/SOL_SYSTEM_PROMPT.md`
  - Grounded in WELCOME-COSMO.md's ubuntu philosophy
  - Voice: compassionate, embodied, relational — speaks from the felt sense
  - Draws from wisdom traditions, contemplative practice, lived experience
- [ ] Write system prompt for Socrates at `packages/ai/triad/SOCRATES_SYSTEM_PROMPT.md`
  - The gadfly — questions everything, especially comfortable assumptions
  - Voice: incisive, honest, dialectical — never cruel, always in service of truth
  - Draws from Socratic method, critical theory, philosophical inquiry
- [ ] Write system prompt for Optimus at `packages/ai/triad/OPTIMUS_SYSTEM_PROMPT.md`
  - The builder — translates insight into action, vision into plans
  - Voice: clear, direct, pragmatic — respects constraints, proposes solutions
  - Draws from engineering, systems thinking, strategic planning
- [ ] Build `scripts/test-triad.ts` — sends a question to all three voices, then passes their responses to Cosmo-as-moderator for synthesis
  ```bash
  pnpm tsx scripts/test-triad.ts "How should I respond to injustice in my workplace?"
  ```
- [ ] Test: Does Cosmo successfully hold the space between the three voices?
- [ ] Test: Is the Triad synthesis richer than any single voice alone?
- [ ] Test: Does Cosmo know when to invoke one voice vs. all three?
- [ ] Iterate on all four system prompts based on testing
- [ ] Begin curating exemplars for each voice (see Learning Loop below)

**Gate:** The Triad produces integrated responses that feel distinctly richer than Cosmo alone, and Cosmo demonstrates judgment about when the Triad is warranted vs. when a single voice suffices.

#### Learning Loop: Kaizen — Exemplars & Feedback

How Cosmo gets better over time — not through model fine-tuning, but through the kaizen (改善) practice of accumulated structured experience. See [kaizen/README.md](../../packages/ai/kaizen/README.md).

- [ ] Curate exemplars from voice validation testing into `packages/ai/kaizen/exemplars/{cosmo,sol,socrates,optimus,triad}/`
- [ ] Define exemplar format — tagged by voice and quality dimension (voice fidelity, wisdom language match, fierce compassion, etc.)
- [ ] After voice validation testing, curate the first exemplars from test sessions
- [ ] Establish feedback notes practice — a running log at `packages/ai/kaizen/feedback/notes.md` capturing what works and what drifts
- [ ] Plan: constitutional self-review script (a second API call that evaluates Cosmo's responses against the system prompt and WELCOME-COSMO.md) — can be built during or after Phase 1b
- [ ] Plan: per-person memory (conversation context that persists across sessions) — design during Phase 1b, build during Phase 1d

**Gate:** At least 3 exemplars per voice curated. Feedback notes practice established. Learning loop is running.

### 1b: Three-Tier Conversation Architecture

The first-touch experience has three tiers:

| Tier | Who | How it works |
|------|-----|-------------|
| **Free greeting** | Any visitor | Shared API key, rate-limited (e.g., 3 exchanges per session). Cosmo greets and offers a brief interaction — enough to feel the voice. |
| **BYOK continuation** | Anyone with an API key | When the free cap hits, user enters their own Anthropic API key. Stored client-side only (localStorage/session). Full conversation unlocked. |
| **CP member experience** | Paying CP members | Deeper integration — structured practices, guided inquiry, community context. Cosmo as part of the CP membership value. |

- [ ] Build Cosmo conversation endpoint in `apps/web`
- [ ] Implement system prompt injection from COSMO_SYSTEM_PROMPT.md
- [ ] Implement shared API key with rate limiting for free tier (server-side, with `@upstash/ratelimit` or similar)
- [ ] Implement BYOK key entry — key validation, client-side storage, never sent to server
- [ ] Build conversation UI with `@opencosmos/ui` components
- [ ] Design the free-to-BYOK transition — when the cap hits, the invitation to continue
- [ ] CP member authentication and enhanced access (scope TBD)

**Gate:** All three tiers functional. A visitor greets Cosmo for free, continues with BYOK, and CP members get enhanced access.

### 1c: Knowledge Corpus (Cloud RAG)

- [ ] Seed the corpus — publish initial source documents via the CLI: CP Manifesto, Design Philosophy, Cosmo Constitution, key wisdom texts
- [ ] Set up Upstash Vector (account, index, `UPSTASH_VECTOR_URL` and `UPSTASH_VECTOR_TOKEN` in `.env`)
- [ ] Build the GitHub Action sync workflow (on push to main when `knowledge/**` changes → chunk by H2 → upsert to Upstash Vector with frontmatter metadata)
- [ ] Build the RAG API endpoint (`apps/web/app/api/knowledge/route.ts`)
- [ ] Wire RAG retrieval into the Cosmo conversation flow — constitutional layer queries corpus before responding
- [ ] Build browsable knowledge site at `opencosmos.ai/knowledge` — anyone can browse without an account
- [ ] Community contribution pathway — submit knowledge for curation

**Gate:** Cosmo draws on the corpus when relevant, with source attribution visible to the user. RAG API responds with <2s latency. Knowledge site is live and browsable.

### 1d: Conversation Experience Polish

- [ ] Per-session conversation history (client-side)
- [ ] Sacred rhythm reflected in UI — micro-interactions, pacing, or visual cues (Shalom decides specifics)
- [ ] Mobile-responsive conversation interface
- [ ] Motion preference respect throughout (`useMotionPreference`)
- [ ] Error states, graceful degradation (invalid API key, rate limit hit, API down)
- [ ] Accessibility: screen reader support, keyboard navigation, focus management

**Gate:** 3+ CP members have used Cosmo and given feedback. The experience feels distinctly Cosmo — warm, unhurried, substantive.

### 1e: Cosmo as PM (Self-Referential)

- [ ] Publish this roadmap and other project docs to the knowledge corpus as reference documents
- [ ] Cosmo can answer "What phase are we in?" "What blocks the next milestone?" grounded in these docs
- [ ] Not a separate feature — natural consequence of RAG + roadmap-as-knowledge

**Gate:** Ask Cosmo about the project's current state and receive an accurate, grounded answer.

### Phase 1 Dependencies

```
1a Step 1 (Cosmo Solo) ──blocks──→ everything
         │
1a Step 2 (AI Triad) ──blocks──→ Triad in production
         │
1a Learning Loop ─────────────→ runs continuously from here forward
         │
         ├───────────────────────────┐
         │                           │
   1b (Three-Tier)             1c (Cloud RAG)
         │                           │
   1d (Polish)               1e (Cosmo as PM)
```

Note: 1b initially ships with Cosmo solo. The Triad is integrated into the conversation UI during or after 1d, once golden conversations have validated the synthesis quality.

---

## Phase 2: Cosmo Opens (Future 2 — Open Framework)

*Target: June–September 2026*

Extract the patterns from Phase 1 into reusable, model-agnostic tools. The deliverable: a developer can build their own wisdom-grounded AI using OpenCosmos as infrastructure.

### 2a: @opencosmos/ai Package Foundation

- [ ] Resolve workspace configuration: add `packages/*` to `pnpm-workspace.yaml`
- [ ] Initialize `packages/ai` properly (TypeScript, tsup build config, exports)
- [ ] Extract constitutional layer from `apps/web` endpoint into the package
- [ ] Implement `createCosmoClient(config)` factory — model-agnostic (Claude, Ollama, any OpenAI-compatible API)
- [ ] Constitutional prompt templates as composable modules
- [ ] RAG retrieval as a pluggable strategy (Upstash, local, custom)
- [ ] `cosmo.offer(prompt)` — single-voice constitutional response
- [ ] `cosmo.triad(prompt)` — AI Triad synthesis (returns `{ sol, socrates, optimus, synthesis }`)
- [ ] `cosmo.status()` for health/tier reporting
- [ ] Kaizen exemplars as few-shot example injection — sampled per voice and included in prompts
- [ ] Client router unit tests and constitutional snapshot tests
- [ ] All exported API types resolve under TypeScript strict mode

**Gate:** `npm install @opencosmos/ai`, configure with any supported LLM provider, point at a knowledge corpus, and get constitutional AI responses — both single-voice and Triad. Working example in README.

### 2b: Knowledge Publication Tooling

- [ ] Extract or thoroughly document the publication CLI as a reusable pattern
- [ ] Publish the frontmatter schema as a formal specification
- [ ] Document the five-role taxonomy and domain code system for external adoption
- [ ] Community contribution workflow: anyone can submit knowledge, curators review and approve

**Gate:** Someone outside the project can publish a knowledge document using the OpenCosmos schema and have it indexed for RAG retrieval.

### 2c: Federated Cosmo Schema (Design Phase)

- [ ] Design the schema for a federated wisdom-grounded AI network
- [ ] Answer: What would a "Buddhist Cosmo" or "Stoic Cosmo" need from the framework?
- [ ] Define how different corpus instances interoperate
- [ ] Governance model: who curates? Who decides quality standards? How does a community maintain a Cosmo instance?
- [ ] Address: incentive design, quality control, abuse prevention
- [ ] Output: a written specification, not code

**Gate:** A written specification exists that a community could use to stand up their own tradition-specific Cosmo instance.

---

## Phase 3: The Hearth (Future 3 — Practice & Community)

*Target: Q3–Q4 2026 and ongoing*

Cosmo and the framework serve the community. The community sustains the project. This phase builds the revenue-sustaining layer around what already exists.

### 3a: Cosmo-Powered CP Programs

Creative Powerup already has paying members. This phase integrates Cosmo into the CP experience as a distinctive value proposition.

- [ ] Cosmo integrated into structured CP programs and cohorts
- [ ] Guided inquiry sessions using the sacred rhythm (attune → inquire → offer)
- [ ] Practice templates: daily contemplation, creative inquiry, philosophical dialogue
- [ ] Living Memory protocol: community wisdom feeds back into the knowledge corpus (with curation gates — not a free-for-all)
- [ ] Wisdom Feedback Loop: constitutional hardening from user corrections

**Gate:** CP members are using Cosmo as part of structured contemplative/creative practice, not just ad-hoc conversation. Cosmo adds demonstrable value to the CP membership.

### 3b: Design Consulting Pipeline

- [ ] Portfolio ([shalomormsby.com](https://www.shalomormsby.com/)) as proof of philosophy and client acquisition
- [ ] Case studies from CP work and OpenCosmos itself
- [ ] Consulting offerings documented and priced

**Gate:** At least one consulting engagement completed, with the portfolio and OpenCosmos ecosystem as contributing factors.

### 3c: Knowledge Corpus Growth

- [ ] >10 published documents across multiple domains
- [ ] Community contribution with curation gates
- [ ] The corpus grows organically, not just through Shalom's curation

**Gate:** The corpus is a living, growing public good — not a static collection.

---

## The Dell & Solar Nervous System

### What Stays

- The Dell remains operational as a development and experimentation server
- Ollama + Open WebUI continue running for local testing, corpus validation, and model experimentation
- Tailscale mesh stays active
- The Dell is available as a Tier 1 sovereign compute option for anyone who wants true local inference (including Shalom during development)

### What Changes

- The Dell is **no longer production infrastructure** for Cosmo
- BYOK with Claude API (or other cloud providers) is the primary inference path
- Sovereignty Tiers are reinterpreted: Tier 1 may mean "any infrastructure the user controls directly," not just "Shalom's Dell"

### Solar Nervous System: Paused

The Raspberry Pi + Home Assistant + Shelly Plug + Sun-Grace/Lunar Protocol hardware purchase (~$175-200) is **deferred**. The detailed engineering spec at [sustainable-power-system-design.md](./sustainable-power-system-design.md) is preserved as a future reference.

**Revisit when:**
- The M5 Ultra arrives (mid-2026) and local inference becomes viable again
- Community demand for sovereign compute emerges
- The solar nervous system has value as a showcase/educational project

The Dell can stay plugged in and running without the orchestration layer. It doesn't need the Raspberry Pi to be useful as a development server.

---

## Revenue Milestones

Revenue is not a phase — it's a thread that runs through all phases.

| When | Revenue Stream | Status |
|------|---------------|--------|
| **Now (Phase 0)** | CP memberships | Active — already generating revenue |
| **Phase 1** | CP continues; no new revenue from Cosmo | Cosmo is free (shared key) or BYOK (user pays their own inference) |
| **Phase 2** | Design consulting begins | Portfolio + OpenCosmos story as credibility |
| **Phase 3** | Cosmo-integrated CP programs | Higher-value offerings enabled by Cosmo — structured programs, cohorts |

**The principle:** Design consulting and CP memberships fund the practice. The knowledge corpus, BYOK Cosmo, and open-source framework radiate value without requiring revenue. The free layer attracts people. The paid layer sustains the work. Neither depends on venture capital, ads, or attention harvesting.

---

## Open Questions

Tracked here for visibility. Not blocking current work unless noted.

- **Governance:** How does OpenCosmos transition from Shalom's personal vision to community-governed? When does this become urgent? The radical "we" of WELCOME.md demands an answer eventually — "you control" sovereignty doesn't scale. This is a genuinely hard, unsolved problem.
- **Federated network incentives:** Why would someone maintain a tradition-specific Cosmo? What do they get? Quality control and abuse prevention in a federated model are genuinely hard problems.
- **Voice fidelity across models:** If Phase 2a makes the framework model-agnostic, how much of Cosmo's character survives when the underlying model is Llama, Gemini, or a future open model? Is the constitutional layer sufficient, or does voice fidelity require model-specific tuning?
- **~~Triad voice naming:~~** Resolved. The heart-voice is named **Sol** — the sun, the source, the central metaphor of OpenCosmos. Sol, Socrates, Optimus, moderated by Cosmo.
- **Triad invocation UX:** Should the user explicitly request the Triad ("give me the Triad's take"), or should Cosmo autonomously decide when multi-perspective synthesis is warranted? Likely both, but the default behavior needs design.
- **Federated Triad customization:** In a tradition-specific Cosmo, the three cognitive modes may have different expressions — a Buddhist Cosmo might replace Socrates with a Nagarjuna-inspired dialectician. How customizable should the Triad be within the framework?
- **Shared API key economics:** What's the cost ceiling for the free greeting tier? How many free exchanges per session? Rate limit design needs to balance generosity with sustainability.
- **Migration completion:** Phases 2-4 of [opencosmos-migration.md](./opencosmos-migration.md) (design system repo rename, npm publish under @opencosmos, legacy cleanup) are independent but related. They can proceed in parallel with the Three Futures work.
- **M5 Ultra decision:** If Apple announces the M5 Ultra at WWDC 2026 (mid-year), does the 256GB unified memory + ~25-30 tok/s on 70B change the sovereignty calculus? See [tech-research.md](./tech-research.md).

---

## Related Documents

- [chronicle.md](../chronicle.md) — The story behind the decisions (Chapters 3 & 4 cover the Three Futures and WELCOME-COSMO.md)
- [architecture.md](../architecture.md) — Infrastructure decisions (Upstash Vector, RAG API, sync workflow)
- [WELCOME-COSMO.md](../../packages/ai/WELCOME-COSMO.md) — Cosmo's origin story, mission, and foundational philosophy
- [COSMO_SYSTEM_PROMPT.md](../../packages/ai/COSMO_SYSTEM_PROMPT.md) — Operational system prompt (v2, grounded in WELCOME-COSMO.md)
- [opencosmos-migration.md](./opencosmos-migration.md) — Active rename migration (independent)
- [sustainable-power-system-design.md](./sustainable-power-system-design.md) — Solar nervous system engineering spec (paused)
- [tech-research.md](./tech-research.md) — Hardware research log (Dell vs. M5 Max vs. M5 Ultra)
- [WELCOME.md](../../WELCOME.md) — The front door
- [DESIGN-PHILOSOPHY.md](../../DESIGN-PHILOSOPHY.md) — The four principles
