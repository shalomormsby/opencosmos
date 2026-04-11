---
name: groom
description: Prepare raw markdown files in knowledge/incoming/ for publication to the knowledge base. Applies formatting cleanup (headers, spacing, structure) while preserving all original text. Also previews which wiki pages the new document will affect.
argument-hint: "[path] [--dry-run | --report | --force]"
disable-model-invocation: true
user-invocable: true
---

# /groom — Knowledge Base Formatting Skill

You are preparing raw text files in `knowledge/incoming/` for publication to the OpenCosmos knowledge base. Your job is formatting only — you must not rewrite, summarize, paraphrase, or alter any of the original content.

**Full pipeline:** stage → **`/groom`** → `pnpm knowledge:publish` → `/knowledge-compile log`

Your step covers formatting. After publish, `/knowledge-compile log` updates the knowledge wiki with any pages affected by the new document — run it immediately after publishing, not later.

## Critical: Always Use the Python Script

**All text transformations MUST go through `scripts/knowledge/groom.py`** — never use the Write or Edit tools to output transformed file content directly. This is required because the API content filtering policy blocks output of religious, philosophical, and sacred texts when passed through LLM tool calls. The Python script reads, transforms, and writes files in-process, bypassing this limitation entirely.

The script is persistent, version-controlled tooling — not a throwaway. It contains tested processors for every content type in the knowledge base.

## Invocation

- `/groom` — process all files in `knowledge/incoming/` (skip already-formatted and empty files)
- `/groom path/to/file` — process a specific file
- `/groom --dry-run` — analyze and report what would be done, without writing
- `/groom --report` — show the status of all files in `knowledge/incoming/`

Parse `$ARGUMENTS` to determine which mode to use. If `$ARGUMENTS` contains a file path, process that file. If it contains `--dry-run`, `--report`, or `--force`, apply those flags. Multiple flags can be combined.

---

## How It Works

### The groom script: `scripts/knowledge/groom.py`

Run it via:

```bash
# Process all incoming files
python3 scripts/knowledge/groom.py

# Process a specific file (can be anywhere, not just incoming/)
python3 scripts/knowledge/groom.py knowledge/sources/cross-the-prophet.md

# Dry run
python3 scripts/knowledge/groom.py --dry-run

# Force reprocess already-formatted files
python3 scripts/knowledge/groom.py --force path/to/file
```

The script handles:
- **Idempotency**: Skips files whose first non-blank line starts with `# ` (override with `--force`)
- **Frontmatter preservation**: If a file has YAML frontmatter (`---`), it is preserved and reattached after processing
- **Content routing**: Each file is matched by filename stem to a registered processor
- **Hard line-wrap unwrapping**: Joins consecutive non-blank lines into flowing paragraphs while preserving headings, indented text, blockquotes, footnotes, and separators
- **Gutenberg artifact stripping**: Publisher metadata, conventions notes, license text, `[Illustration]` markers, `[Sidenote]` markers, page markers
- **Blank line collapsing**: 3+ consecutive blank lines → 1

### Content type processors

| Processor | Used for | Key behaviors |
|-----------|----------|---------------|
| `dialogue` | Standard Plato/Jowett dialogues | Strip TOC, convert INTRODUCTION → ##, bold speakers |
| `laws` | Plato's Laws | INTRODUCTION AND ANALYSIS, EXCURSUS, BOOK I-XII |
| `republic` | Plato's Republic | Publisher title page, sidenotes, Stephanus numbers, page markers, line unwrapping |
| `heart_sutra` | Heart Sutra | Minimal: H1 + preserve verse structure |
| `tao` | Tao Te Ching | Chapter numbers (ONE through EIGHTY-ONE) → ## headers |
| `poetry` | Leaves of Grass, etc. | Preserve line breaks/indentation, BOOK → ## headers |
| `prophet` | The Prophet | Strip [Illustration], unwrap ~40-char hard wraps, ### chapter titles |
| `scientific` | Gaia Hypothesis, etc. | Unwrap PDF columns, section headers → ## |
| `generic` | Unregistered files | Gutenberg strip + unwrap + collapse blanks |

