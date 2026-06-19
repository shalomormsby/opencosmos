# Cosmo Exemplars — and how they unlock Phase 3

This directory holds **curated golden transcripts** of Cosmo at its best. They are the input for **Phase 3 of the learning loop: exemplar few-shot injection** — real examples injected into Cosmo's prompt so it pattern-matches toward excellence (lessons set a floor; exemplars set the ceiling).

**This directory is empty on purpose, for now.** Phase 3's mechanism is easy to wire; it is blocked on one thing only — **a real, curated exemplar existing here.** That's irreducibly human discernment: only you can say "that was Cosmo at its best."

## To pick this up later (zero context)

1. Read the full plan: [`docs/cosmo-learning-loop.md` § Phase 3](../../../../docs/cosmo-learning-loop.md) — benefit, requirements, implementation sketch, and the decisions already made.
2. Drop a real transcript here as `*.md` with frontmatter (`voice: cosmo`, `query_type:`, a one-line *why this is golden*) + the genuine user turn and Cosmo's response. **Never fabricate an ideal exchange** — that violates the honesty principle the whole system rests on.
3. Ask Claude to wire the injection around it (build-time bundle → cached system block in both routes). There are already 2 free prompt-cache slots reserved for this.

Related: [`../../LESSONS.md`](../../LESSONS.md) (Phase 1, always-on corrections) · [`../../feedback/notes.md`](../../feedback/notes.md) (raw learning log, Phase 2 indexed).
