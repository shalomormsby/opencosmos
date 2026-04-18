---
name: standardize-knowledge
description: Analyse and normalise heading structure across knowledge corpus documents to consistent H2/H3/H4 Markdown hierarchy for reliable RAG chunking.
argument-hint: "[path/to/file.md | all]"
disable-model-invocation: true
user-invocable: true
---

# /standardize-knowledge — Knowledge Document Standardization Skill

Convert non-standard heading formats in the knowledge corpus to a consistent Markdown hierarchy, enabling reliable H2/H3 chunking by the embed pipeline.

---

## Target Hierarchy

```
Document (frontmatter title — never a heading in the body)
│
├── ## Major Division          H2 — primary chunk boundary
│   (Book / Part / Play / Volume / essay section)
│   │
│   ├── ### Sub-division       H3 — secondary chunk boundary
│   │   (Chapter / Act / Scene group / named section within a division)
│   │   │
│   │   └── #### Minor break   H4 — in-chunk organisation, no embed split
│   │       (Scene / subsection / verse group)
│   │
│   └── ### Sub-division
│
└── ## Major Division
```

**Mapping by doc type:**

| Doc type | Depth | Maps to |
|----------|-------|---------|
| Short essay / wiki article | 1 | `##` only |
| Journal / autobiography (Fox) | 1 | `## Chapter I.` |
| Long philosophical work | 1–2 | `##` + `###` |
| Play collection (Shakespeare) | 2–3 | `## Play`, `### Act`, `#### Scene` |
| Scripture / annotated verse | 1–2 | `## Chapter`, `#### Verse group` |

---

## Step 0: Parse Arguments

Read `$ARGUMENTS`:
- If a file path is given → **single-file mode**: process only that file
- If `all` or empty → **corpus mode**: process all files in `knowledge/sources/` and `knowledge/collections/`

---

## Step 0.5: Frontmatter Enrichment Check

Before modifying any headings, verify each target file's frontmatter declares `work_type`. This field is required by the graph layer (`@opencosmos/constellation`) and by the `/split-collection` routing logic.

**Inference rules when `work_type` is missing:**

| Path prefix | Inferred `work_type` |
|-------------|---------------------|
| `knowledge/sources/` | `work` |
| `knowledge/collections/` | `collection` |
| `knowledge/references/` | `reference` |
| `knowledge/wiki/` | `wiki` |

For unambiguous files, insert `work_type: <inferred>` into the frontmatter directly beneath `title:`.

**Ambiguous cases — do not auto-backfill; flag for manual review:**
- A file in `sources/` whose frontmatter already declares `role: collection` (or vice versa).
- Multi-work monoliths awaiting a `/split-collection` pass (Shakespeare collected works, Khayyám + Salámán, Walden + Civil Disobedience).
- Files whose `title` does not match the apparent content (e.g. a collection file titled after a single work).

List every ambiguous file under **Files Requiring Manual Review** in the Step 6 report and skip the rest of this pipeline for them.

---

## Step 1: Identify Non-Standard Files

Run a grep to find files with non-standard heading patterns:

```bash
grep -rln "^CHAPTER\|^BOOK\|^PART\|^ACT\|^SCENE\|^PROLOGUE\|^EPILOGUE\|^[A-Z][A-Z ]\{5,\}" \
  knowledge/sources/ knowledge/collections/ knowledge/references/
```

For each matched file, note which pattern dominates.

**Common non-standard patterns and their standard equivalents:**

| Pattern found | Context | Standard form |
|--------------|---------|---------------|
| `CHAPTER I. Title` | top-level chapter | `## Chapter I. Title` |
| `CHAPTER I.` (no title) | top-level chapter | `## Chapter I` |
| `CHAPTER I.` inside a BOOK | nested chapter | `### Chapter I` |
| `BOOK I` / `PART I` | major division | `## Book I` / `## Part I` |
| `ACT I` / `ACT II` | division within play | `### Act I` |
| `SCENE I` / `SCENE II` | subdivision within act | `#### Scene I` |
| `PROLOGUE` / `EPILOGUE` | major section | `## Prologue` / `## Epilogue` |
| `ALL-CAPS TITLE` (full title line) | determine from context | `##` or `###` |

---

## Step 2: Analyse Each File's Structure

Before editing, read each flagged file to understand its nesting depth:

1. **1-level doc** (e.g. Fox Journal): only one tier of headings (all `CHAPTER X`) → map all to `##`
2. **2-level doc** (e.g. philosophical treatise with BOOK + CHAPTER): → `##` for BOOK, `###` for CHAPTER
3. **3-level doc** (e.g. Shakespeare play): → `##` for Play, `###` for Act, `####` for Scene

**Multi-work monolith special case.** If a file contains ≥2 works that a reader would cite separately (e.g. `knowledge/sources/literature-the-complete-works-of-william-shakespeare.md`, `literature-rub-iy-t-of-omar-khayy-m-and-sal-m-n-and-abs-l.md`, `philosophy-walden-and-on-the-duty-of-civil-disobedience.md`):

