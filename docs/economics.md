# OpenCosmos Economics

> The unit economics ledger for OpenCosmos. One place to answer: "What does this cost us? What's our margin? Can we afford this feature?"
>
> **This document owns the numbers.** `architecture.md` owns the technical mechanics of cost tracking. `strategy.md` owns the revenue philosophy. Neither does math.

**Updated:** 2026-04-10

---

## Cost Components

### LLM — Claude Sonnet (Baseline)

| Component | Rate |
|-----------|------|
| Input tokens | $3.00 / 1M tokens ($0.000003/token) |
| Output tokens | $15.00 / 1M tokens ($0.000015/token) |
| Cached input (system prompt) | $0.30 / 1M tokens — 90% reduction vs. uncached |
| Cache write | $3.75 / 1M tokens (one-time, amortizes over session) |

**Prompt caching** applies `cache_control: ephemeral` on the system prompt (~4,000 tokens) for all subscribers. The system prompt is cached on the first exchange and read from cache on all subsequent exchanges. This is the largest single cost reduction in the system.

**Session model assumptions:**
- System prompt: ~4,000 tokens/exchange (cached after exchange 1)
- Average user message: ~150 tokens
- Average Cosmo response: ~500 tokens (contemplative, unhurried)
- Growing conversation history injected per exchange (caching applied to last assistant turn for subscribers)
- A "session" = ~10 exchanges (~20 minutes of conversation)

**Per-exchange cost (subscriber, with caching):**

| Cost item | Tokens | Rate | Cost |
|-----------|--------|------|------|
| System prompt — cache read | 4,000 | $0.30/M | $0.0012 |
| Conversation history (avg ~1,000 tokens, cached portion) | ~1,000 | $0.30/M | $0.0003 |
| New user message — uncached input | ~150 | $3.00/M | $0.0005 |
| Cosmo response — output | ~500 | $15.00/M | $0.0075 |
| **Per exchange** | | | **~$0.009–0.013** |
| **Per session (10 exchanges)** | | | **~$0.09–0.13** |

*Conservative model uses $0.013/exchange, $0.13/session.*

---

### Voice — TTS + STT Add-on

Provider selected: **ElevenLabs Flash v2.5** (for quality). Full comparison in [cosmo-voice-research.md](projects/cosmo-voice-research.md).

**TTS cost model (ElevenLabs Flash v2.5, $0.08/1K chars):**

| Component | Volume | Rate | Cost/exchange |
|-----------|--------|------|---------------|
| TTS: Cosmo response (~500 tokens ≈ ~375 words ≈ ~1,875 chars) | 1,875 chars | $0.08/1K | **$0.150** |
| STT: user speech (~15 sec avg, browser Web Speech API) | free | — | **$0.000** |
| Claude (same as text) | — | — | **$0.013** |
| **Total per voice exchange** | | | **~$0.163** |
| **Total per voice session (10 exchanges)** | | | **~$1.63** |

Voice adds **~12.5× the cost** of a text-only session.

**Alternative provider economics:**

| Provider | TTS rate | Cost/session | vs. text-only | Notes |
|----------|----------|-------------|----------------|-------|
| ElevenLabs Flash v2.5 | $0.08/1K chars | ~$1.63 | **12.5×** | Selected. Best quality. |
| Cartesia Sonic 3 | ~$0.03/1K chars | ~$0.73 | **5.6×** | Strong quality, streaming-native. |
| Deepgram Aura-2 | $0.03/1K chars | ~$0.73 | **5.6×** | Enterprise-grade. Pairs with Deepgram STT. |
| Google WaveNet | $0.016/1K chars | ~$0.44 | **3.4×** | 1M chars/mo **free** tier. Slight "assistant" quality. |
| Inworld AI | $0.01/1K chars | ~$0.32 | **2.5×** | Best value. Newer. Less proven. |
| Web Speech API (browser) | Free | ~$0.13 | **1×** | Zero TTS cost. Quality unsuitable for Cosmo. |

> **STT note:** Browser [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) is free and surprisingly accurate for conversational input. Test this first before adding a paid STT provider. If it's acceptable, it removes one API dependency entirely.

---

### Infrastructure — Fixed Costs

