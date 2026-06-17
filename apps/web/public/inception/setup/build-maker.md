# The Maker build — Cowork · Cursor · Claude Code

> The maker path. Your synthetic self lives as a **folder of files** that the agent reads *and writes* — so it updates its own memory, schedules its own check-ins, and pulls from your calendar and email through connectors. This is how `synth-shalom` itself is built. Three good homes, easiest first.
>
> The big advantage over the No-code build: **the agent closes the loop for you.** It appends to `log` itself; you don't paste anything.

---

## The one-time setup (any home)

1. **Pick your path** (`PATHS.md`) — Operator or Companion. It decides your brief and loop set.
2. Keep this `synth-starter-kit/` folder somewhere you'll use it (or copy just your path + `brain/`).
3. **Rename your path's brief → `AGENTS.md`** at the folder root and fill in every `[[bracket]]`:
   - Operator → `paths/operator/brief.md`
   - Companion → `paths/companion/brief.md`
   This file loads automatically and *is* your agent's identity.
4. Fill in the `brain/` docs your path uses — Operator: `identity`, `goals`, `practice`, `log`; Companion: `identity`, `teachers`, `log`.
5. Your path's `loops/` skills are ready as-is.

Your folder ends up like (Companion shown):
```
synth-[yourname]/
  AGENTS.md            ← your path's brief (renamed)
  brain/               ← identity · teachers · log  (+ goals/practice if you want)
  loops/               ← attune · reflect · discern · synthesize · witness
                          (copy from paths/companion/loops/, or symlink in place)
```

> **Blending both paths?** Keep both briefs' content in `AGENTS.md` (or merge the parts you want) and install both loop sets — they're designed to interleave. See *Blending* in `PATHS.md`.

---

## Home 1 — Cowork (easiest; you're likely here already)

Cowork (the Claude desktop app's agent mode) has folders, skills, scheduled tasks, and connectors built in — no setup beyond pointing it at your folder.

1. **Connect the folder.** Point Cowork at `synth-[yourname]/`. It reads `AGENTS.md` automatically and picks up your `loops/` skills.
2. **Run a loop.** Operator → *"check in with me"*; Companion → *"attune with me."* When it's done, it **writes the entry into `brain/log.md` itself** (Companion: it offers, gently).
3. **Connect your pipes (read-only).** Add connectors for **Google Calendar, Gmail, Tasks/to-do, Notion** — whatever holds your real life — so the loops read your actual state instead of asking. Keep them read-only to start (the agent recommends; you act). *(Companion path needs fewer connectors — it's about you, not your plate.)*
4. **Make it proactive (earn it first).** Ask Cowork to **schedule a task** — Operator: *"every weekday at 8am, run my check-in and save it to my log"*; Companion: *"every Sunday evening, run a gentle /witness and /attune."* Built in, no cron.
5. **Companion: fetch Cosmo live.** On the Maker build your agent can read Cosmo's full constitution at session start for the richest voice — see `paths/companion/cosmo-grounding.md`.

> This is the closest thing to `synth-shalom` you can stand up without touching a terminal — and you're already in it.

---

## Home 2 — Cursor (for makers who code, or want to)

1. Open `synth-[yourname]/` as a project in Cursor.
2. Cursor reads `AGENTS.md` as project context. Install your path's loops as skills (symlink them so they work everywhere):
   ```bash
   # Operator path — from paths/operator/ :
   for s in check-in review spar retro; do ln -s "$(pwd)/loops/$s" "$HOME/.claude/skills/$s"; done
   # Companion path — from paths/companion/ :
   for s in attune reflect discern synthesize witness; do ln -s "$(pwd)/loops/$s" "$HOME/.claude/skills/$s"; done
   ```
3. **Connectors via MCP.** Add read-only MCP servers for the tools you live in (Google Calendar, Gmail, Notion, Todoist, etc.) in Cursor's MCP settings, so the loops read your real state. Start read-only.
4. **Scheduling.** Use Cursor's scheduled/background agents (or a simple cron that runs the check-in prompt) for the morning digest. `synth-shalom` uses a weekday `0 8 * * 1-5` cloud agent for exactly this.
5. **Version it (optional).** `git init` the folder so your synthetic self has history — every change to who-you-are is tracked. (`synth-shalom` is a git repo for this reason.)

---

## Home 3 — Claude Code (terminal)

Same as Cursor, minus the IDE: `cd` into the folder, and Claude Code reads `AGENTS.md` and the `loops/` skills. Symlink the skills as above to invoke `/check-in` anywhere. Wire MCP connectors in your Claude Code config. Best if you're already comfortable at the command line.

---

## The connectors worth adding (read-only first)

| Pipe | Feeds | Loop that uses it |
|---|---|---|
| **Calendar** | what's actually on today | `/check-in` |
| **Email** | asks aging, things waiting on you | `/check-in`, event-flags |
| **Tasks / to-do** (Todoist, Notion, Apple/Google Tasks) | the real plate | `/check-in`, `/retro` |
| **Notes / docs** (Notion, Obsidian, Drive) | project state, where work lives | `/check-in`, `/review` |

**The principle (straight from `synth-shalom`):** *pull every platform in to one agent; don't push the agent out into every platform.* One brain reads everything read-only and surfaces through one front door (a daily check-in, a chat). You stay the only thing that writes to the outside world.

---

## Why the Maker build compounds harder

On the No-code build you keep the memory by hand. Here the agent does it — every check-in and retro lands in `log` automatically, decisions get logged with their reasoning, and the weekly `/retro` reads the whole trail to tell you whether you're actually getting better. Over months, that trail is the thing: an agent that genuinely knows your judgment because it has watched it accumulate. That's the payoff for the slightly higher setup cost.
