---
title: "Knowledge Base Architecture: RAG, Vector Index, and Section-Aware Context"
role: guide
format: manual
domain: opencosmos
tags: [knowledge-base, rag, vector-index, upstash, cosmo, chunking, headings, toc, context]
audience: [creator, engineer]
complexity: intermediate
summary: >
  How the OpenCosmos knowledge base is structured for RAG retrieval — the heading hierarchy,
  why H2/H3 chunking matters, how Cosmo accesses documents, how the document outline
  panel works, and best practices for authoring knowledge documents that give Cosmo
  the most useful context.
curated_at: 2026-04-13
curator: shalom
source: original
corpus_tier: source
related_docs:
  - guides/opencosmos-knowledge-formatting-guide.md
  - guides/opencosmos-knowledge-publish-workflow.md
  - guides/opencosmos-knowledge-tooling-overview.md
  - guides/opencosmos-scripts-reference.md
---

# Knowledge Base Architecture: RAG, Vector Index, and Section-Aware Context

The OpenCosmos knowledge base serves two audiences simultaneously: human readers browsing `opencosmos.ai/knowledge`, and Cosmo retrieving grounding passages to cite in conversation. The same markdown files serve both — but the structure of those files matters enormously for retrieval quality.

This guide explains how the system works, why it is designed the way it is, and how to author documents that give Cosmo the most useful, citable context.

## The Core Architecture

```
knowledge/**/*.md  (source of truth — git)
        │
        ├─ pnpm embed ──────────────────→ Upstash Vector Index
        │   (scripts/knowledge/           (embeddings + metadata per chunk)
        │    embed-knowledge.ts)                   │
        │                                          │ similarity search
        │                            fetchRagContext() in lib/rag.ts
        │                                          │
        │                            /api/chat ────┘
        │                            (injected as system context for Cosmo)
        │
        └─ Vercel build ────────────→ opencosmos.ai/knowledge
                                      (doc browser + TOC panel)
```

Everything flows from the `.md` files in `knowledge/`. The vector index is a derived artifact — always re-buildable from git. Cosmo's knowledge comes from the same source the human reader reads.

## How Documents Become Vector Chunks

### The Heading Hierarchy

Documents are split at heading boundaries. Each section becomes one vector "chunk" — an independently retrievable unit of meaning. The heading hierarchy determines the granularity of that split:

```
Document (frontmatter title — not a heading in the body)
│
├── ## Major Division              H2 — primary chunk boundary
│   (Book / Part / Play / Volume / major section of an essay)
│   │
│   ├── ### Sub-division           H3 — secondary chunk boundary
│   │   (Chapter / Act / Scene group / named section)
│   │   │
│   │   └── #### Minor break       H4 — in-chunk organisation, no split
│   │       (Scene / subsection / verse group)
│   │
│   └── ### Sub-division
│
└── ## Major Division
```

**Why this matters:** If a document has no subheadings, the entire body becomes one chunk. For a 50-page text, that chunk will be truncated at 2000 characters — which means Cosmo sees only the first two paragraphs, never the rest. Every H2 section is a separate vector; every H3 section (nested under an H2) is its own vector with the parent H2 as context. More headings = more retrieval surface area = Cosmo can find any part of the document.

### Chunk IDs

Chunk IDs are deterministic, based on the file path and heading text:

```
knowledge/sources/foo.md#summary              ← H2 chunk
knowledge/sources/foo.md#part-i/chapter-iii   ← H3 chunk (parent H2 / child H3)
```

Re-running `pnpm embed` is safe — existing vectors are updated, never duplicated.

### What Gets Stored per Chunk

Each chunk stores:
- `id` — deterministic path + heading slug
- `data` — enriched text passed to Upstash for embedding (title + author + domain + section label + body, capped at 3000 chars)
- `metadata` — what Cosmo reads in its context window:
  - `source` — relative path (e.g. `knowledge/sources/indigenous-george-fox-an-autobiography.md`)
  - `heading` — section heading text
  - `parent_heading` — H2 parent for H3-level chunks
  - `title`, `author`, `tradition`, `domain`, `role`, `tags`, `audience`
  - `text` — the passage body (capped at 2000 chars)

### Limits

Upstash enforces hard limits. The embed pipeline stays within them:
- Embedding input (`data`): capped at 3000 characters
- Stored metadata text: capped at 2000 characters
- Large sections are truncated at these boundaries — the embedding still captures the semantic substance

## How Cosmo Retrieves Knowledge

When a user sends a message in `/dialog`, the chat route:

