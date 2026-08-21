# Quote substrate (embeddable)

This folder holds **only verified + attributed quotes** — the subset of the corpus that gets embedded and is citable by Cosmo. Records pending verification live in [`data/quotes-pending/`](../../data/quotes-pending/) and migrate here as they pass validation.

## Layout

```
knowledge/quotes/
├── _source/                              # versioned source — do not hand-edit
│   ├── quotes_normalized.jsonl           # 1,509 records, output of Tier 1 normalization
│   ├── validation-progress.jsonl         # append-only ledger of Stage 3 verdicts
│   └── validation-batches/               # per-batch agent IO (.input.json gitignored)
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

| Stage | Command | Purpose |
|-------|---------|---------|
| 1 | `pnpm quotes:normalize` | **One-time migration, already run.** Rebuilds both pools from the source jsonl — which *wipes* validation work. Don't run it. |
| 1 | `pnpm quotes:lint` | Validate all three pools + cross-pool integrity. Run after every mutation. |
| 2 | `pnpm embed` | Embed `knowledge/quotes/*.yaml` into Upstash with `chunk_type: 'quote'`. |
| 3 | `pnpm quotes:checkpoint remaining --write-batches` | Queue unvalidated quotes as batch input files for a subagent fan-out. |
| 3 | `pnpm quotes:checkpoint append --all` | Take agent verdicts back into the checkpoint. Validated, idempotent. |
| 3 | `pnpm quotes:checkpoint status` | What's validated, checkpointed, outstanding. |
| 3 | `pnpm quotes:merge` | Write checkpointed verdicts into `pending.jsonl`. `--dry` previews. |
| 4 | `pnpm quotes:review-export` | Export the records that need a human decision. `--all` widens the net. |
| 4 | `pnpm quotes:review-apply -- <csv>` | Apply keep/drop/reattribute. `--dry` previews. |
| any | `pnpm quotes:export-csv` | Regenerate `pending.csv` from `pending.jsonl`. |
| any | `pnpm quotes:promote` | Migrate eligible pending records into `knowledge/quotes/`. `--dry` previews. |

`scripts/normalize-quotes/02-validate-provenance.ts` (`pnpm quotes:validate`) is the
original API-driven Stage 3 driver. It still works, but it spends real money —
the pilot cost ~$20 for 10 quotes — so validation is run through Claude Code
subagents via `02b-checkpoint.ts` instead. Both write the same checkpoint
format, so `quotes:merge` doesn't care which produced a verdict.

### Running a validation tranche

```bash
pnpm quotes:checkpoint remaining --write-batches --limit 300   # writes N .input.json files
# fan out one subagent per batch: it reads <stem>.input.json, follows
# VALIDATION_PROMPT.md, and writes <stem>.output.json
pnpm quotes:checkpoint append --all
pnpm quotes:merge && pnpm quotes:promote && pnpm quotes:lint
pnpm embed                                                     # make them citable
```

Resume state is derived from which quote IDs already have a verdict, so a
tranche can be resized, re-run, or abandoned midway with no bookkeeping. A
batch whose output is malformed is rejected whole and stays queued.

## Where people read these

Quotes are browsable at `/knowledge/quotes`, one page per author or collective,
each quote anchored by its id. Cosmo's `[quote: …]` citations resolve to those
anchors, so a citation in chat opens the record itself.

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
