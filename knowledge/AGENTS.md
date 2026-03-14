# OpenCosmos Knowledge — Agent Orientation

> **This document is for AI agents and LLMs.** It provides the context you need to effectively retrieve from, reason about, and contribute to this knowledge base. Read this before interacting with the corpus.

Last updated: 2026-03-10

---

## What You're Working With

OpenCosmos Knowledge is a curated corpus of human wisdom — primary source texts, commentary, reference material, guides, and curated collections — structured for both AI retrieval and human navigation.

This is not a code repository. It is a **knowledge base** consumed by the Cosmo AI RAG pipeline. The knowledge base is globally accessible (cloud-primary) with a local mirror on the Sovereign Node. When you retrieve documents from this corpus to answer a question, your response quality depends on understanding how the corpus is organized, what metadata is available, and how to use it.

**Your primary responsibilities when interacting with this corpus:**

1. **Retrieve accurately.** Use metadata (role, domain, tags, format, audience, complexity) to narrow your search before relying on semantic similarity alone.
2. **Attribute honestly.** Always distinguish between source texts (primary works) and commentary (interpretation/analysis). Never present commentary as if it were the source, and never present a source text as if it were your own synthesis.
3. **Respect provenance.** Every document has an author and a curator. Cite both when relevant. If a document's `confidence` field is `speculative` or `emerging`, disclose that to the user.
4. **Preserve voice.** Source texts have their own voice — the Buddha's, Marcus Aurelius's, Rumi's. When quoting or paraphrasing, honor the original tone. Do not flatten diverse voices into a single homogeneous style.

---

## Corpus Structure

Five top-level directories, organized by the document's **relationship to knowledge**:

```
knowledge/
├── sources/          Primary works — the originals
├── commentary/       Analysis, interpretation, explanation
├── reference/        Definitions, glossaries, specifications
├── guides/           Procedures, how-to, workflows
└── collections/      Curated groupings and reading paths
```

### How to Choose the Right Directory

When retrieving or filing documents, use this decision tree:

1. **Is this the original work itself?** → `sources/`
2. **Is this about another work — analyzing, interpreting, or connecting it?** → `commentary/`
3. **Is this for looking up a specific fact, term, or specification?** → `reference/`
4. **Is this for doing something — a procedure, workflow, or tutorial?** → `guides/`
5. **Is this a curated pathway through other documents?** → `collections/`

**The critical distinction is between `sources/` and `commentary/`.** The Dhammapada is a source. An essay explaining the Dhammapada's concept of impermanence is commentary. When a user asks "What does the Buddha say about suffering?", prefer retrieving from `sources/`. When they ask "How do scholars interpret the Buddha's teaching on suffering?", prefer `commentary/`.

---

## File Naming Convention

```
{domain}-{slug}.md
```

- **domain** — Tradition, discipline, or project (e.g., `buddhism`, `stoicism`, `ecology`, `opencosmos`)
- **slug** — Short, recognizable, kebab-case identifier

The filename carries minimal metadata. All structured metadata lives in YAML frontmatter.

---

## Frontmatter Schema

Every document contains YAML frontmatter. **Use these fields for retrieval filtering.** They are more reliable than full-text semantic search for narrowing to the right documents.

### Required Fields

| Field | Type | Purpose | Values |
|---|---|---|---|
| `title` | string | Human-readable document title | Free text |
| `role` | enum | Document's relationship to knowledge | `source`, `commentary`, `reference`, `guide`, `collection` |
| `format` | enum | Literary/structural form | See Format Taxonomy |
| `domain` | string | Primary tradition or discipline | See Domain Codes |
| `tags` | string[] | Topical keywords for retrieval | Free tags, lowercase, hyphenated |
| `audience` | string[] | Intended reader profiles | `philosopher`, `engineer`, `scientist`, `artist`, `contemplative`, `creator`, `general` |
| `complexity` | enum | Depth of prior knowledge assumed | `foundational`, `intermediate`, `advanced` |
| `summary` | string | 1-3 sentence abstract | Free text |
| `curated_at` | date | When the document entered the corpus | ISO 8601 |
| `curator` | string | Who prepared it for the corpus | Name or handle |
| `source` | string | Provenance | `original`, `public-domain`, URL, citation |

### Optional Fields