1. **Fires `fetchRagContext()` immediately** — concurrently with auth checks (doesn't wait)
2. **Builds a contextual query** — appends the last 3 exchange pairs to the current message, so "why does he say that?" retrieves the right context from the prior conversation turn
3. **Queries Upstash Vector** — `topK: 8` most similar chunks
4. **Injects as system context** — formatted with source attribution (title, author, section) and citation guidance, placed between the wiki index and the conversation history
5. **Times out at 4 seconds** — fails open with a `[RAG_TIMEOUT]` signal; Cosmo acknowledges the limitation honestly rather than fabricating

### Context Pollution (and the Fix)

When a user switches from one document to another in the knowledge browser, the conversation history from the previous document can pollute the vector query for the new one. If the last 3 turns were all about George Fox, Cosmo will retrieve Fox passages even when the user switches to the Tao Te Ching.

The fix: the knowledge browser writes the active section to `sessionStorage`. The chat sends `doc_changed: true` when the session's doc path changes. When `doc_changed` is set, `fetchRagContext()` excludes conversation history from the query — giving the new document a clean slate.

### Section-Aware Context

The knowledge browser's TOC panel tracks which section the user is currently reading (via IntersectionObserver). On each section change, it writes to `sessionStorage`:

```json
{
  "heading": "Chapter III. The Opening of the Light",
  "doc_title": "George Fox — An Autobiography",
  "doc_path": "knowledge/sources/indigenous-george-fox-an-autobiography.md",
  "timestamp": 1744512000000
}
```

The chat reads this (if less than 5 minutes old) and includes it as a "Current Reading Context" block in Cosmo's system prompt. Cosmo knows not just what the user asked — but where in the document they are.

## The Document Outline Panel

Every knowledge document page now includes a sticky TOC sidebar on desktop (≥lg). It:

- Extracts H2 and H3 headings from the raw markdown
- Uses `github-slugger` (the same library as `rehype-slug`) to generate IDs that match exactly
- Highlights the active heading as the user scrolls
- Allows clicking to jump to any section
- Updates `sessionStorage` on each section change for Cosmo context

The TOC is hidden on mobile (single-column layout) and visible at the `lg` breakpoint.

## Best Practices for Authors

### Use H2 headings generously

Every H2 becomes an independently retrievable vector chunk. A document with no H2 headings = one chunk = truncated to 2000 chars. A document with 10 H2 sections = 10 chunks = Cosmo can retrieve any part.

**Rule of thumb:** If a section covers a distinct idea, give it an H2.

### Use H3 headings for multi-level works

For documents with Books, Parts, or Plays that contain Chapters, Acts, or Sections:

```markdown
## Book I: The Early Years

### Chapter I. The First Encounter

Content...

### Chapter II. The Turn Inward

Content...

## Book II: The Public Years
```

H3 chunks inherit their parent H2 as context in the embedding — "Book I > Chapter I" — so Cosmo can answer questions about both the part and the chapter.

### Keep sections at 200–800 words

Shorter than 200 words → the chunk may not be semantically rich enough to retrieve reliably. Longer than 800 words → the stored text gets truncated at 2000 chars; Cosmo sees only the beginning.

If a section is inherently long (a dense philosophical argument, a long speech), consider breaking it with an H3 or H4.

### Write informative headings

The heading appears in the chunk's embedding context and in Cosmo's citation. "Chapter I" is less useful than "Chapter I. The Inner Light and Its Consequences." Cosmo will cite the heading; a descriptive heading is a more useful citation.

### Don't skip heading levels

A H3 immediately under the body text (no parent H2) will be treated as a top-level chunk with no parent context. Use H2 first, then H3 inside it.

### Non-standard headings need standardization

If a document uses `CHAPTER I.`, `ACT II`, or ALL-CAPS section markers, run the `/standardize-knowledge` skill before embedding. Non-standard headings are not recognized by the chunker and the entire body collapses into one truncated chunk.

```
/standardize-knowledge knowledge/sources/your-file.md
```

After standardizing, run `pnpm embed` to re-index.

## The Standardization Skill

`/standardize-knowledge` converts non-standard heading patterns to the H2/H3/H4 hierarchy:

| Pattern | Result |
|---------|--------|
| `CHAPTER I.` (top-level) | `## Chapter I.` |
| `CHAPTER I.` (inside a BOOK) | `### Chapter I.` |
| `BOOK II` | `## Book II` |
| `ACT I` | `### Act I` |
| `SCENE II` | `#### Scene II` |
| `THE CONCLUSION` (ALL CAPS) | `## The Conclusion` |

Only heading lines change. Body text is never touched.

**Shakespeare note:** The collected works file (`knowledge/collections/literature-shakespeare-collected-works.md`) is 5.3MB. It should be split into one file per play before standardizing. The skill will flag this automatically.

## Re-indexing After Changes

After editing knowledge documents (whether standardizing headings or editing content), re-index:

```bash
pnpm embed
```

This rebuilds all chunks from scratch and upserts to Upstash Vector. Re-runs are idempotent — safe to run as many times as needed.

CI also runs `pnpm embed` automatically on every push to `main` that includes `knowledge/**` changes.