| Service | Plan | Monthly cost | What it covers |
|---------|------|-------------|----------------|
| Vercel | Hobby / Pro | $0–20 | Hosting, serverless functions, deployments |
| Upstash Redis | Pay-per-request | ~$0–5 (at current scale) | Usage counters, subscription records, session cache |
| Upstash Vector | Free tier → Pay-per-query | $0 (until >10K queries/day) | Knowledge corpus RAG index |
| Anthropic | Pay-per-token | Variable (tracked in economics below) | LLM inference |
| WorkOS | Free → $25+/mo | $0 at current MAU | Auth (1,000 MAU free) |
| Cloudflare | Free | $0 | Turnstile bot prevention, DNS |
| Stripe | 2.9% + $0.30 per transaction | Variable | Payment processing |

*Infrastructure fixed costs are approximately $0–25/month at current scale. As subscriber count grows, Vercel (function invocations) and Upstash become the first scaling levers.*

---

## Tier Economics

### Subscription Tier Margins (Text-Only Baseline)

| Tier | Price | Stripe take (~2.9% + $0.30) | Net revenue | API budget (50%) | Gross margin | Sessions/mo | Hours/mo |
|------|-------|-----|------------|-----------------|--------------|------------|---------|
| **Spark** | $5/mo | ~$0.45 | **$4.55** | ~$2.28 | ~$2.27 (~50%) | ~17 | ~6 hrs |
| **Flame** | $10/mo | ~$0.60 | **$9.40** | ~$4.70 | ~$4.70 (~50%) | ~36 | ~12 hrs |
| **Hearth** | $50/mo | ~$1.80 | **$48.20** | ~$9.55 | ~$38.65 (~80%)* | ~73 | ~24 hrs |

\* Hearth: the $49 CP membership is near-zero marginal cost. The ~$38.65 margin covers infrastructure + Shalom's time. Exceptional economics.

**Token budget formula:** `monthlyBudgetMicrodollars / 15` = output-token equivalents. This is the conservative (guaranteed) floor — actual usage is more generous because uncached input tokens cost only $3/M (1/5 the output rate). The gauge and plan cards display this number.

| Tier | Monthly budget | Token display |
|------|----------------|---------------|
| Spark | $2.28 → 2,280,000 µ$ | **152,000 tokens** |
| Flame | $4.70 → 4,700,000 µ$ | **313,000 tokens** |
| Hearth | $9.55 → 9,550,000 µ$ | **637,000 tokens** |

### Free Greeting Tier

| Item | Value |
|------|-------|
| Exchanges per session | 3 |
| Cost per free session | ~$0.04 |
| Monthly free-tier budget | $30–50 (charged to `opencosmos-main` key) |
| Sessions covered | ~750–1,250 free greetings/month |
| Classification | Marketing spend — not a cost, an investment in first impressions |

---

## Voice Economics — Feature Analysis

### Can we include voice in the current tiers?

Short answer: **No, not at ElevenLabs pricing.** Voice needs its own budget.

| Tier | API budget | Text sessions | ElevenLabs voice sessions | Assessment |
|------|-----------|--------------|--------------------------|------------|
| Spark ($5) | $2.28 | ~17 | **~1.4** | ❌ Not viable — barely one session |
| Flame ($10) | $4.70 | ~36 | **~2.9** | ❌ Not viable as included |
| Hearth ($50) | $9.55 | ~73 | **~5.9** | ⚠️ Marginal — a handful of full voice sessions |

Even Hearth can only support ~6 fully voiced sessions/month on the current API budget. Voice at ElevenLabs pricing must be modeled differently — it cannot draw from the token budget.

### Voice access models

**Option A — Separate voice-minutes allotment (recommended)**

Add a voice-minutes pool per tier, separate from the token budget. Voice exchanges cost against the voice pool; text exchanges cost against the token budget.

| Tier | Voice allotment | Cost to us | Notes |
|------|----------------|-----------|-------|
| Spark | 0 min (text only) | $0 | Voice as a differentiator for Flame+ |
| Flame | 30 min/mo (~20 voice exchanges) | ~$0.45 | 1 full voice session + a few short exchanges |
| Hearth | 120 min/mo (~80 voice exchanges) | ~$1.80 | ~8 full voice sessions — genuinely generous |

At these allotments, Flame adds ~$0.45 voice cost (still profitable: net ~$4.25 margin). Hearth adds ~$1.80 (still very profitable: net ~$36.85 margin).

**Option B — Voice as a paid add-on**

