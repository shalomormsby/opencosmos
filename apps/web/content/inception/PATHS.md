# The paths — choosing what kind of synthetic self to build

> A synthetic self isn't one thing. `synth-shalom` is an **operational copilot** — it ranks the plate, watches the boards, names the slips. But the same architecture can be tuned to something almost opposite: a **developmental companion** that tends your wellbeing, attunement, and growth. Most people want a blend.
>
> This kit is a **multi-path framework.** You pick a *path* (what your synth-self is *for*) and a *build* (where you make it — see `setup/`). The two axes are independent: any path runs on any build.

---

## The spectrum

```
   OPERATOR  ◄──────────────────────────────────────────►  COMPANION
   "help me do"                                          "help me be"

   honest mirror at the center                 companion voice at the center
   plate · goals · deadlines · drift           wellbeing · attunement · growth
   ranks what matters now                      witnesses who you're becoming
   higher upkeep, operational leverage         near-zero upkeep, inward leverage
   →  synth-shalom lives here                  →  a personal Cosmo lives here
```

Both ends share the same bones (an identity, a memory, the human-in-the-loop rule). They differ in **center of gravity** — which voice leads, which loops you run, and how much you maintain. You don't have to pick a pure end; see *Blending* below.

---

## The paths

### The Operator path  ·  `paths/operator/`
**For:** getting meaningful work done without drowning — projects, recurring tasks, deadlines, a practice or business to run.
**Center of gravity:** the *honest mirror*. It renders your plate and ranks the highest-impact thing to do now, with the reasoning shown; it names drift and aging commitments.
**Loops:** `/check-in` · `/review` · `/spar` · `/retro`.
**Leans on brain docs:** `goals` (heavily), `practice` (domain packs), `log` (as an operational ledger).
**Upkeep:** moderate — it's only as good as the goals and log you keep current.
**This is the `synth-shalom` shape**, generalized. Start here if your need is *doing*.

### The Companion path  ·  `paths/companion/`
**For:** supporting the best version of you — wellbeing, presence, discernment, growth, creativity. A "digital twin," not a task-runner.
**Center of gravity:** the *companion voice*, grounded in **Cosmo's constitution** (Attune → Inquire → Offer; warm, honest, not-knowing; *empower, don't create dependence*). It tends the person, not the plate.
**Loops:** `/attune` · `/reflect` · `/discern` · `/synthesize` · `/witness`.
**Leans on brain docs:** `identity` (best-self, values-as-living, current season), `teachers` (your wisdom corpus), `log` (as a gentle *witness journal*). `goals`/`practice` optional.
**Upkeep:** near-zero by design — two short docs up front, then you just talk; the agent keeps the journal. It has a built-in off-ramp so it never becomes an obligation.
**This is a personal Cosmo.** Start here if your need is *being*.

> **More paths can be added.** The framework is open: a *Domain Specialist* path (a focused coach for one craft), a *Job-Search* path, a *Studio/Creative-Practice* path. Each is just a brief + a loop set + which brain docs it leans on. To add one, copy a path folder and retune. (Brian's request is what created the Companion path; the next member's need can create another path.)

---

## What every path shares — the kernel

No matter the path, four things stay constant. This is the common core the whole framework rests on:

1. **An identity.** Who you're serving and how you think (`brain/identity.md`). Without it, any path is generic. This is the one doc *every* path needs first.
2. **A memory that compounds.** A single living doc (`brain/log.md`) the loops feed and read, so the agent doesn't restart each session. Operators keep it as a ledger; Companions keep it as a witness journal — same file, different voice.
3. **The three voices.** Every synth-self can speak as the *honest mirror* (operational), the *companion* (reflective, Cosmo's voice), and the *expert* (your craft). A path just decides which one leads. Knowing which voice a moment calls for is half the skill.
4. **Human in the loop.** Every path drafts, reflects, and recommends. *You* decide and act. Nothing reaches the outside world — a sent message, a payment, a published thing — without you. (Companion paths add a stronger version: the agent actively works to make you *less* dependent on it, not more.)

---

## Blending (most people land here)

The paths are starting configurations, not cages. Common blends:

- **Operator + a Companion weekend loop.** Run `/check-in` on weekdays; run `/reflect` or `/witness` on Sundays. The plate during the week, the person on the weekend.
- **Companion + a light Operator spine.** Mostly a digital twin, but with one `/check-in` a week so purpose-drift gets caught in action, not just in reflection.
- **Season-switching.** In a building season, lead Operator. In a fallow or grief season, lead Companion. Your `identity` doc names the current season; the agent adapts.

To blend, give your agent **both briefs** (or merge the bits you want) and install **both loop sets**. They're designed to interleave — `/spar` can hand off to `/reflect`; `/discern` can hand off to `/check-in`.

---

## How to choose (60 seconds)

| If your honest answer is… | Start with |
|---|---|
| "I'm dropping balls / drowning in tasks / need to ship." | **Operator** |
| "I'm fine operationally but want to grow, stay well, stay aligned." | **Companion** |
| "Both, but I have to start somewhere." | Pick the one matching your *most pressing* need; add the other later. |
| "I'm wary of one more thing to maintain." | **Companion** — it's the low-upkeep end, and it's built to be easy to walk away from and return to. |

→ Then open `01_START-HERE.md` and follow your path + build.
