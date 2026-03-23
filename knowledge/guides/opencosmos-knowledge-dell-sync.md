---
title: "Syncing Knowledge to the Dell Sovereign Node"
role: guide
format: manual
domain: opencosmos
tags: [knowledge-base, dell, sync, sovereign-node, open-webui, rag, tooling]
audience: [engineer]
complexity: foundational
summary: >
  How to sync the knowledge corpus to the Dell Sovereign Node's Open WebUI
  RAG mirror using pnpm knowledge:sync-dell. Covers prerequisites, running
  the sync, verifying results, and troubleshooting connectivity issues.
curated_at: 2026-03-22
curator: shalom
source: original
related_docs:
  - guides/opencosmos-knowledge-tooling-overview.md
  - guides/opencosmos-knowledge-publish-workflow.md
---

# Syncing Knowledge to the Dell Sovereign Node

The Dell Sovereign Node (Dell XPS 8950 with RTX 3090) runs local AI inference via Ollama and hosts a RAG mirror of the knowledge corpus through Open WebUI. This allows Cosmo to retrieve knowledge documents entirely locally — no cloud, no API keys, full sovereignty.

The sync command uploads all published knowledge documents to the Dell's Open WebUI instance, where they're embedded and indexed for retrieval-augmented generation.

## Why Sync Locally?

The knowledge corpus has two retrieval paths:

| Path | Provider | When it's used |
|---|---|---|
| **Cloud** | Upstash Vector | Primary path — always available, synced by GitHub Actions on merge |
| **Local** | Dell Open WebUI | Development, experimentation, offline access, sovereignty |

The cloud path is automatic — merge a PR and the GitHub Action syncs to Upstash. The Dell path is manual and on-demand, because the Dell isn't always powered on.

## Prerequisites

1. **Dell is powered on and connected** to the local network or reachable via Tailscale.
2. **Open WebUI is running** on the Dell (default: `http://dell:8080` or the Tailscale hostname).
3. **`OPEN_WEBUI_API_KEY`** is set in your `.env` file at the repository root:

```bash
# In .env
OPEN_WEBUI_API_KEY=sk-your-api-key-here
```

To get the API key, open the Dell's Open WebUI in a browser, go to Settings > Account, and generate an API key.

4. **`pnpm install`** has been run (the sync script uses project dependencies).

## Running the Sync

### Preview first (recommended)

```bash
pnpm knowledge:sync-dell --dry-run
```

Shows which documents would be uploaded without actually syncing. Use this to verify connectivity and see the document list.

### Sync everything

```bash
pnpm knowledge:sync-dell
```

Uploads all documents from `knowledge/sources/`, `knowledge/commentary/`, `knowledge/references/`, `knowledge/guides/`, and `knowledge/collections/` to the Dell's Open WebUI RAG store.

## What Gets Synced

Every markdown document in the knowledge corpus with valid YAML frontmatter. The sync includes:
- The full document content (frontmatter + body)
- Metadata tags for filtering in Open WebUI

Documents in `knowledge/incoming/` are NOT synced — they're staging files that haven't been published yet.

## When to Sync

- **After publishing new documents** to the corpus (if you want them available locally)
- **After powering on the Dell** to catch up on documents published while it was off
- **Before local development sessions** where you'll test RAG retrieval against the Dell

The sync is idempotent — running it multiple times won't create duplicates. It uploads or updates each document based on its path.

## Troubleshooting

**"Connection refused" or timeout**
- Verify the Dell is powered on
- Check Tailscale is connected: `tailscale status`
- Verify Open WebUI is running on the Dell: try opening its web interface in a browser

**"Unauthorized" or 401 error**
- Your `OPEN_WEBUI_API_KEY` is missing or invalid
- Generate a new key from Open WebUI Settings > Account
- Verify the key is in your `.env` file (not `.env.example` or `.env.local`)

**"No documents found"**
- The sync scans the published corpus directories, not `knowledge/incoming/`
- Make sure you've published documents with `pnpm knowledge:publish` first
- Verify documents exist: `ls knowledge/sources/ knowledge/guides/`

**Sync completes but documents don't appear in Open WebUI**
- Open WebUI may take a moment to index the uploads
- Refresh the knowledge base page in Open WebUI
- Check the Open WebUI logs on the Dell for embedding errors
