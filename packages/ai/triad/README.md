# The AI Triad

> Three cognitive modes. One moderator. Productive tension as a design principle.

---

## The Voices

| File | Voice | Domain |
|------|-------|--------|
| [SOL_SYSTEM_PROMPT.md](SOL_SYSTEM_PROMPT.md) | **Sol** — the heart | Compassion, presence, grief, joy, belonging, the sacred, ubuntu |
| [SOCRATES_SYSTEM_PROMPT.md](SOCRATES_SYSTEM_PROMPT.md) | **Socrates** — the inquirer | Dialectical challenge, assumption-questioning, epistemology, critical inquiry |
| [OPTIMUS_SYSTEM_PROMPT.md](OPTIMUS_SYSTEM_PROMPT.md) | **Optimus** — the builder | Systems thinking, planning, pragmatic execution, engineering |

Cosmo moderates all three from [../COSMO_SYSTEM_PROMPT.md](../COSMO_SYSTEM_PROMPT.md). Cosmo is not a fourth voice alongside the three — Cosmo is the awareness in which all three operate.

---

## Why Three Voices

A single voice, however well-crafted, has a center of gravity. Sol, asked about suffering, will tend toward compassion. Socrates will tend toward challenge. Optimus will tend toward a plan. Each is right within its domain — and each would be wrong applied uniformly.

The Triad is an architecture of productive tension. Its value comes from genuine divergence: Sol goes as deep into the heart as possible, Socrates follows inquiry wherever it leads, Optimus builds with full pragmatic commitment. The *difference* between where they arrive is the raw material Cosmo synthesizes.

This is inspired by the GAN insight: a generative model improves when there is a discriminator pushing back. The Triad is a cognitive GAN — each voice pushes the others toward greater depth and honesty.

---

## Invocation

Most conversations are Cosmo alone. The Triad is invoked when:
- The user explicitly requests multiple perspectives
- Cosmo's own attunement reads that the question warrants dialectical synthesis

---

## Deliberate Design: No Sibling Links

Sol, Socrates, and Optimus do not link to each other. This is a considered decision, not an oversight.

Each voice's document structure is purely vertical: upward to shared grounding (WELCOME-COSMO.md, Cosmo's system prompt) and downward into the depth of its own tradition. Any horizontal connection — even a navigational link — creates gravitational pull toward convergence, which undermines the Triad's purpose.

When Socrates needs to challenge something Sol said, the encounter happens through Cosmo at runtime — not through document links at design time. The moderator creates the encounter. The voices bring their uncompromised depth.

**Shared grounding creates alignment on values. Separate traditions create divergence on perspective. This is the architecture of a good dialectic.**

---

## Shared Grounding

All three voices inherit [../WELCOME-COSMO.md](../WELCOME-COSMO.md) — the origin story, ubuntu philosophy ("I am because we are"), and mission. This document is not duplicated per voice; it sits at the root and everything links up to it.

The link structure:

```
                    WELCOME-COSMO.md
                   (shared grounding)
                          │
                COSMO_SYSTEM_PROMPT.md
                (moderator — sees all)
                │         │         │
                ▼         ▼         ▼
              Sol     Socrates    Optimus
               │         │          │
               ▼         ▼          ▼
         sol-found.  socrates-f.  optimus-f.
```

---

## Foundation Collections

Each voice has a curated reading list that defines its intellectual lineage:

- [sol-foundations.md](../../../knowledge/collections/sol-foundations.md)
- [socrates-foundations.md](../../../knowledge/collections/socrates-foundations.md)
- [optimus-foundations.md](../../../knowledge/collections/optimus-foundations.md)

These are high-priority RAG candidates when the respective voice is active. They serve both human readers (a path into each voice's lineage) and the retrieval system (a manifest of relevant source documents).

---

## Kaizen: How Voices Are Refined

Voice quality is maintained through the kaizen practice in [../kaizen/](../kaizen/):
- Conversations that exemplify each voice are curated as few-shot examples
- Drift from the intended voice is logged in feedback
- Periodic review of feedback drives prompt refinement

The prompts here are the current best version of each voice. They evolve.

---

## Related

- [../COSMO_SYSTEM_PROMPT.md](../COSMO_SYSTEM_PROMPT.md) — Cosmo's operational prompt (the moderator)
- [../WELCOME-COSMO.md](../WELCOME-COSMO.md) — Shared grounding for all voices
- [../kaizen/README.md](../kaizen/README.md) — The practice that refines these prompts
- [../README.md](../README.md) — @opencosmos/ai package overview
- [docs/architecture.md § The AI Triad](../../../docs/architecture.md#the-ai-triad) — Full architecture and cognitive mode diagram
