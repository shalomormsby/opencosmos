---
name: inference-cost
description: View and edit which Claude model each Cosmo/Inception surface runs on. Single entry point for OpenCosmos's inference-cost knobs — reads and edits apps/web/lib/ai-models.ts so model choices never have to be hunted down across route files.
argument-hint: "[tier] [model-id]"
disable-model-invocation: true
user-invocable: true
---

# /inference-cost — OpenCosmos model & inference-cost control panel

All of OpenCosmos's Claude model selection lives in one file:
**`apps/web/lib/ai-models.ts`**. Every API route imports its model from
there — nothing should hardcode a model ID inline. This skill reads and
edits that file so the current settings are never more than one command
away, and stay in one place instead of drifting across route files.

## Step 1 — Read the current config

Read `apps/web/lib/ai-models.ts` in full (it's short — three exports with
comments explaining the cost/quality reasoning behind each). Also skim
`apps/web/app/api/chat/route.ts` and `apps/web/app/api/inception/route.ts`
for anything that imports a model constant, to confirm nothing has drifted
back to a local hardcoded model ID (grep for `claude-` in those two files —
should return nothing outside the `ai-models.ts` import line).

## Step 2 — Present current state

Show a table:

| Export | Model | Controls | Notes |
|---|---|---|---|
| `MODEL_GENERAL` | (current value) | `/dialog` — general-audience sessions (free, subscriber, BYOK) | highest-volume surface |
| `MODEL_ADMIN` | (current value) | `/dialog` — Shalom's admin sessions incl. creative mode | |
| `MODEL_INCEPTION` | (current value) | `/inception` — personal-agent-brief interview | shares free-tier budget with `/dialog` |

## Step 3 — Determine intent

- **No `$ARGUMENTS`** → this is a browse/edit session. Ask the user (via
  AskUserQuestion) which tier they want to change, if any — offer the three
  export names plus "just show me, no changes."
- **`$ARGUMENTS` given** as `<tier> <model-id>` (e.g. `admin claude-opus-4-8`
  or `general claude-sonnet-5`) → apply that change directly, matching
  `tier` loosely against `general`/`admin`/`inception` (case-insensitive,
  ignoring a `MODEL_` prefix if given).

When the user names a target model loosely ("the cheaper one", "latest
Haiku", "Opus") rather than an exact ID, resolve it using current Claude
model IDs — check the `claude-api` skill or ask if you're unsure of an
exact alias, since model names/aliases change over time and this skill
should never guess a stale one.

## Step 4 — Edit

Use the Edit tool on `apps/web/lib/ai-models.ts` only. Update the constant's
value on its `export const MODEL_X = '...'` line. If the change reflects a
deliberate cost/quality tradeoff decision (not just a typo fix), update or
append to that export's comment block with the same brevity as the existing
ones — this file is the durable record of *why* each tier is set the way it
is, and future-you (or future-Claude) will read those comments before
asking the user again.

Do not touch the two route files — they import from this module and need
no changes when a model value changes.

## Step 5 — Verify and report

Run `cd apps/web && pnpm exec tsc --noEmit` to confirm the edit didn't break
anything (a bad constant name would surface here). Report the before/after
value and which surface(s) it affects. Remind the user this is a source
change — it needs a deploy (PR → merge) to take effect, same as any other
code change; there's no separate runtime toggle.