1. Alert the user: "This file is a multi-work monolith. Invoke `/split-collection <path>` first, then re-run `/standardize-knowledge` on each per-work output. Proceed with split now? [yes/no]"
2. On `yes`, delegate to `/split-collection`; skip further steps on the original file in this run (it will be rewritten as a slim collection index by `/split-collection`).
3. On `no`, list the file under **Files Requiring Manual Review** in the Step 6 report and continue with remaining files.

---

## Step 2b: Strip H1-in-body

Frontmatter `title` is the document's authoritative heading. Any `^# ` line appearing in the body before the first `^## ` is H1-title-drift and must be removed.

**Rule:**
- Locate the first heading line after the closing `---` of frontmatter.
- If that heading is `^# `, delete the line. If the immediately following line is blank, delete that blank line too.
- Repeat once more in the rare case a file has a stacked pair of H1s (e.g. `# Title` + `# Subtitle`) before the first `^## `.
- Do not touch anything else.

**Example — before:**

```markdown
---
title: The Prophet
work_type: work
---
# The Prophet

*By Kahlil Gibran*

## The Coming of the Ship
```

**Example — after:**

```markdown
---
title: The Prophet
work_type: work
---
*By Kahlil Gibran*

## The Coming of the Ship
```

---

## Step 3: Apply Transforms

For each file (after structure analysis):

1. Open the file
2. Apply heading-line transforms only — **do not touch body text**
3. Rules:
   - Only lines that are **solely** a heading marker (possibly with trailing text) are modified
   - Preserve all whitespace, paragraph breaks, and content
   - Convert to Title Case if the original is ALL-CAPS (e.g. `THE CONCLUSION` → `## The Conclusion`)
   - Preserve Roman numerals and numbers exactly as-is (e.g. `CHAPTER IV` → `## Chapter IV`)
   - If a heading already starts with `##`, leave it alone

**Line-by-line transform examples:**

```
# Before               → After
CHAPTER I.             → ## Chapter I
CHAPTER I. The Vision  → ## Chapter I. The Vision
BOOK II                → ## Book II
PART THREE             → ## Part Three
ACT I                  → ### Act I
SCENE II               → #### Scene II
THE CONCLUSION         → ## The Conclusion
                       (blank lines — untouched)
Some paragraph text.   (body text — untouched)
```

---

## Step 4: Verify Changes

After editing each file:

1. Count new `##` headings: `grep -c "^## " <file>`
2. Count new `###` headings: `grep -c "^### " <file>`
3. Report: "Converted X H2 headings, Y H3 headings, Z H4 headings in `<filename>`"
4. Confirm no body text was modified (spot-check first and last paragraph)

---

## Step 5: Check for YAML Frontmatter Issues

After editing, check for any YAML sequence items that may break the embed parser:

```bash
grep -n "^  - .*:.*[^\"']$" <file>
```

If found, quote the offending items (e.g. `  - targeted: resist injustices` → `  - "targeted: resist injustices"`).

---

## Step 5b: Required-Field Verification

After Steps 2b, 3, and 5, verify each modified file's frontmatter contains:

- `title` — non-empty string
- `work_type` — one of `work | collection | reference | wiki`

If either field is missing or empty, **do not consider the file standardized**. List it under **Files Failing Verification** in the Step 6 report with the specific missing field, and leave it for manual cleanup.

---

## Step 6: Report and Next Steps

Output a summary:

```
## /standardize-knowledge Report

**Date:** YYYY-MM-DD
**Mode:** single-file | corpus

### Files Modified
- knowledge/sources/foo.md — converted 23 CHAPTER headings to H2
- knowledge/sources/bar.md — converted 4 BOOK (H2) + 18 CHAPTER (H3) headings

### Files Skipped
- knowledge/sources/baz.md — already uses standard Markdown headings

### Files Requiring Manual Review
- knowledge/collections/literature-shakespeare-collected-works.md — needs splitting first

### Next Steps
1. Review the diffs above for any unintended changes
2. Run `pnpm embed` to re-index the updated files in Upstash Vector
3. Verify chunk counts improved (more granular chunks = better RAG retrieval)

### Required environment for `pnpm embed`
The embed script exits silently if these are unset. Before invoking, confirm
both are present in `apps/web/.env.local` (and in Vercel for production):
- `UPSTASH_VECTOR_REST_URL`
- `UPSTASH_VECTOR_REST_TOKEN`

Upstash handles embedding generation natively, so no OpenAI key is required.
```

---

## Guiding Principles

- **Preserve content absolutely.** Only heading marker lines change. If uncertain whether a line is a heading or body text, leave it alone.
- **Occam's Razor.** Use the minimal number of heading levels the document's structure requires. Don't force 3-level nesting on a simple journal.
- **Flag before acting on edge cases.** If a file's structure is ambiguous, describe what you see and ask before editing.
- **One file at a time.** Do not batch-edit multiple files in a single Edit call. Process sequentially so each change can be reviewed.
