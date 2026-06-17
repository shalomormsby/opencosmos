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