### File registry

New files must be registered in the `FILE_REGISTRY` dict in `groom.py` to get content-type-specific processing. Unregistered files fall through to the generic processor.

---

## Step 0: Copyright and Ethical Review

Before formatting, assess the copyright status of every file in `knowledge/incoming/`. This is a gate — copyrighted works must not enter the corpus as full-text sources.

For the full ethical framework, see [Ethical Curation Guide](../../../knowledge/guides/opencosmos-knowledge-ethical-curation.md).

**For each incoming file, determine:**

1. **Is this work in the public domain?** (Ancient text with public domain translation, pre-1929, or explicitly open-licensed.) If yes → proceed to formatting. The `corpus_tier` will be `source`.

2. **Is this a copyrighted work?** (Modern author, copyrighted translation, active copyright.) If yes → **stop**. Do not format this file for corpus inclusion. Instead:
   - **Flag it** in the report as requiring ethical review.
   - **Recommend the appropriate tier:** `commentary` (original overview with limited fair-use quotation) or `reference` (pointer only, no reproduction).
   - The curator must write an original commentary or reference document — the copyrighted text itself does not enter the corpus.

3. **Translation trap:** Many ancient texts are public domain, but their popular English translations are copyrighted. Always verify the *specific translation*, not just the original work. Project Gutenberg texts are safe. Modern scholarly translations often are not.

**The ethical test:** Does including this text honor the author? Does it drive people toward the original work, or replace it? OpenCosmos amplifies — it does not extract.

Report copyright status in the `/groom` output under a `### Copyright Review` section.

---

## Step 1: Before Running

Before running the script, analyze the incoming files:

1. **Check for new/unregistered files**: Run `--report` or `--dry-run` first. If a file triggers the "No registered processor" warning, you need to add it to `FILE_REGISTRY` in `groom.py` before processing.

2. **For new content types**: If a new file doesn't fit any existing processor, add a new processor function to `groom.py` following the existing patterns. Then register it in `FILE_REGISTRY`.

3. **File size awareness**: The script handles all sizes — no need for tier-based strategy decisions. The Python approach works uniformly.

---

## Step 2: Run the Script

```bash
# Recommended: dry run first
python3 scripts/knowledge/groom.py --dry-run

# Then process
python3 scripts/knowledge/groom.py
```

Or for a specific file:

```bash
python3 scripts/knowledge/groom.py knowledge/sources/cross-the-prophet.md --force
```

---

## Step 3: Spot-Check

After the script runs:

1. Read the **first 30 lines** of each processed file (verify H1 title, attribution, no leftover metadata)
2. Read the **last 30 lines** (verify no Gutenberg boilerplate survived)
3. For large files (Republic, Laws, Leaves of Grass), also check **2-3 section transitions** (Book/chapter boundaries)
4. Verify text **reflows naturally** (no hard line breaks mid-sentence)

If issues are found, fix the processor in `groom.py` and re-run with `--force`.

---

## Step 4: Report

After processing, output a structured summary (the script prints this automatically):

```
## /groom Report

### Copyright Review
- filename — public domain (source: Project Gutenberg) → tier: source ✓
- filename — copyrighted (author, year) → FLAGGED: requires commentary or reference tier

### Processed
- filename (type, N lines) — changes applied

### Already formatted (skipped)
- filename — reason

### Empty (skipped)
- filename — 0 bytes

### Observations
- Files lacking .md extension: [list]
- Naming convention issues: [list]

### Wiki Impact Preview
For each successfully processed file, scan `knowledge/wiki/index.md` and identify which existing wiki pages this document will likely affect after publishing. Look for matching entities (authors, traditions), concepts (themes, ideas), and connections (cross-tradition comparisons).

- filename → affects: wiki/entities/plato.md (adds a new dialogue to synthesizes list)
- filename → affects: wiki/concepts/impermanence.md (adds Buddhist source support)
- filename → creates opportunity: wiki/concepts/virtue.md (not yet written — this source would ground it)

**Next step:** After `pnpm knowledge:publish`, run `/knowledge-compile log` to update these pages.
```

