---
title: "Publishing to the Knowledge Base"
role: guide
format: manual
domain: opencosmos
tags: [knowledge-base, cli, publication, workflow, tooling]
audience: [creator, engineer]
complexity: foundational
summary: >
  Step-by-step guide to publishing documents to the OpenCosmos knowledge base
  using the publication CLI. Covers writing content, generating frontmatter,
  reviewing metadata, and understanding the automated git and sync workflow.
curated_at: 2026-03-12
curator: shalom
source: original
---

# Publishing to the Knowledge Base

This guide walks you through the full workflow for adding a document to the OpenCosmos knowledge base using the publication CLI.

## Before You Start

You need a markdown file containing the content you want to publish. Write the content only — no frontmatter. The CLI will generate frontmatter suggestions for you.

Best practices for preparing files to add to the corpus:

- One topic per document, one idea per section
- Use H2 headings for major sections or chapters
- Add a summary sentence after every H2
- Keep sections between 200-800 tokens for original writing. For public domain books and source texts with established chapter structures, preserve the original structure as-is — don't break chapters to fit token limits
- Define terms inline — a retrieved chunk may appear without context. For example, write "eudaimonia (human flourishing)" rather than just "eudaimonia" with the definition in a separate glossary

See the full guidelines in the [knowledge README](../README.md).

## Running the CLI

From the repository root:

```bash
pnpm knowledge:publish <path-to-your-file.md>
```

### Options

| Flag | What it does |
|------|-------------|
| `--role <role>` | Pre-set the document role (source, commentary, reference, guide, collection) |
| `--domain <domain>` | Pre-set the domain (buddhism, stoicism, ecology, opencosmos, etc.) |
| `--dry-run` | Show the generated frontmatter and final document without writing anything |
| `--no-push` | Commit locally but skip pushing to remote (useful when batching multiple documents) |
| `--no-webui` | Skip the Open WebUI upload step |

### Examples

Publish a Buddhist source text:

```bash
pnpm knowledge:publish ~/drafts/dhammapada.md --role source --domain buddhism
```

Preview what the CLI would generate without writing anything:

```bash
pnpm knowledge:publish ~/drafts/essay.md --dry-run
```

Batch multiple documents (commit each, push once at the end):

```bash
pnpm knowledge:publish ~/drafts/doc1.md --no-push
pnpm knowledge:publish ~/drafts/doc2.md --no-push
pnpm knowledge:publish ~/drafts/doc3.md
```

## What Happens When You Run It

The CLI follows a six-step workflow.

### Step 1: Read the content

The CLI reads your markdown file and strips any existing frontmatter. It uses the raw content only.

### Step 2: Generate frontmatter suggestions

The CLI sends your content to an LLM to generate metadata suggestions. It tries providers in this order:

1. **Local Apertus** — Ollama on the Dell Sovereign Node via Tailscale. Free, sovereign, no data leaves your network.
2. **Claude API** — Used when the Dell is offline. Requires `ANTHROPIC_API_KEY` in your environment.
3. **Manual** — If no LLM is available, you fill in every field by hand.

The LLM suggests values for: title, role, format, domain, tags, audience, complexity, summary, and source.

### Step 3: Interactive review

You review each suggested field and can accept or edit it. The CLI walks through every field one at a time. Nothing is written until you confirm.

### Step 4: Write the file

The CLI writes the final document (frontmatter + content) to:

```
knowledge/{role}s/{domain}-{slug}.md
```

For example, a Buddhist source text titled "The Dhammapada" becomes:

```
knowledge/sources/buddhism-the-dhammapada.md
```

### Step 5: Git commit and push

The CLI stages the new file, commits with a descriptive message, and pushes to the remote. This triggers:

- **GitHub Action** — syncs the document to Upstash Vector (embeddings for RAG retrieval)
- **Vercel rebuild** — updates the knowledge section at opencosmos.ai

Use `--no-push` to commit without pushing (useful when adding several documents in a batch).

### Step 6: Upload to Open WebUI

If the Dell Sovereign Node is reachable on Tailscale and `OPEN_WEBUI_API_KEY` is set, the CLI uploads the document to Open WebUI's local RAG. If the Dell is offline, this step is skipped gracefully.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | No | Enables Claude API as fallback LLM for frontmatter generation |
| `OPEN_WEBUI_API_KEY` | No | Enables upload to the Open WebUI local mirror on the Dell |

## Choosing the Right Role

If you're unsure which role to assign, use this decision tree:

- **Is this the original work itself?** Use `source`.
- **Does it analyze or interpret another work?** Use `commentary`.
- **Is it for looking up definitions or specifications?** Use `reference`.
- **Does it teach someone how to do something?** Use `guide`.
- **Does it organize or sequence other documents?** Use `collection`.

## Choosing the Right Domain

Use the domain that best represents the document's origin or primary tradition. If the document bridges two domains (e.g., "Buddhist Ethics and AI Alignment"), use `cross` as the domain and tag both source domains in the tags field.

Full domain list: buddhism, stoicism, sufism, taoism, vedic, indigenous, philosophy, ecology, science, psychology, literature, art, engineering, ai, opencosmos, cross.

## Troubleshooting

**"tsx: command not found"** — Run `pnpm install` from the repository root.

**LLM suggestions are empty or wrong** — Use `--dry-run` to preview, then run again without it. You can override every field during the interactive review.

**Git push fails** — Use `--no-push` to write and commit locally, then push manually when ready.

**Open WebUI upload skipped** — This is normal when the Dell is offline or sleeping. The document is still committed to git and will sync to cloud services via GitHub Actions.