Offer voice-minutes as a separate $3–5/month add-on, any tier. Simple to price. Creates an explicit purchase moment. Less elegant for Cosmo's "choice, not gate" philosophy.

**Option C — Google WaveNet free tier pilot**

1M free chars/month = ~533 voice exchanges/month across all users. Use Google WaveNet as a voice-preview feature at lower quality, offer ElevenLabs as Hearth premium. Tests demand at zero cost.

> **Current decision:** Voice access model (A, B, or C) is unresolved — see [cosmo-voice-research.md § Open Questions](projects/cosmo-voice-research.md#open-questions). Decide before implementation starts.

### Voice implementation cost estimate

At Option A (Flame 30 min, Hearth 120 min):

| Provider | Flame add | Hearth add | Monthly voice revenue needed to break even |
|----------|-----------|-----------|-------------------------------------------|
| ElevenLabs Flash | +$0.45 | +$1.80 | 0 (covered by current margins) |
| Cartesia/Deepgram | +$0.17 | +$0.67 | 0 (even easier to absorb) |

**ElevenLabs voice is affordable at the allotments in Option A without raising prices.** The quality justifies the premium over Cartesia/Google — a mediocre-sounding Cosmo undermines the entire product.

---

## Feature Economics Template

When evaluating any new feature with API cost implications, run this analysis:

```
Feature: [name]
Cost per use: $X
Expected uses/subscriber/month: Y
Monthly cost per subscriber: $X × Y = $Z
Impact on Hearth margin ($38.65): -$Z → $[new margin]
Impact on Flame margin ($4.70): -$Z → $[new margin] — flag if margin goes negative
Decision threshold: if Flame margin drops below $2, reconsider tier access
```

**Voice (ElevenLabs, Option A Flame allotment):**
- Cost per voice exchange: $0.163
- 20 exchanges/month (Flame allotment): $3.26 total
- But! Flame exchanges = 20 voice + remaining text (still ~34 text sessions worth of budget)
- Flame margin with voice allotment: $4.70 - $0.45 = **$4.25** ✅
- Hearth margin with voice allotment: $38.65 - $1.80 = **$36.85** ✅

**AI Triad (3 LLM calls per synthesis instead of 1):**
- Cost per Triad exchange: ~$0.013 × 3 = ~$0.039 (vs $0.013 text)
- 3× cost, but Triad is invoked occasionally, not every exchange
- At 10% Triad usage: average cost/exchange = $0.013 × 0.9 + $0.039 × 0.1 = **$0.016** (23% increase)
- Impact on Flame margin: -$0.70 → **$4.00** ✅ Viable at all tiers.

---

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-14 | Spark $5 / Flame $10 / Hearth $50 pricing | ~50% gross margin target at Spark/Flame. Hearth's $50 bundles $49 CP membership — near-zero marginal cost makes it exceptional value for subscribers and exceptional margin for us. |
| 2026-03-14 | Token budget = `monthlyBudget / 15` (output-equivalent) | Conservative floor users can count on. Actual value delivered is higher because input tokens cost 5× less than output. Transparent and honest. |
| 2026-03-14 | Claude Sonnet as inference model | Best quality-to-cost ratio for Cosmo's conversational style. Sonnet 4.6 is the active model. Revisit if Claude pricing changes or a significantly cheaper model matches quality. |
| 2026-04-10 | Free tier budget: $30–50/month | Covers ~750–1,250 free greetings. Treated as marketing spend. Backed by Anthropic Console hard spend limit as circuit breaker. |
| TBD | Voice access model (A, B, or C) | Unresolved. Must decide before voice implementation. Option A (separate voice allotment, Flame+) is the recommended starting point. |
| TBD | Voice TTS provider confirmation | ElevenLabs Flash v2.5 selected for quality. Pricing viable at Option A allotments. Confirm before committing. |

---

## Related Documents

- [architecture.md](architecture.md) — Technical mechanics: microdollar encoding, Redis key structure, how the token tracker works in code
- [strategy.md](strategy.md) — Revenue philosophy: why free radiates, what the paid layer funds, revenue milestones
- [projects/cosmo-voice-research.md](projects/cosmo-voice-research.md) — Full voice provider comparison, latency research, STT options, open questions
- [lib/stripe.ts](../apps/web/lib/stripe.ts) — Source of truth for tier prices, token budgets, and features (code)