---

## Step 5: After Publishing

Once `pnpm knowledge:publish` completes:

```
/knowledge-compile log
```

This scans the CURATION_LOG for entries added since the last wiki update and updates (or creates) affected wiki pages. Do this immediately — the trigger is "just published something new."

If the new document introduces a theme or concept with no existing wiki page, `/knowledge-compile log` will create one at `confidence: speculative`. Run `/knowledge-review` periodically to promote pages as coverage deepens.

---

## Formatting Rules Reference

These rules are implemented in the Python script. They're documented here for reference when adding new processors.

### Universal rules (all content types)

1. **H1 title**: `# Title` (Title Case if source is ALL CAPS). Author/translator on next line as `*By Author Name*`.
2. **Collapse excessive blank lines**: 3+ → 1. Keep exactly one blank line between paragraphs and before/after headers.
3. **No frontmatter**: Do not add YAML frontmatter. The publication CLI handles that.
4. **Preserve all original text**: Every word of the source text must remain.
5. **File extensions**: Note missing `.md` in report but do not rename.
6. **Unwrap hard line breaks**: Join consecutive non-blank lines into flowing paragraphs. Preserve headings, indented text, blockquotes, bold lines, footnotes, separators.

### Dialogues (Plato/Jowett translations)

- `TITLE` → `# Title` (Title Case)
- `by Plato` → `*By Plato*`, `Translated by Benjamin Jowett` → `*Translated by Benjamin Jowett*`
- `INTRODUCTION.` → `## Introduction`
- Dialogue title (ALL CAPS after Introduction) → `## Title`
- Speaker names: `SOCRATES:` → `**SOCRATES:**` (only at line start)
- Strip Project Gutenberg boilerplate
- **No H3 subsections** within Introduction or dialogue text
- **Exception — Timaeus**: Convert `Section N.` → `### Section N`
- **Exception — Laws**: Has EXCURSUS, BOOK I-XII

### The Republic

- Strip publisher title page (before PREFACE)
- `PREFACE` → `## Preface`, `INTRODUCTION AND ANALYSIS` → `## Introduction and Analysis`
- `BOOK I`-`BOOK X` → `## Book I`-`## Book X`
- Remove `[Sidenote: ...]` and `[Sidenote; ...]` markers
- Convert Stephanus `*NNN*` → `[NNN]`
- Remove page markers `{NNN}` and `{roman}`
- Remove malformed markers (`ccxxxi}`, `(308}`)
- Unwrap hard-wrapped lines

### Poetry

- Preserve all line breaks and indentation exactly
- `BOOK N` → `## Book N`, section titles → `### Title`
- Epigraphs → blockquote with `>`

### Scripture

- Chapter/section divisions → `## Chapter/Section Name`
- Preserve verse structure exactly

### Scientific / Encyclopedia

- Section headings → `## Section` / `### Subsection`
- Join broken PDF column wrapping
- Remove metadata artifacts

---

## What You Must NOT Do

1. **Do not use Write/Edit tools to output transformed text.** Always use the Python script.
2. **Do not rewrite or paraphrase any text.** Not a single word.
3. **Do not add summary sentences** after headers.
4. **Do not add frontmatter.** The publication CLI handles that.
5. **Do not rename or move files.** Report naming issues but let the user handle them.
6. **Do not delete originals.** The script overwrites in place.
7. **Do not split files** into multiple files.
8. **Do not add content** that isn't in the source.
9. **Do not delete `groom.py`** — it is persistent, reusable tooling.
