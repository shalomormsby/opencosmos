---
title: "Reading the Corpus Health Report"
role: guide
format: manual
domain: opencosmos
tags: [knowledge-base, health-report, corpus, metrics, tooling, graph]
audience: [creator, engineer]
complexity: foundational
summary: >
  How to run and interpret the corpus health report (pnpm knowledge:health).
  Explains each section of the report — overview metrics, domain and role
  coverage, foundation collection progress, cross-reference integrity,
  island detection, and import priority scoring.
curated_at: 2026-03-22
curator: shalom
source: original
related_docs:
  - guides/opencosmos-knowledge-tooling-overview.md
  - guides/opencosmos-knowledge-publish-workflow.md
  - guides/opencosmos-knowledge-formatting-guide.md
---

# Reading the Corpus Health Report

The corpus health report gives you the overhead map of the knowledge base — which shelves are full, which are empty, where pathways exist and where they don't. Run it to understand the current state and decide what to do next.

## Running the Report

From the repository root:

```bash
pnpm knowledge:health
```

No arguments needed. The report scans all documents in the `knowledge/` directory (sources, commentary, references, guides, collections) and prints a structured analysis to the terminal.

## Report Sections

### Overview

```
── Overview ────────────────────────────────────────────
   Documents:       11
   Domains active:  3 / 16
   Cross-refs:      5
   Graph density:   4.5%
```

- **Documents**: Total number of published documents across all roles (sources, guides, collections, etc.).
- **Domains active**: How many of the 16 available domains have at least one document. The full domain list: buddhism, stoicism, sufism, taoism, vedic, indigenous, philosophy, ecology, science, psychology, literature, art, engineering, ai, opencosmos, cross.
- **Cross-refs**: Total count of all `related_docs` references across the corpus.
- **Graph density**: Cross-refs as a percentage of maximum possible connections. A fully connected graph of N documents would have N*(N-1) directed edges. Early in the corpus's life, density will be low — that's expected.

### Domain Coverage

```
── Domain Coverage ─────────────────────────────────────
   opencosmos     ████████████████████ 5
   cross          ████████████ 3
   buddhism       ████ 1
   stoicism        (empty)
   sufism          (empty)
   ...
```

A visual bar chart showing how many documents exist in each domain. Empty domains are flagged. Use this to identify gaps — if a foundation collection references stoic texts but the stoicism domain is empty, that's a priority.

### Role Coverage

```
── Role Coverage ───────────────────────────────────────
   source         3
   commentary     0
⚠️ reference      0
   guide          5
   collection     4
```

How many documents exist in each role category. A warning icon appears for roles with zero documents. A healthy corpus has sources as the foundation, commentary building on sources, and references for quick lookup.

### Foundation Collection Progress

```
── Foundation Collection Progress ──────────────────────
   sol foundations
   ░░░░░░░░░░░░░░░░░░░░ 0/12 (0%)
   socrates foundations
   ░░░░░░░░░░░░░░░░░░░░ 0/10 (0%)
   optimus foundations
   ░░░░░░░░░░░░░░░░░░░░ 0/8 (0%)
   cosmo foundations
   ░░░░░░░░░░░░░░░░░░░░ 0/6 (0%)
```

Each foundation collection has placeholder entries (`- [ ] Text Title`) for texts that need to be imported. This section shows progress bars — how many placeholders have been filled (converted to `- [x]` links by the publication CLI) versus how many remain.

When a source text is published whose title matches a placeholder, the CLI automatically checks the box and adds a link. This section tracks that progress across all four collections.

### Cross-Reference Integrity

```
── Cross-Reference Integrity ───────────────────────────
   ✅ All cross-references resolve correctly.
```

or:

```
   ⚠️  2 broken references:
      sources/buddhism-the-dhammapada.md → commentary/deleted-doc.md (not found)
```

Validates that every `related_docs` path in every document's frontmatter points to a file that actually exists. Broken references happen when documents are renamed, moved, or deleted without updating the documents that link to them.

### Islands (Zero Connections)

```
── Islands (Zero Connections) ──────────────────────────
   ⚠️  3 islands:
      The Dhammapada (sources/buddhism-the-dhammapada.md)
      The Prophet (sources/cross-the-prophet.md)
```

A document is an "island" if no other document references it AND it references no other documents. Islands are disconnected from the knowledge graph — they exist but aren't woven into the web of relationships.

To fix an island, add it to relevant documents' `related_docs` lists, or add `related_docs` to the island document's own frontmatter.

### Import Priority

```
── Import Priority (Top Texts to Add Next) ────────────
   1. Meditations (Marcus Aurelius)
      Referenced in: sol foundations, socrates foundations | Score: 5
   2. Tao Te Ching
      Referenced in: sol foundations, cosmo foundations | Score: 4
   3. Rumi — Selected Poems
      Referenced in: sol foundations | Score: 3
```

The top texts to import next, scored by:
- **Collection mentions** (+1 per foundation collection that references the text)
- **New domain bonus** (+2 if importing the text would create a new active domain)

Texts that appear in multiple foundation collections score highest — they're cross-domain bridge texts that serve multiple voices in the AI Triad.

## When to Run It

- **After publishing**: See the impact of your new addition on domain coverage and graph density.
- **Planning what to import next**: The import priority section tells you which texts have the highest leverage.
- **Periodic check-up**: Run it weekly or before a batch of imports to understand the current landscape.
- **After refactoring**: If you've renamed or reorganized documents, check cross-reference integrity.

## Acting on the Report

| Report says | Action |
|---|---|
| Domain is empty | Import a source text from that tradition |
| Commentary is zero | Write analysis connecting existing source texts |
| Foundation progress is low | Import the top texts from import priority |
| Broken references exist | Update or remove the stale `related_docs` entries |
| Islands detected | Add cross-references to connect the island to related documents |
| Graph density is low | Add `related_docs` to existing documents; the publish CLI suggests these automatically |
