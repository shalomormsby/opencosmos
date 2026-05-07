# Quotes pending verification

Working table for the ~1,463 quotes that haven't passed verification yet. Records here are **not** embedded into Cosmo's retrieval pool — they live outside `knowledge/` so they can't accidentally leak into citations.

As Stage 3 validation enriches each record with provenance evidence and Stage 4 review confirms the human call, eligible records migrate into [`knowledge/quotes/`](../../knowledge/quotes/) via `pnpm quotes:promote`.

## Files

| File | Purpose |
|---|---|
| `pending.jsonl` | Canonical store. One record per line. Mutated by Stages 3 + 4 + promote. |
| `pending.csv` | Spreadsheet-friendly export, regenerated from JSONL. Read-only — edits will be wiped on next regeneration. |

## CSV columns

| Column | Source field |
|---|---|
| `id` | `id` (canonical, stable) |
| `author` | `author` |
| `author_normalized_key` | `author_normalized_key` |
| `text` | `text` |
| `category` | `category` (single-valued, taxonomic — may be empty) |
| `keywords` | `keywords` joined with `;` |
| `context` | `context` (free-text from Tier 1) |
| `favorite` | `favorite` (boolean) |
| `source` | `source` (raw source field carried from Tier 1) |
| `status` | `provenance.status` |
| `confidence` | `provenance.confidence` (0.0–1.0; null until Stage 3 runs) |
| `wikiquote_url` | `provenance.wikiquote_url` |
| `earliest_print_source` | `provenance.earliest_print_source` |
| `notes` | `provenance.notes` |
| `reviewed_by_human` | `provenance.reviewed_by_human` (boolean) |
| `suspect_reason` | `flags.suspect_reason` (Tier 1 flag explanation) |

Multi-line text fields use RFC-4180 quoting. Sheets/Numbers/Excel handle this natively.

## Reading the CSV

```bash
open data/quotes-pending/pending.csv
# → opens in Numbers (default) on macOS
```

In Sheets/Excel:
- Sort by `status` to group misattributed/apocryphal at the top
- Filter by `author` to scan a single voice
- Filter by `confidence < 0.6` to triage low-confidence Stage 3 outputs (only meaningful after Stage 3 runs)

**Don't edit pending.csv directly** — `pnpm quotes:export-csv` regenerates it from `pending.jsonl`. To make changes that stick, edit `pending.jsonl` (or wait for Stage 4 review tooling, which exports a separate decisions CSV).

## Promotion workflow

```
pending.jsonl                          ← canonical, mutable
   │
   │ Stage 3 validation enriches provenance
   │
   ▼
pnpm quotes:promote --dry              ← preview what would move
pnpm quotes:promote                    ← move eligible records to knowledge/quotes/
   │
   ▼
knowledge/quotes/{author-key}.yaml     ← embeddable; pnpm embed picks them up
```

**Promotion eligibility** (see `meetsPromotionBar` in `scripts/normalize-quotes/shared.ts`):
- `provenance.status` ∈ {`verified`, `attributed`}, AND
- (`provenance.confidence` ≥ 0.8 OR `provenance.reviewed_by_human` = true)

Records below that bar stay in pending until Stage 3 enriches them or Stage 4 review confirms.

## Resetting

`pnpm quotes:normalize` is idempotent — it wipes both pools and rebuilds from `_source/quotes_normalized.jsonl`. Any Stage 3 enrichment held only in pending.jsonl is lost on reset, so commit Stage 3 outputs before re-running normalize. (After Stage 3 lands, normalize will gain a `--preserve-validation` flag.)

See [docs/pm.md § Phase 1.3](../../docs/pm.md) for the full plan.
