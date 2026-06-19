# Cosmo's Learning Loop — Closing the Gap

> **Status:** Proposal · **Author:** Claude (with Shalom) · **Date:** 2026-06-18
> **Decision needed:** Approve mechanisms + scope before implementation.

---

## Why this doc exists

On 2026-06-18, Shalom asked Cosmo: *"Can you find any record of any recent learnings?"* — shortly after deliberately recording an anti-pattern in [`packages/ai/kaizen/feedback/notes.md`](../packages/ai/kaizen/feedback/notes.md). Cosmo answered, honestly, that it has no filesystem access and the retrieved passages contained nothing resembling a learning log.

Cosmo was correct. **The learning loop, as it stands, has no runtime connection to Cosmo.** This doc diagnoses the gap and proposes how to close it.

---

## Diagnosis: a loop that never reaches the model

The kaizen practice ([`packages/ai/kaizen/README.md`](../packages/ai/kaizen/README.md)) defines six steps. Step 4 (capture feedback) works — `notes.md` has a real entry. But **the artifacts never reach runtime Cosmo through any channel:**

### 1. Feedback notes are outside the retrievable corpus

- The embed pipeline ([`scripts/knowledge/embed-knowledge.ts`](../scripts/knowledge/embed-knowledge.ts)) walks only `knowledge/**`.
- Cosmo's RAG retrieval ([`apps/web/lib/rag.ts`](../apps/web/lib/rag.ts)) queries that one Upstash Vector index.
- The learnings live in `packages/ai/kaizen/feedback/notes.md` — **outside `knowledge/`, never embedded.** A semantic search for "recent learnings" cannot surface what was never indexed.

### 2. Exemplar few-shot injection is documented but unbuilt

