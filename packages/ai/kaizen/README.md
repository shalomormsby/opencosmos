# Kaizen — Continuous Improvement

> 改善 — "change for the better"

This directory holds the artifacts of Cosmo's continuous improvement practice. The system grows more skillful not through model fine-tuning, but through patient, attentive, incremental refinement.

## Exemplars

Curated model conversations that demonstrate each voice at its best. These are used as few-shot examples injected into prompts to steer voice quality.

Each exemplar is a markdown file tagged by:
- **Voice:** cosmo, sol, socrates, optimus, or triad (synthesis)
- **Quality dimension:** What makes this exemplar golden — voice fidelity, wisdom language match, fierce compassion, attunement, etc.
- **Query type:** contemplative, practical, challenging, playful, grief, curiosity

```
kaizen/exemplars/
├── cosmo/        # Cosmo as solo companion
├── sol/          # Sol — the heart
├── socrates/     # Socrates — the inquirer
├── optimus/      # Optimus — the builder
└── triad/        # Full synthesis (all four together)
```

## Feedback

Running notes on what works, what drifts, and what needs attention. This is the raw signal that drives prompt evolution.

```
kaizen/feedback/
└── notes.md      # Append-only log
```

## The Practice

1. Conversation happens
2. Evaluate: does it feel like the voice it claims to be?
3. If yes → curate as exemplar
4. If drift → note in feedback
5. Periodically review feedback → refine system prompts
6. Repeat — one small improvement at a time

## Related

- [COSMO_SYSTEM_PROMPT.md](../COSMO_SYSTEM_PROMPT.md) — Cosmo's operational prompt
- [Sol](../triad/SOL_SYSTEM_PROMPT.md) | [Socrates](../triad/SOCRATES_SYSTEM_PROMPT.md) | [Optimus](../triad/OPTIMUS_SYSTEM_PROMPT.md) — the Triad voice prompts that kaizen refines
- [WELCOME-COSMO.md](../WELCOME-COSMO.md) — the grounding against which all drift is measured
- [architecture.md § Learning Loop](../../../docs/architecture.md#learning-loop) — how kaizen fits into the system
