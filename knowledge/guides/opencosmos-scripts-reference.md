---
title: "OpenCosmos Scripts Reference"
role: guide
format: manual
domain: opencosmos
corpus_tier: source
tags: [scripts, cli, terminal, automation, knowledge-management, publishing, health, byok, cosmo]
audience: [engineer, creator, general]
complexity: foundational
summary: >
  Reference guide for all automation scripts in the OpenCosmos repo. Covers what scripts
  are, how to run them from Terminal, and the full usage reference for each script —
  knowledge publication, corpus health, Dell sync, Cosmo voice testing, and BYOK diagnostics.
curated_at: 2026-04-11
curator: shalom
source: original
related_docs:
  - guides/opencosmos-knowledge-publish-workflow.md
  - guides/opencosmos-knowledge-health-report.md
  - guides/opencosmos-knowledge-formatting-guide.md
---

# OpenCosmos Scripts Reference

Automation scripts live in the `scripts/` directory at the repo root. This guide explains what they are, how to run them, and what each one does.

---

## What Is a Script?

A script is a program you run from your terminal to automate a task. Instead of clicking through a UI, you type a command and the script does the work — generating metadata, publishing files, checking for broken links, syncing to hardware, or querying a database.

In this repo, scripts are TypeScript files run by [`tsx`](https://github.com/privatenumber/tsx), a tool that executes TypeScript directly without a separate compilation step. Most scripts have a named shorthand registered in `package.json` and are invoked via `pnpm`. A few are run directly with `pnpm tsx`.

---

## How to Open Terminal and Navigate to the Repo

On macOS, open Terminal with `Cmd + Space`, type "Terminal", and press Enter. Alternatively, open it from Finder: **Applications → Utilities → Terminal**.

Once Terminal is open, navigate to the repo:

```bash
cd ~/Developer/opencosmos
```

All `pnpm` commands in this guide should be run from the repo root (`opencosmos/`). If you see an error like "command not found: pnpm", install it with:

```bash
npm install -g pnpm
```

---

## How pnpm Scripts Work

`pnpm` is the package manager for this repo. It provides two ways to run scripts:

**Named scripts** — shortcuts defined in `package.json`:

```bash
pnpm knowledge:health
pnpm knowledge:publish
pnpm knowledge:sync-dell
```

**Direct execution** — for scripts without a named shorthand:

```bash
pnpm tsx scripts/test-cosmo-voice.ts "your question here"
pnpm tsx scripts/check-byok-flags.ts
```

`tsx` runs a TypeScript file directly. Think of it as "node, but for TypeScript."

---

## Where Scripts Live

```
opencosmos/
└── scripts/
    ├── knowledge-health.ts        # pnpm knowledge:health
    ├── publish-knowledge.ts       # pnpm knowledge:publish
    ├── sync-dell.ts               # pnpm knowledge:sync-dell
    ├── test-cosmo-voice.ts        # pnpm tsx scripts/test-cosmo-voice.ts
    ├── check-byok-flags.ts        # pnpm tsx scripts/check-byok-flags.ts
    └── knowledge/                 # shared implementation modules (not directly runnable)
        ├── shared.ts              # constants, types, corpus scanner
        ├── frontmatter.ts         # Claude API frontmatter generation
        ├── git.ts                 # safe git operations
        └── dell-sync.ts           # Open WebUI upload logic
```

The files in `scripts/knowledge/` are library modules used internally by the scripts above. They are not directly runnable.

---

## Script Reference

### `pnpm knowledge:health` — Corpus Health Report

Prints a full health report of the knowledge corpus. Run this to understand the current state of the corpus at a glance, or to find problems before they accumulate.

**What it checks:**

| Section | What it shows |
|---------|---------------|
| Overview | Document count, active domains, total cross-references, graph density |
| Domain Coverage | How many documents exist per domain (bar chart) |
| Role Coverage | Count per role — flags if any role has zero documents |
| Foundation Collection Progress | Checklist completion % for each AI Triad foundation collection |
| Cross-Reference Integrity | Broken `related_docs` entries in frontmatter |
| Islands | Documents with no incoming or outgoing connections |
| Import Priority | Top texts to add next, scored by collection demand |
| Broken Body Links | Inline markdown links in document bodies that resolve to nothing |

**Usage:**

```bash
pnpm knowledge:health
```

No flags. Run it any time to get the full picture.

**What "Broken Body Links" catches:** Inline markdown links in the body of any knowledge document where the target file does not exist. Handles both site-absolute paths (`/knowledge/guides/foo`) and relative `.md` links. Skips `incoming/`, external URLs, and anchor-only links. This is the check that caught the broken link in `opencosmos-skills-reference.md` (a bare filename used instead of the correct route).

**Source:** `scripts/knowledge-health.ts`

---

### `pnpm knowledge:publish` — Knowledge Publication CLI

The primary tool for adding new documents to the corpus. It handles frontmatter generation, review, file placement, curation logging, collection auto-linking, and git operations — all in one command.

**Typical workflow:**

```bash
# Drop a raw text file into the staging area
pbpaste > knowledge/incoming/my-document.md

# Run the CLI — Claude generates all metadata
pnpm knowledge:publish

# Review the proposed frontmatter, accept or edit it, done.
```

If no file is specified, the CLI automatically discovers all `.md` files in `knowledge/incoming/`.

**What it does, step by step:**

1. Reads the document content
2. Calls the Claude API to generate enriched frontmatter (title, role, format, domain, tags, audience, complexity, summary, author, era, tradition)
3. Presents the frontmatter for your review — accept, open in `$EDITOR`, or cancel
4. Suggests cross-references based on tag and domain overlap with existing corpus
5. Writes the document to `knowledge/{role}s/{domain}-{slug}.md`
6. Appends to `CURATION_LOG.md`
7. Checks off matching placeholders in foundation collection files
8. Creates a git branch, commits, and pushes (optionally opens a PR)
9. Cleans up the source file from `incoming/`

**Flags:**

| Flag | Effect |
|------|--------|
| `--role <role>` | Pre-set the document role (`source`, `commentary`, `guide`, etc.) |
| `--domain <domain>` | Pre-set the domain (`philosophy`, `buddhism`, `opencosmos`, etc.) |
| `--accept` | Accept Claude's frontmatter without interactive review |
| `--dry-run` | Preview everything without writing, committing, or pushing |
| `--no-push` | Commit locally but do not push to remote |
| `--no-clean` | Keep source files in `incoming/` after publishing |
| `--pr` | Automatically create a GitHub PR after pushing |
| `--branch <name>` | Custom git branch name |

**Examples:**

```bash
pnpm knowledge:publish --accept                          # auto-import from incoming/, no review
pnpm knowledge:publish --dry-run                         # preview without writing anything
pnpm knowledge:publish ~/drafts/dhammapada.md --role source --domain buddhism
pnpm knowledge:publish ~/drafts/*.md --accept --pr       # batch import with auto PR
```

**Requires:** `ANTHROPIC_API_KEY` in `.env` (for frontmatter generation). Without it, the CLI falls back to manual mode.

**Source:** `scripts/publish-knowledge.ts`

---

### `pnpm knowledge:sync-dell` — Dell Sovereign Node Sync

Uploads all knowledge corpus documents to Open WebUI on the Dell Sovereign Node (the local hardware RAG mirror). Run this when the Dell is powered on and you want to bring the local embedding index up to date with the current corpus state.

**Usage:**

```bash
pnpm knowledge:sync-dell          # upload all documents
pnpm knowledge:sync-dell --dry-run  # preview what would be uploaded
```

**What it syncs:** All `.md` files in `sources/`, `commentary/`, `reference/`, `guides/`, and `collections/`. Does not sync `wiki/`, `incoming/`, or `specifications/`.

**Requires:** `OPEN_WEBUI_URL` and `OPEN_WEBUI_API_KEY` in `.env`. The Dell must be powered on and reachable on the local network.

**Source:** `scripts/sync-dell.ts`

---

### `pnpm tsx scripts/test-cosmo-voice.ts` — Cosmo Voice Test

Sends a question to Claude using `COSMO_SYSTEM_PROMPT.md` as the system prompt. Use this to feel Cosmo's voice in response to a specific prompt — to evaluate tone, test a system prompt edit, or sanity-check a response before shipping.

**Usage:**

```bash
pnpm tsx scripts/test-cosmo-voice.ts "What is the meaning of life?"
pnpm tsx scripts/test-cosmo-voice.ts "I'm feeling lost. Where do I start?"
pnpm tsx scripts/test-cosmo-voice.ts "Explain the relationship between impermanence and creativity."
```

**Output:** Cosmo's response, followed by token usage (`N in / N out`).

**What it uses:** `packages/ai/COSMO_SYSTEM_PROMPT.md` as the system prompt. Model: `claude-sonnet-4-6`. Prompt caching is enabled for the system prompt.

**Requires:** `ANTHROPIC_API_KEY` in `.env`.

**Source:** `scripts/test-cosmo-voice.ts`

---

### `pnpm tsx scripts/check-byok-flags.ts` — BYOK Flag Diagnostic

Scans Upstash Redis for all `cosmo_byok:v1:*` keys and prints their values and TTLs. A debug tool for diagnosing BYOK (Bring Your Own Key) sync issues — use it when a user reports their API key isn't being recognized across devices.

**Usage:**

```bash
dotenv -e apps/web/.env.local -- pnpm tsx scripts/check-byok-flags.ts
```

Note the `dotenv -e apps/web/.env.local --` prefix — this injects the Redis credentials from the web app's local env. Without it, the script will error.

**Output:** For each BYOK flag found: the Redis key, value, TTL in seconds, and approximate days remaining. If no flags are found, prints a diagnostic message explaining what that means (no write path has ever succeeded for any user).

**Requires:** `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` from `apps/web/.env.local`.

**Source:** `scripts/check-byok-flags.ts`

---

## Environment Variables

Most scripts read from a `.env` file at the repo root. Create one if it doesn't exist:

```
ANTHROPIC_API_KEY=sk-ant-...
OPEN_WEBUI_URL=http://192.168.x.x:3000
OPEN_WEBUI_API_KEY=...
```

`check-byok-flags.ts` reads from `apps/web/.env.local` instead (injected via the `dotenv` prefix).

---

## Quick Reference

| Task | Command |
|------|---------|
| Check corpus health and broken links | `pnpm knowledge:health` |
| Publish documents from `incoming/` | `pnpm knowledge:publish --accept` |
| Publish a specific file | `pnpm knowledge:publish path/to/file.md` |
| Preview a publish without writing | `pnpm knowledge:publish --dry-run` |
| Sync documents to Dell | `pnpm knowledge:sync-dell` |
| Test Cosmo's voice | `pnpm tsx scripts/test-cosmo-voice.ts "question"` |
| Debug BYOK flags in Redis | `dotenv -e apps/web/.env.local -- pnpm tsx scripts/check-byok-flags.ts` |
