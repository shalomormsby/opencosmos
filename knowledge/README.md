# OpenCosmos Knowledge

> A curated corpus of human wisdom — organized for retrieval by machines and navigation by people.

**Maintainer:** [Shalom Ormsby](https://www.shalomormsby.com/) | **License:** Public Domain (content) | **Status:** Active curation

---

## What This Is

OpenCosmos Knowledge is an open knowledge base designed to serve two purposes simultaneously:

1. **Retrieval-Augmented Generation (RAG)** — These documents are indexed by [Cosmo AI](../docs/archive-and-deprecated/INCEPTION.md), a sovereign, solar-powered intelligence layer. When Cosmo AI responds to a prompt, it draws on this corpus to ground its answers in curated wisdom rather than training data alone.

2. **A public resource** — This corpus is intended for the public domain. Every document is structured, tagged, and written so that anyone — philosopher, engineer, artist, scientist — can browse, learn from, and contribute to it without needing to understand the software that consumes it. The knowledge base is globally accessible at [opencosmos.ai](https://opencosmos.ai/) as both a browsable docs site and a RAG API endpoint, with a local mirror on the Sovereign Node for offline access and development.

The organizing principle: **the wisdom of humanity, made accessible to both human minds and artificial intelligence.**

---

## How It's Organized

Documents are organized into five categories based on their **relationship to knowledge** — not by subject, discipline, or tradition. This distinction matters because it's universal: it works for Buddhist scripture and TypeScript specifications alike.

```
knowledge/
├── sources/          Primary works — the originals
├── commentary/       Analysis, interpretation, explanation
├── reference/        Definitions, glossaries, specifications
├── guides/           Procedures, how-to, workflows
└── collections/      Curated groupings and reading paths
```

### sources/

The original works. Primary texts. The things everything else references.

When you place a document here, you're saying: "This is the work itself — not a summary, not an interpretation, not a commentary."

**Examples:** The Dhammapada, Marcus Aurelius's *Meditations*, Rumi's poems, the Gaia Hypothesis, the Creative Powerup Manifesto, the Cosmo AI Constitution.

### commentary/

Analysis, interpretation, and explanation of source material. Secondary works that help readers understand, contextualize, or connect primary sources.

This includes cross-domain "bridge" documents that explicitly connect two traditions or disciplines (e.g., "Stoicism for Software Engineers," "Buddhist Ethics and AI Alignment").

**Examples:** An essay on Aristotle's concept of eudaimonia, an analysis comparing the Gaia Hypothesis with systems theory, a piece connecting Stoic practices with engineering resilience.

### reference/

Lookup material. Definitions, glossaries, specifications, term lists. Documents you consult for a specific fact or definition, not documents you read end to end.

**Examples:** A glossary of philosophical terms, the OpenCosmos Design Tokens specification, a list of sovereignty tiers with their definitions.

### guides/

Procedural, instructional documents. Step-by-step workflows. Documents that help you *do* something.

**Examples:** How to set up a Sovereign Node, how to create a theme in OpenCosmos Studio, how to contribute a document to this corpus.

### collections/

Curated groupings, reading lists, syllabi, and pathways through the corpus. These don't contain original content — they organize and sequence other documents for a particular purpose or audience.

**Examples:** "Foundations of Cosmo AI" reading list, "Ecological Ethics" syllabus, "Getting Started with Wisdom Traditions" pathway.

---

## File Naming

Filenames are for human recognition. Metadata lives in frontmatter (see below). Keep filenames simple and scannable.

**Convention:**

```
{domain}-{slug}.md
```

- **domain** — The tradition, discipline, or project the document belongs to (see Domain Codes below)
- **slug** — A short, recognizable, kebab-case name

**Examples:**

```
sources/
  buddhism-dhammapada.md
  stoicism-meditations-marcus-aurelius.md
  sufism-selected-poems-rumi.md
  ecology-gaia-hypothesis-lovelock.md
  opencosmos-design-philosophy.md
  opencosmos-creative-powerup-manifesto.md

commentary/
  cross-stoicism-for-software-engineers.md
  ecology-gaia-and-systems-thinking.md

reference/
  philosophy-key-terms-glossary.md
  opencosmos-sovereignty-tiers-spec.md

guides/
  opencosmos-sovereign-node-setup.md

collections/
  reading-list-foundations-of-cosmo.md
```

**Rules:**

- Use hyphens, not underscores or spaces
- No dates in the filename (dates live in frontmatter)
- No type codes in the filename (the folder provides that)
- Aim for instant recognition — if someone scans a directory listing, can they tell what each file is in under two seconds?

---

## Domain Codes

Domains identify the tradition, discipline, or project a document belongs to. They appear in filenames and in frontmatter metadata.

### Wisdom Traditions

| Code | Tradition |
|---|---|
| `buddhism` | Buddhist traditions (Theravada, Mahayana, Zen, Tibetan) |
| `stoicism` | Stoic philosophy (Hellenistic and modern) |
| `sufism` | Sufi and Islamic mystical traditions |
| `taoism` | Taoist traditions |
| `vedic` | Hindu, Vedic, and Yogic traditions |
| `indigenous` | Indigenous and land-based wisdom traditions |
| `philosophy` | Western academic philosophy (when not a specific tradition) |

### Disciplines

| Code | Discipline |
|---|---|
| `ecology` | Ecology, earth science, environmental thought |
| `science` | Natural and formal sciences |
| `psychology` | Psychology, consciousness studies, contemplative science |
| `literature` | Literary works, fiction, poetry (when not tied to a wisdom tradition) |
| `art` | Visual art, aesthetics, design theory, creative practice |
| `engineering` | Software engineering, systems architecture |
| `ai` | Artificial intelligence, machine learning, alignment |

### Project-Specific

| Code | Scope |
|---|---|
| `opencosmos` | OpenCosmos ecosystem (design philosophy, Creative Powerup, OpenCosmos Studio, Cosmo AI) |

### Cross-Domain

| Code | Use |
|---|---|
| `cross` | Explicitly interdisciplinary documents bridging two or more domains |

**When a document genuinely belongs to two domains** (e.g., Rumi's poems are both `sufism` and `literature`), use the *primary* domain in the filename and tag both in frontmatter. Choose the domain that most accurately represents the document's origin and tradition.

This list will grow as the corpus grows. Adding a new domain never requires restructuring existing documents — it's just a new tag.

---

## Document Frontmatter

Every document in the corpus must include YAML frontmatter. This metadata powers retrieval (AI uses it to filter and rank search results) and provides context for human readers.

### Required Fields

```yaml
---
title: "The Dhammapada: Sayings of the Buddha"
role: source
format: scripture
domain: buddhism
tags: [impermanence, suffering, liberation, mindfulness, ethics]
audience: [contemplative, philosopher, general]
complexity: foundational
summary: >
  Collection of 423 verses in 26 chapters attributed to the Buddha,
  addressing the nature of mind, ethical conduct, and the path to
  liberation from suffering.
curated_at: 2026-03-04
curator: shalom
source: public-domain
---
```

**Field definitions:**

| Field | What it means | Values |
|---|---|---|
| `title` | Human-readable document title | Free text |
| `role` | The document's relationship to knowledge | `source`, `commentary`, `reference`, `guide`, `collection` |
| `format` | The literary/structural form | See Format Taxonomy below |
| `domain` | Primary tradition or discipline | See Domain Codes above |
| `tags` | Topical keywords for retrieval (multi-valued) | Free tags, lowercase, hyphenated |
| `audience` | Who this document is written for | `philosopher`, `engineer`, `scientist`, `artist`, `contemplative`, `creator`, `general` |
| `complexity` | Depth of prior knowledge assumed | `foundational`, `intermediate`, `advanced` |
| `summary` | 1-3 sentence abstract | Free text, used for retrieval and preview |
| `curated_at` | Date this document entered the corpus | ISO 8601 (YYYY-MM-DD) |
| `curator` | Who prepared/curated it | Name or handle |
| `source` | Provenance | `original`, `public-domain`, URL, or citation |

### Optional Fields

```yaml
tradition: theravada           # Specific lineage within the domain
era: ancient                   # ancient | medieval | early-modern | modern | contemporary
origin_date: ~400 BCE          # When the work was originally created
author: attributed-to-buddha   # Original author (distinct from curator)
updated_at: 2026-03-10         # Last substantive update to this document
related_docs:                  # Cross-references within the corpus
  - buddhism-heart-sutra.md
  - commentary/cross-buddhism-and-stoicism-on-suffering.md
license: CC0-1.0               # If different from corpus default
confidence: established        # established | emerging | speculative
```

---

## Format Taxonomy

Format describes the literary or structural form of a document. It matters because different formats require different reading approaches — and different chunking strategies when processed by AI.

| Format | What it is | Examples |
|---|---|---|
| `treatise` | Extended, structured argument | Gaia Hypothesis, Aristotle's *Ethics* |
| `poetry` | Verse, lyric, or spoken word | Rumi, Mary Oliver, Hafiz |
| `aphorisms` | Short independent sayings or meditations | Marcus Aurelius, Epictetus, Lao Tzu |
| `scripture` | Sacred or canonical text | Dhammapada, Bhagavad Gita, Tao Te Ching |
| `dialogue` | Conversational or dialectical form | Plato, Upanishads |
| `essay` | Short-form argument or reflection | CP Manifesto, Aldo Leopold |
| `manifesto` | Declaration of principles or values | Creative Powerup Manifesto |
| `specification` | Technical spec or standard | Sovereignty Tiers, API contracts |
| `manual` | Step-by-step procedural instructions | Setup guides, workflows |
| `narrative` | Story, case study, or experiential account | Origin stories, project histories |
| `glossary` | Term definitions and lookup entries | Domain glossaries |
| `anthology` | Curated collection of shorter works | Selected poems, essay collections |
| `letter` | Epistolary form | Seneca's letters, Rilke's *Letters to a Young Poet* |

---

## Writing for This Corpus

If you're authoring or curating a document for OpenCosmos Knowledge, follow these guidelines. They ensure documents work well for both human readers and AI retrieval.

### Structure

- **One topic per document, one idea per section.** Each section under an H2 heading should be independently meaningful — if extracted on its own, it should make sense without requiring the reader to have seen prior sections.

- **Use a strict heading hierarchy.** H1 is the document title (one per document). H2s are major sections. H3s are subsections. Never skip levels. Avoid H4 and deeper — if you need them, your section is likely covering too many ideas.

- **Add a summary sentence after every H2.** A single sentence at the top of each section that captures its core point. This dramatically improves AI retrieval accuracy.

- **Front-load key information.** Put the core claim or most important point in the first 1-2 sentences of each section.

- **Keep sections between 200-800 tokens.** This is the optimal range for retrieval. If a section exceeds 800 tokens, consider splitting it.

### Clarity

- **Define terms inline.** Don't rely on a glossary elsewhere in the corpus. If a section contains "eudaimonia" or "RAG," define it right there. AI may retrieve this section without the glossary.

- **Prefer structured lists over tables.** Tables split poorly across chunk boundaries. Convert tabular information to bulleted lists or structured paragraphs when possible.

- **Write for the unfamiliar reader.** Assume the reader is intelligent but may not share your domain expertise. A philosopher should be able to follow an engineering document's key ideas; an engineer should be able to engage with a philosophical text's core arguments.

### Integrity

- **Represent source texts faithfully.** When curating a primary source, preserve its voice and structure. Add curator notes in clearly marked sections (e.g., "Curator's Note" under a separate H2), never inline with the source text.

- **Attribute clearly.** Every document must identify its original author and its curator. The `author` field captures who created the original work. The `curator` field captures who prepared it for this corpus.

- **Mark uncertainty.** If a date, attribution, or interpretation is uncertain, say so explicitly. Use `~` for approximate dates (e.g., `~400 BCE`). Use the `confidence` field for documents with debated status.

---

## How to Add a Document

1. **Determine the role.** Is this a primary source, commentary, reference, guide, or collection? Place it in the corresponding folder.

2. **Choose the domain.** What tradition or discipline does it primarily belong to? Use existing domain codes if possible. If none fit, propose a new one.

3. **Name the file.** `{domain}-{slug}.md` — keep it simple and recognizable.

4. **Write the frontmatter.** Fill in all required fields. Add optional fields where they add value.

5. **Structure the content.** Follow the writing guidelines above. Heading hierarchy, summary sentences, inline definitions, 200-800 token sections.

6. **Add cross-references.** In the `related_docs` field, link to other documents in the corpus that share themes, contrast perspectives, or provide context.

7. **Upload.** Add the document to the cloud knowledge base. The local Open WebUI mirror on the Sovereign Node will sync automatically. (See [guides/opencosmos-knowledge-publish-workflow.md](guides/opencosmos-knowledge-publish-workflow.md) for the full workflow.)

---

## Frequently Asked Questions

### Why organize by role instead of by subject?

Because role is universal. Every document — whether Buddhist scripture or a TypeScript specification — has a relationship to knowledge: it's either the original work (source), about the original work (commentary), for looking things up (reference), for doing something (guide), or a curated path through other works (collection). Subject is captured in domain codes and tags, which are more flexible than folder hierarchy.

### Why not use a more granular folder structure?

Deeper hierarchies reduce discoverability. Three levels of nesting means three decisions before you find anything. Five top-level folders means you can hold the entire structure in your mind at once. The frontmatter metadata handles every axis that folders cannot — tradition, era, format, audience, complexity — without requiring a folder for each combination.

### Can I add a new domain code?

Yes. Domain codes are additive. Adding `economics` or `music` or `architecture` requires no restructuring — it's simply a new value in the `domain` field and a new entry in the Domain Codes table in this README. Open an issue or submit a pull request.

### What about documents that belong to multiple domains?

Use the primary domain in the filename. Tag all relevant domains in the frontmatter `tags` field. If the document is *explicitly* about connecting two domains (e.g., "Buddhist Ethics and AI Alignment"), use the `cross` domain code and tag both source domains.

### What about non-English documents?

The corpus welcomes multilingual content. Add a `language` field to frontmatter (e.g., `language: ar` for Arabic, `language: sa` for Sanskrit). When possible, include both the original language text and a curator-provided or attributed translation.

### How does this relate to Cosmo AI?

Cosmo AI's RAG pipeline reads from this corpus. When someone asks Cosmo AI a question, it searches this knowledge base for relevant passages, retrieves them, and uses them to ground its response. The quality and organization of this corpus directly determines the quality of Cosmo AI's answers. See [INCEPTION.md](../docs/archive-and-deprecated/INCEPTION.md) for the full technical architecture.

---

## Technical Context

This corpus is consumed by [Cosmo AI](../docs/archive-and-deprecated/INCEPTION.md), part of the [OpenCosmos platform](../README.md) — a monorepo demonstrating that human-centered design can be proven through architecture, not just claimed.

**Hosting architecture:** The knowledge base is **cloud-primary with a local mirror.** Knowledge hosting and compute are fundamentally different workloads — serving documents and embeddings costs pennies; running LLM inference costs watts. Global accessibility serves the "Generous by Design" principle.

| Layer | Where | Why |
|-------|-------|-----|
| Knowledge base (primary) | Cloud (always-on) | Global access, nominal hosting cost |
| Knowledge base (local mirror) | Dell Sovereign Node | Offline access, development, seeding |
| RAG API endpoint | Cloud (always-on) | Programmatic access for Cosmo clients |
| Static docs site | [opencosmos.ai](https://opencosmos.ai/) | Human-browsable knowledge |
| Inference (Apertus models) | Dell (local, sovereign) | GPU cost, privacy, sovereignty |

**Current RAG infrastructure (Phase 1):** Open WebUI's built-in RAG on the Sovereign Node (Dell XPS 8950, RTX 3090, solar-powered, Marin County, CA) serves as the local mirror. Documents are uploaded manually and indexed via Open WebUI's embedding pipeline. Cloud deployment is planned — see [Migration Phase 1d](../docs/opencosmos-migration.md#1d-knowledge-base-hosting-strategy-not-started).

**Future RAG infrastructure (Phase 3+):** Custom RAG pipeline in `packages/ai/src/rag/` with per-format chunking strategies, metadata-filtered retrieval, and hybrid search. Cloud RAG API endpoint for global access. The migration from Open WebUI's built-in RAG will be informed by retrieval patterns validated during Phase 1.

**Sovereignty note:** [Sovereignty Tiers](../docs/archive-and-deprecated/INCEPTION.md#sovereign-identity--the-sovereignty-tiers) govern **compute** — where LLMs process prompts. Published knowledge is explicitly intended to be shared globally. This is not a contradiction: the knowledge base is public by design; user inference stays sovereign by default.

---

## License

The corpus itself and its organizational structure are offered to the public domain under [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/).

Individual documents may carry their own licenses (noted in frontmatter). Source texts from the public domain remain in the public domain. Original commentary, guides, and reference documents authored for this corpus are released under CC0 unless otherwise specified.

---

> *"The work is the proof."* — This corpus exists because we believe the wisdom of humanity should be accessible to everyone — human and machine alike — organized with care, offered with generosity, and maintained with integrity.
