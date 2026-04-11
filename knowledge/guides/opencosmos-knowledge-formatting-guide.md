---
title: "Formatting Raw Text for Publication"
role: guide
format: manual
domain: opencosmos
tags: [knowledge-base, formatting, groom, text-preparation, markdown, tooling]
audience: [creator, engineer]
complexity: foundational
summary: >
  How to prepare raw text files for publication to the knowledge base using
  the /groom Claude Code skill. Covers content type detection, formatting
  rules for dialogues, poetry, scripture, and scientific texts, and the
  large file strategy for works exceeding 8,000 lines.
curated_at: 2026-03-22
curator: shalom
source: original
corpus_tier: source
related_docs:
  - guides/opencosmos-knowledge-tooling-overview.md
  - guides/opencosmos-knowledge-publish-workflow.md
  - guides/opencosmos-knowledge-health-report.md
---

# Formatting Raw Text for Publication

Raw text arrives in `knowledge/incoming/` from many sources: PDF pastes, Project Gutenberg downloads, web scrapes, book scans. Before the publication CLI can process it effectively, the text needs markdown structure — headers, spacing, cleaned-up artifacts. The `/groom` skill automates this.

## When to Groom

Groom a file when:
- It was pasted from a PDF and has page markers, broken line wrapping, or missing headers
- It's a Project Gutenberg text with publisher boilerplate, excessive blank lines, or ALL CAPS titles
- It's a web scrape with contributor lists, image references, or license blocks at the end
- It's plain text with no markdown structure at all

Skip grooming when:
- The file already has `#` headers at appropriate levels
- You wrote the content yourself with proper markdown formatting
- The file is empty (nothing to groom)

## Using the `/groom` Skill

In Claude Code, invoke the skill with:

```
/groom                                    # Process all files in knowledge/incoming/
/groom knowledge/incoming/euthyphro       # Process a specific file
/groom --dry-run                          # Analyze and report without writing
/groom --report                           # Show status table of all incoming files
/groom --force                            # Re-process already-formatted files
```

The skill analyzes each file to determine its content type and size, then applies the appropriate formatting rules. It preserves every word of the original text — it only adds markdown structure around it.

## What Gets Formatted

### Universal Rules (All Content Types)

1. **Title**: The first line becomes an H1 heading (`# Title`). ALL CAPS titles are converted to Title Case.
2. **Author/translator**: Formatted as italic on the line below the title (`*By Author Name*`).
3. **Blank lines**: Runs of 3+ consecutive blank lines collapse to a single blank line.
4. **No frontmatter added**: The publication CLI handles YAML metadata. Grooming adds only markdown structure.

### Dialogues (Plato/Jowett Translations)

The Plato dialogues from Project Gutenberg have a consistent structure that `/groom` recognizes:

| Original | Formatted |
|---|---|
| `EUTHYPHRO` | `# Euthyphro` |
| `by Plato` | `*By Plato*` |
| `Translated by Benjamin Jowett` | `*Translated by Benjamin Jowett*` |
| `INTRODUCTION.` | `## Introduction` |
| `EUTHYPHRO` (second occurrence) | `## Euthyphro` |
| `SOCRATES:` (at start of paragraph) | `**SOCRATES:**` |

Jowett's introductions are continuous analytical essays — `/groom` does not add subsection headers within them. The same applies to the dialogue text. Speaker names are bolded only when they appear at the start of a line followed by a colon.

Project Gutenberg boilerplate at the end (conventions notes, encoding info, license) is stripped.

### Poetry

Poetry formatting preserves all line breaks and indentation exactly — these are part of the art.

| Element | Formatting |
|---|---|
| Collection title | `# Title` |
| Author | `*By Author Name*` |
| Epigraph/dedication | Blockquote (`>`) |
| Book/section division | `## Book Title` |
| Individual poem title | `### Poem Title` |
| Table of contents | `## Contents` with book headers bolded |

### Scripture

| Element | Formatting |
|---|---|
| Title | `# Title` |
| Source/translator | `*Translated by Name*` |
| Chapter/section | `## Chapter Name` |
| Verse text | Preserved exactly |

### Scientific / Encyclopedia

| Element | Formatting |
|---|---|
| Title | `# Title` |
| Section headings | `## Section` / `### Subsection` |
| Broken lines (PDF wrapping) | Joined into complete sentences |
| Data tables | Markdown table format |
| Block quotes | `>` prefix |
| Book titles in references | Italicized |
| Metadata artifacts | Removed (page markers, contributor lists, license blocks) |

## Large File Strategy

Files are processed differently based on size:

| Size | Strategy | How it works |
|---|---|---|
| < 3,000 lines | Direct | Read the whole file, apply transformations with Edit tool |
| 3,000-8,000 lines | Chunked | Find section boundaries, process each section separately |
| > 8,000 lines | Script | Generate a temporary Python script, run it, spot-check, delete |

For very large files (like The Republic at 29,000+ lines), `/groom` generates a Python script that applies all transformations programmatically. After running it, the skill spot-checks the output at key transition points before cleaning up the script.

## Manual Formatting Tips

For cases `/groom` doesn't handle, or when you prefer to format by hand:

- **One H1 per document**: The title. Everything else is H2 or below.
- **H2 for major divisions**: Chapters, books, main sections.
- **H3 for subsections**: Only when the source text has explicit sub-structure.
- **Don't over-section**: Jowett's introductions and Plato's dialogues are continuous prose. Adding arbitrary headers damages the text's flow.
- **Preserve original structure**: For public domain texts with established chapter organization, keep the original structure. Don't restructure to fit arbitrary section-length targets.
- **One blank line between paragraphs**: Not two, not zero.
- **No trailing whitespace**: Clean lines.

## After Grooming

Once a file is formatted, publish it:

```bash
pnpm knowledge:publish knowledge/incoming/euthyphro-plato --role source --domain philosophy
```

The publication CLI generates frontmatter, moves the file to its correct location, and handles the git workflow. See the [Publishing Guide](opencosmos-knowledge-publish-workflow.md) for the full workflow.