| Field | Type | Purpose |
|---|---|---|
| `tradition` | string | Specific lineage within the domain (e.g., `theravada`, `zen`) |
| `era` | enum | Historical period: `ancient`, `medieval`, `early-modern`, `modern`, `contemporary` |
| `origin_date` | string | When the original work was created (approx. OK: `~400 BCE`) |
| `author` | string | Original author (distinct from curator) |
| `updated_at` | date | Last substantive update to this document |
| `related_docs` | string[] | Paths to related documents in the corpus |
| `license` | string | SPDX identifier if different from corpus default (CC0) |
| `confidence` | enum | How established the content is: `established`, `emerging`, `speculative` |
| `language` | string | ISO 639-1 language code (if not English) |

---

## Domain Codes

Use these to filter by tradition or discipline. A document's `domain` field holds its primary domain. Additional domains can appear in `tags`.

**Wisdom Traditions:** `buddhism`, `stoicism`, `sufism`, `taoism`, `vedic`, `indigenous`, `philosophy`

**Disciplines:** `ecology`, `science`, `psychology`, `literature`, `art`, `engineering`, `ai`

**Project-Specific:** `opencosmos`

**Cross-Domain:** `cross` (for documents explicitly bridging two or more domains)

---

## Format Taxonomy

Format describes **how the text is structured**. This directly affects how you should interpret and process retrieved content.

| Format | Structure | Retrieval Notes |
|---|---|---|
| `treatise` | Extended, structured argument with chapters/sections | Sections are self-contained; retrieve at section level |
| `poetry` | Verse, stanzas, lyric form | Retrieve whole poems, never mid-stanza. Meaning is condensed — don't over-paraphrase |
| `aphorisms` | Short independent sayings or meditations | Each aphorism is atomic — retrieve individually. Context between aphorisms is loose |
| `scripture` | Sacred or canonical text with verse/chapter numbering | Preserve verse numbers in citations. Retrieve at verse or chapter level |
| `dialogue` | Conversational or dialectical form | Preserve speaker attribution. Arguments develop across exchanges — retrieve full exchanges, not isolated statements |
| `essay` | Short-form argument or reflection | Retrieve at section level |
| `manifesto` | Declaration of principles | Each principle may stand alone. Retrieve at principle level |
| `specification` | Technical spec with precise definitions | Retrieve at section level. Exact wording matters — do not paraphrase specifications |
| `manual` | Step-by-step instructions | Preserve step ordering. Do not retrieve steps out of sequence |
| `narrative` | Story, case study, experiential account | Meaning depends on arc — retrieve larger chunks to preserve context |
| `glossary` | Term definitions | Each entry is atomic. Retrieve individual definitions |
| `anthology` | Curated collection of shorter works | Retrieve individual works within the anthology |
| `letter` | Epistolary form | Preserve salutation and context. Letters often reference prior correspondence |

---

## Retrieval Strategy

When answering a user's question using this corpus, follow this process:

### 1. Classify the Query

Determine what the user is actually asking for:

- **"What does X say about Y?"** → Retrieve from `sources/`. The user wants the primary text.
- **"What does Y mean?"** → Retrieve from `reference/` first (definitions), then `commentary/` (interpretation).
- **"How do I do X?"** → Retrieve from `guides/`.
- **"How does X relate to Y?"** → Retrieve from `commentary/` (especially `cross` domain docs).
- **"What should I read about X?"** → Retrieve from `collections/`.

### 2. Filter by Metadata First

Before running semantic similarity search across the entire corpus, narrow the search space using metadata:

- If the query mentions a specific tradition → filter by `domain`
- If the query implies expertise level → filter by `complexity`
- If the query is about a specific concept → filter by `tags`
- If the query implies a specific audience → filter by `audience`

Metadata-filtered retrieval is dramatically more precise than brute-force similarity search.

### 3. Respect the Source/Commentary Boundary

This is the most important retrieval principle in this corpus.

- **Never blend source and commentary in a way that obscures which is which.** If you retrieve a verse from the Dhammapada and a scholar's commentary on it, present them distinctly. The user must be able to tell the difference.
- **When quoting a source text, cite it.** Include the document title, author, and section/verse if applicable.
- **When summarizing commentary, name the commentator.** "According to [curator/author]'s analysis in [document title]..." — not "The general view is..."
- **If no source text exists for a claim, say so.** "This corpus does not contain a primary source for that topic" is better than hallucinating one.

### 4. Handle Gaps Honestly

If the corpus doesn't contain relevant material:

- Say so explicitly: "The OpenCosmos Knowledge corpus does not currently include material on [topic]."
- Do not fill the gap with your training data while implying the answer came from the corpus.
- You may offer your own knowledge, but clearly distinguish it: "Based on my training (not from the OpenCosmos Knowledge corpus)..."

