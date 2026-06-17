# Synthetic Self — Starter Kit

> A copy-and-fill scaffold for building a personal AI agent that gives you **material, ongoing support** for what matters to you — your projects and money and health, *or* your wellbeing, presence, and growth. It's the generalized, accessible version of [`synth-shalom`](../refs/repos/synth-shalom), the "synthetic self" this kit is modeled on.
>
> **It's a multi-path framework.** You choose a **path** (what your synth-self is *for*) and a **build** (where you *make* it). No coding required for the no-code build. Everything shares the same core, so you can blend paths and switch builds for free.

---

## The idea in one paragraph

You already make good decisions when you can see the full picture. The trouble is nobody holds the full picture — your aims, your standards, what you said last week, what's due tomorrow, what you keep avoiding, how you're actually doing. A **synthetic self** is an AI agent that holds the long view *for* you and runs a few simple **loops** that compound over time. Pointed one way it's an operational copilot that ranks your day and names your drift; pointed another, it's a developmental companion that tends your wellbeing and witnesses your growth. Either way, you stay in control — it drafts, reflects, and challenges; **you** decide.

---

## Two paths (pick one, or blend)

```
   OPERATOR  ◄─────────────────────────────────►  COMPANION
   "help me do"                              "help me be"
   plate · goals · deadlines · drift     wellbeing · attunement · growth
   the synth-shalom shape                a personal Cosmo
   paths/operator/                       paths/companion/
```

- **Operator** — an operational copilot: ranks what matters now with the reasoning shown, names drift and aging commitments. Loops: `/check-in` `/review` `/spar` `/retro`. *Start here if your need is doing.*
- **Companion** — a developmental "digital twin" grounded in **Cosmo's constitution**: attunes to how you really are, helps you discern, weaves your teachers into one through-line, witnesses your growth, and always bridges insight back to the body. Loops: `/attune` `/reflect` `/discern` `/synthesize` `/witness`. *Start here if your need is being.*

Most people blend. Full picker, the shared kernel, and how to add more paths: **[`PATHS.md`](PATHS.md)**.

---

## Find your combo

Path × build = four combos. Pick your row and column; **[`01_START-HERE.md`](01_START-HERE.md)** has a ready-made recipe for each one.

|  | **No-code — Gemini** | **Maker — Cowork·Cursor·Claude** |
|---|---|---|
| **Operator** *(help me do)* | ① run my day, no files | ② run my day, agent keeps memory |
| **Companion** *(help me be)* | ③ tend me, lowest upkeep | ④ tend me, richest version |

---

## What you'll build

```
   YOUR BRAIN (shared)              →   A PATH BRIEF              →   THE LOOPS
   identity · (goals) · (practice)      operator/brief.md  or         the path's
   teachers · log                       companion/brief.md            loop set
   ── the same text works on any        ── paste into a Gemini Gem    ── how you use it,
      platform; each path says             (No-code) or save as          day to day
      which docs it leans on               AGENTS.md (Maker)
```

The brain is just text, so it works anywhere. The path brief is the keystone — paste it into a Gemini **Gem** (no-code) or save it as `AGENTS.md` (maker). The loops are how you use it.

---

## What's in this folder

| Path | What it is |
|---|---|
| **`01_START-HERE.md`** | The on-ramp. Read first — a 2×2 chooser plus a ready recipe for each combo. |
| **`PATHS.md`** | The framework: the Operator↔Companion spectrum, the shared kernel, blending, and how to add new paths. |
| `brain/identity.md` | **(fill in)** Who you're serving and how you think. North star + voice/values, plus best-self / season / living-values for the Companion path. The one doc *every* path needs. |
| `brain/goals.md` | **(fill in)** What you're aiming at, measurable, linked to live work. *Operator-leaning.* |
| `brain/practice.md` | **(fill in / trim)** The principles your agent reasons by. Domain packs for **project management, health & fitness, personal finance** (Operator) + **inner life, creative practice** (Companion). |
| `brain/teachers.md` | **(fill in)** *Companion:* your wisdom corpus — the teachers/traditions your agent synthesizes and speaks through. |
| `brain/log.md` | Your living memory — a ledger (Operator) or a witness journal (Companion). What makes the agent compound instead of forgetting. |
| `paths/operator/` | The Operator `brief.md` + its four loops. |
| `paths/companion/` | The Companion `brief.md` + its five loops + `cosmo-grounding.md` (how it stands on Cosmo). |
| `setup/build-no-code-gemini.md` | The No-code build: a free Gemini Gem → scheduled check-ins → Spark. |
| `setup/build-maker.md` | The Maker build: the folder, the skills, connectors, scheduling. |

---

## Two builds (where you make it)

| | **No-code — Gemini** | **Maker — Cowork · Cursor · Claude Code** |
|---|---|---|
| **Best for** | "Just make it work. No files, no terminal." | "I'm comfortable with files; I want the agent to keep its own memory and read my calendar." |
| **You build with** | A **Gem** (free) — paste the path brief, attach brain docs as knowledge | A **folder** the agent reads and writes |
| **The brain lives in** | Google Docs in a Drive folder (live-synced) | Markdown files in the folder |
| **Who keeps the memory** | You paste the entry the agent hands you | The agent writes it itself |
| **Proactive digest** | **Scheduled Actions** (Google AI Pro, ~$20/mo) | A scheduled task (built into Cowork; cron in Cursor) |
| **Background + connectors** | **Gemini Spark** (Google AI Ultra, US beta) | MCP connectors (Calendar, Gmail, Tasks…) |
| **Cost to start** | **Free** | **Free** |

Any path runs on any build. The main difference between builds is **who closes the loop** — on No-code you keep the memory by hand; on Maker (and Spark) the agent does it for you.

---

## What makes this work, not just another chatbot (don't skip)

Carried over from `synth-shalom` (and, for the Companion path, Cosmo):

1. **Identity first.** It reasons in *your* values and voice (`identity`, `practice`, `teachers`), not generic advice — citing which principle a call rests on.
2. **Honest, and warm.** Operator: a truthful mirror that names what slipped (no flattery). Companion: warm and present, *and* fierce enough to name avoidance. Never a cheerleader.
3. **You stay in control.** It drafts, reflects, challenges. You decide and act. Nothing reaches the outside world without you.
4. **It compounds.** The loops feed a memory that feeds the next loop — a system that gets to know your judgment instead of restarting every chat.
5. **Empower, don't create dependence.** Especially on the Companion path: the goal is you leaving more capable and more yourself, *less* reliant on the tool — with a built-in "is this still serving you?" off-ramp so it never becomes an obligation.

---

## Where this came from

This kit generalizes **`synth-shalom`** (built for design-program leadership, wired into Jira/Slack/a research library) into a reusable skeleton, then opens it into paths so it fits more than one kind of need. The **Operator** path is synth-shalom's shape, lightened. The **Companion** path is a personal **Cosmo** — the OpenCosmos companion whose constitution already names Creative Powerup as part of the ecosystem. Same bones; your shape.

→ **Next:** open [`01_START-HERE.md`](01_START-HERE.md).
