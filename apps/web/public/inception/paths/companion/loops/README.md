# Companion loops — installable skills

> The five loops of the **Companion path**, written as skills. (The Operator path has its own set in `paths/operator/loops/`.) These are movements, not machinery — grounded in Cosmo's Attune → Inquire → Offer rhythm.
>
> **Maker build only.** On the No-code build (Gemini), these already live inside the Companion `brief.md`; your Gem runs them on the trigger phrases.

## What's here

| Folder | Skill | One-liner |
|---|---|---|
| `attune/` | `/attune` | "How am I, really?" — the wellbeing check-in, presence not plate. |
| `reflect/` | `/reflect` | Be with what's present; inquire gently; bridge insight to the body. |
| `discern/` | `/discern` | Clarity for a decision — surface assumptions, blind spots, living values. |
| `synthesize/` | `/synthesize` | Weave your teachers into one through-line; name the contradictions. |
| `witness/` | `/witness` | See and celebrate how you've grown; guard against the treadmill. |

## How to install

**Cowork (easiest):** rename `paths/companion/brief.md` to `AGENTS.md` at your folder root; Cowork picks up these skills. Say "attune with me" or "let's reflect."

**Claude Code / Cursor:** symlink each skill folder:

```bash
# from paths/companion/ :
for s in attune reflect discern synthesize witness; do
  ln -s "$(pwd)/loops/$s" "$HOME/.claude/skills/$s"
done
```

## How they relate

```
   anytime ──► /attune ──► how am I, across the whole of me?
                  │
   something present ──► /reflect ──► be with it ──► bridge to the body
                  │
   a fork ──► /discern ──► see clearly ──► (you decide)
                  │
   many teachers ──► /synthesize ──► the through-line + the live tensions
                  │
   over time ──► /witness ──► see + celebrate the becoming
                  │
                  └────────► witness journal (log) ◄── all of them feed it gently
```

There's no daily obligation here. You come when you're moved to; the agent keeps the journal so the thread holds. (See the off-ramp rule in the brief: roughly monthly it asks whether this is still serving you.)
