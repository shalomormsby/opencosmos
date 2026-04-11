---
title: "Knowledge Wiki Workflow"
role: guide
format: manual
domain: opencosmos
tags: [wiki, knowledge-compile, knowledge-review, knowledge-lookup, workflow, synthesis]
audience: [curator, engineer]
complexity: intermediate
summary: >-
  Step-by-step guide for the wiki synthesis layer: how to compile new insights,
  update existing pages, run health checks, and integrate the wiki into the
  standard source ingestion pipeline.
curated_at: 2026-04-10
curator: shalom
source: original
corpus_tier: source
related_docs:
  - guides/opencosmos-knowledge-tooling-overview.md
  - guides/opencosmos-skills-reference.md
---

# Knowledge Wiki Workflow

The knowledge wiki is the synthesis layer above raw source texts. It is maintained through three Claude Code skills and integrates with the existing publication pipeline. This guide covers everything from daily use to the full ingestion-to-wiki workflow.

## Overview

```
Source texts (knowledge/sources/)
       │
       ▼
Wiki synthesis (knowledge/wiki/)          ← new layer
  ├── entities/   — who/what
  ├── concepts/   — ideas and themes
  └── connections/ — cross-tradition comparisons
       │
       ▼
RAG retrieval (Upstash Vector / Open WebUI)
       │
       ▼
Cosmo AI responses
```

The wiki is always in Claude's context via:
```
# in .claude/CLAUDE.md:
@knowledge/wiki/index.md
```

---

## The Three Skills

| Skill | When to use |
|-------|------------|
| `/knowledge-compile` | After learning something durable — compile it to the wiki |
| `/knowledge-review` | Periodic health check — orphans, staleness, symmetry, open questions |
| `/knowledge-lookup <query>` | Before deep domain work — see what the wiki already knows |

---

## Daily Use: Compiling Insights

The cardinal rule: **compile when you learn something, not on a schedule.**

When a conversation surfaces a cross-tradition synthesis worth keeping:

```bash
/knowledge-compile convo
```

Claude will extract the durable insight, check whether a relevant wiki page already exists, and either update it or create a new one.

**Good candidates for compilation:**
- A claim that connects two or more source documents ("the Dhammapada's 'you too shall pass away' maps directly to the Tao Te Ching's teaching on wu wei — both describe acceptance of change through non-resistance")
- A contradiction articulated clearly ("Plato's soul is immortal and therefore permanent; the Buddhist self is anatman and therefore empty — these cannot both be true")
- An open question worth tracking ("Does the Taoist Tao have any equivalent to Platonic teleology?")
- A confidence promotion ("Three more Platonic dialogues confirm the Form of the Good — promote logos-and-tao from speculative to medium")

**Not worth compiling:**
- Factual lookups with no synthesis
- Conversation-specific context that won't generalize
- Anything already covered adequately by an existing wiki page

---

## Updated Ingestion Pipeline

The full pipeline is now: stage → groom → publish → **wiki-update**

```
1. Stage
   pbpaste > knowledge/incoming/my-text.md

2. Groom (format the raw text)
   /groom knowledge/incoming/my-text.md

3. Publish (frontmatter generation + corpus indexing)
   pnpm knowledge:publish knowledge/incoming/my-text.md --role source --domain <domain>

4. Wiki update (synthesize into wiki)
   /knowledge-compile log
```

Step 4 scans recent CURATION_LOG entries and updates the wiki pages affected by the new source document. For a new Platonic dialogue, for example, it would:
- Update `wiki/entities/plato.md` to add the dialogue to `synthesizes`
- Update any concept page that dialogue is relevant to
- Create a new concept page if the dialogue introduces a theme not yet covered

---

## Periodic Health Check

Run monthly or before a major synthesis session:

```bash
/knowledge-review
```

The review identifies:
- **Orphan pages** — not grounded in any source documents
- **Asymmetric links** — A links B but B doesn't link A
- **Stale pages** — `last_reviewed` > 90 days ago
- **Promotion candidates** — speculative pages now backed by 3+ sources
- **Accumulated open questions** — gaps the current corpus cannot answer (candidates for new sources)

---

## Searching Before You Ask

Before a deep domain conversation with Cosmo, check what the wiki already knows:

```bash
/knowledge-lookup impermanence
/knowledge-lookup what does plato say about the good
/knowledge-lookup cosmology origin universe
```

This returns pre-built synthesis pages, key claims, and connections — so Cosmo's response can build on existing wiki knowledge rather than re-deriving it from raw sources.

---

## Wiki Page Confidence Lifecycle

```
speculative → medium → high → superseded (if contradicted)
```

| Status | Meaning | Promotion criteria |
|--------|---------|-------------------|
| `speculative` | Interesting synthesis, not yet confirmed | — |
| `medium` | Supported by 2-3 sources, defensible | 3+ `synthesizes` entries |
| `high` | Well-established, contradictions documented | 4+ `synthesizes` entries + documented contradictions |
| `superseded` | Contradicted by new evidence | Add `failure_reason` note; create replacement page |
| `archived` | No longer relevant to corpus | — |

To promote manually: edit the `confidence` field in frontmatter and append to `knowledge/wiki/log.md`:
```
2026-04-12  PROMOTED  wiki/concepts/logos-and-tao.md  (speculative → medium; added theaetetus reference)
```

---

## Adding a Brand New Wiki Page Manually

If you want to add a wiki page without running a skill:

1. Choose the category: `entities/`, `concepts/`, or `connections/`
2. Filename: `{slug}.md` (kebab-case, no domain prefix — the wiki has its own namespace)
3. Required frontmatter:

```yaml
---
title: "Page Title"
role: wiki
domain: <primary domain or cross>
confidence: speculative|medium|high
status: active
synthesizes:
  - sources/path-to-source.md
last_reviewed: YYYY-MM-DD
tags: [tag1, tag2]
---
```

4. Follow the article structure: Summary → Key Claims → Connections → Contradictions → Open Questions
5. Add to `knowledge/wiki/index.md`
6. Append to `knowledge/wiki/log.md`

---

## File Naming Conventions

Wiki pages do NOT use the `{domain}-{slug}` convention from source files. The wiki is a different namespace:

```
entities/plato.md              ✓
entities/philosophy-plato.md   ✗ (don't prefix with domain)

concepts/impermanence.md       ✓
concepts/buddhism-impermanence.md  ✗ (it's cross-tradition)

connections/cosmology-comparison.md  ✓
```

One exception: if two entities share a name, use `{tradition}-{name}.md` to disambiguate.

---

## What the Wiki Is NOT

- **Not a replacement for source texts.** Wiki pages are synthesis and navigation — raw sources remain the authoritative primary material for RAG.
- **Not commentary.** Wiki pages extract and connect claims; they don't argue or interpret. For original interpretive essays, use `knowledge/commentary/`.
- **Not a glossary.** Term definitions go in `knowledge/reference/`. Wiki pages synthesize across multiple sources.
- **Not permanent.** Wiki pages are designed to be updated and superseded as the corpus grows. `confidence: speculative` is not a flaw — it's the system working as intended.
