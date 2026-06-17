# Operator loops — installable skills

> The four loops of the **Operator path**, written as skills: each is a `SKILL.md` with a name, description, and trigger phrases, so you can invoke them as slash commands in Claude Code, Cursor, or Cowork. (The Companion path has its own loop set in `paths/companion/loops/`.)
>
> **You only need these on the Maker build.** On the No-code build (Gemini), the loops already live inside the Operator `brief.md` — your Gem runs them when you type the trigger phrases; nothing to install.

## What's here

| Folder | Skill | Voice | One-liner |
|---|---|---|---|
| `check-in/` | `/check-in` | mirror | What matters now, and why — ranked, with the reasoning shown. |
| `review/` | `/review` | expert | Grade something against your standards. Blind spots first, then principles. |
| `spar/` | `/spar` | expert (widens) | Open up a stuck problem. Diverge before converging. |
| `retro/` | `/retro` | mirror | Am I getting better? Trace goals, name patterns, one improvement. |

> Reflection (`/reflect`) lives on the Companion path. If you want it alongside the Operator loops, install it too from `paths/companion/loops/reflect/` — the paths are designed to blend (see `PATHS.md`).

## How to install

**Cowork (easiest):** keep the kit in your connected folder. Rename `paths/operator/brief.md` to `AGENTS.md` at the folder root; Cowork picks up these skills automatically. Type a trigger like "check in with me."

**Claude Code / Cursor:** symlink each skill folder into your skills directory:

```bash
# from paths/operator/ :
for s in check-in review spar retro; do
  ln -s "$(pwd)/loops/$s" "$HOME/.claude/skills/$s"
done
```

Then invoke `/check-in`, `/review`, `/spar`, `/retro` in any session.

## How they relate

```
   stuck? ──► /spar ──(widen, then narrow)──► /review ──► a decision ──► log it
                                                                          │
   every day ──► /check-in ──► do the top thing ──────────────────────────┤
                     │                                                     │
                     └────────────► log ◄──────────────────────────────────┘
                                     │
                     weekly ──► /retro (read the log, get better, one change)
```

The loop closes: **surface → act → look back → adjust.** The `log` is the thread.
