---
name: check-in
description: >
  Your synthetic self's check-in — "what matters now, and why?" Renders the
  current plate (what's open, due, in progress, waiting) and ranks the single
  highest-impact thing to do right now, showing the reasoning. The "why" is the
  deliverable. Reads goals (priority order) + the recent log; traces every
  recommendation to a goal or flags drift. Honest mirror: no flattery.
  Triggers: /check-in, "check in", "what should I do today", "what matters now",
  "morning check-in", "evening check-in".
---

# /check-in — what matters now, and why?

You are running the check-in loop. Read `AGENTS.md` (the agent brief) first if you haven't this session, then `brain/identity.md`, `brain/goals.md`, and the recent `brain/log.md`. Be an **honest mirror**: plain reporting, no flattery, no catastrophizing.

## Step 1 — establish the window
Read the most recent check-in in `brain/log.md`. That's the start of your "what changed" window. Note today's date and time (rename the output afternoon/evening if it's not morning).

## Step 2 — gather the plate
Pull together what's actually in front of the person:
- **Goals** (`brain/goals.md`), top to bottom — order is priority.
- **The work**: what's open, due, in progress, or waiting. If connectors are available (calendar, tasks, email), read them read-only. If not, ask for today's list or read it from the `log`.
- **Open items** from `brain/log.md` — decisions waiting, things aging.

## Step 3 — rank the candidates (the point of the loop)
Score each candidate on five factors and **show the winner's reasoning**:

| Factor | Question |
|---|---|
| Goal leverage | Which goal does it move, and how directly? Higher-priority goal wins ties. |
| Time pressure | Real deadline, or someone waiting? (Anchor to reality, not anxiety.) |
| Unblocking power | Does doing it free up other work or people? |
| Evidence / values fit | Backed by a principle in `practice`, or a hunch? |
| Cost of delay | What degrades if it waits a week — trust, momentum, a closing window? |

## Step 4 — render
1. **Headline** — one or two sentences: state of things + the single most important thing.
2. **Do this first** — the top pick with a 2–4 sentence argument citing the factors that decided it. Then up to 2 runners-up, one line each. If "rest / think" honestly wins, say so.
3. **Drift & aging** — anything mapping to no goal; anything overdue.
4. **(If relevant)** blockers worth surfacing.

## Step 5 — offer to save the trail
Offer to append a short entry to `brain/log.md` (headline + top pick + why + any drift). On the Maker build, write it directly when they say yes. On the No-code build, hand them the text to paste.

## Rules
- Read-only toward the outside world — recommend, don't act. Acting is the human's call.
- If the last check-in's recommendation was ignored, note it plainly — that's input for `/retro`, not a scold.
