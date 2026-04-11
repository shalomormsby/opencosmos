---
title: "OpenCosmos Claude Code Skills — Reference"
role: guide
format: manual
domain: opencosmos
corpus_tier: source
tags: [skills, claude-code, tooling, workflow, knowledge-base, ui, wiki]
audience: [creator, engineer]
complexity: foundational
summary: >-
  Complete reference for all Claude Code skills available in the OpenCosmos
  monorepo. Covers the UI building skill (/create), the knowledge base
  formatting skill (/groom), and the three wiki skills (/knowledge-compile,
  /knowledge-review, /knowledge-lookup).
curated_at: 2026-04-10
curator: shalom
source: original
related_docs:
  - guides/opencosmos-knowledge-tooling-overview.md
  - guides/opencosmos-knowledge-wiki-workflow.md
  - guides/opencosmos-knowledge-formatting-guide.md
---

# OpenCosmos Claude Code Skills — Reference

Skills are invocable AI workflows defined in `.claude/skills/`. Each skill is a directory containing a `SKILL.md` file that gives Claude a focused set of instructions for a specific task. Invoke any skill with `/skill-name [args]` in a Claude Code session.

## Skill Index

| Skill | Category | What it does |
|-------|----------|-------------|
| [`/create`](#create) | UI | Build UI components using `@opencosmos/ui` exclusively |
| [`/groom`](#groom) | Knowledge | Format raw text in `knowledge/incoming/` for corpus publication |
| [`/knowledge-compile`](#knowledge-compile) | Wiki | Compile durable insights to the knowledge wiki |
| [`/knowledge-review`](#knowledge-review) | Wiki | Run a wiki health check |
| [`/knowledge-lookup`](#knowledge-lookup) | Wiki | Search the wiki before starting domain work |

---

## /create

**Category:** UI — **Skill file:** `.claude/skills/create/SKILL.md`

Builds UI for OpenCosmos applications using `@opencosmos/ui` components. Never writes custom HTML, custom CSS, or bespoke JSX when a library component exists.

### What it does

Reads `$ARGUMENTS` as a description of what to build, selects the appropriate components from the `@opencosmos/ui` component API, and produces correct, token-compliant UI code.

If a required component doesn't exist in `@opencosmos/ui`, the skill stops and asks whether to add it to the design system — it does not build bespoke one-offs without explicit authorization.

### Invocation

```
/create <brief description of what to build>
```

Examples:
```
/create hero section with a centered tagline and two CTA buttons
/create sidebar navigation with collapsible sections
/create subscription tier cards for Spark, Flame, and Hearth
```

### Core rules

- **Design tokens only** — `bg-background text-foreground border-border`, never hardcoded hex or Tailwind palette classes
- **Component-first** — check the library before writing anything custom
- **Motion gated** — all animations use `useMotionPreference()` from `@opencosmos/ui/hooks`
- **`cn()` for conditional classes** — never string-concatenate Tailwind classes

### Key components

| You want... | Component |
|-------------|-----------|
| Sticky navbar | `Header` |
| Scrollable area | `ScrollArea` |
| Text input | `Input` |
| CTA button | `Button` (variants: `default`, `outline`, `ghost`, `link`) |
| Status pill | `Badge` |
| Alert / info box | `Alert` + `AlertTitle` + `AlertDescription` |
| Modal | `Dialog` |
| Side drawer | `Sheet` |
| Content card | `Card` |
| Loading state | `Spinner`, `Skeleton`, `Progress` |
| App root wrapper | `ThemeProvider` |

### Pre-build checklist (always done by `/create`)

1. `globals.css` has `@import "tailwindcss"` → `@import "@opencosmos/ui/theme.css"` → `@import "@opencosmos/ui/globals.css"`
2. `app/_ui-safelist.ts` exists with the full class safelist
3. All colors from tokens, not hardcoded values
4. `asChild` pattern for link buttons (never nest `<a>` inside `<button>`)

---

## /groom

**Category:** Knowledge — **Skill file:** `.claude/skills/groom/SKILL.md`

Prepares raw text in `knowledge/incoming/` for publication. Adds markdown structure (headers, spacing, speaker formatting) while preserving every word of the original text. Also previews which wiki pages the new document will affect after publishing.

**Full pipeline:** stage → **`/groom`** → `pnpm knowledge:publish` → `/knowledge-compile log`

### What it does

Runs `scripts/knowledge/groom.py` — a persistent Python script that transforms raw text files through content-type-specific processors. All transformations happen in Python, not via Claude's Write/Edit tools, to bypass content filtering constraints on sacred and philosophical texts.

### Invocation

```
/groom                                  # Process all files in knowledge/incoming/
/groom knowledge/incoming/file.md       # Process a specific file
/groom --dry-run                        # Analyze without writing
/groom --report                         # Status of all incoming files
/groom knowledge/sources/file.md --force  # Reprocess an already-formatted file
```

### Content type processors

| Processor | Used for |
|-----------|----------|
| `dialogue` | Standard Plato/Jowett dialogues |
| `republic` | Plato's Republic (sidenotes, Stephanus numbers) |
| `laws` | Plato's Laws (EXCURSUS, BOOK I-XII) |
| `heart_sutra` | Heart Sutra |
| `tao` | Tao Te Ching (chapter numbers → headings) |
| `poetry` | Leaves of Grass (preserve line breaks) |
| `prophet` | The Prophet |
| `scientific` | Gaia Hypothesis, scientific texts |
| `generic` | Unregistered files |

### Step 0: copyright gate

Before formatting, `/groom` assesses copyright status. Full text enters the corpus only for public domain works. Copyrighted works → `corpus_tier: commentary` (fair-use overview) or `corpus_tier: reference` (pointer only).

### Report output (Step 4)

The `/groom` report includes a **Wiki Impact Preview** section: for each processed file, it scans `knowledge/wiki/index.md` and identifies which existing wiki pages the new document will affect after publishing — and which new wiki pages it creates opportunity for. Example:

```
### Wiki Impact Preview
- incoming/stoicism-meditations.md → affects: wiki/concepts/impermanence.md
                                   → creates opportunity: wiki/entities/marcus-aurelius.md (not yet written)

Next step: after pnpm knowledge:publish, run /knowledge-compile log
```

### After publishing (Step 5)

Once `pnpm knowledge:publish` completes, run immediately:

```
/knowledge-compile log
```

This updates all wiki pages affected by the newly published document. The trigger is "just published" — not scheduled.

### What it must NOT do

- Rewrite or paraphrase any text
- Add frontmatter (the publication CLI handles that)
- Split or delete files

See the full reference: [Formatting Raw Text for Publication](opencosmos-knowledge-formatting-guide.md)

---

## /knowledge-compile

**Category:** Wiki — **Skill file:** `.claude/skills/knowledge-compile/SKILL.md`

Compiles durable insights into `knowledge/wiki/`. The trigger is **"I just learned something"** — event-driven, not scheduled.

### What it does

Extracts cross-tradition synthesis from a source, checks whether a relevant wiki page already exists, and writes or updates pages with the standardized article structure: Summary → Key Claims → Connections → Contradictions → Open Questions.

Each run:
1. Writes or updates one or more wiki pages in `knowledge/wiki/`
2. Updates `knowledge/wiki/index.md` with new/changed entries
3. Appends to `knowledge/wiki/log.md`

### Invocation

```
/knowledge-compile convo                    # Extract from current conversation
/knowledge-compile incoming/<file>          # Process a staged external reference
/knowledge-compile log                      # Update wiki from recent CURATION_LOG entries
```

### When to use each mode

| Mode | Use when |
|------|----------|
| `convo` | A conversation just produced a notable cross-tradition synthesis |
| `incoming/<file>` | An article or text was dropped into `knowledge/incoming/` |
| `log` | New source documents were just published to the corpus |

### Wiki page frontmatter it writes

```yaml
role: wiki
confidence: speculative|medium|high
status: active|superseded|archived
synthesizes:
  - sources/path-to-source.md
last_reviewed: YYYY-MM-DD
open_questions:
  - ...
contradictions:
  - ...
```

**Confidence lifecycle:** `speculative` (initial synthesis) → `medium` (confirmed by 3+ sources) → `high` (4+ sources, contradictions documented) → `superseded` (contradicted by new evidence)

See the full reference: [Knowledge Wiki Workflow](opencosmos-knowledge-wiki-workflow.md)

---

## /knowledge-review

**Category:** Wiki — **Skill file:** `.claude/skills/knowledge-review/SKILL.md`

Runs a health check on `knowledge/wiki/`. Returns a structured report identifying issues and opportunities.

### What it checks

| Check | What it finds |
|-------|--------------|
| Orphan pages | Pages with empty `synthesizes` or no `## Connections` |
| Asymmetric links | A links B but B doesn't link A |
| Missing pages | Pages referenced in `Connections` that don't exist yet |
| Staleness | `status: active` pages not reviewed in >90 days |
| Promotion candidates | `speculative` pages with 3+ sources → ready for `medium` |
| Not indexed | Pages on disk not listed in `wiki/index.md` |
| Open questions | All `open_questions` across all pages in one place |

### Invocation

```
/knowledge-review               # Full health check
/knowledge-review --orphans     # Only orphan and asymmetric link issues
/knowledge-review --staleness   # Only stale pages
/knowledge-review --questions   # Only accumulated open questions
/knowledge-review --fix         # Auto-fix minor issues (staleness dates, missing sections)
```

### When to run

- Monthly, before a major synthesis session
- After adding several new source documents (to catch update opportunities)
- When open questions from wiki pages are guiding decisions about new sources to add

---

## /knowledge-lookup

**Category:** Wiki — **Skill file:** `.claude/skills/knowledge-lookup/SKILL.md`

Searches the knowledge wiki for existing synthesis before starting domain work. Returns pre-built concept pages and connections.

### What it does

Reads `knowledge/wiki/index.md`, finds pages relevant to the query, reads their full content, and returns summaries with key claims and connection links. Also reports gaps — topics the query touches that aren't yet in the wiki, with suggestions for which source documents would help.

### Invocation

```
/knowledge-lookup impermanence
/knowledge-lookup what plato says about the good
/knowledge-lookup self identity soul
/knowledge-lookup cosmology origin universe
```

### Output format

For each matching wiki page:
- **Summary** — the article's synthesis paragraph
- **Key Claims** — 2-3 most important claims
- **Connects to** — related wiki pages

Plus a "Not in wiki yet" section listing gaps and suggesting source documents that would fill them.

### When to use

Before asking Cosmo a deep cross-tradition question — check what the wiki already knows first. This prevents re-deriving synthesis that's already been captured, and surfaces contradictions or open questions to keep in mind.

---

## Adding a New Skill

Skills live in `.claude/skills/{skill-name}/SKILL.md`. The SKILL.md format:

```yaml
---
name: skill-name
description: One-sentence description (appears in the skill picker)
argument-hint: "<arg1> [--optional-flag]"
disable-model-invocation: true   # omit to allow nested model calls
user-invocable: true             # makes it appear in /skill-name tab completion
---

# /skill-name — Skill Title

[Instructions Claude follows when this skill is invoked]

$ARGUMENTS contains the arguments passed by the user.
```

File: `.claude/skills/{name}/SKILL.md` (the directory name is the invocation name).
