---
title: "Knowledge Tooling Overview"
role: guide
format: manual
domain: opencosmos
tags: [knowledge-base, tooling, workflow, cli, operations, wiki]
audience: [creator, engineer]
complexity: foundational
summary: >
  The master reference for all OpenCosmos knowledge base tools. Maps the full
  operational pipeline from staging raw text through formatting, publishing,
  health monitoring, and Dell sync. Start here to understand which tool to use
  and when.
curated_at: 2026-03-22
curator: shalom
source: original
related_docs:
  - guides/opencosmos-knowledge-publish-workflow.md
  - guides/opencosmos-knowledge-formatting-guide.md
  - guides/opencosmos-knowledge-health-report.md
  - guides/opencosmos-knowledge-dell-sync.md
---

# Knowledge Tooling Overview

The OpenCosmos knowledge base is maintained by a set of tools that handle the full lifecycle of a document: from raw text to formatted content, from formatted content to published corpus entry, and from published entry to synced mirrors. This guide maps the landscape.

## The Pipeline

A document flows through four stages:

```
1. Stage        Copy raw text into knowledge/incoming/
      │
2. Groom        /groom — add markdown structure, clean artifacts
      │
3. Publish      pnpm knowledge:publish — generate metadata, file, commit
      │
4. Sync         pnpm knowledge:sync-dell — mirror to Dell (on-demand)
```

Each stage has its own tool. You can enter the pipeline at any stage — if your text is already well-formatted, skip straight to publish.

## Quick Reference

| I want to... | Use this |
|---|---|
| Add raw text to the staging area | Copy/paste into `knowledge/incoming/` |
| Clean up formatting before publishing | `/groom` (Claude Code skill) |
| Publish a document to the corpus | `pnpm knowledge:publish` |
| See what the corpus looks like | `pnpm knowledge:health` |
| Sync to the Dell for local AI access | `pnpm knowledge:sync-dell` |
| Check what texts to import next | `pnpm knowledge:health` (import priority section) |

## The Tools

### `/groom` — Format Raw Text

A Claude Code skill that prepares raw text files for publication. It adds markdown headers, collapses excessive blank lines, cleans source artifacts (PDF page numbers, Gutenberg boilerplate), and bolds dialogue speaker names — while preserving every word of the original text.

**When to use it:** After pasting raw text into `knowledge/incoming/`, before running `knowledge:publish`. Especially useful for PDFs, Project Gutenberg texts, and web scrapes that arrive with formatting issues.

**Invocation:**

```
/groom                              # Process all files in knowledge/incoming/
/groom knowledge/incoming/file.md   # Process a specific file
/groom --dry-run                    # Analyze without writing
/groom --report                     # Show status of all incoming files
```

See the full guide: [Formatting Raw Text for Publication](opencosmos-knowledge-formatting-guide.md)

### `pnpm knowledge:publish` — Publish to the Corpus

The publication CLI. Takes a markdown file, generates YAML frontmatter via Claude API (title, domain, tags, author, era, etc.), writes it to the correct location in the corpus, creates a safe git branch, and optionally opens a PR.

**When to use it:** When a document is formatted and ready to enter the corpus. This is the main tool — everything else supports it.

**Quick start:**

```bash
pnpm knowledge:publish knowledge/incoming/dhammapada.md --role source --domain buddhism
```

Features beyond basic publishing:
- **Cross-reference suggestions** — scans existing documents and suggests `related_docs` connections
- **Curation log** — auto-appends an entry to `CURATION_LOG.md` with gaps served and graph impact
- **Collection auto-linking** — if the title matches a foundation collection placeholder, updates the checkbox

See the full guide: [Publishing to the Knowledge Base](opencosmos-knowledge-publish-workflow.md)

### `pnpm knowledge:health` — Corpus Health Report

The overhead map. Shows the current state of the knowledge corpus: how many documents exist, which domains are covered, which are empty, how well-connected the graph is, and what to import next.

**When to use it:** After publishing to see the impact, when planning what to import next, or periodically to assess corpus health.

```bash
pnpm knowledge:health
```

See the full guide: [Reading the Corpus Health Report](opencosmos-knowledge-health-report.md)

### `pnpm knowledge:sync-dell` — Dell Sovereign Node Sync

Uploads all knowledge documents to the Dell's Open WebUI RAG mirror for local AI inference. Decoupled from the publication flow — run it whenever the Dell is powered on and you want to catch up.

**When to use it:** After publishing new documents to the corpus, or whenever you power on the Dell and want the latest knowledge available locally.

```bash
pnpm knowledge:sync-dell             # Sync everything
pnpm knowledge:sync-dell --dry-run   # Preview what would be synced
```

See the full guide: [Syncing Knowledge to the Dell Sovereign Node](opencosmos-knowledge-dell-sync.md)

## Supporting Artifacts

### `knowledge/CURATION_LOG.md`

A living record of what was added to the corpus, when, and why it matters. Auto-appended by the publication CLI. Each entry records the document's metadata, what gap it fills in the corpus, and what new connections it enables in the knowledge graph.

### Foundation Collections

Four curated reading lists that define the intellectual lineage of the AI Triad voices (Sol, Socrates, Optimus, Cosmo). Each collection has placeholder entries (`- [ ] Text Title`) that track which texts still need to be imported. The publication CLI auto-links these when a matching document is published.

### `knowledge/incoming/`

The staging area for raw text. This directory is gitignored — files here are works in progress, not yet part of the corpus. Use `/groom` to format them, then `knowledge:publish` to move them into the corpus proper.

## Environment Variables

| Variable | Required for | Purpose |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | `knowledge:publish` | Claude API for frontmatter generation |
| `OPEN_WEBUI_API_KEY` | `knowledge:sync-dell` | Dell Open WebUI API access |

Both are set in the `.env` file at the repository root.
