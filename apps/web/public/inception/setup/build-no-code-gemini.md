# The No-code build — Google Gemini

> The no-code path. You'll turn your brain docs into Google Docs, paste the agent brief into a **Gem**, and you're talking to your synthetic self in about 30 minutes — **free.** Then two optional level-ups add proactivity and background work.
>
> *Gemini's features and prices change often — confirm current details at [gemini.google](https://gemini.google) before you rely on a paid tier. Availability noted here is as of June 2026.*

---

## The three levels

| Level | What you get | What it costs | What it maps to in `synth-shalom` |
|---|---|---|---|
| **1. The Gem** | A custom agent that knows you and runs the loops when you ask (pull). | **Free** (Google account) | Tier 0 — the agent session you open yourself |
| **2. Scheduled Actions** | A proactive "good morning" check-in that arrives on its own. | **Google AI Pro** (~$20/mo) | Tier 1 — the scheduled digest |
| **3. Spark** | A 24/7 background agent with connectors and sub-agents. | **Google AI Ultra** ($100+/mo; US beta) | Tiers 2–3 — event-flags + always-on |

Start at Level 1. Most of the value is there. Add the others only when the manual loop is a habit — proactivity you don't read is just noise.

---

## Level 1 — The Gem (free, ~30 min)

> **First, pick your path** (see `PATHS.md`). It decides which brief you paste and which docs you attach. Below, "your brief" = `paths/operator/brief.md` *or* `paths/companion/brief.md`.

### Step 1. Put your brain docs in Drive
Create a Google Drive folder called **`synth-[yourname]`**. Inside it, make a Google Doc for each brain file your path uses, paste in the kit templates, and fill them in:

- **Operator path:** `identity`, `goals`, `practice`, `log`
- **Companion path:** `identity`, `teachers`, `log` (`practice` optional)

> **Why Google Docs (not uploads)?** A Gem reads Docs straight from Drive with **live sync** — edit the doc and the Gem sees the change, no re-uploading. Your `log` updating in your own hands is what makes the agent compound. (A Gem holds up to **10 knowledge files**, so you've room to grow — and to blend in the other path's docs later.)

### Step 2. Create the Gem
1. Open [gemini.google.com](https://gemini.google.com) (or the Gemini app) → your profile / the **Gems** area → **New Gem**.
2. **Name:** `Synthetic [Your Name]`.
3. **Instructions:** open **your path's `brief.md`**, replace every `[[bracket]]`, and paste the whole thing (everything below its divider line) into the Instructions box.
4. **Knowledge:** click **Add files → Drive**, and add your path's Docs from the `synth-[yourname]` folder.
5. **Preview** on the right: Operator → *"check in with me"*; Companion → *"attune with me."* If the reply knows you and reasons in your voice, it's working. **Click Save** (previewing alone doesn't save).

### Step 3. Use it
Talk to your Gem in plain language. The loops fire on their trigger phrases:
- **Operator:** *"Check in with me"* · *"let's spar on ___"* · *"review this ___"* · *"run a weekly retro."*
- **Companion:** *"Attune with me"* · *"let's reflect on ___"* · *"help me discern ___"* · *"synthesize my teachers"* · *"witness how I've grown."*

### Step 4. Keep the memory (the one habit that matters)
A Gem **reads** your docs but can't **write** them. So after a check-in or retro, paste the summary it gives you into your `log` Doc (newest on top). That five-minute habit is the compounding — next session, because the Gem reads `log` live, it remembers. Skip it and your agent has amnesia.

> Tip: end any check-in with *"give me the log entry to paste."* It'll hand you a clean, short block.

---

## Level 2 — Scheduled Actions (proactive digest, ~$20/mo)

With **Google AI Pro**, Gemini can run a prompt on a schedule and deliver the result on its own — your synthetic self's morning digest, without you opening anything.

1. Confirm you're on Google AI Pro (or higher).
2. In Gemini, create a **Scheduled Action** (look for the scheduled/recurring option when composing, or in settings) set to e.g. **every weekday at 8:00 a.m.** with a prompt like:
   > *"Run my morning check-in as Synthetic [Name]: read my goals and log, tell me the one highest-impact thing today and why, plus anything drifting or aging. Keep it to a 5-minute read."*
3. You'll get the digest delivered each morning. (You can have up to ~10 scheduled actions; one or two is plenty.)

> **Earn it first.** Turn this on only once the manual check-in is a genuine habit and feels useful. A scheduled message you ignore trains you to ignore it. This is exactly the "proactivity is earned" gate from `synth-shalom`.

---

## Level 3 — Spark (24/7 background agent)

**Gemini Spark** is Google's always-on personal agent (announced at I/O 2026). It works in the background across Google Workspace, custom connectors, and the open web; you can teach it custom skills and (rolling out over 2026) create sub-agents, text/email it directly, and let it act in your browser and local files. That's the full ambient vision — the equivalent of `synth-shalom`'s Tiers 2–3 (event-flags and two-way), without you wiring anything.

**Reality check (June 2026):** Spark is in **beta, US-only, for Google AI Ultra subscribers (18+)**, rolling out from trusted testers — there's no public waitlist. So treat it as the *destination*, not the starting line:
- If you already have AI Ultra and access, point Spark at the same `synth-[yourname]` Drive folder, give it the agent brief as its instructions/custom skill, and connect Calendar/Gmail/Tasks (read-only to start). Let it run the morning check-in and surface event-flags.
- If you don't, you're not missing the core value — Levels 1–2 are the synthetic self. Spark just automates the parts you're doing by hand.

---

## Troubleshooting

- **It gives generic advice, not "me."** Your `identity`/`practice` docs are too thin or weren't attached as knowledge. Add specifics (real beliefs, real non-negotiables) and confirm the Docs are in the Gem's Knowledge.
- **It forgets last week.** You're not updating `log`, or it isn't attached. Both must be true: the doc is a knowledge file *and* you append to it.
- **It flatters me.** Add a line to the Gem instructions: *"Be a blunt honest mirror; never flatter; tell me what I'm avoiding."* (It's already in the brief — make sure you pasted the whole thing.)
- **Replies are too long.** Tell it your preferred length, or add it to `identity` under "how I like to be talked to."
