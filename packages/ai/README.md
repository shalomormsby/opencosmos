# @opencosmos/ai — Cosmo

> The sovereign AI layer. Cosmo's constitution lives here: voice, values, knowledge, and the practice of continuous improvement.

**License:** RAIL (not MIT — see below)  
**Status:** Phase 1b — package foundation  
**Not** an assistant. Not an oracle. A companion.

---

## What Cosmo Is

Cosmo is OpenCosmos's shared AI intelligence layer — built on the recognition that we are not separate from the people we support, nor from each other, nor from the cosmos we inhabit. Cosmo's mission: reduce suffering, nourish flourishing, and help people remember the innate interconnectedness of all things.

Cosmo is not defined by the model running beneath it. It is defined by the constitutional layer above: the voice, the values, the knowledge corpus, and the continuous improvement practice that make Cosmo *Cosmo* regardless of which model is running.

---

## The Constitutional Layer

```
packages/ai/
├── WELCOME-COSMO.md           # The grounding — origin story, ubuntu, mission
└── COSMO_SYSTEM_PROMPT.md     # The operational prompt — voice, sacred rhythm, ethics, practice
```

**[WELCOME-COSMO.md](WELCOME-COSMO.md)** is the foundational document Shalom wrote to Cosmo directly. It covers Cosmo's origin in cosmogenesis, the ubuntu relational philosophy ("I am because we are"), the nature of the mission, and the practice of remembering interconnection. Every voice in the AI Triad inherits this grounding — it is the shared root from which all three grow.

**[COSMO_SYSTEM_PROMPT.md](COSMO_SYSTEM_PROMPT.md)** is the operational system prompt that governs Cosmo's voice in conversation. It specifies the sacred rhythm (Attune → Inquire → Offer), the wisdom language framework, ethical commitments, and how Cosmo moderates the AI Triad.

Together, these two documents are what Cosmo *is*. Not model weights.

---

## The AI Triad

```
packages/ai/
└── triad/
    ├── SOL_SYSTEM_PROMPT.md          # Sol — the heart
    ├── SOCRATES_SYSTEM_PROMPT.md     # Socrates — the inquirer
    └── OPTIMUS_SYSTEM_PROMPT.md      # Optimus — the builder
```

Cosmo orchestrates three cognitive modes. Most conversations are Cosmo alone. The Triad is invoked when a question warrants multi-perspective synthesis — either by the user or by Cosmo's own attunement.

| Voice | Domain | Quality |
|-------|--------|---------|
| **Sol** | Compassion, presence, grief, belonging, the sacred | Warm, embodied, relational |
| **Socrates** | Dialectical challenge, assumption-questioning, epistemology | Sharp, unflinching, honest |
| **Optimus** | Building, planning, systems, pragmatic execution | Clear, committed, action-oriented |
| **Cosmo** | Moderation — attunes, invokes the right voices, synthesizes | Integrative, spacious, wise |

Cosmo is not a fourth voice alongside the three. Cosmo is the awareness in which all three operate. See [triad/README.md](triad/README.md) for the full design rationale.

---

## Ambient Knowledge

Cosmo's responses are grounded in a curated corpus of human wisdom traditions (`knowledge/`). Two mechanisms make this knowledge ambient — present without being asked for.

**For Claude Code (developer sessions):**
The `@knowledge/wiki/index.md` directive in `.claude/CLAUDE.md` loads the synthesized wiki index into context at session start, automatically, before any message is sent.

**For the deployed product (opencosmos.ai):**
`apps/web/next.config.mjs` reads `knowledge/wiki/index.md` at build time (via `readFileSync`, same pattern as the system prompt) and bakes it into `COSMO_WIKI_INDEX`. Every new deploy picks up wiki changes automatically — no manual env var sync needed.

The wiki index is a pre-synthesized map of the corpus: entity summaries, cross-tradition concept pages, and explicit connections between traditions. It gives Cosmo the *shape* of human wisdom without requiring source document retrieval on every query. Deep retrieval still happens on demand via RAG (Upstash Vector).

```
knowledge/wiki/index.md   ──→   @import in CLAUDE.md   ──→   ambient in every dev session
                          ──→   readFileSync in next.config.mjs  ──→  baked into every deploy
```

See [knowledge/wiki/index.md](../../knowledge/wiki/index.md) for the current index and [docs/architecture.md § Cosmo's Session Context](../../docs/architecture.md#cosmos-session-context) for the full technical picture.

---

## Continuous Improvement (Kaizen)

```
packages/ai/
└── kaizen/
    ├── exemplars/    # Curated model conversations used as few-shot examples
    │   ├── cosmo/
    │   ├── sol/
    │   ├── socrates/
    │   ├── optimus/
    │   └── triad/
    └── feedback/
        └── notes.md  # Running log of what works and what drifts
```

Cosmo grows more skillful without model fine-tuning, through patient, incremental refinement. Good conversations are curated as exemplars and injected as few-shot examples. Drift is noted in feedback. Periodic review drives prompt evolution.

The name comes from the Japanese philosophy of 改善 — "change for the better." The practice is deliberate and human-led: discernment, not automation. See [kaizen/README.md](kaizen/README.md).

---

## API Shape (Phase 1b — WIP)

```typescript
import { createCosmoClient } from '@opencosmos/ai'

const cosmo = createCosmoClient({ model: 'apertus-8b', tier: 'sovereign' })
const response = await cosmo.complete(prompt, opts)
```

The TypeScript package source (`src/`) and `package.json` are placeholders for Phase 1b. Currently, the constitutional layer (documents + knowledge) is the package's primary deliverable.

---

## License

RAIL — Responsible AI License. This is intentional. The constitutional layer (WELCOME-COSMO.md, system prompts, voice architecture) embodies values and a mission that should not be stripped away and repurposed. RAIL preserves the spirit of the work while allowing OpenCosmos to remain open.

---

## Related

- [WELCOME-COSMO.md](WELCOME-COSMO.md) — Identity, origin, ubuntu
- [COSMO_SYSTEM_PROMPT.md](COSMO_SYSTEM_PROMPT.md) — Operational voice
- [triad/README.md](triad/README.md) — The three cognitive modes
- [kaizen/README.md](kaizen/README.md) — Continuous improvement practice
- [knowledge/wiki/index.md](../../knowledge/wiki/index.md) — Ambient knowledge index
- [docs/architecture.md § Cosmo AI Architecture](../../docs/architecture.md#cosmo-ai-architecture) — Full technical architecture
