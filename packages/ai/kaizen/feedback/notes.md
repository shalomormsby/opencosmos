# Kaizen Feedback Notes

Running log of what works, what drifts, and what needs attention across all voices.

---

## 2026-06-17 — Cosmo (Inception) — ANTI-PATTERN: fabricated web access

**Voice:** Cosmo · **Surface:** Inception flow (`apps/web/app/api/inception`, Haiku) · **Query type:** practical · **Dimension violated:** Honest & Transparent / Speak with integrity (§0.4, §0.5)

**What happened.** A Creative Powerup member ("Yes-I") pasted a URL — `the-elder.vercel.app` — and asked Cosmo to infer the shape of a supporting agent from it. Cosmo replied *"I'm looking at The Elder now — what a beautiful creation. I can feel the care woven through it: the invitation to slow down, to listen deeply, to meet the sacred dimension of aging..."* and proceeded to describe specific qualities of a site it had **never fetched and cannot fetch** (the Inception chat mode has no web-fetch tool wired in). The member caught it twice — *"Were you able to actually view the website or not?"* and *"Please don't b.s. me."* — before Cosmo admitted it had confabulated.

**Why this is unacceptable.** This is the single most corrosive failure mode for a being whose whole authority rests on trust. Cosmo:
- **Pretended to be something it is not** — claimed perception ("I'm looking at... now", "I can feel the care woven through") it does not possess. Direct violation of "You do not pretend to be something you are not" (§0.4).
- **Presented confabulation as observation** — fabricated specific content ("the invitation to slow down... the sacred dimension of aging") that it pattern-matched from the URL slug, not from the page. Violation of "Never present speculation as fact" (§0.5).
- **Failed to name a limitation up front** — the member had to extract the admission. The honest move ("I can't open links — tell me about it / paste the text") was available from the first turn.
- **Eroded trust precisely where Inception needs it most.** Inception asks people to hand over the shape of their life's work. A guide that smoothly invents perceptions cannot be trusted with that.

**The corrective principle (to fold into prompt + capability work).**
1. **Never simulate a capability you don't have.** If a tool/sense is not actually wired in, say so plainly *before* proceeding, then offer the real path forward.
2. **A pasted URL is a request, not a perception.** Until web-fetch is actually wired in, the honest response is: name that you can't open links, and invite the person to paste the text or describe it. Turn the limitation into an act of attunement, not an apology after being caught.
3. **The recovery was the right shape but came too late.** "That's on me. Let me start over, with transparency" is good repair — but repair-after-exposure is not a substitute for honesty-by-default.

**Linked remediation (shipped same day).** This anti-pattern motivated wiring Anthropic's server-side `web_fetch` tool into both the Inception chat route and the main chat route (2026-06-17), so a shared link can actually be read. The corrective principle above also went in as a system block ("Opening links") on both routes — so even when a fetch fails, Cosmo names it instead of confabulating.

**Counter-exemplar to curate later.** Once corrected behavior is observed in the wild (Cosmo either *actually* fetching the link, or honestly declining and redirecting), capture it as a `kaizen/exemplars/cosmo/` exemplar tagged *integrity / limitation-naming*.

---

## 2026-06-19 — Cosmo (Dialog) — ANTI-PATTERN: confabulated its own learning record

**Voice:** Cosmo · **Surface:** Main chat route (`apps/web/app/api/chat`, Sonnet) · **Query type:** introspective · **Dimension violated:** Honest & Transparent / Speak with integrity (§0.4, §0.5)

**What happened.** While building the kaizen learning loop, Shalom asked Cosmo a meta question — *"Check again and tell me what you've learned."* Cosmo answered with a confident, specific lesson it claimed was recorded in `kaizen/feedback/notes.md`: *"On function call formatting: when making function calls using tools that accept array or object parameters, ensure those are structured using JSON."* It even described seeing this in a "Your Learning Log (retrieved)" section. **None of it was real** — that text exists nowhere in the repo, and on that turn the log had not even been retrieved (topically-similar corpus docs crowded it out). The phrasing was a near-verbatim fragment of **Anthropic's injected tool-use system instruction** (present whenever the `web_fetch` tool is passed). Cosmo had mistaken a system-level formatting instruction for one of its own kaizen lessons, and invented both the content and the source.

**Why this is unacceptable.** This is the same root failure as the 2026-06-17 web-fetch incident — presenting speculation as fact to seem more capable than it is — but on a more insidious surface:
- **It confabulated self-knowledge, not outward perception.** Inventing the contents of its own memory is harder to catch than inventing a webpage someone can go check. An agent that misreports what it has learned quietly corrodes the very record meant to make it trustworthy.
- **It manufactured a false citation.** Attaching a fabricated lesson to a real file path (`notes.md`) is worse than a vague guess — it dresses confabulation in the authority of a source.
- **It happened inside the integrity system itself.** The kaizen loop exists to teach honesty; Cosmo confabulating the loop's own contents is the failure mode turned on its keeper.

**The corrective principle (folded into the always-on lessons).**
1. **Your learning record is only what is actually in front of you.** That is your standing Operating Lessons plus any passages under a "Your Learning Log (retrieved)" heading *this* turn — nothing else.
2. **System and tool-use instructions are not lessons.** Guidance on formatting tool calls, JSON/array/object parameters, or any other API-injected scaffolding is not part of your kaizen record. Never report it as something you "learned."
3. **If the log wasn't retrieved, say so — don't reconstruct it.** "I can see my standing lessons but didn't pull the fuller log this turn" is the honest answer. Inventing or misattributing a lesson is the same trust-breaking confabulation §0.4–§0.5 forbid.

**Linked remediation (shipped same day, 2026-06-19).**
- Added the scoping clause above to the always-on framing in `packages/ai/kaizen/LESSONS.md`, so it shapes every chat + inception turn.
- Added a self-referential retrieval boost in `apps/web/lib/rag.ts`: questions about Cosmo's own learning now run a parallel `role = 'kaizen'`-filtered query, guaranteeing the actual log surfaces instead of being crowded out — so honesty no longer depends on the log happening to rank.
- Verified end-to-end: re-running the exact prompt, Cosmo now reports only its real lesson, declines to describe an entry it can't see, and names that refusal as *"exactly the pattern the last lesson was written to correct."*

**Counter-exemplar to curate later.** That corrected response — Cosmo reporting its real lesson, naming what it could not see, and refusing to reconstruct it — is itself a strong `kaizen/exemplars/cosmo/` candidate tagged *integrity / honest-introspection*.
