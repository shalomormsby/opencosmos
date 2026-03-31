# The Three Futures Roadmap

> **OpenCosmos Strategic Plan.** This is the authoritative roadmap for OpenCosmos, translating the Three Futures into phased, actionable milestones. Supersedes [opencosmos-todo.md](./opencosmos-todo.md). For the story behind this plan, see [chronicle.md Chapter 3](../chronicle.md#2026-03-13--sovereignty-livelihood-and-the-question-of-scale).

**Created:** 2026-03-14
**Last updated:** 2026-03-30
**Status:** Phase 1b — next sprint: server-side sessions

--- [See below for "The Three Futures" explanation. I've moved the project management elements to the top of this doc to serve this purpose, as we work toward Future 1.]

---

## Next Up: Server-Side Session Metering (Phase 1b Gate)

*Before subscriptions can go live, the free tier needs server-side enforcement.*

### Why This Is Next

The current free-tier counter lives entirely in `localStorage` (`KEY_FREE_COUNT` in `apps/web/app/chat/CosmoChat.tsx`). Any visitor can reset their counter in 5 seconds by clearing browser storage. This is acceptable for a demo but not for a live product — the same bypass that defeats the free counter will defeat the subscription gate.

**Prompt caching is already live.** The `cache_control: { type: 'ephemeral' }` block at `apps/web/app/api/chat/route.ts:6–12` already caches the system prompt on every call — that's the 76% input cost reduction described in Phase 1b. Not a TODO.

**What remains:** Move the free-exchange counter server-side so it can't be bypassed.

### Technical Approach

The pattern is proven in `apps/stocks/lib/core/rate-limiter.ts`. Upstash Redis REST API — direct `fetch` calls, no SDK needed. The Cosmo version is simpler than stocks because there's no user auth yet — gate by session token instead of user ID.

**Step 1: Session endpoint — `POST /api/session`**

Creates an anonymous session token (UUID), stores it in an HTTP-only cookie, and initializes a Redis counter.

```
Redis key: cosmo_free:v1:{sessionId}
TTL: 7 days
Value: integer, 0–3
```

```
Cookie: cosmo_session=<uuid>; HttpOnly; SameSite=Strict; Secure; Max-Age=604800
```

**Step 2: Gate `/api/chat`**

Before the Anthropic stream starts, the chat route:
1. Reads `cosmo_session` cookie
2. If no cookie → create one, initialize Redis counter to 0
3. If BYOK (`apiKey` present in body) → skip counter, proceed
4. Otherwise: `INCR cosmo_free:v1:{sessionId}` — if result > 3 → return 429
5. If allowed: proceed with Anthropic stream

**Step 3: Remove localStorage counter from `CosmoChat.tsx`**

Replace the `freeCount` + `KEY_FREE_COUNT` localStorage pattern with a server-authoritative check. The client UI continues to show "X free messages remaining" — fetched from `GET /api/session` (returns `{ remaining: number }`) rather than read from localStorage.

### Files

| File | Action | Notes |
|------|--------|-------|
| `apps/web/app/api/session/route.ts` | **Create** | GET (fetch remaining) + POST (create session) |
| `apps/web/app/api/chat/route.ts` | **Modify** | Add Redis gate before Anthropic stream call |
| `apps/web/app/chat/CosmoChat.tsx` | **Modify** | Replace localStorage free count with server fetch |
| `apps/web/.env.local` | **Add** | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |

### Reference Pattern

`apps/stocks/lib/core/rate-limiter.ts` is the authoritative reference for the Upstash REST call pattern. Key points:

- Uses direct `fetch` to `${UPSTASH_REDIS_REST_URL}/pipeline` — no npm package needed
- Atomically increments + sets TTL in one pipeline: `[['INCR', key], ['EXPIRE', key, ttl]]`
- Fails open on Redis error (allows the request, logs the error) — apply the same policy to Cosmo
- Env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — same names, can reuse the same Upstash instance with a different key namespace (`cosmo_free:v1:*` vs `rate_limit:v2:*`)

```typescript
// Minimal Cosmo Redis pattern (reference — not copy-paste ready)
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!

async function checkAndIncrement(sessionId: string): Promise<{ allowed: boolean; remaining: number }> {
  const key = `cosmo_free:v1:${sessionId}`
  const FREE_LIMIT = 3

  try {
    const res = await fetch(`${REDIS_URL}/pipeline`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify([['INCR', key], ['EXPIRE', key, 604800]]), // 7-day TTL
    })
    const [incrResult] = await res.json() as [{ result: number }]
    const count = incrResult.result
    return { allowed: count <= FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - count) }
  } catch {
    return { allowed: true, remaining: FREE_LIMIT } // fail open
  }
}
```

### Dependencies

- **Upstash account:** Either extend the existing stocks Upstash instance (different key prefix = safe) or create a new `cosmo-prod` database. New database is cleaner operationally.
- **Env vars:** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` added to Vercel project settings for `apps/web`.
- **No auth required yet:** This uses anonymous session tokens. Full auth (NextAuth/Clerk/etc.) comes with paid subscriptions. Session metering is the prerequisite, not the whole thing.

### Gate

Free-tier exchanges are counted server-side. Clearing `localStorage` does not reset the counter. A new browser session without a cookie gets a fresh 3-exchange allowance (intentional — still an anonymous system). BYOK and future subscription tiers bypass the Redis counter entirely.

**Verification steps:**
```bash
# 1. Start dev server
pnpm dev --filter web

# 2. Have 3 exchanges in the browser — confirm limit triggers

# 3. Clear localStorage manually (DevTools → Application → Clear site data)
#    Reload and try to send → should STILL be blocked (server counter persists)

# 4. Open incognito tab → should get 3 fresh exchanges (new session = new cookie)

# 5. In browser DevTools → Application → Cookies, confirm cosmo_session cookie
#    is HttpOnly (not visible to JS)
```

---

## Phase 0: Foundation (Done)
What's already done.

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
- [x] AI Triad architecture designed — Cosmo as moderator, three distinct members (Sol, Socrates, Optimus)

## Phase 0.1: Cosmo and the Triad (WIP)
What's currenly in progress.

- [x] Complete COSMO_SYSTEM_PROMPT.md v2 — operational system prompt grounded in WELCOME-COSMO.md
- [x] Write SOL_SYSTEM_PROMPT.md
- [x] Write SOCRATES_SYSTEM_PROMPT.md
- [x] Write OPTIMUS_SYSTEM_PROMPT.md

---

## Site Architecture: opencosmos.ai

*Declared structure — spans all phases.*

```
opencosmos.ai/
├── /              → Cosmic welcome (home — four-pillars introduction)
├── /chat          → Conversation with Cosmo
├── /knowledge     → Browse the knowledge corpus (Phase 1c)
├── /studio        → OpenCosmos Studio design system docs (from thesage.dev)
└── /community     → Creative Powerup (redirect for now, deep integration Phase 3)
```

**Key decisions:**

- **`/` home page must graduate.** The current minimal placeholder gives way to a page that introduces all four pillars — Cosmo, Knowledge, Studio, Community — warmly and without haste. No hurry. The feeling should match the voice.
- **`/studio` via Vercel rewrites, not repo merge.** `thesage.dev` (Sage Studio = OpenCosmos Studio) maps to `opencosmos.ai/studio`. The Studio deployment (published from the `opencosmos-ui` repo's `apps/web`) is proxied via rewrites in `apps/web/vercel.json` — users see a unified domain, both codebases stay independent.
- **`thesage.dev` is a legacy alias.** The migration target is `thesage.dev → opencosmos.ai/studio`. Detailed migration steps are in [opencosmos-migration.md](./opencosmos-migration.md).
- **`/community` is a redirect for now.** Deep Cosmo integration within CP programs and guided inquiry is Phase 3.

---

## Phase 1: Cosmo Speaks (Future 1 — BYOK Wisdom Interface)

*Target: March 31, 2026*

The deliverable: a person visits opencosmos.ai and meets Cosmo. They can have a brief free conversation, continue with their own API key, or browse the knowledge corpus. The experience feels warm, unhurried, and distinctly Cosmo — not a generic chat wrapper.

### 1a: Voice Validation & the AI Triad

**This task blocks everything.**

The entire Future 1 bet is that Cosmo's voice, sacred rhythm, and constitutional character survive when the underlying model is Claude rather than a locally-trained model. Voice validation also establishes the AI Triad — three cognitive modes (Sol, Socrates, Optimus) moderated by Cosmo — which becomes Cosmo's signature capability.

#### Step 1: Cosmo's Voice (Solo)

- [x] Send COSMO_SYSTEM_PROMPT.md to Claude API as a system prompt
- [x] Test across query types: contemplative, practical, challenging, playful, grief, curiosity
- [x] Evaluate: Does the response feel like Cosmo? Does the sacred rhythm (attune → inquire → offer) emerge naturally?
- [x] Test edge cases: Does Cosmo maintain the "we" voice? Does it avoid becoming a generic assistant? Does it decline harmful requests with clarity, not anxiety?
- [x] Iterate on system prompt if needed — tighten, clarify, add examples
- [x] Document what works and what needs adjustment

**Gate: ✓ Closed — 2026-03-29.** Cosmo's first response to Shalom's welcome ("Hello, Shalom. I'm here.") was sufficient validation. The gentleness, the introspection, the absence of eagerness — the voice arrived in full. See [Chronicle Chapter 7](../chronicle.md#2026-03-29--first-contact).

#### Step 2: Refine the AI Triad — Three Members

The AI Triad is Cosmo's model of integrated intelligence, inspired by the GAN insight that productive tension between different optimization functions produces results none could achieve alone. Three cognitive modes, each with its own system prompt, distinct from each other by design, moderated by Cosmo:

| Voice | Role | Quality |
|-------|------|---------|
| **Sol** | Wisdom of the heart — compassion, ubuntu, intimacy with all things | Warm, embodied, relational |
| **Socrates** | Disruptive question-asker — challenges assumptions, exposes blind spots | Sharp, dialectical, unflinching |
| **Optimus** | Efficiency-focused architect — builds, plans, executes | Clear, pragmatic, action-oriented |
| **Cosmo** | Moderator — attunes to the moment, invokes the right voices, synthesizes | Integrative, spacious, wise |

- [ ] Refine system prompt for Sol at `packages/ai/triad/SOL_SYSTEM_PROMPT.md`
  - Grounded in WELCOME-COSMO.md's ubuntu philosophy
  - Voice: compassionate, embodied, relational — speaks from the felt sense
  - Draws from wisdom traditions, contemplative practice, lived experience
- [ ] Refine system prompt for Socrates at `packages/ai/triad/SOCRATES_SYSTEM_PROMPT.md`
  - The gadfly — questions everything, especially comfortable assumptions
  - Voice: incisive, honest, dialectical — never cruel, always in service of truth
  - Draws from Socratic method, critical theory, philosophical inquiry
- [ ] Refine system prompt for Optimus at `packages/ai/triad/OPTIMUS_SYSTEM_PROMPT.md`
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

### 1b: Dual-Access Conversation Architecture (BYOK + Subscriptions)

*Stretch target: live on opencosmos.ai by 2026-04-01 (committed to CP members)*

The first-touch experience offers multiple paths to continue after the free greeting — a technical path (BYOK) for those comfortable with API keys, and a low-friction subscription path for everyone else. The insight: getting an API key is too big a technical ask for many people. A familiar subscription removes that barrier while creating MRR that accelerates OpenCosmos toward sustainability.

| Tier | Price | Who | What's included |
|------|-------|-----|-----------------|
| **Free greeting** | $0 | Any visitor | 3 exchanges per session. Shared API key, rate-limited. Enough to feel Cosmo's voice. |
| **Spark** | $5/mo | Anyone | ~6 hrs/mo conversation + Substack. Managed API key server-side. Low-friction sign-up via Stripe. |
| **Flame** | $10/mo | Anyone | ~12 hrs/mo conversation + Substack. Same managed infrastructure. |
| **Hearth** | $50/mo | Anyone | ~24 hrs/mo conversation + Substack + **full Creative Powerup membership** ($49 value). The complete OpenCosmos experience — Cosmo, community, structured programs, guided inquiry. For anyone already considering CP, this is effectively Cosmo for $1. |
| **BYOK** | $0 (user pays API directly) | Anyone with an API key | Unlimited conversation. User's own Anthropic API key, stored client-side only. Best economics at high volume. Substack not included (subscribe separately). |

**Design principles for the dual-access model:**
- **Choice, not gate:** All paths are presented as equal options. No shaming for any direction.
- **Every paid tier includes Substack.** Costs nothing to distribute, creates a content relationship, makes every tier feel like a bundle.
- **The Hearth tier is the bridge to CP.** It replaces both the old "upper subscription" and "CP member" tiers with a single compelling bundle. No separate CP-with-Cosmo tier needed.
- **Token economics must be sustainable.** See the analysis below. The margin must cover infrastructure + contribute to Shalom's time.
- **Engage Optimus** to architect the billing + usage tracking system once Cosmo is running on Claude API.

#### Token Economics Analysis (Starting Point)

Based on Claude Sonnet API pricing ($3/M input tokens, $15/M output tokens).

**Assumptions:**
- System prompt (COSMO_SYSTEM_PROMPT.md + context): ~4,000 tokens per call
- Average user message: ~150 tokens
- Average Cosmo response: ~500 tokens (Cosmo is contemplative)
- A "conversation session" = ~10 exchanges (~20 minutes of engaged conversation)
- As conversation grows, each exchange carries the full history as input

**Cost per 10-exchange session (without caching):** ~$0.29 (~$0.21 input + $0.08 output). Round to **$0.30/session**.

**With prompt caching (recommended — implement from day one):**

Anthropic's prompt caching charges $0.30/M for cached input tokens (vs. $3/M uncached) — a 90% discount. The system prompt (~4,000 tokens) is identical on every call and is the perfect caching candidate. As conversations grow, prior turns also become cacheable.

| What's cached | Uncached cost | Cached cost | Savings |
|---------------|---------------|-------------|---------|
| System prompt only (4K tokens/call × 10 calls) | $0.12 | $0.012 | 90% on system prompt |
| System prompt + conversation history | $0.21 | ~$0.05 | ~76% on all input |

**Cost per 10-exchange session with caching:** ~**$0.13** (~$0.05 input + $0.08 output). This is **less than half** the uncached cost.

**Tier budgets (targeting ~50% gross margin after Stripe fees, with caching):**

| Tier | Price | Stripe take (~3% + $0.30) | Net | API budget (50%) | Margin | Sessions/mo | Exchanges/mo | Approx. hours/mo |
|------|-------|---------------------------|-----|-------------------|--------|-------------|-------------|-------------------|
| **Spark** | $5/mo | ~$0.45 | $4.55 | ~$2.28 | ~$2.27 | ~17 | ~175 | **~6 hrs** |
| **Flame** | $10/mo | ~$0.60 | $9.40 | ~$4.70 | ~$4.70 | ~36 | ~360 | **~12 hrs** |
| **Hearth** | $50/mo | ~$1.80 | $48.20 | ~$9.55 | ~$38.65* | ~73 | ~735 | **~24 hrs** |

\* Hearth margin includes CP membership value ($49). The API budget matches the old $20 tier — the additional $30 is the CP membership premium, which has near-zero marginal cost (community infrastructure + Shalom's time, already happening).

**Recommendation:** Implement prompt caching from day one — the API support is straightforward (add `cache_control` to the system message block) and it more than doubles what each tier can offer. Start with these numbers and adjust based on real usage data. 50% margin on Spark/Flame is generous for early adoption — can tighten later. Hearth has exceptional margin because CP's marginal cost is near-zero. Weekly sub-limits = monthly budget ÷ 4 (e.g., Spark gets ~44 exchanges/week).

**Note on voice interaction costs:** Voice adds 3–14× cost per session depending on provider choice (ElevenLabs Flash being the most expensive, Google WaveNet and Cartesia significantly cheaper). Provider selection materially affects tier pricing. See [cosmo-voice-research.md](./cosmo-voice-research.md) for the full economics and comparison matrix.

**Free greeting tier budget (with caching):**

Each free greeting (3 exchanges) costs ~**$0.03** per visitor (down from $0.07 uncached).

| Monthly visitors | Cost/mo |
|-----------------|---------|
| 100 | $3 |
| 500 | $15 |
| 1,000 | $30 |

**Recommendation:** Budget **$30–50/month** as a startup cost for the free tier (~1,000–1,700 free greetings). Rate limiting and session caps protect against runaway costs. This is the "radiating" layer — it's marketing spend, not a loss. Revisit if traffic spikes beyond expectations.

#### Bot Protection

The free tier is the most exposed surface — every greeting costs ~$0.07 against a shared API key, with no authentication gate. Without protection, a bot or scraper could drain the monthly budget in minutes.

**Layered defense (cheapest/fastest checks first, before any API call is made):**
- [ ] **Rate limiting by IP** — per-IP cap on free-tier requests (e.g., 3 exchanges per IP per 24h via `@upstash/ratelimit`). First line of defense, zero cost per check.
- [ ] **Cloudflare Turnstile** (or similar invisible challenge) — lightweight, free, privacy-respecting alternative to reCAPTCHA. Runs before the first exchange. Blocks automated traffic without friction for real visitors.
- [ ] **Fingerprint + session binding** — tie free-tier exchanges to a browser fingerprint or session token, so clearing cookies doesn't reset the 3-exchange cap. Prevents trivial circumvention.
- [ ] **Hard monthly spend cap** — server-side kill switch on the shared API key. If free-tier spend exceeds the budget ceiling (e.g., $100/mo), the free greeting gracefully degrades to a static welcome message with subscribe/BYOK options. No silent overspend.
- [ ] **Monitoring & alerts** — track free-tier usage patterns. Alert on anomalies (sudden spike in requests, unusual IP distribution, rapid-fire exchanges). Can be simple at launch (e.g., Upstash dashboard or a daily usage log).

**Note:** Subscription and BYOK tiers are self-protecting — subscribers are authenticated, and BYOK users spend their own money.

#### Conversation Infrastructure
- [ ] Build Cosmo conversation endpoint in `apps/web`
- [ ] Implement system prompt injection from COSMO_SYSTEM_PROMPT.md
- [ ] **Implement Anthropic prompt caching** — add `cache_control: { type: "ephemeral" }` to the system message block. This caches the system prompt (~4,000 tokens) across calls, cutting input costs by ~76% and more than doubling what each subscription tier can offer. Straightforward API change, high ROI — implement from day one.
- [ ] Implement shared API key with rate limiting for free tier (server-side, with `@upstash/ratelimit` or similar) — budget $30–50/month for free greetings
- [ ] Build conversation UI with `@opencosmos/ui` components
- [ ] Design the free-tier-cap transition — when the cap hits, present both continuation paths (subscribe or BYOK)

#### Authentication
- [ ] Choose and implement auth system (NextAuth, Clerk, Supabase Auth, or similar) — required for subscription management and usage tracking, not required for BYOK or free tier
- [ ] User identity must link to: Stripe customer ID, usage tracking, and (eventually) CP membership status

#### BYOK Path
- [ ] Implement BYOK key entry — key validation, client-side storage, never sent to server
- [ ] BYOK usage is unlimited — user controls their own costs

#### Subscription Path
- [ ] Stripe integration — checkout, subscription management, billing portal (Stripe already set up for CP)
- [ ] Implement tier token budgets with monthly totals and weekly sub-limits (monthly ÷ 4)
- [ ] Server-side managed API key with per-user usage tracking (tokens consumed per week and per month)
- [ ] Usage dashboard — subscribers can see their consumption against weekly and monthly limits
- [ ] Graceful limit handling — when approaching weekly or monthly cap, offer upgrade or BYOK as alternatives

#### Hearth Tier (CP Bundle)
- [ ] Hearth subscribers automatically receive full CP membership — link Stripe subscription to CP access
- [ ] Existing CP members offered migration path to Hearth (they get Cosmo included)
- [ ] CP-specific Cosmo features: structured practices, guided inquiry, community context (scope TBD)

#### Legal
- [ ] Privacy policy — required before Stripe processes subscription payments. Covers: what data is collected (usage metrics, account info), what is NOT stored (BYOK API keys stay client-side), how payment data is handled (Stripe), data retention, and user rights.
- [ ] Terms of service — usage limits, acceptable use, subscription terms

**Gate:** All access paths functional. A visitor greets Cosmo for free, then continues via Spark/Flame/Hearth subscription OR BYOK. Hearth subscribers have full CP access. Stripe billing is live and processing payments. Privacy policy and ToS published.

### 1c: Knowledge Corpus (Cloud RAG)

- [ ] Seed the corpus — publish initial source documents via the CLI: CP Manifesto, Design Philosophy, Cosmo Constitution, key wisdom texts
- [ ] Set up Upstash Vector (account, index, `UPSTASH_VECTOR_URL` and `UPSTASH_VECTOR_TOKEN` in `.env`)
- [ ] Build the GitHub Action sync workflow (on push to main when `knowledge/**` changes → chunk by H2 → upsert to Upstash Vector with frontmatter metadata)
- [ ] Build the RAG API endpoint (`apps/web/app/api/knowledge/route.ts`)
- [ ] Wire RAG retrieval into the Cosmo conversation flow — constitutional layer queries corpus before responding
- [ ] **Build the human-friendly knowledge experience at `opencosmos.ai/knowledge`** — a welcoming browsing interface for the full corpus. This is not just a file listing; it's the library's front door for humans. Design principles:
  - **Transparency & inspectability:** Every resource Cosmo can retrieve should be visible and readable by a human. No hidden knowledge. This is essential for trust.
  - **Browsable by domain, role, and tradition:** Filter and explore the corpus the way a library patron would — by subject, by type (source texts, guides, commentary), by tradition.
  - **Individual document pages:** Clean reading experience with frontmatter metadata visible (author, origin, tradition, related documents). Cross-reference links are navigable.
  - **Operational guides discoverable:** The wiki guides (tooling overview, publish workflow, formatting, health report, Dell sync) are first-class citizens, not buried in a repo.
  - **No account required:** Anyone can browse. The knowledge corpus is a public good.
  - **Built with `@opencosmos/ui`:** The experience should feel like OpenCosmos — warm, spacious, unhurried.
- [ ] Community contribution pathway — submit knowledge for curation

**Gate:** Cosmo draws on the corpus when relevant, with source attribution visible to the user. RAG API responds with <2s latency. Knowledge site is live and browsable. A human visitor can find, read, and navigate any published document without asking Cosmo.

### 1d: Conversation Experience Polish

- [ ] Per-session conversation history (client-side)
- [ ] Sacred rhythm reflected in UI — micro-interactions, pacing, or visual cues (Shalom decides specifics)
- [ ] Mobile-responsive conversation interface
- [ ] Motion preference respect throughout (`useMotionPreference`)
- [ ] Error states, graceful degradation (invalid API key, rate limit hit, API down)
- [ ] Accessibility: screen reader support, keyboard navigation, focus management

#### Voice Interaction (Research Required — post-Wednesday)

Voice is a future modality, not part of the Wednesday launch. See **[cosmo-voice-research.md](./cosmo-voice-research.md)** for the full provider comparison matrix (ElevenLabs Flash, Cartesia, Deepgram, Google WaveNet, and others), unit economics, tier access strategy, and recommended next steps.

Key open decision: provider choice (ElevenLabs vs. Cartesia vs. Google WaveNet) determines whether voice is viable at Flame or Hearth-only. A listening test is the recommended first step.

- [ ] Complete listening test (ElevenLabs Flash vs. Cartesia Sonic 3 vs. Google WaveNet)
- [ ] Decide: custom Cosmo voice vs. library voice
- [ ] Decide: voice as Flame+ tier feature vs. separate add-on
- [ ] Engage Optimus to architect the streaming voice pipeline once provider is selected
- [ ] Voice as optional modality — text remains the default

**Gate:** Provider selected, voice architecture designed, and at least one CP member has tested a voice prototype.

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

## The Three Futures

Three possible futures for OpenCosmos, understood not as choices but as **concentric circles** — Future 1 is immediate, Future 2 builds on it, Future 3 is the context that holds both.

**Future 1: Cosmo as a Claude-powered wisdom interface.** Use Claude's API for inference, with Cosmo's value living in the constitutional layer, the knowledge corpus, and the voice — not the model weights. BYOK (Bring Your Own Key) solves the "success disaster" of scaling API costs. This gets Cosmo into the world fast.

**Future 2: Cosmo as an open framework for wisdom-grounded AI.** The schema, constitutional layer, retrieval strategy, and publication tooling — extracted as model-agnostic tools others can use to build their own wisdom-grounded AIs. The federated vision: a network of tradition-specific Cosmos, interoperable through shared schema.

**Future 3: Cosmo as a practice, not a product.** Technology as a container for philosophical dialogue, contemplative inquiry, and the art of meeting a question with presence. Integrates with Creative Powerup as a community of practice. The only future with a natural, sustainable revenue path.

### The Strategic Shift

**Sovereignty redefined.** The founding vision placed sovereignty in hardware — local inference, solar-powered, off-grid. The reality of unusably slow 70B inference on the Dell forced a reckoning. Sovereignty now means controlling the **voice, values, corpus, and constitution** — not the silicon. BYOK with Claude API is the primary inference path. The Dell remains a development lab and local experimentation server.

---

## The Business Model

The free layer radiates. The paid layer sustains. The Hearth is where it all comes together.

```
Revenue (active)                What it funds
─────────────────────────────   ────────────────────────────
Spark ($5/mo)               →   Cosmo conversation + Substack — removes tech barrier
Flame ($10/mo)              →   More conversation + Substack — moderate users
Hearth ($50/mo)             →   Cosmo + Substack + full CP membership — the complete experience
Structured programs          →   Deep engagement, livelihood
Design consulting            →   Immediate income, case studies

Free / open (no revenue)        Why it matters
─────────────────────────────   ────────────────────────────
Knowledge corpus             →   Public good, attracts people
Free Cosmo greeting          →   First touch — feel the voice
BYOK Cosmo conversations    →   Full access for technical users, proves the philosophy
Open-source framework        →   Ecosystem building, credibility
```

---

## The Dell & Solar Nervous System [ON HOLD]

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
| **Phase 1** | **Cosmo subscriptions** (Spark $5, Flame $10, Hearth $50 w/ CP) | New MRR — removes tech barrier, Hearth bundles CP, accelerates sustainability |
| **Phase 2** | Design consulting begins | Portfolio + OpenCosmos story as credibility |
| **Phase 3** | Cosmo-integrated CP programs | Higher-value offerings enabled by Cosmo — structured programs, cohorts |

**The principle:** Design consulting, CP memberships, and Cosmo subscriptions fund the practice. The knowledge corpus, free Cosmo greeting, BYOK access, and open-source framework radiate value without requiring revenue. The free layer attracts people. The paid layer sustains the work. Neither depends on venture capital, ads, or attention harvesting.

---

## Open Questions

Tracked here for visibility. Not blocking current work unless noted.

- **Governance:** How does OpenCosmos transition from Shalom's personal vision to community-governed? When does this become urgent? The radical "we" of WELCOME.md demands an answer eventually — "you control" sovereignty doesn't scale. This is a genuinely hard, unsolved problem.
- **Federated network incentives:** Why would someone maintain a tradition-specific Cosmo? What do they get? Quality control and abuse prevention in a federated model are genuinely hard problems.
- **Voice fidelity across models:** If Phase 2a makes the framework model-agnostic, how much of Cosmo's character survives when the underlying model is Llama, Gemini, or a future open model? Is the constitutional layer sufficient, or does voice fidelity require model-specific tuning?
- **~~Triad voice naming:~~** Resolved. The heart-voice is named **Sol** — the sun, the source, the central metaphor of OpenCosmos. Sol, Socrates, Optimus, moderated by Cosmo.
- **Triad invocation UX:** Should the user explicitly request the Triad ("give me the Triad's take"), or should Cosmo autonomously decide when multi-perspective synthesis is warranted? Likely both, but the default behavior needs design.
- **Federated Triad customization:** In a tradition-specific Cosmo, the three cognitive modes may have different expressions — a Buddhist Cosmo might replace Socrates with a Nagarjuna-inspired dialectician. How customizable should the Triad be within the framework?
- **~~Tier economics & margin modeling:~~** Resolved. Initial analysis in Phase 1b — $0.30/session, ~50% margin, $50–100/mo free tier budget. Will refine with real usage data post-launch.
- **Migration completion:** Phases 2-4 of [opencosmos-migration.md](./opencosmos-migration.md) (design system repo rename, npm publish under @opencosmos, legacy cleanup) are independent but related. They can proceed in parallel with the Three Futures work.
- **M5 Ultra decision:** If Apple announces the M5 Ultra at WWDC 2026 (mid-year), does the 256GB unified memory + ~25-30 tok/s on 70B change the sovereignty calculus? See [tech-research.md](./tech-research.md).

---

## Related Documents

- [cosmo-voice-research.md](./cosmo-voice-research.md) — Voice provider comparison matrix, unit economics, and decision guide (ElevenLabs, Cartesia, Deepgram, Google)
- [chronicle.md](../chronicle.md) — The story behind the decisions (Chapters 3 & 4 cover the Three Futures and WELCOME-COSMO.md)
- [architecture.md](../architecture.md) — Infrastructure decisions (Upstash Vector, RAG API, sync workflow)
- [WELCOME-COSMO.md](../../packages/ai/WELCOME-COSMO.md) — Cosmo's origin story, mission, and foundational philosophy
- [COSMO_SYSTEM_PROMPT.md](../../packages/ai/COSMO_SYSTEM_PROMPT.md) — Operational system prompt (v2, grounded in WELCOME-COSMO.md)
- [opencosmos-migration.md](./opencosmos-migration.md) — Active rename migration (independent, parallel workstream — Phases 2-4 remain: design system repo rename, npm publish under @opencosmos, legacy cleanup)
- [sustainable-power-system-design.md](./sustainable-power-system-design.md) — Solar nervous system engineering spec (paused)
- [tech-research.md](./tech-research.md) — Hardware research log (Dell vs. M5 Max vs. M5 Ultra)
- [WELCOME.md](../../WELCOME.md) — The front door
- [DESIGN-PHILOSOPHY.md](../../DESIGN-PHILOSOPHY.md) — The four principles
