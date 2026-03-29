# Cosmo Voice Interaction — Provider Research & Decision Guide

> **Status: Provider and voice selected.** ElevenLabs Flash v2.5 with a custom voice named "Cosmo". Implementation decisions (streaming architecture, STT, tier access model) remain open. See Open Questions below.

**Created:** 2026-03-29
**Last updated:** 2026-03-29 (voice selected)

## Decisions Made

| Decision | Choice | Notes |
|----------|--------|-------|
| **TTS provider** | ElevenLabs Flash v2.5 | Selected after ~2 hours of listening tests across providers |
| **Voice** | Custom — "Cosmo" | Created in ElevenLabs voice design tool. British accent, female. Description: *"With a slight British accent, Cosmo's voice feels grounded, authentic, and kind. Wise without being presumptuous, she's someone who invites trust. She speaks more from a place of empathy than of authority."* |
**Feeds into:** [three-futures-roadmap.md § 1d Voice Interaction](./three-futures-roadmap.md#1d-conversation-experience-polish)

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
| **ElevenLabs** | Flash v2.5 | ~75ms | Yes | ⭐⭐⭐⭐⭐ Industry benchmark | $0.08 | Yes (cloning) | Most expressive. 32 languages. Highest cost. 1M free chars/mo on paid plans. |
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
| **ElevenLabs Flash** | ~$1.60 | ~$0.03 | ~$0.13 | **~$1.76** |
| **Cartesia Sonic 3** | ~$0.36 | ~$0.03 | ~$0.13 | **~$0.52** |
| **Deepgram Aura-2** | ~$0.60 | ~$0.02 | ~$0.13 | **~$0.75** |
| **Google WaveNet** | ~$0.32 | ~$0.01 | ~$0.13 | **~$0.46** |
| **Inworld TTS-1 Max** | ~$0.20 | ~$0.03 | ~$0.13 | **~$0.36** |
| **Text-only (no voice)** | — | — | ~$0.13 | **~$0.13** |

Voice adds **3–14× cost** over text-only, depending on provider. This is the most significant variable in tier pricing.

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

- [x] ~~**Does ElevenLabs' voice quality differentiation justify ~3–5× the cost of Cartesia or Google WaveNet?**~~ **Resolved.** Yes — listening test confirmed ElevenLabs quality is meaningfully differentiated. Provider selected.
- [x] ~~**Does Cosmo need a custom voice?**~~ **Resolved.** Yes — custom voice "Cosmo" created in ElevenLabs. See Decisions Made above.
- [ ] **Should there be a male version of the Cosmo voice at a later point?** The current voice is female-presenting. A male version would give users a choice and broaden the sense that Cosmo transcends any single gender identity — which aligns with the "we" framing in Cosmo's philosophy. Worth considering once the initial voice implementation is live and tested.
- [ ] **STT: browser Web Speech API vs. Deepgram/Whisper?** Web Speech API is free and surprisingly accurate. If STT accuracy is acceptable, this removes one API dependency. Worth testing first before committing to a paid STT API.
- [ ] **Streaming architecture:** Does the UI need to implement WebSocket streaming (ElevenLabs supports this) or is chunked HTTP streaming sufficient? This affects implementation complexity — decide with Optimus before building.
- [ ] **Tier access model:** Voice as Flame+ tier feature (Path 1) or separate add-on (Path 2)? Decide before implementation starts. See unit economics section for the cost implications of each path.

---

## Recommended Next Steps

1. ~~**Listening test**~~ — Done. ElevenLabs Flash v2.5 selected. Custom voice "Cosmo" created.
2. **STT prototype** — Test Web Speech API in the browser with a simple recording. If accuracy is acceptable for conversational input, use it and save the STT API cost.
3. **Decide: tier access model** — Voice as Flame+ feature (Path 1) or separate add-on (Path 2)? See unit economics above.
4. **Engage Optimus** — once STT and tier decisions are made, Optimus can architect the streaming voice pipeline (ElevenLabs Flash WebSocket streaming into the Cosmo conversation endpoint).
5. **Revisit: male voice option** — after initial voice is live and tested with CP members.

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
