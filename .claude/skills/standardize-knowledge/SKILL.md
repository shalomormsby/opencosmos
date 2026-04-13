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

## Step 1: Identify Non-Standard Files

Run a grep to find files with non-standard heading patterns:

```bash
grep -rln "^CHAPTER\|^BOOK\|^PART\|^ACT\|^SCENE\|^PROLOGUE\|^EPILOGUE\|^[A-Z][A-Z ]\{5,\}" knowledge/sources/ knowledge/collections/
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

**Shakespeare special case:** The collected works file at `knowledge/collections/literature-shakespeare-collected-works.md` is 5.3MB. Before standardizing:
1. Alert the user: "Shakespeare collected works should be split into one file per play first (e.g. `knowledge/sources/shakespeare/midsummer-nights-dream.md`). Proceed with split first, then standardize? [yes/no]"
2. Wait for confirmation before proceeding with that file.

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
```

---

## Guiding Principles

- **Preserve content absolutely.** Only heading marker lines change. If uncertain whether a line is a heading or body text, leave it alone.
- **Occam's Razor.** Use the minimal number of heading levels the document's structure requires. Don't force 3-level nesting on a simple journal.
- **Flag before acting on edge cases.** If a file's structure is ambiguous, describe what you see and ask before editing.
- **One file at a time.** Do not batch-edit multiple files in a single Edit call. Process sequentially so each change can be reviewed.
