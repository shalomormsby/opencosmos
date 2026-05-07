# Quote substrate (embeddable)

This folder holds **only verified + attributed quotes** — the subset of the corpus that gets embedded and is citable by Cosmo. Records pending verification live in [`data/quotes-pending/`](../../data/quotes-pending/) and migrate here as they pass validation.

## Layout

```
knowledge/quotes/
├── _source/                              # versioned source — do not hand-edit
│   └── quotes_normalized.jsonl           # 1,509 records, output of Tier 1 normalization
├── _review/                              # CSVs exported for human review (Stage 4)
├── _archive/
│   └── rejected.yaml                     # records dropped in Stage 4 (audit trail)
├── {author-normalized-key}.yaml          # one file per attributed person author
├── proverbs.yaml                         # traditional sayings (Chinese proverb, Zen saying, …)
├── attributed-collectives.yaml           # named collective sources (Delphic maxim, Yoga Sutras, …)
└── anonymous.yaml                        # author unknown
```

## What lives here vs. what's pending

| Status | Where it lives | Embedded by `pnpm embed`? |
|---|---|---|
| `verified` | `knowledge/quotes/*.yaml` | Yes |
| `attributed` | `knowledge/quotes/*.yaml` | Yes |
| `attributed_unverified` | `data/quotes-pending/pending.jsonl` | No |
| `likely_misattributed` | `data/quotes-pending/pending.jsonl` | No |
| `apocryphal` | `data/quotes-pending/pending.jsonl` | No |
| `rejected` | `knowledge/quotes/_archive/rejected.yaml` | No |

A record migrates from pending → embeddable when its status flips to `verified` or `attributed` and either (a) `confidence ≥ 0.8` from Stage 3 validation, or (b) `reviewed_by_human: true` from Stage 4 review. See [`data/quotes-pending/README.md`](../../data/quotes-pending/README.md) for the promotion workflow.

## File shape

**Person files** carry author metadata at the top; per-quote records inherit it.

```yaml
author: "Albert Einstein"
author_normalized_key: "albert-einstein"
tradition: "science"
era: null
gender: "M"
quotes:
  - id: "q_0159"
    slug: null
    text: "Creativity is intelligence having fun."
    category: "insight"
    keywords: ["creativity", "intelligence", "joy"]
    context: "Scientist, Theoretical Physicist"
    favorite: false
    source_work: null
    source_section: null
    provenance:
      status: "verified"
      confidence: 0.95
      wikiquote_url: "https://en.wikiquote.org/..."
      earliest_print_source: "..."
      notes: null
      reviewed_by_human: true
```

**Collective files** (`proverbs.yaml`, `attributed-collectives.yaml`, `anonymous.yaml`) carry author per-quote since multiple sources share the file:

```yaml
collective: "attributed-collectives"
description: "Quotes attributed to a named collective source — author preserved per-quote."
quotes:
  - id: "q_0001"
    slug: null
    text: "Know thyself."
    author: "Delphic maxim"
    author_normalized_key: "delphic-maxim"
    tradition: null
    era: null
    gender: null
    category: "insight"
    keywords: ["self-knowledge", ...]
    context: "Ancient Greek, Philosophy"
    favorite: true
    source_work: null
    source_section: null
    provenance:
      status: "attributed"
      ...
```

## Pipeline

| Stage | Script | Purpose |
|-------|--------|---------|
| 1 | `pnpm quotes:normalize` (`scripts/normalize-quotes/01-jsonl-to-yaml.ts`) | Read source jsonl, split into embeddable yaml here + pending pool. Idempotent. |
| 1 | `pnpm quotes:lint` (`scripts/normalize-quotes/lint.ts`) | Validate both pools + cross-pool integrity. |
| 2 | `pnpm embed` (`scripts/knowledge/embed-knowledge.ts`) | Embed `knowledge/quotes/*.yaml` into Upstash with `chunk_type: 'quote'`. |
| 3 | `02-validate-provenance.ts` (planned) | Claude + web search validation of pending pool. |
| 3 | `03-merge-validation.ts` (planned) | Merge Stage 3 results back into pending.jsonl. |
| 4 | `04-export-review-csv.ts` (planned) | Export low-confidence rows for human review. |
| 4 | `05-apply-review.ts` (planned) | Apply human keep/drop/reattribute decisions. |
| any | `pnpm quotes:export-csv` | Regenerate `pending.csv` from `pending.jsonl`. |
| any | `pnpm quotes:promote` | Migrate eligible pending records into `knowledge/quotes/`. `--dry` flag previews. |

## Provenance vocabulary

| Status | Meaning |
|--------|---------|
| `verified` | Primary or scholarly source confirms |
| `attributed` | Carried in source field; not yet primary-source verified |
| `attributed_unverified` | Commonly attributed; no source carried |
| `likely_misattributed` | Evidence points elsewhere |
| `apocryphal` | Almost certainly fabricated |
| `rejected` | Dropped in Stage 4 — moved to `_archive/rejected.yaml`, not embedded |

See [docs/pm.md § Phase 1.3](../../docs/pm.md) for the full plan.
