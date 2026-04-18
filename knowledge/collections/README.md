# Knowledge Collections

> Curated reading paths through the corpus. Serve human readers and RAG retrieval simultaneously.

---

## What a Collection Is

A collection (`role: collection`) is a curated grouping of source documents — a reading order, a thematic journey, or a voice's intellectual foundation. Collections contain no primary content of their own; they point to source documents in the corpus.

They serve two audiences at once:
- **Human readers** — a navigable path into a tradition, theme, or voice's lineage
- **RAG system** — a manifest of high-priority documents for retrieval when a collection's domain is relevant

---

## Voice Foundation Collections

Four collections define the intellectual foundation for each AI voice in the Triad:

| Collection | Voice | Domain |
|------------|-------|--------|
| [cosmo-foundations.md](cosmo-foundations.md) | Cosmo | Integrative, cross-tradition texts — the bridges between wisdom traditions |
| [sol-foundations.md](sol-foundations.md) | Sol | Contemplative and relational wisdom: Buddhism, Sufism, Vedic, ubuntu, indigenous traditions |
| [socrates-foundations.md](socrates-foundations.md) | Socrates | Dialectical inquiry, epistemology, Stoicism, critical philosophy, science |
| [optimus-foundations.md](optimus-foundations.md) | Optimus | Systems thinking, engineering, AI, pragmatic philosophy, organizational design |

When a voice is active in a conversation, its foundation collection is the first-priority region of the knowledge graph to search. Sol responding to a question about grief draws from the Sol foundations. Socrates challenging an assumption draws from the Socrates foundations.

These collections are referenced from within each voice's system prompt and are linked from [packages/ai/triad/](../../packages/ai/triad/).

---

## Standalone Collections

| Collection | What it is |
|------------|------------|
| [philosophy-gleanings-from-george-fox.md](philosophy-gleanings-from-george-fox.md) | Curated selections from George Fox's journals — a thematic reading path through his spiritual insights |
| [literature-poems-of-nature-by-henry-david-thoreau.md](literature-poems-of-nature-by-henry-david-thoreau.md) | Thoreau's nature poetry — a standalone reading collection |
| [philosophy-essays-by-ralph-waldo-emerson.md](philosophy-essays-by-ralph-waldo-emerson.md) | Emerson's essays — curated reading order through the Transcendentalist canon |

---

## Frontmatter Schema

```yaml
---
title: "Sol Foundations"
role: collection          # identifies this as a collection, not a source
domain: cross             # or the primary domain (buddhism, philosophy, etc.)
tags: [...]
---
```

The `role: collection` field tells the RAG system and the docs site how to treat this document. Collections appear in their own section of the browsable knowledge site.

---

## Related

- [knowledge/README.md](../README.md) — Full corpus organization and frontmatter schema
- [knowledge/sources/](../sources/) — The source documents collections point to
- [packages/ai/triad/README.md](../../packages/ai/triad/README.md) — The AI voices these collections ground
- [knowledge/wiki/index.md](../wiki/index.md) — Synthesized cross-tradition concept pages (the layer above sources)
