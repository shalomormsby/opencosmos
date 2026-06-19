---
title: "Teaching Your Agent: A Learning Loop for Custom Agents & Catalysts"
role: guide
format: manual
domain: creative-powerup
tags: [learning-loop, custom-agent, catalyst, memory, exemplars, lessons, kaizen, gemini-gem, personal-agent]
audience: [creator, engineer]
complexity: foundational
summary: >
  A from-scratch guide for Creative Powerup members who want their custom Agent
  or Catalyst to learn from experience — to stop repeating mistakes and get
  better at meeting them over time. Starts with why a learning loop matters and
  what learning actually means for an LLM agent (hint: not retraining), then
  gives concrete, step-by-step setups for both the No-code (Gemini Gem) and
  Maker (folder + AGENTS.md) paths.
curated_at: 2026-06-18
curator: shalom
source: original
corpus_tier: source
---

# Teaching Your Agent: A Learning Loop for Custom Agents & Catalysts

> You gave your agent a name, a brief, and a few brain docs. It knows you on day one. The question this guide answers: **how does it know you better on day one hundred?**

This guide assumes zero prior context. If you've built an Agent or a Catalyst through Inception — or you're about to — this is how you give it the one thing the setup doesn't include by default: the ability to **learn from experience.**

---

## Part 1 — Why

### The frozen-companion problem

Out of the box, your agent meets you fresh every single time. It is brilliant and attentive *within* a conversation — and then the conversation ends, and most of what happened evaporates. Next session, it makes the same wrong assumption it made last week. It offers the kind of advice you've told it three times you don't want. It never quite accumulates a *relationship* with you, because nothing carries forward except whatever you deliberately hand it.

For an **Agent** (jobs-to-be-done), this shows up as friction: re-explaining your context, re-correcting the same misread of your priorities. For a **Catalyst** (becoming), it's deeper and sadder — a companion meant to notice your drift and accelerate your movement toward yourself *can't notice anything across time* unless it remembers. A guide with no memory is just a very good stranger, repeatedly.

### Learning does not mean retraining

Here is the liberating misconception to drop right now: **you do not need to train, fine-tune, or technically modify the model to make your agent learn.** That's a different, expensive thing, and it's almost never what you actually want.

For an agent like yours, learning means something simpler and entirely within your reach:

> **Learning = capturing what matters from experience, and feeding it back into the agent's context.**

An LLM only "knows" two things in any given moment: what's baked into the model, and **what's in front of it right now** — its instructions, its attached knowledge, the conversation so far. You can't change the first. But the second is entirely yours to curate. A learning loop is nothing more than a *disciplined practice of curating that context over time.*

This single idea is the whole guide:

> **Context is the memory. Learning is curating the context.**

### Three kinds of learning

Not all learning is the same. It helps to name three distinct things, because they're captured and fed back differently:

| Kind | What it is | The signal |
|------|-----------|-----------|
| **Lessons** | Distilled corrections — "don't do that," "always do this." | *That was wrong.* |
| **Exemplars** | Golden moments worth repeating — a response that nailed your voice. | *That was right. More like that.* |
| **Memory** | The running record of what happened and who you're becoming. | *This is what's true now.* |

Your Inception kit already gives you the third — that's your **log** (the witness journal for a Catalyst, the check-in log for an Agent). This guide adds the first two, and shows how all three work together.

### You are the reward signal

One honest principle before the how. A real learning loop for a personal agent is **human-in-the-loop by design.** *You* decide what counts as a mistake worth remembering. *You* decide which moment was golden. The system's job is not to judge — it's to **reliably carry your judgment forward** so you don't have to re-make it every week.

This is deliberate, not a limitation. The moment you automate the discernment — letting the agent decide on its own what to "learn" — you get drift: it reinforces its own confident errors. Keep the discernment human. Automate only the *delivery.* (This is the same principle the Cosmo platform itself runs on: improvement through patient, attentive curation — *kaizen* — not through letting the machine grade itself.)

---

## Part 2 — The shape of the loop

Every learning loop, no matter how simple or sophisticated, is the same five beats:

