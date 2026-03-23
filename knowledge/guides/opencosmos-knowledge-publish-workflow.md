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
  reviewing metadata, and the safe branch-based git workflow.
curated_at: 2026-03-22
curator: shalom
source: original
---

# Publishing to the Knowledge Base

This guide walks you through the full workflow for adding a document to the OpenCosmos knowledge base using the publication CLI.

## Quick Start

1. **Copy your text.** Find the source text you want to add (a webpage, PDF, book excerpt, etc.) and copy the content to your clipboard.

2. **Create a markdown file.** Save it anywhere — a good default is the `knowledge/incoming/` directory at the repo root:

   ```bash
   # Create the staging directory if it doesn't exist
   mkdir -p knowledge/incoming

   # Create your file and paste the content
   # (or use your editor — VS Code, vim, etc.)
   pbpaste > knowledge/incoming/dhammapada.md
   ```

   The file should contain only the text content — no frontmatter, no metadata. Just the words. The CLI will handle the rest.

3. **Run the CLI.** From the repository root:

   ```bash
   pnpm knowledge:publish knowledge/incoming/dhammapada.md --role source --domain buddhism
   ```

   Or let Claude figure out the metadata for you:

   ```bash
   pnpm knowledge:publish knowledge/incoming/dhammapada.md --accept
   ```

4. **Review and merge.** The CLI creates a branch and pushes it. Add `--pr` to auto-create a GitHub PR, or create one manually.

That's it. The CLI generates frontmatter via Claude, writes the file to the correct location in `knowledge/`, creates a safe git branch, commits, and pushes.

## Preparing Content

The CLI needs a `.md` file with content only — no frontmatter needed. A few guidelines:

- One topic per document, one idea per section
- Use H2 headings for major sections or chapters
- Add a summary sentence after every H2
- Keep sections between 200-800 tokens for original writing. For public domain books and source texts with established chapter structures, preserve the original structure as-is — don't break chapters to fit token limits
- Define terms inline — a retrieved chunk may appear without context. For example, write "eudaimonia (human flourishing)" rather than just "eudaimonia" with the definition in a separate glossary

See the full guidelines in the [knowledge README](../README.md).

## Running the CLI

From the repository root:

```bash
pnpm knowledge:publish <file...>
```

### Options

| Flag | What it does |
|------|-------------|
| `--role <role>` | Pre-set the document role (source, commentary, reference, guide, collection) |
| `--domain <domain>` | Pre-set the domain (buddhism, stoicism, ecology, opencosmos, etc.) |
| `--accept` | Accept Claude's frontmatter suggestions without interactive review |
| `--branch <name>` | Custom git branch name (default: `knowledge/{date}-{slug}`) |
| `--pr` | Create a GitHub PR after pushing |
| `--dry-run` | Show the generated frontmatter and final document without writing anything |
| `--no-push` | Commit locally but skip pushing to remote |

### Examples

Publish a Buddhist source text:

```bash
pnpm knowledge:publish ~/drafts/dhammapada.md --role source --domain buddhism
```

Preview what the CLI would generate without writing anything:

```bash
pnpm knowledge:publish ~/drafts/essay.md --dry-run
```

Publish multiple documents at once (one branch, one commit, one PR):

```bash
pnpm knowledge:publish ~/drafts/*.md --accept --pr
```

Trust Claude's suggestions and publish without review:

```bash
pnpm knowledge:publish ~/drafts/rumi-poems.md --role source --domain sufism --accept
```

## What Happens When You Run It

The CLI follows a streamlined workflow.

### Step 1: Safety check

Before doing anything, the CLI checks for uncommitted changes to tracked files. If any exist, it asks you to commit or stash them first. This prevents accidental data loss.

### Step 2: Generate frontmatter

The CLI sends your content to Claude API to generate metadata suggestions (title, role, format, domain, tags, audience, complexity, summary, source). Requires `ANTHROPIC_API_KEY` in your `.env`. If no API key is available, you fill in fields manually.

### Step 3: Review

You see all the suggested frontmatter at once and choose:

- **Accept all** — use the suggestions as-is
- **Edit in $EDITOR** — opens the full frontmatter as YAML in your editor (vim, nano, VS Code, etc.) for fine-tuning
- **Cancel** — abort without writing

Or use `--accept` to skip this step entirely and trust Claude's output.

### Step 4: Write the file

The CLI writes the final document (frontmatter + content) to:

```
knowledge/{role}s/{domain}-{slug}.md
```

For example, a Buddhist source text titled "The Dhammapada" becomes:

```
knowledge/sources/buddhism-the-dhammapada.md
```

### Step 5: Safe git workflow

The CLI creates a **new branch** (never pushes to main), commits the file(s), and pushes:

1. Creates branch `knowledge/{date}-{slug}` (or custom name with `--branch`)
2. Stages only the published files (never `git add .`)
3. Commits with message: `docs(knowledge): add {domain} {role} — {title}`
4. Pushes to remote
5. Optionally creates a PR (with `--pr`)
6. Returns to your original branch

Use `--no-push` to commit locally without pushing.

After pushing, the branch triggers:

- **GitHub Action** — syncs the document to Upstash Vector (embeddings for RAG retrieval)
- **Vercel rebuild** — updates the knowledge section at opencosmos.ai (once the PR is merged)

## Dell Sync (Separate Command)

The Dell Sovereign Node sync is decoupled from the publication flow. When you want to sync knowledge documents to Open WebUI on the Dell:

```bash
pnpm knowledge:sync-dell
```

This uploads all knowledge documents to the Dell's Open WebUI RAG mirror. Run it whenever the Dell is powered on and you want to catch up.

```bash
pnpm knowledge:sync-dell --dry-run   # Preview what would be synced
```

Requires: Dell on and reachable via Tailscale, `OPEN_WEBUI_API_KEY` in `.env`.

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Recommended | Enables Claude API for frontmatter generation |
| `OPEN_WEBUI_API_KEY` | No | Enables Dell sync (`pnpm knowledge:sync-dell`) |

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

**LLM suggestions are empty or wrong** — Use `--dry-run` to preview, then run again without it. Choose "Edit in $EDITOR" during review to correct any field.

**Git push fails** — Use `--no-push` to write and commit locally, then push manually when ready.

**Uncommitted changes warning** — The CLI won't run if you have uncommitted tracked changes. Commit or stash them first. This is a safety feature to prevent data loss.
