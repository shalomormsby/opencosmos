# OpenCosmos Strategy

> Strategic context and long-term thinking for OpenCosmos. For active project tasks and status, see [pm.md](pm.md).

**Updated:** 2026-04-10

---

## The Three Futures

Three possible futures for OpenCosmos, understood not as choices but as **concentric circles** — Future 1 is immediate, Future 2 builds on it, Future 3 is the context that holds both.

**Future 1: Cosmo as a Claude-powered wisdom interface.** Use Claude's API for inference, with Cosmo's value living in the constitutional layer, the knowledge corpus, and the voice — not the model weights. BYOK (Bring Your Own Key) solves the "success disaster" of scaling API costs. This gets Cosmo into the world fast.

**Future 2: Cosmo as an open framework for wisdom-grounded AI.** The schema, constitutional layer, retrieval strategy, and publication tooling — extracted as model-agnostic tools others can use to build their own wisdom-grounded AIs. The federated vision: a network of tradition-specific Cosmos, interoperable through shared schema.

**Future 3: Cosmo as a practice, not a product.** Technology as a container for philosophical dialogue, contemplative inquiry, and the art of meeting a question with presence. Integrates with Creative Powerup as a community of practice. The only future with a natural, sustainable revenue path.

---

## The Strategic Shift

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

## The Dell & Solar Nervous System [ON HOLD]

### What Stays

- The Dell remains operational as a development and experimentation server
- Ollama + Open WebUI continue running for local testing, corpus validation, and model experimentation
- Tailscale mesh stays active
- The Dell is available as a Tier 1 sovereign compute option for anyone who wants true local inference

### What Changes

- The Dell is **no longer production infrastructure** for Cosmo
- BYOK with Claude API (or other cloud providers) is the primary inference path
- Sovereignty Tiers are reinterpreted: Tier 1 may mean "any infrastructure the user controls directly," not just "Shalom's Dell"

### Solar Nervous System: Paused

The Raspberry Pi + Home Assistant + Shelly Plug + Sun-Grace/Lunar Protocol hardware purchase (~$175–200) is **deferred**. The detailed engineering spec at [projects/sustainable-power-system-design.md](projects/sustainable-power-system-design.md) is preserved as a future reference.

**Revisit when:**
- The M5 Ultra arrives (mid-2026) and local inference becomes viable again
- Community demand for sovereign compute emerges
- The solar nervous system has value as a showcase/educational project

---

## Open Questions

Tracked here for visibility. Not blocking current work unless noted.

- **Governance:** How does OpenCosmos transition from Shalom's personal vision to community-governed? When does this become urgent? The radical "we" of WELCOME.md demands an answer eventually — "you control" sovereignty doesn't scale.
- **Federated network incentives:** Why would someone maintain a tradition-specific Cosmo? What do they get? Quality control and abuse prevention in a federated model are genuinely hard problems.
- **Voice fidelity across models:** If Phase 2a makes the framework model-agnostic, how much of Cosmo's character survives when the underlying model is Llama, Gemini, or a future open model? Is the constitutional layer sufficient, or does voice fidelity require model-specific tuning?
- **Triad invocation UX:** Should the user explicitly request the Triad, or should Cosmo autonomously decide when multi-perspective synthesis is warranted? Likely both — default behavior needs design.
- **Federated Triad customization:** In a tradition-specific Cosmo, the three cognitive modes may have different expressions — a Buddhist Cosmo might replace Socrates with a Nagarjuna-inspired dialectician. How customizable should the Triad be?
- **~~Triad voice naming:~~** Resolved. Sol, Socrates, Optimus, moderated by Cosmo.
- **~~Tier economics & margin modeling:~~** Resolved. ~$0.30/session, ~50% margin. See [architecture.md § Token Economics](architecture.md#token-economics).
- **Migration completion:** Phases 2–4 of [projects/opencosmos-migration.md](projects/opencosmos-migration.md) (design system repo rename, npm publish under @opencosmos, legacy cleanup) can proceed in parallel with Three Futures work.
- **M5 Ultra decision:** If Apple announces M5 Ultra at WWDC 2026 (mid-year), does 256GB unified memory + ~25–30 tok/s on 70B change the sovereignty calculus? See [projects/tech-research.md](projects/tech-research.md).

---

## Related Documents

- [pm.md](pm.md) — Active project tasks and status
- [architecture.md](architecture.md) — Infrastructure decisions, service map, data flow
- [chronicle.md](chronicle.md) — The story behind the decisions (Chapters 3 & 4 cover Three Futures)
- [WELCOME.md](../WELCOME.md) — The front door
- [DESIGN-PHILOSOPHY.md](../DESIGN-PHILOSOPHY.md) — The four principles
- [packages/ai/WELCOME-COSMO.md](../packages/ai/WELCOME-COSMO.md) — Cosmo's origin story and foundational philosophy