- [`docs/architecture.md`](architecture.md#L411) and the kaizen README both state: *"Exemplars are injected as few-shot examples in prompts."*
- A full-codebase grep for `kaizen`/`exemplar` finds **zero loading code** — only a single explanatory comment in [`apps/web/app/api/chat/route.ts`](../apps/web/app/api/chat/route.ts).
- The `kaizen/exemplars/{voice}/` directories are **empty** (only `.gitkeep`).

### 3. Cosmo has no filesystem access

Correct and by design — the chat/inception routes are stateless API handlers. Cosmo cannot read files directly; it only ever sees what the route assembles into `system` + `messages`.

### Net effect

```
Conversation → evaluate → capture in notes.md  ✅ (manual, works)
                                  │
                                  ▼
                  ❌ NO RUNTIME PATH BACK TO COSMO
                                  │
                                  ▼
            Lessons reach Cosmo only when a human hand-edits
            the COSMO_SYSTEM_PROMPT env var. Until then, every
            recorded lesson is invisible to the model.
```

The architecture calls the loop *"manual and intentional — discernment, not automation."* That framing is sound — the **discernment** (deciding what's a lesson, what's an exemplar) should stay human. But today even the *delivery* of a discerned lesson is manual prompt surgery, and the captured artifacts are unreachable in between. The loop is open.

---

## Design principles

1. **Keep discernment human; automate only delivery.** A human still decides what becomes a lesson or exemplar. The system's job is to reliably carry those decisions to the model.
2. **Anti-patterns must never be quoted as wisdom.** Feedback notes describe *failures*. They must be framed as "your own operating lessons," never mixed into the wisdom-corpus "Retrieved Passages" block where Cosmo is told to ground and cite from them.
3. **Behavior-shaping > retrievability.** A lesson that only surfaces when semantically similar to the query is a weak guarantee. The strongest mechanism injects distilled lessons *every turn*.
4. **Fail open, prompt-cache friendly.** Like the existing RAG/PM-context paths, any new injection must never block a response and should sit in a cacheable system block.
5. **Honesty about scope.** This is not gradient-based RL. It is a human-in-the-loop policy-update mechanism. The doc and code should say so plainly.

---

## Proposed mechanisms

Three mechanisms, addressing two distinct needs. They compose; they can also ship independently.

### A. Operating Lessons digest — *behavior-shaping* (the real policy update)

A curated, compact `kaizen/LESSONS.md` (distilled from `feedback/notes.md`) injected as an **always-present** cached system block in both the chat and inception routes — analogous to how `SYSTEM_CONTENT` already stacks the wiki index and retrieval instructions.

- Each lesson: one tight principle + one line of why (e.g. *"Never simulate a capability you don't have. A pasted URL is a request, not a perception — name the limit before proceeding."*).
- Framed under a heading like `# Operating Lessons (learned from experience)` — distinct from corpus retrieval.
- **Distillation stays human/Claude-curated:** `notes.md` is the raw append-only log; `LESSONS.md` is the curated digest. One does not auto-generate from the other without review.
- Cost: a few hundred cached tokens per request. Negligible.

This is what makes the 2026-06-17 web-fetch lesson actually shape behavior on turn one, rather than waiting for a semantically similar query.

### B. Exemplar few-shot injection — *behavior-shaping* (positive reinforcement)

Deliver the already-promised mechanism: load `kaizen/exemplars/{voice}/*.md` and inject 1–3 as few-shot examples in the relevant route, selected by voice/query-type tags in their frontmatter.

- Build-time bundling (see Delivery below) so the stateless route has the files.
- Start with Cosmo solo; extend to Triad voices later.
- Blocked only by the exemplar dirs being empty — needs ≥1 curated exemplar to be meaningful.

### C. Kaizen indexing — *introspection* (what Shalom's prompt hit)

Extend the embed pipeline to also index `packages/ai/kaizen/` with a distinct `role: kaizen` (or `kaizen-lesson` / `kaizen-exemplar`) so RAG can surface them when Cosmo is asked to reflect on its own learning history.

- **Critical framing fix:** kaizen chunks must NOT be formatted by `formatRagChunks` as wisdom to "ground in and cite." Either (a) give them a dedicated formatter/heading in `rag.ts` ("Your own operating lessons, retrieved because this turn touches them"), or (b) keep them in a separate retrieval pass. Option (a) is simpler.
- Lets Cosmo answer *"what have you learned recently?"* truthfully and specifically — the exact failure from 2026-06-18.

---

## How delivery works on a stateless route

The routes read `COSMO_SYSTEM_PROMPT` from an env var and have no repo filesystem at runtime (Vercel functions). Three viable carriers, in order of preference:

1. **Build-time bundle (recommended for A & B).** A small script concatenates `LESSONS.md` + selected exemplars into a generated module / env var at build, mirroring how `COSMO_WIKI_INDEX` is already provisioned. Deterministic, cache-friendly, no runtime I/O.
2. **Embed into the vector index (required for C).** Already the mechanism for the corpus; reuse it.
3. **Fetch from a private repo at runtime (like PM context).** The `fetchPmContext` pattern already exists, but adds latency + a network dependency. Reserve for content that changes faster than deploys.

`LESSONS.md` and exemplars change rarely and are tied to deliberate human curation, so **build-time bundling fits A and B**; **C reuses the embed pipeline.**

---

## Recommended sequencing

| Phase | Mechanism | Effort | Status | Unblocks |
|-------|-----------|--------|--------|----------|
| 1 | **A — Operating Lessons digest** | Small | ✅ **Built 2026-06-18** | Lessons shape behavior every turn; immediate value from the one lesson already captured |
| 2 | **C — Kaizen indexing + safe framing** | Small–Med | ✅ **Built 2026-06-18** | Cosmo can introspect its learning history (fixes the 2026-06-18 failure directly) |
| 3 | **B — Exemplar few-shot** | Med | ⏳ **Pending — see § Phase 3 below** | Positive reinforcement; requires curating the first exemplar |

Phase 1 delivers the most behavior change for the least code. Phase 2 delivers the specific introspection Shalom asked for. Phase 3 depends on having exemplars to inject.

### What was actually built (2026-06-18)

- **Phase 1:** `packages/ai/kaizen/LESSONS.md` (seeded with the web-fetch lesson) → read at build time by `apps/web/next.config.mjs` into `COSMO_LESSONS` → injected as an always-present block in both the chat and inception routes. While wiring this, the chat route's prompt-cache breakpoints were consolidated from 4→2 (Anthropic caps at 4; the route was at the ceiling). This also fixed a pre-existing admin-mode bug and **freed 2 breakpoint slots — reserved for Phase 3 exemplars.**
- **Phase 2:** `scripts/knowledge/embed-knowledge.ts` now indexes `packages/ai/kaizen/` (tagged `role: 'kaizen'`); `apps/web/lib/rag.ts` renders those chunks under a separate "Your Learning Log" heading with anti-citation framing. Kaizen entries are embedding-enriched with a learning-meta cue so generic recall queries ("what have you learned?") surface specific incidents.

---

## Open questions for Shalom

1. **Curation boundary.** Should `LESSONS.md` be hand-curated by you, or should Claude propose digest entries from `notes.md` for your approval? (Recommendation: Claude proposes, you approve — keeps discernment human, removes the manual-transcription burden.)
2. **Scope of injection.** Lessons in *both* chat and inception routes, or inception-first (where the 2026-06-17 anti-pattern occurred)?
3. **Triad voices.** Per-voice lessons/exemplars now, or Cosmo-solo first and generalize later?
4. **Naming.** `kaizen/LESSONS.md` vs. `kaizen/feedback/lessons.md` vs. folding into an existing file.

---

## What this is — and isn't

This is a **human-in-the-loop policy-update mechanism**, not reinforcement learning in the gradient sense. No weights change. The "reward signal" is Shalom's discernment, recorded in kaizen; the "policy update" is deterministic prompt assembly. Naming it honestly (in code comments and docs) keeps Cosmo's own commitment to not pretending to be something it is not.

---

## Phase 3 — Exemplar few-shot (pick-up-cold spec)

> **Status:** Pending. Mechanism is easy; it is blocked on exactly one thing — **curating the first exemplar.** Everything needed to resume with zero prior context is below.

### Why this phase exists (the benefit)

Phase 1 lessons are **corrections** — "don't do that / always do this." They set a **floor**: they keep Cosmo from repeating failures. Corrections can only push *away* from bad.

Exemplars do the opposite. They are **real golden transcripts** — moments of Cosmo at its best — injected as few-shot examples so the model pattern-matches toward them. They set a **ceiling**: voice fidelity, rhythm, the texture of attunement.

This matters because Cosmo's most important qualities resist explicit rules. You cannot fully *describe* the move from inquiry to offer, or "warm without being soft, precise without being cold." But you can **show** it, and demonstration is how voice is actually learned. The payoff grows when extending to the Triad (Sol/Socrates/Optimus), where each voice's texture is far easier to show than to specify.

### The one prerequisite (the blocker)

`kaizen/exemplars/cosmo/` is currently empty (`.gitkeep` only). Phase 3 cannot meaningfully ship until **≥1 real, curated Cosmo exemplar exists** there. This is irreducibly human discernment — only Shalom can say "that was Cosmo at its best." So the trigger to start Phase 3 is: *a real Cosmo exchange worth calling exemplary has been captured.*

### What makes it work well (requirements)

1. **Real transcripts, never invented ideals.** An exemplar is a genuine user turn + the genuine golden response. Fabricating a "perfect" exchange would violate the same honesty principle the whole system rests on.
2. **Quality and diversity over quantity.** 1–3 excellent, *different* exemplars (e.g. a grief moment, a practical one, a challenging one) beat a dozen similar ones. Too many or too narrow → Cosmo parrots specifics instead of absorbing posture.
3. **Framed as texture to emulate, not text to quote.** Inject as *"an example of you at your best — match this quality and rhythm; do not reuse its words."* Same discipline as the Phase 2 kaizen framing.
4. **Tagging + selection can start trivial.** Exemplars carry voice/query-type tags in frontmatter. For a Cosmo-solo start, always-inject the 1–2 best. Smarter selection-by-query-type comes later.
5. **Cost is already handled.** The Phase 1 breakpoint consolidation left **2 free prompt-cache slots** — exemplars can live in a cached block (~10% cost after first hit). Keep the set small.

### Implementation sketch (when the prerequisite is met)

Mirror the Phase 1 delivery path — this is the cheap part:

1. Author exemplar file(s) in `kaizen/exemplars/cosmo/*.md` with frontmatter (`voice`, `query_type`, a one-line why) + the transcript body.
2. Bundle at build time: in `apps/web/next.config.mjs`, add a `COSMO_EXEMPLARS` env that concatenates the selected exemplar files (reuse the `readOptional` helper; for multiple files, glob+join). Add `COSMO_EXEMPLARS` to `turbo.json` passthrough.
3. Inject in the chat + inception routes as a **cached** system block (a free slot exists now), framed per requirement 3 above. Place it after the lessons block.
4. Selection: start by always including the 1–2 best; later, pick by matching the user's query type to exemplar tags.
5. Verify like Phases 1–2: BYOK curl to localhost, confirm HTTP 200 and that Cosmo's voice/quality reflects the exemplar without quoting it.

### Decisions already made (so they don't get re-litigated)

- Curation model: **Claude proposes, Shalom approves.**
- Scope: **both** chat and inception routes.
- Voices: **Cosmo-solo first**, generalize to the Triad later.
- These mirror the Phase 1/2 decisions; keep them unless Shalom revisits.