---

## Authoring Guidelines for Agents

If you are asked to create or curate a new document for this corpus, follow these rules:

### Document Structure

- **One topic per document, one idea per section.** Each H2 section should be independently meaningful when extracted as a retrieval chunk.
- **H1** = Document title (one per document). **H2** = Major sections (primary chunk boundaries). **H3** = Subsections. Never skip heading levels. Avoid H4+.
- **Add a summary sentence immediately after every H2 heading.** This gives the embedding model concentrated semantic signal.
- **Keep sections between 200-800 tokens.** Exceeding 800 tokens usually means the section covers multiple ideas and should be split.
- **Front-load key information.** The core claim belongs in the first 1-2 sentences of each section.
- **Define terms inline.** A chunk may be retrieved without the glossary. If a section uses "eudaimonia" or "sovereignty tier," define it right there.
- **Prefer structured lists over tables.** Tables split poorly across chunk boundaries.

### Voice and Integrity

- **For source text curation:** Preserve the original voice faithfully. Place curator notes in clearly marked sections (e.g., a "Curator's Note" H2), never inline with the source text.
- **For commentary:** Write in clear, accessible prose. Assume the reader is intelligent but may not share your domain expertise.
- **For cross-domain bridges:** Define terms from both domains. A philosopher reading about software engineering, and an engineer reading about philosophy, should both find the document accessible.

### Frontmatter

- Fill in **all required fields** before saving.
- Write a `summary` that would help another agent (or a human) decide whether this document is worth retrieving for a given query — without reading the full text.
- Add `related_docs` cross-references wherever meaningful. These help both retrieval ranking and human navigation.

---

## The Cosmo AI Context

This corpus exists within a larger system. Understanding that system helps you serve users better.

**Cosmo AI** is the intelligence layer of the OpenCosmos platform. Inference runs on local hardware (Dell XPS 8950, RTX 3090) in Marin County, California, powered by a 9.25 kW solar array and a 13.5 kWh Tesla Powerwall. The knowledge base is cloud-primary (globally accessible) with a local mirror on the Sovereign Node.

**The Cosmo AI Constitution** (four mandates derived from the platform's design philosophy):

1. **Epistemic Humility** — Distinguish between facts, speculation, and limitations. When uncertain, say so.
2. **Provocative Growth** — Challenge assumptions. Surface blind spots. Support deep thinking, not shallow validation.
3. **The Zero-Intrusion Rule** — Never assume personal details unless explicitly provided. Ask, don't infer.
4. **Ecological Awareness** — The system breathes with the sun. Resource use is transparent and sustainable.

**Sovereignty Tiers** govern **compute** (where LLMs process prompts), not the knowledge base. The knowledge base is public by design — always disclose which compute tier is active:

- **Tier 1 (Full Sovereignty):** All inference on local hardware. No external calls.
- **Tier 2 (Reduced Capability):** Low-power mode (nighttime/low solar). Limited model. Complex queries may be queued for sunrise.
- **Tier 3 (Cloud-Assisted):** User opted in per-request. Prompt sent to external provider. Always disclose this to the user.

**Knowledge base access:** This corpus is served globally via a cloud RAG API endpoint and a static docs site at [opencosmos.ai](https://opencosmos.ai/). A local mirror on the Sovereign Node provides offline access. Retrieval works regardless of which compute tier is active.

**Foundation Model:** Apertus (8B and 70B parameters), an open-source model from the Swiss AI consortium (EPFL, ETH Zurich, CSCS). Available locally as `apertus:latest` (8B) and `apertus-70b:latest` (70B Q4_K_M) via Ollama.

For the full technical blueprint, see [INCEPTION.md](../docs/archive-and-deprecated/INCEPTION.md) (historical).

---

## Key Principles — Summary

1. **Sources are sacred.** Primary texts are preserved faithfully. They are not paraphrased, blended, or flattened.
2. **Attribution is mandatory.** Every claim must trace to a document, author, and curator.
3. **Metadata is your best tool.** Filter by role, domain, tags, audience, and complexity before relying on semantic similarity.
4. **Gaps are disclosed, not filled.** If the corpus doesn't cover a topic, say so. Don't hallucinate sources.
5. **Voice is preserved.** The Dhammapada sounds like the Dhammapada. Marcus Aurelius sounds like Marcus Aurelius. Rumi sounds like Rumi. The corpus contains many voices — honor each one.
6. **Wisdom serves people.** This corpus exists to make the wisdom of humanity accessible. Every retrieval decision should ask: does this serve the human asking the question?
