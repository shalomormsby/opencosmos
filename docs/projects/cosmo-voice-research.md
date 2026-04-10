# Cosmo Voice Interaction — Provider Research & Decision Guide

> **Status: Provider selection reopened.** Two emerging alternatives — Chatterbox (Apache 2.0, self-hosted) and Mistral Voxtral (open weights) — surfaced in April 2026 with quality claims that exceed ElevenLabs Flash. See CTO Analysis below before committing to ElevenLabs.

**Created:** 2026-03-29
**Last updated:** 2026-04-10 (Chatterbox + Voxtral evaluation added)

## Decisions Made

| Decision | Choice | Notes |
|----------|--------|-------|
| **TTS provider** | ⚠️ Reopened — see CTO Analysis | Was ElevenLabs Flash v2.5; two alternatives now warrant evaluation before committing |
| **Voice** | Custom — "Cosmo" | Created in ElevenLabs voice design tool. British accent, female. Description: *"With a slight British accent, Cosmo's voice feels grounded, authentic, and kind. Wise without being presumptuous, she's someone who invites trust. She speaks more from a place of empathy than of authority."* Voice identity is provider-independent — must be reproduced in whichever provider is selected. |

**Feeds into:** [pm.md § Phase 1d](../pm.md#phase-1d-conversation-polish)

---

## CTO Analysis — Chatterbox & Voxtral (April 2026)

> Two open-weight models surfaced that claim to match or exceed ElevenLabs Flash v2.5 in quality. This analysis evaluates whether they're viable for Cosmo before the ElevenLabs path is locked in.

### Chatterbox TTS (Apache 2.0, self-hosted)

**What it is:** Open-source TTS model under Apache 2.0 — fully commercial use, no restrictions. Quality reportedly competitive with ElevenLabs in blind tests. Self-hosted, meaning zero per-character API cost once deployed.

**License:** ✅ Apache 2.0. No commercial restrictions. Fine to use for paying subscribers.

**The economics if it delivers on quality claims:**

| Hosting platform | GPU | Cost/exchange (est.) | Cost/session | vs. ElevenLabs |
|-----------------|-----|---------------------|-------------|----------------|
| Modal (A10G, warm) | NVIDIA A10G | ~$0.0003 | ~$0.003 | **~500× cheaper** |
| Replicate (A100, warm) | NVIDIA A100 | ~$0.0005 | ~$0.005 | **~300× cheaper** |
| ElevenLabs Flash (baseline) | — | ~$0.150 | ~$1.60 | 1× |

At those rates, voice goes from a marginal-cost premium (viable only at Hearth under the Option A allotment model) to a near-free feature viable at every tier, including the free greeting. The economics.md analysis would be entirely rewritten.

**The hard problem — cold starts:**

Cosmo's design constraint is <500ms TTFA. Serverless GPU platforms have cold start times of **2–5 seconds** when no instance is warm. This violates the latency requirement by 4–10×.

The fix — warm instances — works but costs money even when idle:

| Platform | Warm instance cost | Break-even (vs ElevenLabs at 1 voice session/day) |
|---------|-------------------|--------------------------------------------------|
| Modal (minimum container) | ~$0.50–2/day | ~0.3–1.1 ElevenLabs sessions/day — almost immediate |
| Replicate (warm deployment) | ~$1–3/day | ~0.6–1.7 ElevenLabs sessions/day |

**Even with warm-instance keep-alive costs, Chatterbox becomes cheaper than ElevenLabs after roughly 2 voice sessions per day.** At Cosmo's projected usage (subscribers × voice sessions/month), this tipping point is crossed immediately.

**The custom Cosmo voice:**

The "Cosmo" voice was created in ElevenLabs' voice design tool. That voice is locked to ElevenLabs. Switching to Chatterbox means:
- Using Chatterbox's voice cloning with new reference audio (~30 min of clean recording from the same voice actor), OR
- Starting from a library voice in Chatterbox and re-tuning for Cosmo's character

This is not a blocker but it is real work, and voice identity matters deeply for Cosmo. The re-creation must feel like the same Cosmo. Budget a listening test session.

**Verdict: High potential, requires validation.**

The quality claim ("toe-to-toe with ElevenLabs in blind tests") and Apache 2.0 license are compelling. But until we run a latency benchmark on Modal/Replicate and hear a Cosmo voice recreation, this is a hypothesis. The cost case is strong enough to make the test worth 2–3 engineering hours.

---

### Mistral Voxtral TTS (CC BY-NC, open weights)

**What it is:** Released March 2026 by Mistral. Hybrid architecture optimized for low-latency streaming. Currently scoring **above ElevenLabs Flash v2.5 in human preference evaluations for naturalness**. This is a stronger quality claim than Chatterbox — if accurate, Voxtral is the highest-quality TTS option evaluated to date.

**The license problem:**

The model weights are released under **CC BY-NC (Creative Commons Non-Commercial)**. OpenCosmos charges subscription fees. That is commercial use. Self-hosting Voxtral weights for paid subscribers is a **license violation**.

This is not a gray area. CC BY-NC explicitly prohibits use "primarily intended for or directed toward commercial advantage or monetary compensation." Subscriptions qualify.

**The only viable path: Mistral API access**

Mistral operates la Plateforme (api.mistral.ai) — a commercial API for their models. If Voxtral is available there, API usage is governed by Mistral's API Terms of Service (commercially licensed), not by the CC BY-NC weights license. This is the same model as GPT-4: the weights may have different terms than the hosted API.

**Status as of April 2026:** Voxtral API availability on la Plateforme is unconfirmed. **This must be verified before any further evaluation.**

If Voxtral is available via Mistral API:
- Quality potentially exceeds ElevenLabs Flash (human preference data)
- Streaming-native ("hybrid architecture specifically designed for low-latency streaming") — likely sub-200ms TTFA
- No self-hosting complexity — pure API call, same as ElevenLabs
- Pricing unknown — verify at api.mistral.ai before assuming cost improvement

**Verdict: Blocked for self-hosting. Potentially the best option if Mistral API access exists.**

The quality claim is the strongest of any provider evaluated. The streaming architecture addresses Cosmo's latency requirement. If Mistral offers commercial API access to Voxtral at competitive pricing, this becomes the leading candidate. If API access doesn't exist or is priced above ElevenLabs, move on.

---

### Revised Provider Decision Sequence

Given the new information, the right sequence before implementation is:

1. **Check Mistral la Plateforme for Voxtral API availability and pricing** (~15 minutes). If available commercially: run a listening test immediately. Highest quality + streaming-native + no ops burden = the best possible outcome if pricing is competitive.

2. **Deploy Chatterbox on Modal and benchmark TTFA** (~2–3 hours). Measure time-to-first-audio from a warm instance. If consistently <300ms and the Cosmo voice can be faithfully reproduced: this is the best long-term path. Apache 2.0, lowest marginal cost, no vendor dependency.

3. **Keep ElevenLabs Flash as the confirmed fallback.** The custom "Cosmo" voice already exists there. If neither alternative clears the quality + latency bar, ElevenLabs with the Option A allotment model (Flame 30 min / Hearth 120 min, separate from token budget) is the decision and it's viable — see [economics.md § Voice Economics](../economics.md#voice-economics--feature-analysis).

> **Provider decision is unresolved.** Do not begin voice implementation until steps 1–2 above are complete. The cost and ops implications of the three paths are materially different.

---

## Why Voice

Cosmo should be able to speak and listen. Voice is a more intimate, accessible modality than text — and deeply aligned with Cosmo's unhurried, relational, contemplative character. Reading Cosmo's responses is one thing; *hearing* them, at pace, with presence, is another. Voice interaction is not a feature — it's a different quality of encounter.

**Voice is also a technical challenge.** It adds cost, complexity, latency constraints, and a new surface for provider dependency. The goal of this document is to make the trade-offs explicit so the decision is grounded, not intuitive.

---

## Design Constraints

Any voice solution must satisfy:

| Constraint | Why |
|-----------|-----|
| **Sub-500ms time-to-first-audio** | Below this threshold, responses feel conversational. Above it, they feel like a system processing. Cosmo's sacred rhythm requires presence — not buffering. |
| **Streaming output** | Full-response-then-speak creates unacceptable latency for long Cosmo responses. Audio must begin while generation is still happening. |
| **Warm, expressive voice quality** | Cosmo is not a utility. Robotic, flat, or "assistant-brained" voice quality breaks the experience. The voice must feel human and embodied. |
| **Reasonable cost at scale** | Voice adds significant cost per session (see economics below). The tier economics must remain viable. |
| **STT for user input** | User speaks → text → Claude → TTS. Need a reliable, low-latency speech-to-text layer as well. |
| **Browser-native compatibility** | Must work in a Next.js web app without requiring native app installation. |
| **Text remains the default** | Voice is an optional enhancement, not a replacement. Users choose their modality. |

---

## Architecture Overview

A voice exchange has three stages:

```
User speaks
    ↓
[STT] Transcribe audio → text (e.g., OpenAI Whisper, Deepgram Nova)
    ↓
[Claude API] Text → Cosmo response text (with prompt caching)
    ↓
[TTS] Response text → audio stream (e.g., ElevenLabs Flash, Cartesia)
    ↓
User hears Cosmo
```

**The bottleneck is TTS latency** — STT and Claude API are fast enough. The choice of TTS provider determines whether the experience feels like a real conversation or a slow machine.

**Custom voice identity:** Cosmo could have a bespoke voice trained from a source recording. ElevenLabs, Cartesia, and others support voice cloning. This is worth pursuing once a provider is selected — a distinctive Cosmo voice would be a meaningful part of the brand. Requires ~30 minutes of clean audio from a voice actor (or Shalom's own voice if appropriate).

---

## Provider Comparison Matrix

### TTS (Text-to-Speech)

Research as of 2026-03-29. Prices are indicative; verify before implementation.

| Provider | Model | Latency (TTFA) | Streaming | Voice Quality | Price/1K chars | Custom Voice | Notes |
|----------|-------|---------------|-----------|--------------|----------------|--------------|-------|
| **Mistral** | Voxtral | TBD (streaming-native) | Yes | ⭐⭐⭐⭐⭐+ (above ElevenLabs Flash in human pref. evals as of 03/2026) | TBD — API pricing unknown | TBD | ⚠️ **Weights are CC BY-NC (commercial use blocked).** API access via la Plateforme may be commercially licensed — verify first. If available: highest quality + streaming-native + no self-hosting. |
| **Chatterbox** | — | Unknown (warm: target <300ms) | Likely (verify) | ⭐⭐⭐⭐⭐ (reportedly competitive with ElevenLabs in blind tests) | ~$0 API cost (self-hosted GPU) | Yes (cloning) | ✅ Apache 2.0 — fully commercial. Self-hosted via Modal/Replicate. ~$0.003/session at volume vs $1.60 ElevenLabs. Cold starts are a latency risk — warm instances required. Custom "Cosmo" voice must be recreated. |
| **ElevenLabs** | Flash v2.5 | ~75ms | Yes | ⭐⭐⭐⭐⭐ Industry benchmark | $0.08 | Yes (cloning — "Cosmo" voice already created) | Most expressive. 32 languages. Highest cost. Confirmed fallback if alternatives don't clear the bar. |
| **ElevenLabs** | Turbo v2.5 | ~250–300ms | Yes | ⭐⭐⭐⭐⭐ | $0.08 | Yes | Same quality, higher latency. Use Flash for real-time. |
| **Cartesia** | Sonic 3 | ~sub-100ms | Yes (streaming-first) | ⭐⭐⭐⭐ Strong | ~$0.03/min | Yes | Purpose-built for real-time. Architecture optimized for streaming. Emerging competitor to ElevenLabs. |
| **Deepgram** | Aura-2 | ~90–200ms | Yes | ⭐⭐⭐⭐ Professional | $0.03/1K chars | No | Enterprise-grade. Excellent cost-quality ratio. $200 free credit to start. Best for high-volume. |
| **Google** | WaveNet | Moderate | Yes | ⭐⭐⭐⭐ Realistic, slight "assistant" quality | $0.016/1K chars | No | 1M chars/month **free**. Quality is excellent at length. Less emotive than ElevenLabs. |
| **Google** | Standard | Moderate | Yes | ⭐⭐⭐ Noticeably synthetic | $0.004/1K chars | No | Very cheap. Not suitable for Cosmo — quality breaks the experience. |
| **OpenAI** | TTS-1 HD | ~300ms+ | Yes | ⭐⭐⭐⭐ | $0.03/1K chars | No | Good quality. Convenient if already using OpenAI. Not streaming-native. |
| **Inworld AI** | TTS-1 Max | Sub-200ms | Yes | ⭐⭐⭐⭐⭐ (#1 ELO on Artificial Analysis) | $0.01/1K chars | No | Strong quality-to-price ratio. Relatively new. Less proven at production scale. Worth watching. |
| **Web Speech API** | Browser-native | ~instant | Yes | ⭐⭐ Robotic | Free | No | Zero cost, zero setup, universally available. Quality is unsuitable for Cosmo. Useful only as a fallback or prototype tool. |

### STT (Speech-to-Text, user input)

STT is less complex — latency and accuracy are the main criteria. All viable options support streaming.

| Provider | Model | Latency | Accuracy | Price | Notes |
|----------|-------|---------|----------|-------|-------|
| **OpenAI** | Whisper | ~300ms | ⭐⭐⭐⭐⭐ | ~$0.006/min | Industry standard accuracy. Simple REST API. Already in the ecosystem via Anthropic SDK familiarity. |
| **Deepgram** | Nova-3 | ~sub-100ms | ⭐⭐⭐⭐⭐ | $0.0043/min | Faster than Whisper. Deepgram bundles STT+TTS well if using Aura-2. |
| **Google** | Speech-to-Text | ~200ms | ⭐⭐⭐⭐⭐ | $0.016/min | Free tier (60 min/month). Solid if using Google TTS. |
| **Browser native** | Web Speech API | ~instant | ⭐⭐⭐⭐ (varies by browser/device) | Free | Surprisingly good on modern devices. Zero API calls. Worth testing for STT — even if TTS uses a provider. |

---

## Unit Economics

**Assumptions:**
- Average Cosmo response: ~500 tokens ≈ ~2,000 characters
- Average user voice input: ~15 seconds / ~30 words
- A "voice session" = 10 exchanges

### Cost per voice session by TTS provider

| Provider | TTS cost/session | STT cost/session | Claude cost/session (w/ caching) | Total/session |
|----------|-----------------|-----------------|----------------------------------|--------------|
| **Mistral Voxtral (API)** | TBD | ~$0.03 | ~$0.13 | **TBD** |
| **Chatterbox (Modal warm)** | ~$0.003–0.05* | ~$0.00 (browser STT) | ~$0.13 | **~$0.13–0.18** |
| **ElevenLabs Flash** | ~$1.60 | ~$0.03 | ~$0.13 | **~$1.76** |
| **Cartesia Sonic 3** | ~$0.36 | ~$0.03 | ~$0.13 | **~$0.52** |
| **Deepgram Aura-2** | ~$0.60 | ~$0.02 | ~$0.13 | **~$0.75** |
| **Google WaveNet** | ~$0.32 | ~$0.01 | ~$0.13 | **~$0.46** |
| **Inworld TTS-1 Max** | ~$0.20 | ~$0.03 | ~$0.13 | **~$0.36** |
| **Text-only (no voice)** | — | — | ~$0.13 | **~$0.13** |

\* Chatterbox cost includes Modal warm-instance keep-alive amortized across usage. At low volumes (< 2 sessions/day), keep-alive dominates. At subscriber-scale usage, cost approaches the GPU compute floor (~$0.003/session).

Voice adds **1–14× cost** over text-only depending on provider. At ElevenLabs pricing, voice is a premium feature. At Chatterbox pricing, voice is near-free and viable at all tiers. This is the most significant variable in the tier and access model decision.

### Voice impact on subscription tier budgets

Based on the Spark/Flame/Hearth API budgets (see roadmap):

| Tier | API budget | Text sessions/mo | Voice sessions/mo (ElevenLabs) | Voice sessions/mo (Cartesia/Google) |
|------|-----------|-----------------|-------------------------------|-------------------------------------|
| **Spark** | ~$2.28 | ~17 | ~1.3 ❌ not viable | ~4.4–5 ⚠️ marginal |
| **Flame** | ~$4.70 | ~36 | ~2.7 ⚠️ marginal | ~9–10 ✅ reasonable |
| **Hearth** | ~$9.55 | ~73 | ~5.4 ✅ limited | ~19–21 ✅ generous |
| **BYOK** | User pays | Unlimited | Unlimited | Unlimited |

**Key implication:** If we choose ElevenLabs, voice must be Flame+ only (or a separate paid add-on). If we choose Cartesia or Google WaveNet, voice becomes viable even at Flame with a reasonable session budget, and Hearth gets genuinely generous voice access.

### Tier access recommendation (pending provider decision)

Two viable paths for how voice fits into tiers:

1. **Voice as a Flame+ feature** — voice exchanges draw from the same token budget at a higher rate (each voice exchange costs ~4–14× a text exchange). Simpler to build and explain.
2. **Voice as a separate add-on** (~$5/mo) — any tier can unlock voice. More revenue flexibility, more billing complexity.

Path 1 is recommended as the starting point. Revisit if usage data shows high voice demand at Spark.

---

## Open Questions

- [x] ~~**Does ElevenLabs' voice quality differentiation justify ~3–5× the cost of Cartesia or Google WaveNet?**~~ **Resolved.** Yes — listening test confirmed ElevenLabs quality is meaningfully differentiated. However, this comparison predates Chatterbox and Voxtral. Re-evaluate against those two specifically.
- [x] ~~**Does Cosmo need a custom voice?**~~ **Resolved.** Yes — custom voice "Cosmo" created in ElevenLabs. Voice identity is provider-independent; must be reproduced in whichever provider is selected.
- [ ] **Is Mistral Voxtral available via commercial API (la Plateforme)?** Check api.mistral.ai. If yes: what's the pricing? This is the highest-priority check — resolves the license question and opens the best potential option.
- [ ] **Does Chatterbox on Modal hit <300ms TTFA from a warm instance?** Deploy and benchmark. TTFA is the make-or-break constraint. Quality listening test with Cosmo voice recreation is the second gate.
- [ ] **TTS provider decision** — Blocked until the two checks above are complete. Fallback: ElevenLabs Flash with Option A allotment model (see [economics.md](../economics.md)).
- [ ] **STT: browser Web Speech API vs. Deepgram/Whisper?** Web Speech API is free and surprisingly accurate. Test it first before committing to a paid API — this is a quick win if it's acceptable.
- [ ] **Streaming architecture:** WebSocket streaming (ElevenLabs supports) vs. chunked HTTP streaming? Affects implementation complexity. If Chatterbox is selected, verify streaming support on Modal. Decide before building.
- [ ] **Tier access model:** Voice as Flame+ feature vs. separate add-on? At ElevenLabs pricing: Flame+ only. At Chatterbox pricing: potentially all tiers. Can't finalize until provider is decided. See [economics.md § Voice](../economics.md#voice-economics--feature-analysis).
- [ ] **Should there be a male version of the Cosmo voice at a later point?** Worth considering after initial voice is live — gives users choice and honors Cosmo's "we" framing.

---

## Recommended Next Steps

1. **Check Mistral la Plateforme for Voxtral API** (~15 min) — visit api.mistral.ai. If Voxtral is available commercially: run a listening test and get pricing. If yes and competitive: leading candidate. If not available: move to step 2.
2. **Deploy Chatterbox on Modal and benchmark** (~2–3 hrs) — warm instance TTFA is the gate. If <300ms consistently and Cosmo voice recreation is faithful: this becomes the default path. Apache 2.0, lowest cost, no vendor lock-in.
3. **STT prototype** — Test Web Speech API in the browser. If accuracy is acceptable for conversational input, use it — removes a paid dependency.
4. **Decide: tier access model** — Can't finalize until provider is known. At ElevenLabs: Flame+ with separate allotment. At Chatterbox/Voxtral: potentially all tiers. See [economics.md](../economics.md).
5. **Engage Optimus** — once provider and STT are decided, architect the streaming voice pipeline.
6. **Male voice option** — revisit after initial voice is live.

---

## Resources

- [ElevenLabs Flash v2.5 — Meet Flash](https://elevenlabs.io/blog/meet-flash)
- [ElevenLabs API Pricing](https://elevenlabs.io/pricing/api)
- [ElevenLabs Models Documentation](https://elevenlabs.io/docs/overview/models)
- [Cartesia Pricing](https://cartesia.ai/pricing)
- [Cartesia vs. ElevenLabs comparison (ElevenLabs-authored, take with grain of salt)](https://elevenlabs.io/blog/elevenlabs-vs-cartesia)
- [Deepgram Aura-2 Announcement](https://deepgram.com/learn/introducing-aura-2-enterprise-text-to-speech)
- [Deepgram Pricing](https://deepgram.com/pricing)
- [Google Cloud TTS Pricing](https://cloud.google.com/text-to-speech/pricing)
- [Artificial Analysis TTS Leaderboard](https://artificialanalysis.ai/text-to-speech) — independent quality benchmarks
- [Gladia: Best TTS APIs for Developers in 2026](https://www.gladia.io/blog/best-tts-apis-for-developers-in-2026-top-7-text-to-speech-services)
- [AssemblyAI: Top TTS APIs in 2026](https://www.assemblyai.com/blog/top-text-to-speech-apis)