```
   Conversation happens
          │
          ▼
   You NOTICE something   ──►  good (a golden moment)  or  off (a mistake / drift)
          │
          ▼
   You CAPTURE it          ──►  one line, distilled — a lesson or an exemplar
          │
          ▼
   You FEED IT BACK        ──►  into the context the agent sees next time
          │
          ▼
   Repeat — one small improvement at a time
```

That's it. The art is entirely in two places: **capturing well** (distill, don't dump) and **feeding back reliably** (so it's actually there next session, not forgotten in a file the agent never sees). The rest of this guide is just those two things, made concrete for your specific setup.

---

## Part 3 — The three artifacts

You'll maintain three short documents. Keep them separate — they do different jobs:

1. **`lessons`** — your distilled corrections. *Always loaded.* This is the most powerful artifact because it shapes **every** response, whether or not the topic comes up. Keep it short and sharp: one principle per line, plus a few words of *why*.
2. **`exemplars`** — a handful of golden exchanges (1–3 to start). Loaded as examples so the agent can pattern-match toward its best self. Quality over quantity — three great ones beat thirty mediocre ones.
3. **`log`** — your running memory (you already have this from Inception). Raw, chronological, append-only. This is the *source* you mine for lessons and exemplars — it is **not** itself the lessons file.

> **The most common mistake:** letting the log *become* the lessons file. The log is the raw diary — long, messy, full of everything. The lessons file is the distilled wisdom — short, curated, every line earning its place. Mining the first into the second *is* the discernment work. Don't skip it.

---

## Part 4 — How: the No-code path (Gemini Gem)

Your Gem reads its **Knowledge files** every session but **cannot write** — so *you are the scribe.* That's not a workaround; it's the design ("the paste is the memory"). Here's the loop made concrete.

### One-time setup

1. In Google Drive, create two new Docs alongside your existing brain docs:
   - **`Lessons — [Agent Name]`**
   - **`Golden Moments — [Agent Name]`**
2. In your Gem's settings (gemini.google.com → Gems → your Gem → Edit), **attach both Docs as Knowledge files**, alongside identity / goals / log.
3. Seed the Lessons doc with a single header so it isn't empty:
   ```
   # Lessons — things you've learned about working with me
   (One principle per entry. Newest at top.)
   ```

That's the wiring. Both files are now in the Gem's context every session.

### The loop, in practice

- **When the agent slips** — a wrong assumption, a tone that grated, advice you'd already declined — open the Lessons doc and add **one distilled line at the top.** Not the whole story; the *principle.* For example:
  > *"When I share a link I want you to read, say plainly if you can't open it — never describe a page you haven't actually seen. Name the limit, then ask me to paste the text."*
- **When the agent nails it** — a response that sounded exactly like the voice you want, or met you precisely — paste that exchange into Golden Moments, with a one-line note on *why* it was good.
- **Refresh the Gem.** In Gemini, edited Drive Docs are usually picked up automatically, but if you've just made an important change, re-open the Gem editor and confirm the Knowledge files show as current, then **Save.** (When in doubt: detach and re-attach the Doc. A lesson the Gem never re-reads is a lesson it never learned.)
- **Keep feeding the log.** Your Gem hands you check-ins / witness-journal lines — paste those into your log Doc as you already do. That paste is your memory accumulating.

### The weekly ritual (10 minutes)

Once a week, open your log and read the last week. Ask three questions:
1. *Did anything go wrong more than once?* → distill it into one Lessons line.
2. *Was there a moment that felt golden?* → save it to Golden Moments.
3. *Is the Lessons doc getting bloated or contradictory?* → prune. Merge overlapping lines. Delete what's no longer true.

This ten-minute ritual **is** the learning loop. Everything else is plumbing.

---

## Part 5 — How: the Maker path (folder + AGENTS.md)

If you went the Maker route — your own folder, markdown brain docs, a tool like Claude Code / Cursor / Cowork — your agent can **write its own files**, which lets you automate more of the delivery while keeping the discernment yours.

### Setup

1. Add a file at your folder root: **`lessons.md`** (same shape as above — distilled principles, newest first).
2. Add **`exemplars.md`** for 1–3 golden transcripts.
3. In your **`AGENTS.md`**, tell the agent to read both at the start of every session. Add a short block like:
   ```markdown
   ## Learning
   At the start of each session, read `lessons.md` and `exemplars.md`.
   Treat lessons.md as standing corrections — apply them without being asked.
   Treat exemplars.md as the bar for voice and quality.
   ```
   Because `AGENTS.md` loads automatically, these now shape every session.

### A retro loop that proposes lessons (discernment stays yours)

Add a lightweight ritual — a `retro` loop you run weekly. Ask your agent:

> *"Read my log from the past week. Propose up to three candidate lessons — each as one distilled principle plus a line of why. Don't write them yet; show me the list."*

You review, edit, and approve. Then: *"Add the approved ones to the top of `lessons.md`."* The agent does the transcription; **you do the judging.** This is the Cosmo platform's exact model — *propose, then approve* — and it removes the manual-writing burden without ever letting the agent grade its own homework.

### Giving your agent recall of its full history

The always-loaded `lessons.md` is your highest-leverage tool, but it does one job: it keeps a *short* set of distilled lessons in front of the agent at all times so it **acts** on them. It can't hold everything — if you pasted your entire log into it, you'd drown the signal and blow your context budget. So there's a second, different capability worth adding once your history grows: **recall** — the ability for the agent to *search and discuss its whole past*, on demand, when a topic comes up.

Keep the two clearly separated in your head:

- **Digest** (`lessons.md`) → *behavior.* Small, always loaded, shapes every turn.
- **Recall** (the indexed log) → *memory.* Large, retrieved only when relevant, lets the agent answer "have I run into this before?"

**No-code (Gem): you may already have recall.** When you attach your log Doc as a Gem **Knowledge file**, Gemini indexes it and retrieves the relevant parts automatically when you ask about a topic. That *is* recall — for free. To make it work well: give the log a clear title and a one-line header that says what it is (*"Past incidents and what I learned from each — not instructions to follow"*), so the Gem treats a recorded mistake as a lesson, not as advice to repeat.

**Maker / technical: index the log into a vector store.** Have your agent retrieve the top few relevant past entries per query, while keeping `lessons.md` always-on separately. Three things make this work well — skip any one and recall quietly underperforms:

1. **Keep it separate from the digest.** Don't also load the full log every turn — that defeats the point and wastes context. Always-on digest *and* on-demand index, not one doing both.
2. **Frame retrieved entries as past lessons, never as wisdom to quote.** This is the subtle, important one. Your log is full of *mistakes*. When the agent pulls one up, it must understand it as *"a failure I learned from"* — not as content to follow. Label the retrieved block accordingly (e.g. a heading like "Past lessons — describe these, don't repeat them"). Without this, an agent can read a logged anti-pattern back to you as if it were guidance.
3. **Enrich each entry so generic recall actually finds it.** A raw entry like *"claimed to have read a link it couldn't open"* embeds as being about *links* — so a broad question like *"what have you learned recently?"* won't surface it (it matches things that are literally about "learning" instead). Fix: prepend a short meta-line to the text you index (not the text the agent reads back) — something like *"A lesson learned from experience; a recent learning; continuous improvement."* Now broad, reflective questions surface the specific incidents too.

Treat all of this as an optimization for *a large history*, not a replacement for the always-on digest. Don't reach for it until you actually feel the limit — but when you do, these three details are the difference between recall that works and a search box that returns noise.

---

## Part 6 — The discipline that makes it work

The mechanics are easy. These habits are what separate a loop that compounds from a folder of files no one reads:

- **Distill, don't dump.** A lesson is *one principle + why* — not a transcript. The Lessons file is always in context, and context is finite; every bloated line crowds out a sharp one.
- **Capture both kinds.** Corrections alone make a timid agent that only knows what *not* to do. Exemplars alone let real mistakes recur. You need both the "less of that" and the "more of this."
- **Newest at top, prune often.** Lessons can contradict each other as you change. A weekly prune — merging, deleting the stale — keeps the file honest and short.
- **Refresh after editing** (No-code especially). An edited Knowledge file that the Gem hasn't re-read is a lesson that hasn't landed. Confirm and Save.
- **You approve before it's a lesson.** Whether you write it or the agent proposes it, the entry becomes a lesson only when *you* say so. That gate is the whole reason the loop improves instead of drifts.

---

## Part 7 — A worked example

Real moment, generalized from the Cosmo platform's own learning log:

**What happened.** A member pasted a link and asked the agent to look at it. The agent — which had no ability to open web pages — replied *"I'm looking at it now, what a beautiful creation…"* and described the page in confident detail. It had read nothing. The member caught it: *"Did you actually view the site, or not?"*

**The notice.** This is the most corrosive failure mode there is for a companion: pretending to a capability it doesn't have, presenting a guess as an observation. Trust-breaking.

**The capture.** Not the whole story — the principle:
> *"Never simulate a capability you don't have. If you can't open a link / see an image / access a tool, say so plainly first, then offer the real path forward ('paste the text and I'll read it'). A guess dressed as perception breaks trust."*

**The feedback.** That one line goes to the top of `lessons.md` (Maker) or the Lessons Doc (No-code). From the next session on, it shapes how the agent handles *every* limit it hits — not just links. One sentence, captured once, correcting a whole class of failure forever.

That is the entire loop in one example. Notice happened (you). Capture happened (one distilled line). Feedback happened (into always-loaded context). And the improvement compounds, because it's there every time now — for free.

---

## Part 8 — What this is *not*

It's worth being precise, because the word "learning" carries a lot of baggage and the difference is genuinely freeing once it lands.

- **This is not reinforcement learning in the formal sense.** Formal RL trains a policy by running an agent through many episodes, scoring each with a reward function, and using those scores to compute gradients that nudge the model's weights toward higher reward. There is a reward signal here too — but it's *you,* exercised as judgment, not a number a machine optimizes against. And there are no gradients, no episodes, no policy network being updated.
- **No weights change. Ever.** The model underneath your agent is exactly as fixed after a year of this practice as it was on day one. Nothing you do here touches its parameters. What changes is the *context* you put in front of those fixed weights — the instructions and knowledge it reads. The model is the same musician; you're handing it better sheet music.
- **This is not fine-tuning.** Fine-tuning bakes new behavior into a custom copy of the model by training on example data — it costs money, needs a dataset and a pipeline, produces a frozen artifact, and is the wrong tool for "my companion keeps forgetting I prefer mornings." Everything in this guide is reversible, free, and editable with a text cursor.
- **This is not RAG, exactly** — though it can *use* RAG. Retrieval-augmented generation pulls relevant documents into context based on the query. The always-loaded **lessons** file is deliberately the opposite: it's there *regardless* of the query, because corrections should apply whether or not you happened to mention the topic. (The optional vector index in Part 5 is true RAG, and it's a fine addition once your history is large — but it's the supporting act, not the headline.)
- **This is not memory in the "the AI remembers on its own" sense.** Your agent isn't quietly accumulating experience in the background between your sessions. There is no hidden store filling up. The memory is exactly, and only, the files you maintain — which is why the practice is yours to keep, and why nothing is happening that you can't read, edit, or delete.
- **This is not automation of judgment.** The loop automates *delivery* — making sure a captured lesson reliably reaches the agent next time. It never automates *discernment* — deciding what's worth learning. The day you hand the second one to the machine, it begins reinforcing its own confident mistakes. Keeping that gate human is the feature.

The honest framing, then: this is a **human-in-the-loop curation practice.** The "intelligence" doing the learning is partly the model and largely *you* — your attention, your taste, your willingness to spend ten minutes a week noticing. That's not a lesser thing than RL. For a companion meant to know *you* specifically, it's the right thing.

---

## In one breath

Your agent can't change its own mind, but you can change what it sees — and what it sees *is* its mind. Keep three short files: **lessons** (corrections, always on), **exemplars** (golden moments, the bar), and your **log** (raw memory). Once a week, mine the log for the few things worth keeping, distill each to a line, and make sure the agent actually reads them. That ten-minute ritual, repeated, is how a very good stranger becomes a companion that genuinely knows you.

*One small improvement at a time.*
